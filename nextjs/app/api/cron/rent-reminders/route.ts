import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/resend'
import { rentDueSoonEmail, rentOverdueEmail } from '@/lib/resend-rent'
import { getRegion } from '@/lib/i18n/regions'
import { formatCurrencyLocale } from '@/lib/i18n/formatters'

/**
 * Daily rent reminders.
 *
 * Replaces `rent-reminder-agent`, a Supabase Edge Function that ran via pg_cron
 * for four months and reported 122 successful runs while sending nothing: it was
 * a "free tier implementation using Expo push notifications", aimed at the
 * abandoned Expo app. Zero of 22 profiles have a push_token and the live app never
 * registers one, so it could reach nobody.
 *
 * This runs on Vercel Cron and sends email through Resend, which is verified on
 * rentybase.com and already delivering the welcome mail.
 *
 * Design notes
 * ------------
 * - Amounts are formatted in the PROPERTY's currency, never the server's locale.
 *   A number without its currency is the bug that made a landlord's rupee rents
 *   render as dollars; an email is worse, because it cannot be corrected later.
 * - Dates are compared in the TENANT's timezone. A reminder that says "due today"
 *   on the wrong day is worse than no reminder.
 * - Every send is written to email_logs BEFORE the next one is attempted, and
 *   dedup is a query against that table. A reminder loop that double-sends because
 *   a run was retried would train people to ignore it.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Reminder is sent this many days before the due date.
const REMIND_DAYS_BEFORE = 3

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

/** Today's date in an IANA zone, as YYYY-MM-DD. Falls back to UTC. */
function localToday(timeZone: string | null): Date {
  try {
    const s = new Date().toLocaleDateString('en-CA', { timeZone: timeZone || 'UTC' })
    return new Date(`${s}T00:00:00`)
  } catch {
    return new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00')
  }
}

export async function GET(req: Request) {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Without this the route
  // is an open trigger for sending mail to every tenant.
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

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

  const rows = (data ?? []) as unknown as Row[]
  let sent = 0
  const skipped: Record<string, number> = {}
  const skip = (why: string) => { skipped[why] = (skipped[why] ?? 0) + 1 }

  for (const row of rows) {
    const tenant = row.rental?.tenant
    if (!tenant?.email) { skip('no_tenant_email'); continue }

    const region = getRegion(row.rental?.property?.country_code)
    const today = localToday(tenant.timezone)

    // Due date in the tenant's own calendar.
    const monthStart = new Date(`${row.month}T00:00:00`)
    const dueDay = row.rental?.rent_due_day ?? 5
    const due = new Date(monthStart.getFullYear(), monthStart.getMonth(), dueDay)
    const dayDelta = Math.round((due.getTime() - today.getTime()) / 86_400_000)

    let kind: 'rent_due_soon' | 'rent_overdue' | null = null
    if (dayDelta >= 0 && dayDelta <= REMIND_DAYS_BEFORE) kind = 'rent_due_soon'
    else if (dayDelta < 0) kind = 'rent_overdue'
    if (!kind) { skip('not_in_window'); continue }

    // One of each kind per payment, ever. reference_id is the payment id, so a
    // retried run or a second deploy cannot double-send.
    const { data: already } = await sb
      .from('email_logs')
      .select('id')
      .eq('email_type', kind)
      .eq('reference_id', row.id)
      .limit(1)
    if (already && already.length > 0) { skip('already_sent'); continue }

    const money = (n: number) => formatCurrencyLocale(Number(n), region.currency, region.locale)
    const input = {
      tenantName: (tenant.full_name || 'there').split(' ')[0],
      propertyName: row.rental?.property?.name || 'your rental',
      amount: money(row.amount),
      dueDate: due.toLocaleDateString(region.locale, { day: 'numeric', month: 'long', year: 'numeric' }),
      landlordName: row.rental?.landlord?.full_name || 'your landlord',
      daysUntilDue: Math.max(0, dayDelta),
      daysOverdue: Math.abs(dayDelta),
      lateFee: row.late_fee && row.late_fee > 0 ? money(row.late_fee) : null,
    }

    const { subject, html } = kind === 'rent_due_soon' ? rentDueSoonEmail(input) : rentOverdueEmail(input)

    try {
      await sendEmail({ to: tenant.email, subject, html })
      await sb.from('email_logs').insert({
        recipient_id: tenant.id, recipient_email: tenant.email,
        email_type: kind, reference_id: row.id, subject, status: 'sent',
      })
      sent++
    } catch (err) {
      // One bad address must not stop the run for everyone else.
      await sb.from('email_logs').insert({
        recipient_id: tenant.id, recipient_email: tenant.email,
        email_type: kind, reference_id: row.id, subject, status: 'failed',
        error: err instanceof Error ? err.message.slice(0, 500) : 'unknown',
      })
      skip('send_failed')
    }
  }

  return NextResponse.json({ ok: true, considered: rows.length, sent, skipped })
}
