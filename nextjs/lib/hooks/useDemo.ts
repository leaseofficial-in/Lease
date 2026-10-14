'use client'

import { useRegion } from '@/lib/hooks/useRegion'
import { getRegion } from '@/lib/i18n/regions'
import { formatCurrencyLocale } from '@/lib/i18n/formatters'
import { PAYMENT_METHOD_DISPLAY } from '@/lib/i18n/payments'

const fmtINR = (n: number) => '₹' + n.toLocaleString('en-IN')

/* ── Demo figures in the visitor's currency ───────────────────
   Every amount on this page is written in rupees for an Indian 2BR
   (₹28,500 a month). Outside India it is rescaled to a plausible local
   rent, NOT converted at market rates: ₹28,500 is about $335, which no
   one in Austin would read as rent. Currencies without a typical-rent
   figure fall back to US dollars rather than to rupees. */
const DEMO_BASE = 28500
const DEMO_RENT: Record<string, number> = {
  INR: 28500, USD: 2400, CAD: 2300, GBP: 1700, EUR: 1300, CHF: 2200, AUD: 2600,
  NZD: 2400, SGD: 3800, AED: 7500, SAR: 5500, QAR: 7000, ZAR: 12000, MYR: 2200,
  JPY: 180000, KRW: 1500000, HKD: 18000, PHP: 30000, IDR: 7000000, THB: 18000,
  VND: 12000000, PKR: 80000, BDT: 30000, LKR: 90000, NPR: 35000, KES: 45000,
  NGN: 400000, GHS: 4000, EGP: 15000, MAD: 6000, BRL: 3000, MXN: 15000,
  ARS: 600000, CLP: 600000, COP: 2500000, PEN: 2200, SEK: 14000, NOK: 15000,
  DKK: 11000, PLN: 4000, CZK: 22000, HUF: 300000, RON: 3000, TRY: 25000,
  ILS: 6000, CNY: 6000, TWD: 25000,
}
export function useDemo() {
  const region = useRegion()
  const india = region.countryCode === 'IN'
  const known = region.currency.code in DEMO_RENT
  const cur = known ? region.currency : getRegion('US').currency
  const locale = known ? region.locale : 'en-US'
  const scale = DEMO_RENT[cur.code] / DEMO_BASE
  const nice = (n: number) => {
    const step = n >= 1_000_000 ? 50_000 : n >= 100_000 ? 5_000 : n >= 10_000 ? 500 : n >= 1_000 ? 50 : 10
    return Math.round(n / step) * step
  }
  const m = (inr: number, compact = false) =>
    india && !compact
      ? fmtINR(inr)
      : formatCurrencyLocale(india ? inr : nice(inr * scale), { ...cur, decimals: 0 }, locale, compact)
  const label = (id: string) => (PAYMENT_METHOD_DISPLAY as Record<string, { label: string }>)[id]?.label ?? id
  const methods = india ? ['UPI', 'NEFT', 'Cash'] : region.paymentMethods.slice(0, 3).map(label)
  return {
    india,
    m,
    method: methods[0],
    methods: methods.join(' · '),
    methodsSentence: india ? 'UPI, NEFT, or cash with a UTR' : `${methods.slice(0, -1).join(', ')}, or ${methods[methods.length - 1]?.toLowerCase()} with a reference`,
    account: india ? 'alex@okbank' : 'Account ···· 4421',
    ref: india ? 'UTR' : 'Ref',
    unit: india ? 'rupee' : 'payment',
  }
}
