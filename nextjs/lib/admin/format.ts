import { getRegion } from '@/lib/i18n/regions'
import { formatCurrencyLocale } from '@/lib/i18n/formatters'

// Admin pages render on the server, which runs in UTC on Vercel. The operator is
// in India, so absolute times are pinned to IST rather than the server clock.
const TZ = 'Asia/Kolkata'

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }).format(new Date(iso))
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: TZ,
  }).format(new Date(iso))
}

export function fmtMonth(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso))
}

/** "3h ago", "12d ago". Timezone-independent. */
export function ago(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return 'never'
  const s = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86_400 * 60) return `${Math.floor(s / 86_400)}d ago`
  if (s < 86_400 * 730) return `${Math.floor(s / (86_400 * 30))}mo ago`
  return `${Math.floor(s / (86_400 * 365))}y ago`
}

/** Money in the currency of the country it is denominated in. */
export function money(amount: number | null | undefined, countryCode: string | null | undefined): string {
  const region = getRegion(countryCode)
  return formatCurrencyLocale(Number(amount || 0), region.currency, region.locale)
}

export function countryLabel(code: string | null | undefined): string {
  if (!code) return '—'
  const r = getRegion(code)
  return `${r.flag} ${r.countryCode}`
}
