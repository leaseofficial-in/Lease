import { describe, it, expect } from 'vitest'
import { relativeDayLabel, relativeDateTime, formatTime } from './relative'

// Replaces English literals ("Today at", "Yesterday at") in the dashboard's
// activity and payment rows with Intl output. Local-constructor dates throughout,
// so these hold in any test-runner timezone.

const NOW = new Date(2026, 8, 10, 9, 0) // Thu 10 Sep 2026, 09:00 local

describe('relativeDayLabel', () => {
  it('says Today / Yesterday in English', () => {
    expect(relativeDayLabel(NOW, 0, 'en')).toBe('Today')
    expect(relativeDayLabel(new Date(2026, 8, 9, 23, 0), 1, 'en')).toBe('Yesterday')
  })

  it('says it in the viewer\'s language', () => {
    expect(relativeDayLabel(NOW, 0, 'fr').toLowerCase()).toMatch(/aujourd/)
    expect(relativeDayLabel(NOW, 1, 'de').toLowerCase()).toBe('gestern')
    expect(relativeDayLabel(NOW, 0, 'es').toLowerCase()).toBe('hoy')
  })

  it('uses a short weekday inside the week', () => {
    const tue = new Date(2026, 8, 8) // Tue 8 Sep
    expect(relativeDayLabel(tue, 2, 'en')).toBe('Tue')
    expect(relativeDayLabel(tue, 2, 'fr').toLowerCase()).toMatch(/^mar/)
  })

  it('falls back to a short date beyond a week', () => {
    const d = new Date(2026, 8, 1)
    expect(relativeDayLabel(d, 9, 'en')).toMatch(/1 Sep|Sep 1/)
  })

  it('never throws for an unknown locale', () => {
    expect(() => relativeDayLabel(NOW, 0, 'xx-NOPE-@')).not.toThrow()
    expect(relativeDayLabel(NOW, 0, 'xx-NOPE-@')).toBe('Today')
  })
})

describe('relativeDateTime', () => {
  it('reads "Yesterday at <time>" across midnight even under 24h elapsed', () => {
    // 23:00 last night, read at 09:00: ten hours, but a different calendar day.
    const iso = new Date(2026, 8, 9, 23, 0).toISOString()
    expect(relativeDateTime(iso, 'en', NOW)).toMatch(/^Yesterday at /)
  })

  it('reads "Today at <time>" for the same calendar day', () => {
    const iso = new Date(2026, 8, 10, 1, 15).toISOString()
    expect(relativeDateTime(iso, 'en', NOW)).toMatch(/^Today at /)
  })

  it('returns empty for missing or invalid input', () => {
    expect(relativeDateTime(null, 'en', NOW)).toBe('')
    expect(relativeDateTime(undefined, 'en', NOW)).toBe('')
    expect(relativeDateTime('garbage', 'en', NOW)).toBe('')
  })
})

describe('formatTime', () => {
  it('follows locale hour conventions', () => {
    const d = new Date(2026, 8, 10, 15, 40)
    expect(formatTime(d, 'en-US')).toMatch(/3:40/)
    expect(formatTime(d, 'en-GB')).toMatch(/15:40/)
  })
})
