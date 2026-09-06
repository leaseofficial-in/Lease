import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/resend'
import { rentDueSoonEmail, rentOverdueEmail } from '@/lib/resend-rent'
import { getRegion } from '@/lib/i18n/regions'
import { formatCurrencyLocale } from '@/lib/i18n/formatters'

/**
 * Daily rent reminders.
 *
 * Replaces `rent-reminder-agent`, a Supabase Edge Function that ran via pg_cron for
 * four months reporting 122 successful runs while sending nothing: it targeted the
 * abandoned Expo app's push tokens, and zero of 22 profiles have one.
 *
 * ONE EMAIL PER TENANT PER RUN
 * ----------------------------
 * The first version of this route keyed dedup on the payment, which meant a tenant
 * with eight overdue months received eight separate emails in a single run. That
 * happened for real on the first live run — 23 messages reached four people — and
 * it is the exact failure that teaches someone to filter a sender to spam.
 *
 * Payments are now grouped by tenant. The oldest unpaid month decides what the
 * email says, and the rest are summarised inside it. Dedup is keyed on
 * (tenant, kind, month) so a retried run, a redeploy, or a second cron tick cannot
 * resend, and a tenant can never receive more than one message per run.
 *
 * Other rules this keeps:
 *  - Amounts are formatted in the PROPERTY's currency, never the server's locale.
 *  - Due dates are compared in the TENANT's timezone; "due today" on the wrong day
 *    is worse than no reminder.
 *  - `?dry=1` reports exactly what would be sent without sending. Test with it.
 *  - MAX_SENDS_PER_RUN is a blast-radius cap, not a business rule: if a query
 *    change ever widens the audience, the damage stops at a number a human can
 *    review rather than reaching everyone at once.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const REMIND_DAYS_BEFORE = 3
const MAX_SENDS_PER_RUN = 50

type Row = {
  id: string
  amount: number
  month: string
  status: string
  late_fee: number | null
  rental: {
    rent_due_day: number | null
    property: { name: string | null; country_code: string | null } | null
    landlord: { full_name: string | null } | null
    tenant: { id: string; full_name: string | null; email: string | null; timezone: string | null } | null
  } | null
}

/** Midnight today in an IANA zone. Falls back to UTC for a missing or bad zone. */
function localToday(timeZone: string | null): Date {
  try {
    return new Date(`${new Date().toLocaleDateString('en-CA', { timeZone: timeZone || 'UTC' })}T00:00:00`)
  } catch {
    return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`)
  }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = new URL(req.url).searchParams.get('dry') === '1'

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

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

  // ── Group by tenant, so one person gets at most one email ──────────────────
  const byTenant = new Map<string, Row[]>()
  for (const row of (data ?? []) as unknown as Row[]) {
    const id = row.rental?.tenant?.id
    if (!id) continue
    const list = byTenant.get(id) ?? []
    list.push(row)
    byTenant.set(id, list)
  }

  let sent = 0
  const skipped: Record<string, number> = {}
  const skip = (why: string) => { skipped[why] = (skipped[why] ?? 0) + 1 }
  const planned: { to: string; kind: string; month: string; others: number }[] = []

  for (const [, rows] of byTenant) {
    if (sent >= MAX_SENDS_PER_RUN) { skip('run_cap_reached'); continue }

    const tenant = rows[0].rental?.tenant
    if (!tenant?.email) { skip('no_tenant_email'); continue }

    // The oldest unpaid month is the one worth writing about.
    rows.sort((a, b) => a.month.localeCompare(b.month))
    const primary = rows[0]

    const region = getRegion(primary.rental?.property?.country_code)
    const today = localToday(tenant.timezone)
    const monthStart = new Date(`${primary.month}T00:00:00`)
    const due = new Date(monthStart.getFullYear(), monthStart.getMonth(), primary.rental?.rent_due_day ?? 5)
    const dayDelta = Math.round((due.getTime() - today.getTime()) / 86_400_000)

    let kind: 'rent_due_soon' | 'rent_overdue' | null = null
    if (dayDelta >= 0 && dayDelta <= REMIND_DAYS_BEFORE) kind = 'rent_due_soon'
    else if (dayDelta < 0) kind = 'rent_overdue'
    if (!kind) { skip('not_in_window'); continue }

    // Keyed on tenant + kind + month, so the same person cannot be mailed twice
    // about the same period however often this runs.
    const dedupKey = `${tenant.id}:${primary.month}`
    const { data: already } = await sb
      .from('email_logs')
      .select('id').eq('email_type', kind).eq('reference_id', dedupKey).limit(1)
    if (already && already.length > 0) { skip('already_sent'); continue }

    const money = (n: number) => formatCurrencyLocale(Number(n), region.currency, region.locale)
    // When several months are outstanding, the email is about the total.
    const totalDue = rows.reduce((sum, r) => sum + Number(r.amount) + Number(r.late_fee || 0), 0)
    const totalFee = rows.reduce((sum, r) => sum + Number(r.late_fee || 0), 0)

    const { subject, html } = (kind === 'rent_due_soon' ? rentDueSoonEmail : rentOverdueEmail)({
      tenantName: (tenant.full_name || 'there').split(' ')[0],
      propertyName: primary.rental?.property?.name || 'your rental',
      amount: money(rows.length > 1 ? totalDue : Number(primary.amount)),
      dueDate: due.toLocaleDateString(region.locale, { day: 'numeric', month: 'long', year: 'numeric' }),
      landlordName: primary.rental?.landlord?.full_name || 'your landlord',
      daysUntilDue: Math.max(0, dayDelta),
      daysOverdue: Math.abs(dayDelta),
      lateFee: totalFee > 0 ? money(totalFee) : null,
      outstandingMonths: rows.length,
    })

    if (dryRun) {
      planned.push({ to: tenant.email, kind, month: primary.month, others: rows.length - 1 })
      sent++
      continue
    }

    try {
      await sendEmail({ to: tenant.email, subject, html })
      await sb.from('email_logs').insert({
        recipient_id: tenant.id, recipient_email: tenant.email,
        email_type: kind, reference_id: dedupKey, subject, status: 'sent',
      })
      sent++
    } catch (err) {
      await sb.from('email_logs').insert({
        recipient_id: tenant.id, recipient_email: tenant.email,
        email_type: kind, reference_id: dedupKey, subject, status: 'failed',
        error: err instanceof Error ? err.message.slice(0, 500) : 'unknown',
      })
      skip('send_failed')
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    tenants: byTenant.size,
    sent,
    skipped,
    ...(dryRun ? { planned } : {}),
  })
}
