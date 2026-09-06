// ─── Month labels, in the viewer's language ───────────────────────────────────
//
// The dashboard carried `const MONTHS = ['Jan','Feb', …]` and built every period
// label from it. That is English regardless of the account's locale — a landlord
// in Montréal or Madrid sees "Sep 2026" in a product that otherwise formats their
// currency and dates correctly. Intl.DateTimeFormat already knows every language's
// month names; this replaces the array with it.
//
// The input shape is deliberately the one the database uses: `rent_payments.month`
// is a DATE holding the first of the month, so callers pass 'YYYY-MM-01' (or
// 'YYYY-MM'). Parsed by hand rather than via `new Date(string)`, because an ISO
// date-only string is interpreted as UTC midnight, which in any timezone west of
// Greenwich is the previous day — and therefore, on the 1st, the previous MONTH.

/** "Sep 2026", "sept. 2026", "2026年9月" — per locale. */
export function monthLabel(ym: string | null | undefined, locale: string = 'en', style: MonthStyle = 'short'): string {
  if (!ym) return ''
  const m = /^(\d{4})-(\d{2})/.exec(ym)
  if (!m) return ''
  const year = Number(m[1])
  const monthIndex = Number(m[2]) - 1
  if (monthIndex < 0 || monthIndex > 11) return ''
  return formatMonthYear(new Date(year, monthIndex, 1), locale, style)
}

/** Same label from a Date, using its LOCAL month. */
/** 'short' for ledger rows ('Sep 2026'); 'long' where there is room and it is read once, like an email ('September 2026'). */
export type MonthStyle = 'short' | 'long'

export function formatMonthYear(d: Date, locale: string = 'en', style: MonthStyle = 'short'): string {
  try {
    return new Intl.DateTimeFormat(locale, { month: style, year: 'numeric' }).format(d)
  } catch {
    // An unknown locale tag must not take down a ledger row.
    return new Intl.DateTimeFormat('en', { month: style, year: 'numeric' }).format(d)
  }
}
