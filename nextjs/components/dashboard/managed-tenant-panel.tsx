'use client'

// ─── Track rent for a tenant who is not on RentyBase ──────────────────────────
//
// Shown in the property modal for any rental without a tenant account. Before
// 052 that modal offered exactly one thing, an invite link, and the product did
// nothing for the landlord until the tenant accepted it. In production none ever
// had. This panel makes the landlord's own record useful on day one:
//
//   1. name + phone → the rental becomes "managed" and this month's rent row
//      appears (seed_managed_rent trigger);
//   2. each month: "Mark received", and a WhatsApp reminder or receipt carrying
//      the /rent/<share_token> link, which the tenant opens without an account.
//
// The invite stays below this panel as an optional upgrade; joining later hands
// the tenant every month recorded here (claim_rental_invite, 052).

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { PAYMENT_METHOD_DISPLAY } from '@/lib/i18n/payments'
import type { RegionConfig } from '@/lib/i18n/regions'
import { track } from '@/lib/analytics/track'
import { phoneForStorage, phoneForWhatsApp, receiptMessage, reminderMessage, rentShareUrl, whatsAppUrl } from '@/lib/rent/share'

type ManagedRental = {
  id: string
  status: string
  tenant_id?: string | null
  tenant_name?: string | null
  tenant_phone?: string | null
  property?: { name?: string | null } | null
}

type Row = {
  id: string
  month: string
  amount: number
  late_fee: number | null
  status: string
  share_token: string
  payment_method: string | null
  paid_at: string | null
}

type Props = {
  rental: ManagedRental
  sb: SupabaseClient
  region: RegionConfig
  money: (n: number) => string
  monthLabel: (ym?: string | null) => string
  toast: (msg: string, type?: 'success' | 'error' | 'info') => void
  onChanged: () => void
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid var(--rb-border)', borderRadius: 10, fontFamily: 'inherit', fontSize: 14, color: 'var(--rb-ink)', background: 'var(--rb-surface)', outline: 'none' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--rb-ink-2)', marginBottom: 6 }
const smallBtn: React.CSSProperties = { padding: '7px 12px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--rb-ink-2)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }
const waBtn: React.CSSProperties = { ...smallBtn, background: '#25D366', borderColor: '#25D366', color: '#fff' }

const STATUS: Record<string, { t: string; bg: string; c: string }> = {
  paid:                 { t: 'Received', bg: 'var(--rb-success-soft)', c: 'var(--rb-success)' },
  pending:              { t: 'Due',      bg: 'var(--rb-fill-2)',       c: 'var(--rb-ink-2)' },
  overdue:              { t: 'Overdue',  bg: 'var(--rb-danger-soft)',  c: 'var(--rb-danger)' },
  partial:              { t: 'Partial',  bg: 'var(--rb-warning-soft)', c: 'var(--rb-warning)' },
  pending_verification: { t: 'To review', bg: 'var(--rb-warning-soft)', c: 'var(--rb-warning)' },
}

export function ManagedTenantPanel({ rental, sb, region, money, monthLabel, toast, onChanged }: Props) {
  // Local, because the modal's rental object is a snapshot taken when it opened
  // and does not change when the dashboard refreshes underneath it.
  const [managed, setManaged] = useState(!rental.tenant_id && !!rental.tenant_name)
  const [tenantName, setTenantName] = useState(rental.tenant_name || '')
  const [tenantPhone, setTenantPhone] = useState(rental.tenant_phone || '')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(rental.tenant_name || '')
  const [phone, setPhone] = useState(rental.tenant_phone || '')
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [recording, setRecording] = useState<string | null>(null) // row id choosing a method
  const [busyRow, setBusyRow] = useState<string | null>(null)

  const methods = Array.from(new Set(['cash', ...region.paymentMethods])).slice(0, 4)
  const methodLabel = (m: string) => (PAYMENT_METHOD_DISPLAY as Record<string, { label: string }>)[m]?.label || m
  const waPhone = phoneForWhatsApp(tenantPhone, region.phoneDialCode, region.phoneLocalLength)

  // Bumped to re-read the rows after recording a payment.
  const [reload, setReload] = useState(0)
  useEffect(() => {
    if (!managed) return
    let live = true
    sb.from('rent_payments')
      .select('id, month, amount, late_fee, status, share_token, payment_method, paid_at')
      .eq('rental_id', rental.id).order('month', { ascending: false }).limit(6)
      .then(({ data, error }) => {
        if (!live) return
        if (error) { toast(error.message, 'error'); return }
        setRows((data as Row[]) || [])
      })
    return () => { live = false }
  }, [managed, rental.id, reload, sb, toast])

  const startTracking = async () => {
    if (!name.trim()) { toast('Enter your tenant’s name', 'error'); return }
    const storedPhone = phone.trim() ? phoneForStorage(phone, region.phoneDialCode, region.phoneLocalLength) : null
    if (phone.trim() && !storedPhone) { toast('That phone number doesn’t look right', 'error'); return }
    setSaving(true)
    try {
      const { data, error } = await sb.from('rentals')
        .update({ tenant_name: name.trim(), tenant_phone: storedPhone, status: 'active' })
        .eq('id', rental.id).select('id')
      if (error) throw error
      if (!data?.length) throw new Error('That rental could not be updated. Please refresh and try again.')
      track('tenant_tracked', { with_phone: !!storedPhone })
      toast(`Tracking rent for ${name.trim().split(' ')[0]}`, 'success')
      setTenantName(name.trim()); setTenantPhone(storedPhone || ''); setManaged(true)
      onChanged()
    } catch (e) {
      toast((e as { message?: string })?.message || 'Could not save', 'error')
    } finally { setSaving(false) }
  }

  const markReceived = async (row: Row, method: string) => {
    setBusyRow(row.id)
    try {
      const { data, error } = await sb.from('rent_payments')
        .update({ status: 'paid', payment_method: method, paid_at: new Date().toISOString() })
        .eq('id', row.id).select('id')
      if (error) throw error
      if (!data?.length) throw new Error('That payment could not be updated. Please refresh and try again.')
      track('payment_confirmed', { month: row.month.slice(0, 7), managed: true })
      toast(`${monthLabel(row.month)} marked received`, 'success')
      setRecording(null)
      setReload(n => n + 1)
      onChanged()
    } catch (e) {
      toast((e as { message?: string })?.message || 'Could not record the payment', 'error')
    } finally { setBusyRow(null) }
  }

  // ── Not tracking yet ─────────────────────────────────────────────────────────
  if (!managed) {
    return (
      <div style={{ marginBottom: 18, padding: 16, borderRadius: 14, background: 'var(--rb-action-soft)', border: '1px solid var(--rb-border-soft)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--rb-ink)' }}>Already have a tenant here?</div>
        <div style={{ fontSize: 13, color: 'var(--rb-ink-2)', marginTop: 4, lineHeight: 1.55 }}>
          Track their rent yourself. They don&rsquo;t need to sign up: you send reminders and receipts on WhatsApp.
        </div>
        {!open ? (
          <Button variant="primary-sm" style={{ marginTop: 12 }} onClick={() => setOpen(true)}>Track rent without an invite</Button>
        ) : (
          <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
            <label>
              <span style={labelStyle}>Tenant&rsquo;s name</span>
              <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ravi Kumar" autoFocus maxLength={120} />
            </label>
            <label>
              <span style={labelStyle}>WhatsApp number (optional)</span>
              <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder={`${region.phoneDialCode} …`} inputMode="tel" autoComplete="off" />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary-sm" onClick={startTracking} busy={saving}>Start tracking</Button>
              <Button variant="cancel" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Managed ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ marginBottom: 18, padding: 16, borderRadius: 14, background: 'var(--rb-surface)', border: '1px solid var(--rb-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--rb-ink-3)' }}>Tenant</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--rb-ink)', marginTop: 2 }}>{tenantName}</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--rb-ink-3)' }}>{tenantPhone || 'No phone saved'} · not on RentyBase</div>
      </div>

      <div style={{ marginTop: 14 }}>
        {rows === null && <div style={{ fontSize: 13, color: 'var(--rb-ink-3)' }}>Loading…</div>}
        {rows?.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--rb-ink-3)', lineHeight: 1.5 }}>This month&rsquo;s rent appears here once the lease start date is reached.</div>
        )}
        {rows?.map(row => {
          const s = STATUS[row.status] || STATUS.pending
          const paid = row.status === 'paid'
          const due = Number(row.amount) + (paid ? 0 : Number(row.late_fee || 0))
          return (
            <div key={row.id} style={{ padding: '12px 0', borderTop: '1px solid var(--rb-border-soft)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--rb-ink)' }}>{monthLabel(row.month)}</div>
                  <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>
                    {money(due)}{paid && row.payment_method ? ` · ${methodLabel(row.payment_method)}` : ''}
                  </div>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: 999, background: s.bg, color: s.c, fontSize: 11, fontWeight: 700 }}>{s.t}</span>
              </div>

              {recording === row.id ? (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--rb-ink-2)', marginBottom: 8 }}>How did {tenantName.split(' ')[0]} pay? This can&rsquo;t be undone.</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {methods.map(m => (
                      <button key={m} style={{ ...smallBtn, borderColor: 'var(--rb-action)', color: 'var(--rb-action)' }} disabled={busyRow === row.id} onClick={() => markReceived(row, m)}>
                        {busyRow === row.id ? '…' : methodLabel(m)}
                      </button>
                    ))}
                    <button style={{ ...smallBtn, border: 0 }} onClick={() => setRecording(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {!paid && row.status !== 'pending_verification' && (
                    <button style={{ ...smallBtn, background: 'var(--rb-action)', borderColor: 'var(--rb-action)', color: '#fff' }} onClick={() => setRecording(row.id)}>✓ Mark received</button>
                  )}
                  <RentShareButtons row={row} tenantName={tenantName} waPhone={waPhone} propertyName={rental.property?.name} money={money} monthLabel={monthLabel} toast={toast} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── WhatsApp reminder / receipt + copy link for one rent row ─────────────────
// Used for managed tenants above, and for tenants with an account in the
// property modal: either way the link opens without signing in.

type ShareRow = Pick<Row, 'month' | 'amount' | 'late_fee' | 'status' | 'share_token'>

export function RentShareButtons({ row, tenantName, waPhone, propertyName, money, monthLabel, toast }: {
  row: ShareRow
  tenantName?: string | null
  waPhone?: string | null
  propertyName?: string | null
  money: (n: number) => string
  monthLabel: (ym?: string | null) => string
  toast: (msg: string, type?: 'success' | 'error' | 'info') => void
}) {
  const paid = row.status === 'paid'
  const kind = paid ? 'receipt' : 'reminder'
  const url = () => rentShareUrl(row.share_token, window.location.origin)
  const message = () => {
    const input = {
      tenantName,
      propertyName,
      amount: money(Number(row.amount) + (paid ? 0 : Number(row.late_fee || 0))),
      month: monthLabel(row.month),
      url: url(),
    }
    return paid ? receiptMessage(input) : reminderMessage(input)
  }
  const copy = () => {
    navigator.clipboard.writeText(url())
      .then(() => { track('rent_link_sent', { channel: 'copy', kind }); toast('Link copied', 'success') })
      .catch(() => toast('Could not copy the link', 'error'))
  }
  return (
    <>
      <a href={whatsAppUrl(message(), waPhone)} target="_blank" rel="noreferrer" style={waBtn}
        onClick={() => track('rent_link_sent', { channel: 'whatsapp', kind })}>
        {paid ? 'Send receipt' : 'Remind'} on WhatsApp
      </a>
      <button style={smallBtn} onClick={copy}>Copy link</button>
    </>
  )
}
