import { describe, it, expect } from 'vitest'
import { prefillFrom } from './hra-receipt-generator'

// The tenant dashboard links here with the details it already holds, so this
// parses text from a URL into a document someone will hand to their employer.
// Anything it cannot vouch for has to fall back rather than render.

const q = (s: string) => new URLSearchParams(s)

describe('prefillFrom', () => {
  it('returns the empty form when there is no query string', () => {
    const empty = prefillFrom(null)
    expect(empty.tenantName).toBe('')
    expect(empty.amount).toBe('')
    expect(empty.landlordPan).toBe('')
  })

  it('carries through what the dashboard sends', () => {
    const f = prefillFrom(q('tenantName=Aarav+Shah&landlordName=Priya&landlordPan=abcde1234f&month=September&year=2026&amount=22000&method=UPI+Transfer&utr=UTR123'))
    expect(f.tenantName).toBe('Aarav Shah')
    expect(f.landlordName).toBe('Priya')
    expect(f.landlordPan).toBe('ABCDE1234F')   // PAN is upper-case by definition
    expect(f.month).toBe('September')
    expect(f.year).toBe('2026')
    expect(f.amount).toBe('22000')
    expect(f.method).toBe('UPI Transfer')
    expect(f.utr).toBe('UTR123')
  })

  it('rejects a month or method it does not recognise', () => {
    const f = prefillFrom(q('month=Septober&method=Suitcase+of+cash'))
    expect(f.month).toBe(prefillFrom(null).month)
    expect(f.method).toBe('UPI Transfer')
  })

  it('keeps only digits in the amount, and a four-digit year', () => {
    expect(prefillFrom(q('amount=%E2%82%B922%2C000.50')).amount).toBe('2200050')
    expect(prefillFrom(q('year=20xx')).year).toBe(prefillFrom(null).year)
    expect(prefillFrom(q('year=1999')).year).toBe('1999')
  })

  it('caps every free-text field so a long URL cannot blow up the receipt', () => {
    const long = 'x'.repeat(500)
    const f = prefillFrom(q(`tenantName=${long}&landlordName=${long}&address=${long}&utr=${long}`))
    expect(f.tenantName).toHaveLength(80)
    expect(f.landlordName).toHaveLength(80)
    expect(f.address).toHaveLength(200)
    expect(f.utr).toHaveLength(40)
  })

  it('does not invent values for keys that were not sent', () => {
    const f = prefillFrom(q('tenantName=Aarav'))
    expect(f.landlordName).toBe('')
    expect(f.address).toBe('')
    expect(f.amount).toBe('')
  })
})
