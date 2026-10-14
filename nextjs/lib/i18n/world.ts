// ─── Every country, not just the curated twelve ──────────────────────────────
// REGIONS in regions.ts holds hand-tuned configs (payment rails, tax ID labels,
// postcode formats) for the markets we have researched. Everyone else used to be
// silently treated as Indian: a landlord in São Paulo or Nairobi saw rupees, UPI
// and a PAN field. This module gives every ISO 3166-1 country a correct baseline
// instead: its own currency, name, flag and number formatting, all derived from
// the runtime's Intl data so nothing here needs translating or maintaining
// beyond the country → currency table.

import type { CurrencyConfig, PaymentMethodId, RegionConfig } from './regions'

// ISO 3166-1 alpha-2 → ISO 4217. Covers every assigned country code that has a
// currency of its own or uses another's. Antarctica (AQ) is deliberately absent.
export const COUNTRY_CURRENCY: Record<string, string> = {
  AD: 'EUR', AE: 'AED', AF: 'AFN', AG: 'XCD', AI: 'XCD', AL: 'ALL', AM: 'AMD', AO: 'AOA',
  AR: 'ARS', AS: 'USD', AT: 'EUR', AU: 'AUD', AW: 'AWG', AX: 'EUR', AZ: 'AZN', BA: 'BAM',
  BB: 'BBD', BD: 'BDT', BE: 'EUR', BF: 'XOF', BG: 'BGN', BH: 'BHD', BI: 'BIF', BJ: 'XOF',
  BL: 'EUR', BM: 'BMD', BN: 'BND', BO: 'BOB', BQ: 'USD', BR: 'BRL', BS: 'BSD', BT: 'BTN',
  BW: 'BWP', BY: 'BYN', BZ: 'BZD', CA: 'CAD', CC: 'AUD', CD: 'CDF', CF: 'XAF', CG: 'XAF',
  CH: 'CHF', CI: 'XOF', CK: 'NZD', CL: 'CLP', CM: 'XAF', CN: 'CNY', CO: 'COP', CR: 'CRC',
  CU: 'CUP', CV: 'CVE', CW: 'ANG', CX: 'AUD', CY: 'EUR', CZ: 'CZK', DE: 'EUR', DJ: 'DJF',
  DK: 'DKK', DM: 'XCD', DO: 'DOP', DZ: 'DZD', EC: 'USD', EE: 'EUR', EG: 'EGP', EH: 'MAD',
  ER: 'ERN', ES: 'EUR', ET: 'ETB', FI: 'EUR', FJ: 'FJD', FK: 'FKP', FM: 'USD', FO: 'DKK',
  FR: 'EUR', GA: 'XAF', GB: 'GBP', GD: 'XCD', GE: 'GEL', GF: 'EUR', GG: 'GBP', GH: 'GHS',
  GI: 'GIP', GL: 'DKK', GM: 'GMD', GN: 'GNF', GP: 'EUR', GQ: 'XAF', GR: 'EUR', GT: 'GTQ',
  GU: 'USD', GW: 'XOF', GY: 'GYD', HK: 'HKD', HN: 'HNL', HR: 'EUR', HT: 'HTG', HU: 'HUF',
  ID: 'IDR', IE: 'EUR', IL: 'ILS', IM: 'GBP', IN: 'INR', IO: 'USD', IQ: 'IQD', IR: 'IRR',
  IS: 'ISK', IT: 'EUR', JE: 'GBP', JM: 'JMD', JO: 'JOD', JP: 'JPY', KE: 'KES', KG: 'KGS',
  KH: 'KHR', KI: 'AUD', KM: 'KMF', KN: 'XCD', KP: 'KPW', KR: 'KRW', KW: 'KWD', KY: 'KYD',
  KZ: 'KZT', LA: 'LAK', LB: 'LBP', LC: 'XCD', LI: 'CHF', LK: 'LKR', LR: 'LRD', LS: 'LSL',
  LT: 'EUR', LU: 'EUR', LV: 'EUR', LY: 'LYD', MA: 'MAD', MC: 'EUR', MD: 'MDL', ME: 'EUR',
  MF: 'EUR', MG: 'MGA', MH: 'USD', MK: 'MKD', ML: 'XOF', MM: 'MMK', MN: 'MNT', MO: 'MOP',
  MP: 'USD', MQ: 'EUR', MR: 'MRU', MS: 'XCD', MT: 'EUR', MU: 'MUR', MV: 'MVR', MW: 'MWK',
  MX: 'MXN', MY: 'MYR', MZ: 'MZN', NA: 'NAD', NC: 'XPF', NE: 'XOF', NF: 'AUD', NG: 'NGN',
  NI: 'NIO', NL: 'EUR', NO: 'NOK', NP: 'NPR', NR: 'AUD', NU: 'NZD', NZ: 'NZD', OM: 'OMR',
  PA: 'PAB', PE: 'PEN', PF: 'XPF', PG: 'PGK', PH: 'PHP', PK: 'PKR', PL: 'PLN', PM: 'EUR',
  PN: 'NZD', PR: 'USD', PS: 'ILS', PT: 'EUR', PW: 'USD', PY: 'PYG', QA: 'QAR', RE: 'EUR',
  RO: 'RON', RS: 'RSD', RU: 'RUB', RW: 'RWF', SA: 'SAR', SB: 'SBD', SC: 'SCR', SD: 'SDG',
  SE: 'SEK', SG: 'SGD', SH: 'SHP', SI: 'EUR', SJ: 'NOK', SK: 'EUR', SL: 'SLE', SM: 'EUR',
  SN: 'XOF', SO: 'SOS', SR: 'SRD', SS: 'SSP', ST: 'STN', SV: 'USD', SX: 'ANG', SY: 'SYP',
  SZ: 'SZL', TC: 'USD', TD: 'XAF', TF: 'EUR', TG: 'XOF', TH: 'THB', TJ: 'TJS', TK: 'NZD',
  TL: 'USD', TM: 'TMT', TN: 'TND', TO: 'TOP', TR: 'TRY', TT: 'TTD', TV: 'AUD', TW: 'TWD',
  TZ: 'TZS', UA: 'UAH', UG: 'UGX', UM: 'USD', US: 'USD', UY: 'UYU', UZ: 'UZS', VA: 'EUR',
  VC: 'XCD', VE: 'VES', VG: 'USD', VI: 'USD', VN: 'VND', VU: 'VUV', WF: 'XPF', WS: 'WST',
  XK: 'EUR', YE: 'YER', YT: 'EUR', ZA: 'ZAR', ZM: 'ZMW', ZW: 'USD',
}

// Countries where rent routinely moves over mobile money (M-Pesa, MTN MoMo,
// Airtel Money, Orange Money). Offering only "bank transfer" there misdescribes
// how most tenants actually pay.
const MOBILE_MONEY = new Set([
  'KE', 'TZ', 'UG', 'RW', 'GH', 'ZM', 'MZ', 'MW', 'CI', 'SN', 'CM', 'BJ', 'BF', 'ML',
  'NE', 'TG', 'GN', 'CD', 'CG', 'GA', 'MG', 'SL', 'LR', 'ET', 'SO', 'BI', 'ZW', 'BD', 'PK',
])

// The only places still on imperial measurement for floor area.
const IMPERIAL = new Set(['US', 'LR', 'MM'])

// Month-day-year is effectively a US-and-territories convention.
const MDY = new Set(['US', 'AS', 'GU', 'MP', 'PR', 'UM', 'VI', 'FM', 'MH', 'PW'])
// Year-first is the norm across East Asia and a few others.
const YMD = new Set(['CN', 'JP', 'KR', 'KP', 'TW', 'HU', 'LT', 'MN', 'SE', 'IR', 'BT'])

export const isCountryCode = (code: string | null | undefined): code is string =>
  !!code && /^[A-Z]{2}$/.test(code) && code in COUNTRY_CURRENCY

/** Regional-indicator emoji flag for any alpha-2 code. */
export const flagFor = (code: string): string =>
  String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65))

let regionNames: Intl.DisplayNames | null = null
let currencyNames: Intl.DisplayNames | null = null

export function countryName(code: string): string {
  try {
    regionNames ??= new Intl.DisplayNames(['en'], { type: 'region' })
    return regionNames.of(code) ?? code
  } catch {
    return code
  }
}

function currencyConfig(code: string, locale: string): CurrencyConfig {
  let symbol = code
  let decimals = 2
  let name = code
  try {
    const nf = new Intl.NumberFormat(locale, { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' })
    symbol = nf.formatToParts(0).find(p => p.type === 'currency')?.value ?? code
    decimals = nf.resolvedOptions().maximumFractionDigits ?? 2
  } catch { /* unknown to this runtime: fall back to the bare code */ }
  try {
    currencyNames ??= new Intl.DisplayNames(['en'], { type: 'currency' })
    name = currencyNames.of(code) ?? code
  } catch { /* keep the code */ }
  return { code, symbol, name, decimals, compactK: 'K', compactM: 'M', compactB: 'B' }
}

/**
 * English UI with the country's number conventions where ICU has them
 * (en-NG, en-KE, en-DE, en-NL, ...). Where it has none it resolves to plain
 * 'en', which is still a correct rendering of the amount.
 */
function localeFor(code: string): string {
  const candidate = `en-${code}`
  try {
    const resolved = new Intl.NumberFormat(candidate).resolvedOptions().locale
    return resolved === candidate ? candidate : 'en'
  } catch {
    return 'en'
  }
}

const cache = new Map<string, RegionConfig>()

/** A complete, honest baseline config for any country we have no curated entry for. */
export function genericRegion(code: string): RegionConfig {
  const hit = cache.get(code)
  if (hit) return hit
  const locale = localeFor(code)
  const methods: PaymentMethodId[] = MOBILE_MONEY.has(code)
    ? ['mobile_money', 'bank_transfer', 'cash']
    : ['bank_transfer', 'cash', 'cheque', 'credit_card']
  const region: RegionConfig = {
    countryCode: code,
    name: countryName(code),
    flag: flagFor(code),
    currency: currencyConfig(COUNTRY_CURRENCY[code], locale),
    locale,
    // Only a fallback: onboarding stores the browser's own zone, which is the
    // one the overdue and reminder jobs should judge this user by.
    primaryTimezone: 'UTC',
    phoneDialCode: '',
    phoneLocalLength: [6, 7, 8, 9, 10, 11, 12],
    postalCodeLabel: 'Postal code',
    postalCodePlaceholder: '',
    stateLabel: 'State / province / region',
    dateFormat: MDY.has(code) ? 'MM/DD/YYYY' : YMD.has(code) ? 'YYYY-MM-DD' : 'DD/MM/YYYY',
    paymentMethods: methods,
    minRentAmount: 0,
    taxIdLabel: null,
    taxIdPlaceholder: null,
    measurementSystem: IMPERIAL.has(code) ? 'imperial' : 'metric',
    rentTerminology: 'rent',
    receiptLabel: 'Rent Receipt',
    receiptFootnote: null,
  }
  cache.set(code, region)
  return region
}
