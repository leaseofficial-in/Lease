import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/resend'
import { rentDueSoonEmail, rentOverdueEmail } from '@/lib/resend-rent'
import { getRegion } from '@/lib/i18n/regions'
import { formatCurrencyLocale } from '@/lib/i18n/formatters'
import { planReminders, type OutstandingPayment } from '@/lib/rent/reminders'

/**
 * Daily rent reminders.
 *
 * Replaces `rent-reminder-agent`, a Supabase Edge Function that ran via pg_cron for
 * four months reporting 122 successful runs while sending nothing: it targeted the
 * abandoned Expo app's push tokens, and zero of 22 profiles have one.
 *
 * Every decision about WHO gets WHAT is made by planReminders() in
 * lib/rent/reminders.ts, which is pure and tested against the exact data shape that
 * caused the 2026-09-07 incident (per-payment dedup sent one tenant eight emails in
 * a single run; 23 messages reached four real people). This route only dedups
 * against email_logs, renders, sends, and records.
 *
 * Operational rules:
 *  - `?dry=1` reports exactly what would be sent, to whom, without sending. Run it
 *    before enabling the schedule, every time.
 *  - MAX_SENDS_PER_RUN is a blast-radius cap, not a business rule: if a query change
 *    ever widens the audience, the damage stops at a number a person can review.
 *  - Amounts are formatted in the PROPERTY's currency, never the server's locale.
 *  - Every send is logged before the next is attempted; dedup is a query on
 *    (email_type, reference_id = tenant:month), so a retried run cannot resend.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_SENDS_PER_RUN = 50

export async function GET(req: Request) {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Without this the route
  // is an open trigger for mailing every tenant.
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = new URL(req.url).searchParams.get('dry') === '1'

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  // service_role: this job must see every tenancy, and there is no user session.
  const sb = createClient(url, key, { auth: { persistSession: false } })

  const { data, error } = await sb
    .from('rent_payments')
    .select(`
      id, amount, month, status, late_fee,
      rental:rentals!inner(
        rent_due_day,
        property:properties(name, country_code),
        landlord:profiles!rentals_landlord_id_fkey(full_name),
        tenant:profiles!rentals_tenant_id_fkey(id, full_name, email, timezone)
      )
    `)
    .in('status', ['pending', 'overdue'])
    .eq('rental.status', 'active')

  if (error) {
    console.error('[cron/rent-reminders] query failed:', error.message)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const { planned, skipped } = planReminders((data ?? []) as unknown as OutstandingPayment[])
  const skip = (why: string) => { skipped[why] = (skipped[why] ?? 0) + 1 }

  let sent = 0
  // Dedup keys that were mailed but whose log row did not land. Reported in the
  // response so a run that would resend next time is visible now, not after.
  const unlogged: string[] = []
  const preview: { to: string; kind: string; month: string; others: number }[] = []

  for (const p of planned) {
    if (sent >= MAX_SENDS_PER_RUN) { skip('run_cap_reached'); continue }

    const { data: already } = await sb
      .from('email_logs')
      .select('id').eq('email_type', p.kind).eq('reference_id', p.dedupKey).limit(1)
    if (already && already.length > 0) { skip('already_sent'); continue }

    const region = getRegion(p.countryCode)
    const money = (n: number) => formatCurrencyLocale(Number(n), region.currency, region.locale)

    const { subject, html } = (p.kind === 'rent_due_soon' ? rentDueSoonEmail : rentOverdueEmail)({
      tenantName: p.tenantName,
      propertyName: p.propertyName,
      // A single month reads as the rent figure; several read as the total owed.
      amount: money(p.outstandingMonths > 1 ? p.totalDue : p.totalDue - p.totalFee),
      dueDate: p.dueDate.toLocaleDateString(region.locale, { day: 'numeric', month: 'long', year: 'numeric' }),
      landlordName: p.landlordName,
      daysUntilDue: Math.max(0, p.dayDelta),
      daysOverdue: Math.abs(p.dayDelta),
      lateFee: p.totalFee > 0 ? money(p.totalFee) : null,
      outstandingMonths: p.outstandingMonths,
    })

    if (dryRun) {
      preview.push({ to: p.email, kind: p.kind, month: p.month, others: p.outstandingMonths - 1 })
      sent++
      continue
    }

    try {
      await sendEmail({ to: p.email, subject, html })
      // This row IS the dedup guard: the query at the top of the loop skips
      // anyone who already has one. If the send succeeds and the log does not,
      // the next run has no memory of it and mails them again -- which is the
      // shape of the incident this job caused the first time it ran. It is
      // written with service_role so RLS cannot refuse it, but a constraint or a
      // dropped connection still can, and an unchecked insert would hide that.
      const { error: logErr } = await sb.from('email_logs').insert({
        recipient_id: p.tenantId, recipient_email: p.email,
        email_type: p.kind, reference_id: p.dedupKey, subject, status: 'sent',
      })
      if (logErr) {
        console.error('[cron/rent-reminders] SENT BUT NOT LOGGED', p.dedupKey, logErr.message)
        unlogged.push(p.dedupKey)
      }
      sent++
    } catch (err) {
      // One bad address must not stop the run for everyone else.
      const { error: logErr } = await sb.from('email_logs').insert({
        recipient_id: p.tenantId, recipient_email: p.email,
        email_type: p.kind, reference_id: p.dedupKey, subject, status: 'failed',
        error: err instanceof Error ? err.message.slice(0, 500) : 'unknown',
      })
      if (logErr) console.error('[cron/rent-reminders] failure not logged', p.dedupKey, logErr.message)
      skip('send_failed')
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    considered: data?.length ?? 0,
    planned: planned.length,
    sent,
    skipped,
    ...(unlogged.length ? { unlogged } : {}),
    ...(dryRun ? { preview } : {}),
  })
}
