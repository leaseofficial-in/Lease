import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LogoLockup } from '@/components/brand'
import { getRegion } from '@/lib/i18n/regions'
import { formatCurrencyLocale, formatDateLocale } from '@/lib/i18n/formatters'
import { PAYMENT_METHOD_DISPLAY } from '@/lib/i18n/payments'
import { monthLabel } from '@/lib/date/month-label'
import { upiPayUrl } from '@/lib/rent/share'

// /rent/<share_token> — one rent row, for the tenant, with no account.
//
// The landlord sends this over WhatsApp. Before it is paid it is a reminder with a
// way to pay; after, it is the receipt. It exists so a landlord gets value from
// RentyBase on day one without first persuading their tenant to sign up (052).
//
// Rendered on the server from get_shared_rent(), which returns only what this
// page shows: no address, no phone, no invite token. A receipt is the kind of
// thing that gets forwarded (to an employer, for HRA), so it must not carry
// anything that lets the next holder act on the tenancy.

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Rent',
  robots: { index: false, follow: false, nocache: true },
}

type SharedRent = {
  month: string
  amount: number
  late_fee: number | null
  status: 'paid' | 'pending' | 'overdue' | 'partial' | 'pending_verification'
  paid_at: string | null
  payment_method: string | null
  receipt_ref: string
  rent_due_day: number
  property_name: string | null
  city: string | null
  country_code: string
  landlord_name: string | null
  tenant_name: string | null
  upi_id: string | null
  payout_details: string | null
}

async function load(token: string): Promise<SharedRent | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  const res = await fetch(`${url}/rest/v1/rpc/get_shared_rent`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ share_token_input: token }),
    cache: 'no-store',
  })
  if (!res.ok) return null
  return (await res.json()) as SharedRent | null
}

export default async function SharedRentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const rent = await load(token)
  if (!rent) notFound()

  const region = getRegion(rent.country_code)
  const money = (n: number) => formatCurrencyLocale(Number(n || 0), region.currency, region.locale)
  const month = monthLabel(rent.month, region.locale, 'long')
  const paid = rent.status === 'paid'
  const submitted = rent.status === 'pending_verification'
  const overdue = rent.status === 'overdue'
  const lateFee = Number(rent.late_fee || 0)
  const total = Number(rent.amount) + (paid ? 0 : lateFee)
  const dueDate = (() => {
    const m = /^(\d{4})-(\d{2})/.exec(rent.month)
    if (!m) return null
    // Noon, not midnight: a date-only ISO string parses as UTC midnight, which is
    // the previous day anywhere west of Greenwich.
    return formatDateLocale(`${m[1]}-${m[2]}-${String(rent.rent_due_day).padStart(2, '0')}T12:00:00`, region.locale)
  })()
  const upi = !paid && region.countryCode === 'IN'
    ? upiPayUrl({ vpa: rent.upi_id, payeeName: rent.landlord_name, amount: total, note: `Rent ${monthLabel(rent.month, 'en')}` })
    : null
  const method = rent.payment_method
    ? (PAYMENT_METHOD_DISPLAY as Record<string, { label: string }>)[rent.payment_method]?.label || rent.payment_method
    : null

  const status = paid
    ? { label: 'Paid', bg: 'var(--rb-success-soft)', fg: 'var(--rb-success)' }
    : submitted
      ? { label: 'Awaiting landlord confirmation', bg: 'var(--rb-warning-soft)', fg: 'var(--rb-warning)' }
      : overdue
        ? { label: 'Overdue', bg: 'var(--rb-danger-soft)', fg: 'var(--rb-danger)' }
        : { label: 'Due', bg: 'var(--rb-fill-2)', fg: 'var(--rb-ink-2)' }

  const row = (label: string, value: React.ReactNode, strong = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '11px 0', borderBottom: '1px solid var(--rb-border-soft)', fontSize: 14 }}>
      <span style={{ color: 'var(--rb-ink-3)' }}>{label}</span>
      <span style={{ color: 'var(--rb-ink)', fontWeight: strong ? 700 : 500, textAlign: 'right' }}>{value}</span>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--rb-canvas)', padding: '28px 16px 48px' }}>
      <div style={{ maxWidth: 440, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <Link href="/" aria-label="RentyBase home"><LogoLockup size={28} fontSize={18} /></Link>
        </div>

        <section style={{ background: 'var(--rb-surface)', border: '1px solid var(--rb-border-soft)', borderRadius: 18, padding: '24px 20px', boxShadow: 'var(--rb-shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--rb-ink-3)' }}>
                {paid ? (region.receiptLabel || 'Rent receipt') : 'Rent due'}
              </div>
              <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 30, fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.1, marginTop: 6 }}>{month}</h1>
            </div>
            <span style={{ padding: '5px 11px', borderRadius: 999, background: status.bg, color: status.fg, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{status.label}</span>
          </div>

          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-.02em', margin: '18px 0 6px', color: 'var(--rb-ink)' }}>{money(paid ? Number(rent.amount) : total)}</div>

          <div style={{ marginTop: 12 }}>
            {rent.tenant_name && row('Tenant', rent.tenant_name)}
            {rent.landlord_name && row(paid ? 'Received by' : 'Pay to', rent.landlord_name)}
            {rent.property_name && row('Property', [rent.property_name, rent.city].filter(Boolean).join(', '))}
            {row('Rent', money(Number(rent.amount)))}
            {!paid && lateFee > 0 && row('Late fee', money(lateFee))}
            {!paid && dueDate && row('Due on', dueDate)}
            {paid && rent.paid_at && row('Paid on', formatDateLocale(rent.paid_at, region.locale))}
            {paid && method && row('Method', method)}
            {paid && row('Receipt no.', <span style={{ fontFamily: 'var(--rb-font-mono)' }}>{rent.receipt_ref}</span>)}
          </div>

          {upi && (
            <a href={upi} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 22, padding: '14px 20px', borderRadius: 12, background: 'var(--rb-action)', color: '#fff', textDecoration: 'none', fontSize: 16, fontWeight: 700 }}>
              Pay {money(total)} with UPI
            </a>
          )}
          {!paid && upi && (
            <p style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 8, textAlign: 'center' }}>
              Opens GPay, PhonePe, Paytm or your bank app. UPI ID: <span style={{ fontFamily: 'var(--rb-font-mono)' }}>{rent.upi_id}</span>
            </p>
          )}
          {!paid && !upi && rent.payout_details && (
            <div style={{ marginTop: 20, padding: 14, borderRadius: 12, background: 'var(--rb-fill)', fontSize: 13, lineHeight: 1.55, color: 'var(--rb-ink-2)', whiteSpace: 'pre-wrap' }}>
              <div style={{ fontWeight: 700, color: 'var(--rb-ink)', marginBottom: 4 }}>How to pay</div>
              {rent.payout_details}
            </div>
          )}
          {!paid && (
            <p style={{ fontSize: 13, color: 'var(--rb-ink-3)', marginTop: 16, lineHeight: 1.55 }}>
              Once you have paid, let {rent.landlord_name?.split(' ')[0] || 'your landlord'} know. This page becomes your receipt when they mark it received.
            </p>
          )}
          {paid && region.receiptFootnote && (
            <p style={{ fontSize: 11, color: 'var(--rb-ink-3)', marginTop: 14 }}>{region.receiptFootnote}</p>
          )}
        </section>

        <p style={{ fontSize: 13, color: 'var(--rb-ink-3)', textAlign: 'center', marginTop: 22, lineHeight: 1.6 }}>
          Recorded on RentyBase.{' '}
          <Link href="/for/tenants" style={{ color: 'var(--rb-action)', fontWeight: 600 }}>Keep all your rent receipts in one place →</Link>
        </p>
      </div>
    </main>
  )
}
