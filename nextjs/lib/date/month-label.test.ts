import { describe, it, expect } from 'vitest'
import { monthLabel, formatMonthYear } from './month-label'

// Replaces a hardcoded English MONTHS array in the dashboard. Two things matter:
// the label follows the locale, and the parse never drifts a month because of UTC.

describe('monthLabel', () => {
  it('labels the DB shape (YYYY-MM-01) in English by default', () => {
    expect(monthLabel('2026-09-01')).toBe('Sep 2026')
  })

  it('accepts YYYY-MM too', () => {
    expect(monthLabel('2026-01')).toBe('Jan 2026')
  })

  it('follows the locale', () => {
    // Exact forms vary by ICU build; assert the month is NOT the English abbreviation.
    expect(monthLabel('2026-09-01', 'fr')).not.toBe('Sep 2026')
    expect(monthLabel('2026-09-01', 'fr')).toMatch(/2026/)
    expect(monthLabel('2026-09-01', 'de')).toMatch(/2026/)
  })

  it('never drifts into the previous month on the 1st (no UTC parse)', () => {
    // `new Date('2026-09-01')` is UTC midnight, which is 31 Aug in the Americas.
    // The parser here is local-calendar, so September stays September everywhere.
    expect(monthLabel('2026-09-01')).toContain('Sep')
    expect(monthLabel('2026-01-01')).toContain('Jan')
  })

  it('returns empty for missing or malformed input rather than "Invalid Date"', () => {
    expect(monthLabel(null)).toBe('')
    expect(monthLabel(undefined)).toBe('')
    expect(monthLabel('')).toBe('')
    expect(monthLabel('not-a-month')).toBe('')
    expect(monthLabel('2026-13-01')).toBe('')
  })

  it('falls back to English for an unknown locale tag instead of throwing', () => {
    expect(() => monthLabel('2026-09-01', 'xx-INVALID-@@')).not.toThrow()
  })
})

describe('formatMonthYear', () => {
  it('uses the local month of the Date', () => {
    expect(formatMonthYear(new Date(2026, 8, 15))).toBe('Sep 2026')
  })
})

describe('long style', () => {
  it('spells the month out for surfaces read once, like email', () => {
    expect(monthLabel('2026-09-01', 'en', 'long')).toBe('September 2026')
    expect(monthLabel('2026-09-01', 'fr', 'long').toLowerCase()).toMatch(/septembre 2026/)
    expect(monthLabel('2026-09-01', 'en')).toBe('Sep 2026')
  })
})
