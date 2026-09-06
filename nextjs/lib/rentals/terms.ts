// ─── Rental term calculations ─────────────────────────────────────────────────
//
// Pure business logic, extracted from app/dashboard/page.tsx so it can be read and
// tested on its own. These decide what a tenant owes and when a lease turns over,
// which makes them the least appropriate code in the product to leave buried in a
// 4,500-line component with no coverage.
//
// Everything here takes its inputs explicitly and reads no global state. Dates are
// compared in the local calendar, consistent with lib/date/calendar.ts — see the
// note there on why UTC is the wrong frame for a product used in every timezone.

export interface RentalTerms {
  monthly_rent: number | string
  late_fee_percent?: number | string | null
  start_date?: string | null
  end_date?: string | null
}

/** Late fee charged on overdue rent, in the rental's currency. */
export function computeLateFee(rental: RentalTerms): number {
  const rent = Number(rental.monthly_rent)
  if (!Number.isFinite(rent) || rent <= 0) return 0

  // `|| 5` rather than `?? 5` is deliberate and load-bearing: a stored 0 means
  // "this landlord charges no late fee", but it is also falsy, so `|| 5` would
  // turn a waived fee into 5%. Handled explicitly instead.
  const raw = rental.late_fee_percent
  const percent = raw === null || raw === undefined || raw === '' ? 5 : Number(raw)
  if (!Number.isFinite(percent) || percent <= 0) return 0

  // Rounded to a whole unit. Fees are shown on a receipt a tenant may present to
  // an employer or a court, so a trailing fraction of a paisa helps nobody.
  return Math.round(rent * (percent / 100))
}

/**
 * Days until the lease ends, or null when there is no end date or it has passed.
 * Counts calendar days, so a lease ending tomorrow reads as 1 regardless of the
 * hour it is checked.
 */
export function leaseExpiryDays(rental: RentalTerms, now: Date = new Date()): number | null {
  if (!rental.end_date) return null
  const end = new Date(rental.end_date)
  if (Number.isNaN(end.getTime())) return null
  const days = Math.ceil((end.getTime() - now.getTime()) / 86_400_000)
  return days >= 0 ? days : null
}

/**
 * Days until the next anniversary of the lease start, when that falls within the
 * next 90 days — the window in which a landlord would want to raise rent.
 * Null outside that window, or without a start date.
 */
export function escalationDueDays(rental: RentalTerms, now: Date = new Date()): number | null {
  if (!rental.start_date) return null
  const start = new Date(rental.start_date)
  if (Number.isNaN(start.getTime())) return null

  const anniversary = new Date(start)
  anniversary.setFullYear(now.getFullYear())
  // Already gone this year, so the next one is next year.
  if (anniversary <= now) anniversary.setFullYear(anniversary.getFullYear() + 1)

  const days = Math.ceil((anniversary.getTime() - now.getTime()) / 86_400_000)
  return days <= 90 ? days : null
}

// ─── Renter score bands ───────────────────────────────────────────────────────

export type ScoreBandLabel = 'EXCELLENT' | 'TRUSTED' | 'GOOD' | 'FAIR' | 'BUILDING'

/** Roughly what one on-time payment is worth, used for the "how far away" copy. */
export const POINTS_PER_ON_TIME_PAYMENT = 12

export function scoreBand(score: number): { label: ScoreBandLabel; color: string } {
  if (score >= 850) return { label: 'EXCELLENT', color: 'var(--rb-action)' }
  if (score >= 750) return { label: 'TRUSTED', color: 'var(--rb-action)' }
  if (score >= 650) return { label: 'GOOD', color: 'var(--rb-accent)' }
  if (score >= 550) return { label: 'FAIR', color: 'var(--rb-accent)' }
  return { label: 'BUILDING', color: 'var(--rb-ink-3)' }
}

/** Months of on-time payments needed to reach `target`, never less than 1. */
export function monthsToReach(score: number, target: number): number {
  return Math.max(1, Math.ceil((target - score) / POINTS_PER_ON_TIME_PAYMENT))
}

export function scoreNudge(score: number): string {
  if (score >= 850) return 'Excellent! Keep paying on time to maintain your top rating.'
  if (score >= 750) {
    const n = monthsToReach(score, 850)
    return `Pay on time for ${n} more month${n === 1 ? '' : 's'} to reach Excellent (850+).`
  }
  if (score >= 650) {
    return `${monthsToReach(score, 750)} more on-time payments to reach Trusted (750+).`
  }
  return `Each on-time payment adds ~${POINTS_PER_ON_TIME_PAYMENT} points. You need ${monthsToReach(score, 650)} more months to reach Good (650+).`
}
