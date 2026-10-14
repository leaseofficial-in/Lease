import { describe, it, expect } from 'vitest'
import { REGIONS, COUNTRY_PICKER_ORDER, getRegion, worldPickerOrder, isSupportedCountry, type CountryCode } from './regions'
import { COUNTRY_CURRENCY } from './world'
import { PAYMENT_METHOD_DISPLAY } from './payments'
import { formatCurrencyLocale } from './formatters'

// The region registry is the whole globalisation story: currency, locale,
// timezone, phone, payment methods, per country. A typo in one entry does not
// throw at build time -- it silently breaks that country for every user in it:
// an invalid timezone raises inside the overdue job, a missing payment-method
// label renders as the raw id, an unknown locale falls back to English digits.
// Nothing checked these. Now every entry is exercised the way the product uses it.

const codes = Object.keys(REGIONS) as CountryCode[]

describe('REGIONS integrity', () => {
  it('has at least the launch markets', () => {
    expect(codes).toEqual(expect.arrayContaining(['IN', 'US', 'GB', 'CA', 'AU']))
  })

  it.each(codes)('%s: key matches its countryCode', code => {
    expect(REGIONS[code].countryCode).toBe(code)
  })

  it.each(codes)('%s: locale is accepted by Intl', code => {
    const { locale } = REGIONS[code]
    expect(() => new Intl.NumberFormat(locale)).not.toThrow()
    // And is actually resolved, not silently replaced by the runtime default.
    expect(new Intl.NumberFormat(locale).resolvedOptions().locale.slice(0, 2)).toBe(locale.slice(0, 2))
  })

  it.each(codes)('%s: primaryTimezone is a valid IANA zone', code => {
    // This is what mark_overdue_payments() and the reminder planner trust. An
    // invalid zone here means every tenant in the country is judged in UTC.
    const { primaryTimezone } = REGIONS[code]
    expect(() => new Intl.DateTimeFormat('en', { timeZone: primaryTimezone })).not.toThrow()
    // ICU canonicalises some names (Asia/Kolkata resolves to Asia/Calcutta), so
    // the resolved name may legitimately differ. What must not differ is the
    // zone itself: formatting one instant through both names must agree.
    const resolved = new Intl.DateTimeFormat('en', { timeZone: primaryTimezone }).resolvedOptions().timeZone
    const instant = new Date(Date.UTC(2026, 0, 15, 12, 0))
    const via = (tz: string) => new Intl.DateTimeFormat('en', { timeZone: tz, hour: 'numeric', minute: 'numeric', hour12: false }).format(instant)
    expect(via(resolved)).toBe(via(primaryTimezone))
  })

  it.each(codes)('%s: currency is an ISO-4217 code Intl can format', code => {
    const { currency, locale } = REGIONS[code]
    expect(currency.code).toMatch(/^[A-Z]{3}$/)
    expect(currency.decimals).toBeGreaterThanOrEqual(0)
    expect(currency.decimals).toBeLessThanOrEqual(3)
    expect(() => new Intl.NumberFormat(locale, { style: 'currency', currency: currency.code })).not.toThrow()
  })

  it.each(codes)('%s: phone dial code and local lengths are sane', code => {
    const r = REGIONS[code]
    expect(r.phoneDialCode).toMatch(/^\+\d{1,4}$/)
    expect(r.phoneLocalLength.length).toBeGreaterThan(0)
    for (const n of r.phoneLocalLength) expect(n).toBeGreaterThanOrEqual(6)
  })

  it.each(codes)('%s: every payment method has a display entry', code => {
    const r = REGIONS[code]
    expect(r.paymentMethods.length).toBeGreaterThan(0)
    for (const id of r.paymentMethods) {
      // Without this the UI shows the raw id, e.g. "faster_payments".
      expect(PAYMENT_METHOD_DISPLAY[id], `missing label for ${id} in ${code}`).toBeDefined()
      expect(PAYMENT_METHOD_DISPLAY[id].label).toBeTruthy()
    }
  })

  it.each(codes)('%s: formatCurrencyLocale produces a currency string', code => {
    const r = REGIONS[code]
    const out = formatCurrencyLocale(1234.5, r.currency, r.locale)
    expect(out).toMatch(/\d/)
    expect(out.length).toBeGreaterThan(3)
    // Compact form must not throw either; it has India-specific branches.
    expect(() => formatCurrencyLocale(12_345_678, r.currency, r.locale, true)).not.toThrow()
  })
})

describe('COUNTRY_PICKER_ORDER', () => {
  it('lists every region exactly once', () => {
    expect([...COUNTRY_PICKER_ORDER].sort()).toEqual([...codes].sort())
    expect(new Set(COUNTRY_PICKER_ORDER).size).toBe(COUNTRY_PICKER_ORDER.length)
  })
})

describe('getRegion', () => {
  it('falls back to India for anything unknown, matching the column default', () => {
    expect(getRegion(undefined).countryCode).toBe('IN')
    expect(getRegion(null).countryCode).toBe('IN')
    expect(getRegion('').countryCode).toBe('IN')
    expect(getRegion('XX').countryCode).toBe('IN')
  })

  it('returns the exact region for a known code', () => {
    expect(getRegion('GB').currency.code).toBe('GBP')
  })
})

// Every other country used to fall back to India: a landlord in São Paulo saw
// rupees, UPI and a PAN field. Now every ISO country resolves to itself.
const world = Object.keys(COUNTRY_CURRENCY)

describe('every country in the world', () => {
  it('resolves non-curated countries to themselves, not India', () => {
    expect(getRegion('BR').currency.code).toBe('BRL')
    expect(getRegion('NG').currency.code).toBe('NGN')
    expect(getRegion('JP').currency.code).toBe('JPY')
    expect(getRegion('br').countryCode).toBe('BR') // case-insensitive
    expect(getRegion('BR').paymentMethods).not.toContain('upi')
    expect(getRegion('BR').taxIdLabel).toBeNull()
    expect(getRegion('BR').receiptFootnote).toBeNull()
  })

  it('offers mobile money where rent is paid that way', () => {
    expect(getRegion('KE').paymentMethods[0]).toBe('mobile_money')
  })

  it('uses the currency’s real minor units', () => {
    expect(getRegion('JP').currency.decimals).toBe(0)
    expect(getRegion('KW').currency.decimals).toBe(3)
  })

  it.each(world)('%s: a complete, formattable config', code => {
    const r = getRegion(code)
    expect(r.countryCode).toBe(code)
    expect(r.name).toBeTruthy()
    expect(r.flag.length).toBeGreaterThan(0)
    expect(() => formatCurrencyLocale(1234.5, r.currency, r.locale)).not.toThrow()
    expect(() => new Intl.DateTimeFormat('en', { timeZone: r.primaryTimezone })).not.toThrow()
    for (const id of r.paymentMethods) expect(PAYMENT_METHOD_DISPLAY[id]?.label).toBeTruthy()
  })

  it('the picker lists every country once, curated first', () => {
    const order = worldPickerOrder()
    expect(new Set(order).size).toBe(order.length)
    expect(order.slice(0, COUNTRY_PICKER_ORDER.length)).toEqual(COUNTRY_PICKER_ORDER)
    expect([...order].sort()).toEqual([...new Set([...world, ...COUNTRY_PICKER_ORDER])].sort())
  })

  it('rejects things that are not countries', () => {
    expect(isSupportedCountry('XX')).toBe(false)
    expect(isSupportedCountry('usa')).toBe(false)
    expect(isSupportedCountry(null)).toBe(false)
    expect(isSupportedCountry('KE')).toBe(true)
  })
})
