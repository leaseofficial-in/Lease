// ─── Local-calendar date helpers ──────────────────────────────────────────────
//
// RentyBase runs in every timezone its landlords and tenants live in, so every
// date boundary here is the VIEWER'S local calendar, never UTC.
//
// The dashboard previously derived the current month from `new Date().toISOString()`.
// That is UTC, and it is wrong in both directions:
//
//   - East of UTC, the early hours of the 1st still read as the previous month.
//     In IST (UTC+5:30) that is a five-and-a-half hour window every month.
//   - West of UTC, the closing hours of a month already read as the next one.
//     In US Pacific (UTC-8) that is the last eight hours of every month.
//
// That mattered beyond cosmetics: the value is written as `rent_payments.month`,
// so a tenant who paid inside the window filed their rent against the wrong month
// and the row silently failed to line up with the one the landlord was expecting.
//
// These helpers are pure and take an explicit `Date` so they can be tested against
// fixed instants rather than whatever the clock happens to say.

/**
 * The local calendar month of `d`, as `YYYY-MM`.
 *
 * Uses getFullYear/getMonth (local) rather than the UTC getters behind
 * toISOString(), so the month rolls over at the viewer's midnight.
 */
export function localMonth(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * The first day of `d`'s local calendar month, as `YYYY-MM-01`.
 *
 * This is the canonical key for a rent period: `rent_payments.month` is a date
 * column holding the first of the month.
 */
export function localMonthStart(d: Date = new Date()): string {
  return `${localMonth(d)}-01`
}

/**
 * Midnight local time on `d`'s calendar day, in epoch milliseconds.
 *
 * Comparing these instead of raw timestamps is what makes "yesterday" mean the
 * previous calendar day rather than "between 24 and 48 hours ago".
 */
export function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/**
 * Whole calendar days between two instants — positive when `from` is later.
 *
 * An event logged at 23:00 is one day ago when read at 08:00 the next morning,
 * even though only nine hours have elapsed.
 */
export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((startOfLocalDay(from) - startOfLocalDay(to)) / 86_400_000)
}
