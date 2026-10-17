import { describe, expect, it } from 'vitest'
import { isValidVpa, phoneForStorage, phoneForWhatsApp, receiptMessage, reminderMessage, rentShareUrl, upiPayUrl, whatsAppUrl } from './share'

describe('phoneForWhatsApp', () => {
  it('adds the dial code to a local Indian number', () => {
    expect(phoneForWhatsApp('98765 43210', '+91', [10])).toBe('919876543210')
  })
  it('keeps a number that already has the country code', () => {
    expect(phoneForWhatsApp('+91 98765 43210', '+91', [10])).toBe('919876543210')
  })
  it('drops a trunk zero', () => {
    expect(phoneForWhatsApp('09876543210', '+91', [10])).toBe('919876543210')
  })
  it('refuses something that is not a phone number', () => {
    expect(phoneForWhatsApp('123', '+91', [10])).toBeNull()
    expect(phoneForWhatsApp('', '+91', [10])).toBeNull()
    expect(phoneForWhatsApp(null, '+91', [10])).toBeNull()
  })
  it('stores with a plus, matching the database check', () => {
    expect(phoneForStorage('9876543210', '+91', [10])).toBe('+919876543210')
    expect(phoneForStorage('abc', '+91', [10])).toBeNull()
  })
})

describe('messages', () => {
  const base = { tenantName: 'Ravi Kumar', propertyName: '2BHK Bandra', amount: '₹12,000', month: 'Oct 2026', url: rentShareUrl('a'.repeat(32)) }
  it('greets by first name and carries the link', () => {
    const msg = reminderMessage(base)
    expect(msg).toContain('Hi Ravi,')
    expect(msg).toContain('₹12,000 for Oct 2026 (2BHK Bandra)')
    expect(msg).toContain('https://rentybase.com/rent/' + 'a'.repeat(32))
  })
  it('falls back when there is no name', () => {
    expect(receiptMessage({ ...base, tenantName: '' })).toMatch(/^Hi there,/)
  })
  it('encodes the text into the wa.me link, with or without a number', () => {
    expect(whatsAppUrl('a b&c', '919876543210')).toBe('https://wa.me/919876543210?text=a%20b%26c')
    expect(whatsAppUrl('x')).toBe('https://wa.me/?text=x')
  })
})

describe('upiPayUrl', () => {
  it('builds a pay link with amount and note', () => {
    const u = upiPayUrl({ vpa: 'akhil@okhdfc', payeeName: 'Akhil M', amount: 12000, note: 'Rent Oct 2026' })!
    expect(u.startsWith('upi://pay?')).toBe(true)
    const q = new URLSearchParams(u.slice('upi://pay?'.length))
    expect(q.get('pa')).toBe('akhil@okhdfc')
    expect(q.get('am')).toBe('12000.00')
    expect(q.get('cu')).toBe('INR')
    expect(q.get('tn')).toBe('Rent Oct 2026')
  })
  it('offers nothing without a valid VPA or amount', () => {
    expect(upiPayUrl({ vpa: '', amount: 100, note: 'x' })).toBeNull()
    expect(upiPayUrl({ vpa: 'not a vpa', amount: 100, note: 'x' })).toBeNull()
    expect(upiPayUrl({ vpa: 'a@ok', amount: 0, note: 'x' })).toBeNull()
  })
})

describe('isValidVpa', () => {
  it('accepts name@handle and rejects the rest', () => {
    expect(isValidVpa('ravi.k@okicici')).toBe(true)
    expect(isValidVpa(' 9876543210@paytm ')).toBe(true)
    expect(isValidVpa('ravi')).toBe(false)
    expect(isValidVpa('ravi@')).toBe(false)
    expect(isValidVpa(null)).toBe(false)
  })
})
