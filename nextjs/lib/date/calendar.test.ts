import { describe, it, expect } from 'vitest'
import { localMonth, localMonthStart, startOfLocalDay, calendarDaysBetween } from './calendar'

// These tests construct dates with the LOCAL constructor (year, monthIndex, day,
// hour) rather than ISO strings, because the whole point of the helpers is that
// they follow the viewer's local calendar. A `new Date(y, m, d)` is by definition
// local midnight in whatever zone the test runs in, so the assertions hold on a
// developer machine in IST and on a CI runner in UTC alike.
//
// The UTC-boundary tests below are the regression guard for the real bug: the
// dashboard used to derive the current month from toISOString(), which is what
// misfiled rent payments for anyone not sitting exactly on UTC.

describe('localMonth', () => {
  it('formats a mid-month date as YYYY-MM', () => {
    expect(localMonth(new Date(2026, 8, 6, 12, 0))).toBe('2026-09')
  })

  it('zero-pads single-digit months', () => {
    expect(localMonth(new Date(2026, 0, 15, 12, 0))).toBe('2026-01')
    expect(localMonth(new Date(2026, 8, 15, 12, 0))).toBe('2026-09')
  })

  it('uses the local month at 00:30 on the 1st, not the UTC one', () => {
    // The regression: east of UTC, toISOString() on this instant still reports
    // the PREVIOUS month. Local getters must report September.
    const justAfterLocalMidnight = new Date(2026, 8, 1, 0, 30)
    expect(localMonth(justAfterLocalMidnight)).toBe('2026-09')
  })

  it('uses the local month at 23:30 on the last day, not the UTC one', () => {
    // The mirror case: west of UTC, toISOString() on this instant already reports
    // the NEXT month. Local getters must still report September.
    const justBeforeLocalMidnight = new Date(2026, 8, 30, 23, 30)
    expect(localMonth(justBeforeLocalMidnight)).toBe('2026-09')
  })

  it('rolls the year over correctly at the December boundary', () => {
    expect(localMonth(new Date(2026, 11, 31, 23, 59))).toBe('2026-12')
    expect(localMonth(new Date(2027, 0, 1, 0, 1))).toBe('2027-01')
  })
})

describe('localMonthStart', () => {
  it('returns the first of the local month, the key rent_payments.month uses', () => {
    expect(localMonthStart(new Date(2026, 8, 17, 9, 0))).toBe('2026-09-01')
  })

  it('still returns this month on the 1st just after local midnight', () => {
    expect(localMonthStart(new Date(2026, 8, 1, 0, 30))).toBe('2026-09-01')
  })
})

describe('startOfLocalDay', () => {
  it('collapses any time on a day to that day local midnight', () => {
    const morning = startOfLocalDay(new Date(2026, 8, 6, 7, 15))
    const night = startOfLocalDay(new Date(2026, 8, 6, 23, 45))
    expect(morning).toBe(night)
    expect(new Date(morning).getHours()).toBe(0)
  })
})

describe('calendarDaysBetween', () => {
  it('is 0 within the same calendar day', () => {
    expect(calendarDaysBetween(new Date(2026, 8, 6, 23, 0), new Date(2026, 8, 6, 1, 0))).toBe(0)
  })

  it('is 1 across midnight even when under 24 hours have passed', () => {
    // 23:00 yesterday read at 08:00 today: nine hours elapsed, but one calendar day.
    const loggedLastNight = new Date(2026, 8, 5, 23, 0)
    const readThisMorning = new Date(2026, 8, 6, 8, 0)
    expect(calendarDaysBetween(readThisMorning, loggedLastNight)).toBe(1)
  })

  it('is not 1 for a 23-hour span inside a single day pair', () => {
    // 01:00 today vs 00:00 today -> same day, despite being a long gap from
    // yesterday. Guards against the old elapsed-milliseconds implementation.
    expect(calendarDaysBetween(new Date(2026, 8, 6, 1, 0), new Date(2026, 8, 6, 0, 0))).toBe(0)
  })

  it('counts across a month boundary', () => {
    expect(calendarDaysBetween(new Date(2026, 9, 1, 6, 0), new Date(2026, 8, 29, 20, 0))).toBe(2)
  })

  it('goes negative for future dates', () => {
    expect(calendarDaysBetween(new Date(2026, 8, 6), new Date(2026, 8, 9))).toBe(-3)
  })
})
