import { describe, it, expect } from 'vitest'
import { planReminders, localToday, REMIND_DAYS_BEFORE, type OutstandingPayment } from './reminders'

// The regression guard for the 2026-09-07 incident, in which per-payment dedup sent
// one tenant eight emails in a single run and 23 messages reached four real people.
// Every rule the planner enforces is pinned here against fixed data.

const NOW = new Date(2026, 8, 10, 12, 0) // 10 Sep 2026, midday local

function row(over: Partial<OutstandingPayment> & { tenantId?: string; email?: string | null; tz?: string | null; dueDay?: number }): OutstandingPayment {
  const { tenantId = 't1', email = 't1@example.com', tz = 'UTC', dueDay = 5, ...rest } = over
  return {
    id: rest.id ?? Math.random().toString(36).slice(2),
    amount: rest.amount ?? 20000,
    month: rest.month ?? '2026-09-01',
    late_fee: rest.late_fee ?? null,
    rental: {
      rent_due_day: dueDay,
      property: { name: 'Flat 4B', country_code: 'IN' },
      landlord: { full_name: 'Priya Sharma' },
      tenant: { id: tenantId, full_name: 'Aarav Mehta', email, timezone: tz },
    },
  }
}

describe('planReminders — one email per tenant', () => {
  it('collapses eight overdue months for one tenant into ONE reminder', () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      row({ month: `2026-0${i + 1}-01`.replace('-00-', '-01-'), amount: 1000 }),
    )
    const { planned } = planReminders(rows, NOW)
    expect(planned).toHaveLength(1)
    expect(planned[0].outstandingMonths).toBe(8)
    expect(planned[0].totalDue).toBe(8000)
  })

  it('sends separate emails to separate tenants', () => {
    const rows = [
      row({ tenantId: 'a', email: 'a@x.com', month: '2026-08-01' }),
      row({ tenantId: 'b', email: 'b@x.com', month: '2026-08-01' }),
    ]
    expect(planReminders(rows, NOW).planned.map(p => p.email).sort()).toEqual(['a@x.com', 'b@x.com'])
  })

  it('writes about the OLDEST month and derives the dedup key from it', () => {
    const rows = [row({ month: '2026-09-01' }), row({ month: '2026-06-01' }), row({ month: '2026-08-01' })]
    const [p] = planReminders(rows, NOW).planned
    expect(p.month).toBe('2026-06-01')
    expect(p.dedupKey).toBe('t1:2026-06-01')
  })
})

describe('planReminders — windows', () => {
  it('plans due-soon inside the window before the due date', () => {
    // Due 12 Sep, today 10 Sep -> 2 days out
    const [p] = planReminders([row({ dueDay: 12 })], NOW).planned
    expect(p.kind).toBe('rent_due_soon')
    expect(p.dayDelta).toBe(2)
  })

  it('plans due-soon on the due date itself', () => {
    const [p] = planReminders([row({ dueDay: 10 })], NOW).planned
    expect(p.kind).toBe('rent_due_soon')
    expect(p.dayDelta).toBe(0)
  })

  it('plans overdue once the due date has passed', () => {
    const [p] = planReminders([row({ dueDay: 5 })], NOW).planned
    expect(p.kind).toBe('rent_overdue')
    expect(p.dayDelta).toBe(-5)
  })

  it('plans nothing when the due date is beyond the reminder window', () => {
    const { planned, skipped } = planReminders([row({ dueDay: 10 + REMIND_DAYS_BEFORE + 1 })], NOW)
    expect(planned).toHaveLength(0)
    expect(skipped.not_in_window).toBe(1)
  })

  it('clamps a due day above 28 rather than rolling into next month', () => {
    // Clock set to 27 Sep so the clamped due date (28 Sep) is inside the window;
    // otherwise nothing is planned and there is no dueDate to inspect.
    const sep27 = new Date(2026, 8, 27, 12, 0)
    const [p] = planReminders([row({ dueDay: 31, month: '2026-09-01' })], sep27).planned
    expect(p.dueDate.getMonth()).toBe(8) // still September
    expect(p.dueDate.getDate()).toBe(28)
    expect(p.dayDelta).toBe(1)
  })
})

describe('planReminders — timezone', () => {
  it('judges "today" by the tenant\'s calendar, not the server\'s', () => {
    // 10 Sep 22:00 UTC. In Auckland (UTC+12/13) it is already 11 Sep.
    const lateUtc = new Date(Date.UTC(2026, 8, 10, 22, 0))
    const nz = planReminders([row({ dueDay: 10, tz: 'Pacific/Auckland' })], lateUtc).planned[0]
    const utc = planReminders([row({ dueDay: 10, tz: 'UTC' })], lateUtc).planned[0]
    expect(utc.kind).toBe('rent_due_soon') // due today in UTC
    expect(nz.kind).toBe('rent_overdue')   // already past it in NZ
  })

  it('falls back to UTC for a missing or invalid zone rather than throwing', () => {
    expect(() => planReminders([row({ tz: null })], NOW)).not.toThrow()
    expect(() => planReminders([row({ tz: 'Not/AZone' })], NOW)).not.toThrow()
    expect(localToday('Not/AZone', NOW).getFullYear()).toBe(2026)
  })
})

describe('planReminders — skips', () => {
  it('skips a payment with no tenant email, and counts why', () => {
    const { planned, skipped } = planReminders([row({ email: null })], NOW)
    expect(planned).toHaveLength(0)
    expect(skipped.no_tenant_email).toBe(1)
  })

  it('skips a row with no tenant at all', () => {
    const r = row({}); r.rental!.tenant = null
    const { planned, skipped } = planReminders([r], NOW)
    expect(planned).toHaveLength(0)
    expect(skipped.no_tenant).toBe(1)
  })

  it('sums late fees into the total and reports them separately', () => {
    const rows = [row({ month: '2026-07-01', amount: 100, late_fee: 5 }), row({ month: '2026-08-01', amount: 100, late_fee: 5 })]
    const [p] = planReminders(rows, NOW).planned
    expect(p.totalDue).toBe(210)
    expect(p.totalFee).toBe(10)
  })
})
