// ─── Relative day labels, in the viewer's language ────────────────────────────
//
// The dashboard's activity feed and payment rows say "Today at 3:40 pm",
// "Yesterday at …", "Tue at …", "5 Sep at …". Those first two words were English
// string literals in a product that formats everything else for the viewer's
// locale. Intl.RelativeTimeFormat with numeric: 'auto' gives "today" / "yesterday"
// in every language it knows; the weekday and short date come from
// Intl.DateTimeFormat as they already did.
//
// Day arithmetic is calendar-based, not elapsed-hours: something logged at 23:00
// is "yesterday" at 08:00 the next morning even though nine hours have passed.
// That is lib/date/calendar's calendarDaysBetween; this only adds the words.

import { calendarDaysBetween } from './calendar'

function safe<T>(fn: () => T, fallback: () => T): T {
  try { return fn() } catch { return fallback() }
}

/** "3:40 pm" / "15:40" per locale conventions. */
export function formatTime(d: Date, locale: string): string {
  return safe(
    () => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(d),
    () => new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(d),
  )
}

/**
 * "Today", "Yesterday", "Tue", "5 Sep" — the day part only, localized.
 *
 * `daysAgo` is a calendar-day difference (0 = same day). Beyond a week the short
 * date is used; relative words for "8 days ago" read as fuzz, not precision.
 */
export function relativeDayLabel(d: Date, daysAgo: number, locale: string): string {
  if (daysAgo === 0 || daysAgo === 1) {
    // numeric:'auto' is what turns "-1 day" into the word "yesterday".
    const rtf = safe(
      () => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }),
      () => new Intl.RelativeTimeFormat('en', { numeric: 'auto' }),
    )
    const word = rtf.format(-daysAgo, 'day')
    // Sentence-case the leading letter so it sits at the start of the label.
    // toLocaleUpperCase itself throws on a malformed tag -- the test for an
    // unknown locale found that after the constructor was already guarded.
    const first = safe(() => word.charAt(0).toLocaleUpperCase(locale), () => word.charAt(0).toUpperCase())
    return first + word.slice(1)
  }
  if (daysAgo > 1 && daysAgo < 7) {
    return safe(
      () => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d),
      () => new Intl.DateTimeFormat('en', { weekday: 'short' }).format(d),
    )
  }
  return safe(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(d),
    () => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(d),
  )
}

/**
 * Full label as the dashboard renders it: "<day> at <time>".
 *
 * "at" is the one word left in English here. Joining a day and a time is itself
 * locale-specific and Intl has no primitive for it; this keeps the visible
 * improvement (the day words) without inventing grammar for languages I cannot
 * verify. When real translations arrive, this is the single place to change it.
 */
export function relativeDateTime(iso: string | null | undefined, locale: string, now: Date = new Date()): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const daysAgo = calendarDaysBetween(now, d)
  const day = relativeDayLabel(d, daysAgo, locale)
  return `${day} at ${formatTime(d, locale)}`
}
