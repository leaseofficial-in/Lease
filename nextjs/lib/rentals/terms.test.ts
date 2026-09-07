import { describe, it, expect } from 'vitest'
import {
  computeLateFee,
  leaseExpiryDays,
  escalationDueDays,
  scoreBand,
  monthsToReach,
  scoreNudge,
  renterScore,
} from './terms'

describe('computeLateFee', () => {
  it('charges the configured percentage of monthly rent', () => {
    expect(computeLateFee({ monthly_rent: 8000, late_fee_percent: 5 })).toBe(400)
    expect(computeLateFee({ monthly_rent: 25000, late_fee_percent: 3 })).toBe(750)
  })

  it('treats a stored 0 as a waived fee, not as "use the default"', () => {
    // The regression this file exists for. The original was
    //   Number(rental.late_fee_percent || 5)
    // so a landlord who deliberately set 0 had 5% charged to their tenant anyway
    // — and computeLateFee WRITES to rent_payments.late_fee, so that lands on a
    // real ledger. 12 of 52 live rentals have late_fee_percent = 0.00.
    expect(computeLateFee({ monthly_rent: 8000, late_fee_percent: 0 })).toBe(0)
    expect(computeLateFee({ monthly_rent: 8000, late_fee_percent: '0.00' })).toBe(0)
  })

  it('falls back to 5% only when the value is genuinely absent', () => {
    expect(computeLateFee({ monthly_rent: 8000 })).toBe(400)
    expect(computeLateFee({ monthly_rent: 8000, late_fee_percent: null })).toBe(400)
    expect(computeLateFee({ monthly_rent: 8000, late_fee_percent: '' })).toBe(400)
  })

  it('accepts the string forms Postgres numerics arrive as', () => {
    expect(computeLateFee({ monthly_rent: '8000.00', late_fee_percent: '5.00' })).toBe(400)
  })

  it('rounds to a whole currency unit', () => {
    // A fee can appear on a receipt shown to an employer or a court; a trailing
    // fraction helps nobody.
    expect(computeLateFee({ monthly_rent: 8333, late_fee_percent: 5 })).toBe(417)
  })

  it('never returns a negative or nonsensical fee', () => {
    expect(computeLateFee({ monthly_rent: 0, late_fee_percent: 5 })).toBe(0)
    expect(computeLateFee({ monthly_rent: -8000, late_fee_percent: 5 })).toBe(0)
    expect(computeLateFee({ monthly_rent: 8000, late_fee_percent: -5 })).toBe(0)
    expect(computeLateFee({ monthly_rent: 'not a number', late_fee_percent: 5 })).toBe(0)
  })
})

describe('leaseExpiryDays', () => {
  const now = new Date(2026, 8, 6, 12, 0)

  it('counts days until the lease ends', () => {
    expect(leaseExpiryDays({ monthly_rent: 1, end_date: '2026-09-16' }, now)).toBe(10)
  })

  it('is null once the end date has passed', () => {
    expect(leaseExpiryDays({ monthly_rent: 1, end_date: '2026-08-01' }, now)).toBeNull()
  })

  it('is null without an end date, and for an unparseable one', () => {
    expect(leaseExpiryDays({ monthly_rent: 1 }, now)).toBeNull()
    expect(leaseExpiryDays({ monthly_rent: 1, end_date: 'whenever' }, now)).toBeNull()
  })
})

describe('escalationDueDays', () => {
  const now = new Date(2026, 8, 6, 12, 0)

  it('reports the next anniversary when it falls inside the 90-day window', () => {
    // Started 1 Nov, so the anniversary is ~56 days out from 6 Sep.
    const days = escalationDueDays({ monthly_rent: 1, start_date: '2025-11-01' }, now)
    expect(days).toBeGreaterThan(0)
    expect(days).toBeLessThanOrEqual(90)
  })

  it('is null when the anniversary is further out than 90 days', () => {
    expect(escalationDueDays({ monthly_rent: 1, start_date: '2025-03-01' }, now)).toBeNull()
  })

  it('rolls to next year when this year’s anniversary has already passed', () => {
    // Started 1 Aug; 1 Aug 2026 is behind us, so it must look to 2027 and
    // therefore fall outside the window rather than returning a negative.
    const days = escalationDueDays({ monthly_rent: 1, start_date: '2024-08-01' }, now)
    expect(days === null || days > 0).toBe(true)
  })

  it('is null without a start date, and for an unparseable one', () => {
    expect(escalationDueDays({ monthly_rent: 1 }, now)).toBeNull()
    expect(escalationDueDays({ monthly_rent: 1, start_date: 'sometime' }, now)).toBeNull()
  })
})

describe('scoreBand', () => {
  it('places scores in the right band, inclusive at each boundary', () => {
    expect(scoreBand(900).label).toBe('EXCELLENT')
    expect(scoreBand(850).label).toBe('EXCELLENT')
    expect(scoreBand(849).label).toBe('TRUSTED')
    expect(scoreBand(750).label).toBe('TRUSTED')
    expect(scoreBand(749).label).toBe('GOOD')
    expect(scoreBand(650).label).toBe('GOOD')
    expect(scoreBand(649).label).toBe('FAIR')
    expect(scoreBand(550).label).toBe('FAIR')
    expect(scoreBand(549).label).toBe('BUILDING')
    expect(scoreBand(0).label).toBe('BUILDING')
  })
})

describe('monthsToReach / scoreNudge', () => {
  it('never promises a target is reachable in zero months', () => {
    expect(monthsToReach(849, 850)).toBe(1)
    expect(monthsToReach(850, 850)).toBe(1)
  })

  it('singularises one month', () => {
    expect(scoreNudge(845)).toContain('1 more month to reach')
    expect(scoreNudge(845)).not.toContain('1 more months')
  })

  it('pluralises more than one', () => {
    expect(scoreNudge(760)).toMatch(/\d+ more months to reach/)
  })

  it('congratulates at the top band rather than nudging', () => {
    expect(scoreNudge(880)).toContain('Excellent!')
  })
})

describe('renterScore', () => {
  const base = { paidMonths: 0, overdueMonths: 0, hasMoveInProof: false, openRepairs: 1 }

  it('starts at the base the screen promises', () => {
    expect(renterScore(base)).toBe(700)
  })

  it('adds the points the screen says each thing is worth', () => {
    expect(renterScore({ ...base, paidMonths: 3 })).toBe(700 + 36)
    expect(renterScore({ ...base, hasMoveInProof: true })).toBe(750)
    expect(renterScore({ ...base, openRepairs: 0 })).toBe(720)
    expect(renterScore({ ...base, overdueMonths: 2 })).toBe(640)
  })

  it('caps the on-time contribution, as the screen now states', () => {
    // 13 months would be 156 without the cap.
    expect(renterScore({ ...base, paidMonths: 13 })).toBe(700 + 150)
    expect(renterScore({ ...base, paidMonths: 100 })).toBe(700 + 150)
  })

  it('never leaves the 300-900 range', () => {
    expect(renterScore({ paidMonths: 60, overdueMonths: 0, hasMoveInProof: true, openRepairs: 0 })).toBe(900)
    expect(renterScore({ ...base, overdueMonths: 40 })).toBe(300)
  })

  it('treats nonsense input as zero rather than reversing the sign', () => {
    expect(renterScore({ ...base, paidMonths: -5 })).toBe(700)
    expect(renterScore({ ...base, overdueMonths: -5 })).toBe(700)
  })
})
