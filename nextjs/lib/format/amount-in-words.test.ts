import { describe, it, expect } from 'vitest'
import { amountInWords } from './amount-in-words'

describe('amountInWords', () => {
  it('returns an empty string for non-positive or invalid input', () => {
    expect(amountInWords(0)).toBe('')
    expect(amountInWords(-5)).toBe('')
    expect(amountInWords(Number.NaN)).toBe('')
    expect(amountInWords(Number.POSITIVE_INFINITY)).toBe('')
  })

  it('handles units and teens', () => {
    expect(amountInWords(7)).toBe('Seven')
    expect(amountInWords(15)).toBe('Fifteen')
    expect(amountInWords(19)).toBe('Nineteen')
  })

  it('handles tens, including exact multiples', () => {
    expect(amountInWords(20)).toBe('Twenty')
    expect(amountInWords(40)).toBe('Forty')
    expect(amountInWords(99)).toBe('Ninety Nine')
  })

  it('handles hundreds without emitting a trailing remainder', () => {
    expect(amountInWords(100)).toBe('One Hundred')
    expect(amountInWords(118)).toBe('One Hundred Eighteen')
    expect(amountInWords(900)).toBe('Nine Hundred')
  })

  it('handles thousands, the common rent range', () => {
    expect(amountInWords(1_000)).toBe('One Thousand')
    expect(amountInWords(18_000)).toBe('Eighteen Thousand')
    expect(amountInWords(25_500)).toBe('Twenty Five Thousand Five Hundred')
  })

  // The ₹1 lakh mark is the PAN threshold on HRA receipts, so these boundaries matter.
  it('handles lakhs using the Indian numbering system', () => {
    expect(amountInWords(100_000)).toBe('One Lakh')
    expect(amountInWords(112_500)).toBe('One Lakh Twelve Thousand Five Hundred')
    expect(amountInWords(1_000_000)).toBe('Ten Lakh')
    expect(amountInWords(9_999_999)).toBe(
      'Ninety Nine Lakh Ninety Nine Thousand Nine Hundred Ninety Nine',
    )
  })

  it('handles crores', () => {
    expect(amountInWords(10_000_000)).toBe('One Crore')
    expect(amountInWords(12_345_678)).toBe(
      'One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight',
    )
  })

  it('floors fractional rupees rather than rendering paise', () => {
    expect(amountInWords(18_000.99)).toBe('Eighteen Thousand')
  })

  it('never emits an empty scale group when the remainder is zero', () => {
    // Regression guard: a naive implementation renders 100000 as "One Lakh Thousand",
    // emitting a scale word with no digits in front of it. Note that ending on a
    // scale word is correct ("One Lakh"); two adjacent scale words is the bug.
    const SCALE = /(Thousand|Lakh|Crore)\s+(Thousand|Lakh|Crore)/
    for (const n of [100_000, 200_000, 10_000_000, 20_000_000, 1_000, 5_000, 10_00_000]) {
      const words = amountInWords(n)
      expect(words).not.toMatch(SCALE)
      expect(words).not.toMatch(/\s{2,}/)
      expect(words.trim()).toBe(words)
    }
  })
})
