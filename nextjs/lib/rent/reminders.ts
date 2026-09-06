// ─── Reminder planning ────────────────────────────────────────────────────────
//
// Pure. Takes the outstanding payments and a clock, returns exactly which emails
// should go to whom. The route sends them; this decides them — and this is the
// part that was wrong on the first live run, when dedup keyed on the PAYMENT sent
// one tenant eight emails in a single pass. Everything that decides fan-out lives
// here so it can be tested against fixed data instead of discovered in inboxes.
//
// Rules, each of which has a test:
//   1. One email per tenant per run, however many months are outstanding.
//   2. The oldest unpaid month decides the kind (due-soon vs overdue) and the date.
//   3. "Today" is the TENANT's calendar day, not the server's.
//   4. Due-soon fires only inside the REMIND_DAYS_BEFORE window; overdue only after
//      the due date. Outside both, nothing is planned.
//   5. Dedup key is tenant + oldest month, so a retried run cannot resend.

export const REMIND_DAYS_BEFORE = 3

export interface OutstandingPayment {
  id: string
  amount: number
  /** YYYY-MM-DD, first of the month */
  month: string
  late_fee: number | null
  rental: {
    rent_due_day: number | null
    property: { name: string | null; country_code: string | null } | null
    landlord: { full_name: string | null } | null
    tenant: { id: string; full_name: string | null; email: string | null; timezone: string | null } | null
  } | null
}

export type ReminderKind = 'rent_due_soon' | 'rent_overdue'

export interface PlannedReminder {
  kind: ReminderKind
  tenantId: string
  email: string
  tenantName: string
  propertyName: string
  countryCode: string | null
  landlordName: string
  /** Oldest outstanding month, YYYY-MM-DD */
  month: string
  dueDate: Date
  dayDelta: number
  outstandingMonths: number
  totalDue: number
  totalFee: number
  /** `${tenantId}:${month}` — what email_logs.reference_id records */
  dedupKey: string
}

export interface PlanResult {
  planned: PlannedReminder[]
  skipped: Record<string, number>
}

/** Midnight on today's date in an IANA zone. Falls back to UTC for a bad zone. */
export function localToday(timeZone: string | null, now: Date = new Date()): Date {
  let ymd: string
  try {
    ymd = now.toLocaleDateString('en-CA', { timeZone: timeZone || 'UTC' })
  } catch {
    ymd = now.toISOString().slice(0, 10)
  }
  return new Date(`${ymd}T00:00:00`)
}

export function planReminders(rows: OutstandingPayment[], now: Date = new Date()): PlanResult {
  const skipped: Record<string, number> = {}
  const skip = (why: string) => { skipped[why] = (skipped[why] ?? 0) + 1 }

  // Rule 1: group by tenant first. Everything below is per person, not per row.
  const byTenant = new Map<string, OutstandingPayment[]>()
  for (const row of rows) {
    const id = row.rental?.tenant?.id
    if (!id) { skip('no_tenant'); continue }
    byTenant.set(id, [...(byTenant.get(id) ?? []), row])
  }

  const planned: PlannedReminder[] = []

  for (const [tenantId, list] of byTenant) {
    const tenant = list[0].rental?.tenant
    if (!tenant?.email) { skip('no_tenant_email'); continue }

    // Rule 2: the oldest month is the one worth writing about.
    list.sort((a, b) => a.month.localeCompare(b.month))
    const primary = list[0]

    // Rule 3: the tenant's own calendar.
    const today = localToday(tenant.timezone, now)
    const monthStart = new Date(`${primary.month}T00:00:00`)
    const dueDay = Math.min(Math.max(primary.rental?.rent_due_day ?? 5, 1), 28)
    const dueDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), dueDay)
    const dayDelta = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000)

    // Rule 4: only inside a window.
    let kind: ReminderKind | null = null
    if (dayDelta >= 0 && dayDelta <= REMIND_DAYS_BEFORE) kind = 'rent_due_soon'
    else if (dayDelta < 0) kind = 'rent_overdue'
    if (!kind) { skip('not_in_window'); continue }

    planned.push({
      kind,
      tenantId,
      email: tenant.email,
      tenantName: (tenant.full_name || 'there').split(' ')[0],
      propertyName: primary.rental?.property?.name || 'your rental',
      countryCode: primary.rental?.property?.country_code ?? null,
      landlordName: primary.rental?.landlord?.full_name || 'your landlord',
      month: primary.month,
      dueDate,
      dayDelta,
      outstandingMonths: list.length,
      totalDue: list.reduce((s, r) => s + Number(r.amount) + Number(r.late_fee || 0), 0),
      totalFee: list.reduce((s, r) => s + Number(r.late_fee || 0), 0),
      // Rule 5.
      dedupKey: `${tenantId}:${primary.month}`,
    })
  }

  return { planned, skipped }
}
