'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────
type Profile = { id: string; full_name?: string; avatar_url?: string; role?: string; phone?: string; upi_id?: string }
type Rental = { id: string; monthly_rent: number; security_deposit: number; rent_due_day?: number; status: string; invite_token?: string; invite_expires_at?: string; agreement_signed_at?: string; property?: Property; landlord?: Profile; tenant?: Profile; landlord_id?: string; tenant_id?: string }
type Property = { id: string; name: string; city?: string; address?: string; property_type?: string }
type RentPayment = { id: string; rental_id: string; month: string; amount: number; status: string; payment_method?: string; utr_number?: string; payment_note?: string; payment_proof_url?: string; created_at: string; updated_at?: string }
type RepairRequest = { id: string; rental_id: string; title: string; description?: string; status: string; cost?: number; created_at: string; rental?: { property?: Property } }
type Proof = { id: string; rental_id: string; type: string; status: string; proof_photos?: ProofPhoto[] }
type ProofPhoto = { id: string; room_label?: string; public_url?: string; annotation?: string; created_at: string }
type DepositTx = { id: string; rental_id: string; type: string; amount: number; description?: string; created_at: string }

// ── Helpers ───────────────────────────────────────────────────────────────
const inr = (n: number | undefined | null) => '₹' + Number(n || 0).toLocaleString('en-IN')
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const now = new Date()
const currentMonth = now.toISOString().slice(0, 7)
const currentMonthDate = currentMonth + '-01'

function monthLabel(s?: string) {
  if (!s) return ''
  const parts = s.split('-')
  return `${MONTHS[parseInt(parts[1]) - 1]} ${parts[0]}`
}
function relDate(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
function daysUntil(iso?: string) {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / 86400000))
}
function scoreBand(score: number) {
  if (score >= 850) return { label: 'EXCELLENT', color: 'var(--rb-action)' }
  if (score >= 750) return { label: 'TRUSTED', color: 'var(--rb-action)' }
  if (score >= 650) return { label: 'GOOD', color: 'var(--rb-accent)' }
  if (score >= 550) return { label: 'FAIR', color: 'var(--rb-accent)' }
  return { label: 'BUILDING', color: 'var(--rb-ink-3)' }
}
const methodLabel = (m?: string) => ({ upi: 'UPI', bank_transfer: 'Bank Transfer', cheque: 'Cheque', cash: 'Cash' } as Record<string, string>)[m || ''] || m || '—'

// ── Nav icons (Lucide-style SVG paths) ────────────────────────────────────
const NAV_PATHS: Record<string, string> = {
  home:    `<path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7m-2 2v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7m5 8v-5a1 1 0 011-1h2a1 1 0 011 1v5"/>`,
  pay:     `<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="7" y1="15" x2="9" y2="15"/>`,
  rep:     `<path stroke-linecap="round" stroke-linejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>`,
  hra:     `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>`,
  profile: `<path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>`,
  props:   `<path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>`,
  led:     `<path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>`,
  inbox:   `<path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>`,
  agree:   `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6M7 8h.01M17 8h.01M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>`,
  proof:   `<path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="3"/>`,
  dep:     `<rect x="3" y="11" width="18" height="11" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 11V7a5 5 0 0110 0v4"/>`,
  score:   `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
}

function NavIcon({ k, size = 22, active = false }: { k: string; size?: number; active?: boolean }) {
  const paths = NAV_PATHS[k] || NAV_PATHS.home
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: paths }} />
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────
type Toast = { id: number; msg: string; type: 'success' | 'error' | 'info' }
let toastId = 0

// ── Modal ─────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(14,20,19,.55)', backdropFilter: 'blur(5px)', display: 'grid', placeItems: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--rb-canvas)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 28, height: 28, border: 0, background: 'var(--rb-fill-2)', borderRadius: '50%', cursor: 'pointer', fontSize: 18, lineHeight: 1, display: 'grid', placeItems: 'center', color: 'var(--rb-ink-3)' }}>×</button>
        <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 26, fontWeight: 400, letterSpacing: '-.02em', marginBottom: 18 }}>{title}</h2>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--rb-ink-3)', marginBottom: 5, letterSpacing: '.1em', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid var(--rb-border)', borderRadius: 10, fontFamily: 'inherit', fontSize: 14, color: 'var(--rb-ink)', background: 'var(--rb-surface)', outline: 'none' }

// ── Main component ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const sb = createClient()
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeView, setActiveView] = useState('home')
  const [landlordData, setLandlordData] = useState<any>(null)
  const [tenantData, setTenantData] = useState<any>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [modal, setModal] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null)

  const toast = useCallback((msg: string, type: Toast['type'] = 'info') => {
    const id = ++toastId
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  const navigate = useCallback((key: string) => {
    setActiveView(key)
    window.scrollTo(0, 0)
  }, [])

  // ── Init & data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const { data: { session } } = await sb.auth.getSession()
        if (!session) { setAuthError(true); setLoading(false); return }
        const u = session.user
        setUser(u)

        const { data: prof } = await sb.from('profiles').select('*').eq('id', u.id).maybeSingle()
        setProfile(prof)
        const role = prof?.role

        if (role === 'landlord') {
          const [rentalsRes, ytdRes] = await Promise.all([
            sb.from('rentals').select('*, property:properties(*), tenant:profiles!rentals_tenant_id_fkey(full_name, phone, avatar_url)').eq('landlord_id', u.id).neq('status', 'ended').order('created_at', { ascending: false }).limit(10),
            sb.from('rent_payments').select('id, amount, month, status, rental_id, created_at, rental:rentals!inner(landlord_id, property:properties(name, city))').eq('rental.landlord_id', u.id).gte('month', `${now.getFullYear()}-01-01`).order('created_at', { ascending: false }),
          ])
          const rentals: Rental[] = rentalsRes.data || []
          const rentalIds = rentals.map(r => r.id)
          let currentPayments: RentPayment[] = [], recentRepairs: RepairRequest[] = []
          if (rentalIds.length) {
            const [pmtRes, repRes] = await Promise.all([
              sb.from('rent_payments').select('*').in('rental_id', rentalIds).eq('month', currentMonthDate),
              sb.from('repair_requests').select('*, rental:rentals(property:properties(name, city))').in('rental_id', rentalIds).order('created_at', { ascending: false }).limit(20),
            ])
            currentPayments = pmtRes.data || []
            recentRepairs = repRes.data || []
          }
          const ytdPayments: RentPayment[] = ((ytdRes.data || []) as any[]).filter((p: any) => p.status === 'paid')
          const activeRentals = rentals.filter(r => r.status === 'active')
          const totalMonthlyRent = activeRentals.reduce((s, r) => s + Number(r.monthly_rent), 0)
          const paidThisMonth = currentPayments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
          const dueThisMonth = currentPayments.filter(p => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0)
          const onTimeCount = currentPayments.filter(p => p.status === 'paid').length
          const collectionRate = totalMonthlyRent > 0 ? Math.round((paidThisMonth / totalMonthlyRent) * 100) : 0
          const ytdTotal = ytdPayments.reduce((s, p) => s + Number(p.amount), 0)
          const score = Math.min(900, Math.round(600 + (collectionRate / 100) * 180 + (rentals.length > 0 ? 20 : 0)))
          setLandlordData({ rentals, currentPayments, ytdTotal, totalMonthlyRent, paidThisMonth, dueThisMonth, onTimeCount, activeRentals, collectionRate, score, recentRepairs, ytdPayments })
        } else if (role === 'tenant') {
          const { data: rental } = await sb.from('rentals').select('*, property:properties(*), landlord:profiles!rentals_landlord_id_fkey(full_name, avatar_url)').eq('tenant_id', u.id).neq('status', 'ended').order('created_at', { ascending: false }).limit(1).maybeSingle()
          let currentPayment: RentPayment | null = null, recentPayments: RentPayment[] = [], openRepairs: RepairRequest[] = [], proofs: Proof | null = null, depositTransactions: DepositTx[] = []
          if (rental) {
            const [pmtRes, histRes, repRes, proofRes, depRes] = await Promise.all([
              sb.from('rent_payments').select('*').eq('rental_id', rental.id).eq('month', currentMonthDate).maybeSingle(),
              sb.from('rent_payments').select('*').eq('rental_id', rental.id).eq('status', 'paid').order('month', { ascending: false }).limit(12),
              sb.from('repair_requests').select('*').eq('rental_id', rental.id).in('status', ['open', 'in_progress']).order('created_at', { ascending: false }).limit(10),
              sb.from('proofs').select('*, proof_photos(id, room_label, public_url, annotation, created_at)').eq('rental_id', rental.id).eq('type', 'move_in').maybeSingle(),
              sb.from('deposit_transactions').select('*').eq('rental_id', rental.id).order('created_at', { ascending: false }),
            ])
            currentPayment = pmtRes.data
            recentPayments = histRes.data || []
            openRepairs = repRes.data || []
            proofs = proofRes.data
            depositTransactions = depRes.data || []
          }
          const ytdTotal = recentPayments.reduce((s, p) => s + Number(p.amount), 0)
          const score = Math.min(900, Math.round(700 + (recentPayments.length > 0 ? Math.min(150, recentPayments.length * 12) : 0)))
          let nextDueDate: Date | null = null
          if (rental?.rent_due_day) {
            const d = new Date(now); d.setDate(rental.rent_due_day)
            if (d <= now) d.setMonth(d.getMonth() + 1)
            nextDueDate = d
          }
          setTenantData({ rental, currentPayment, recentPayments, openRepairs, proofs, depositTransactions, ytdTotal, score, nextDueDate })
        }
      } catch (e) {
        console.error(e)
        setAuthError(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleSignOut = async () => { await sb.auth.signOut(); window.location.href = '/signin' }

  if (loading) return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div style={{ width: 44, height: 44, border: '3px solid rgba(15,76,92,.12)', borderTopColor: 'var(--rb-action)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (authError) return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠</div>
        <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 28 }}>Not signed in</h2>
        <p style={{ fontSize: 14, color: 'var(--rb-ink-3)', marginTop: 8, lineHeight: 1.6 }}>Your session has expired. Please sign in again.</p>
        <a href="/signin" style={{ display: 'inline-flex', marginTop: 24, alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', fontWeight: 600, fontSize: 13 }}>Sign in →</a>
      </div>
    </div>
  )

  const role = profile?.role
  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const firstName = name.split(' ')[0]
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url
  const avatarBg = role === 'tenant' ? 'linear-gradient(135deg,#c9b388,#7a6042)' : 'linear-gradient(135deg,#0F4C5C,#163A47)'

  const lNavItems = [
    { k: 'home', label: 'Overview', short: 'Home' },
    { k: 'props', label: 'Properties', short: 'Props' },
    { k: 'led', label: 'Ledger', short: 'Ledger' },
    { k: 'hra', label: 'Receipts', short: 'HRA' },
    { k: 'rep', label: 'Repairs', short: 'Repairs' },
    { k: 'profile', label: 'Profile', short: 'Profile' },
  ]
  const tNavItems = [
    { k: 'home', label: 'My place', short: 'Home' },
    { k: 'pay', label: 'Pay rent', short: 'Pay' },
    { k: 'rep', label: 'Repairs', short: 'Repairs' },
    { k: 'hra', label: 'HRA receipts', short: 'HRA' },
    { k: 'profile', label: 'Profile', short: 'Profile' },
    { k: 'agree', label: 'Agreement', short: 'Agree' },
    { k: 'proof', label: 'Move-in proof', short: 'Proof' },
    { k: 'dep', label: 'Deposit', short: 'Deposit' },
    { k: 'score', label: 'Renter score', short: 'Score' },
  ]
  const navItems = role === 'landlord' ? lNavItems : tNavItems

  // ── Shared sub-components ────────────────────────────────────────────────

  function RepairRow({ r, isLandlord = false }: { r: RepairRequest; isLandlord?: boolean }) {
    const dotColor = r.status === 'open' ? 'var(--rb-accent)' : r.status === 'in_progress' ? 'var(--rb-warning)' : 'var(--rb-action)'
    const stColor = r.status === 'open' ? { bg: 'var(--rb-accent-soft)', c: 'var(--rb-accent)' } : r.status === 'in_progress' ? { bg: 'var(--rb-warning-soft)', c: 'var(--rb-warning)' } : { bg: 'var(--rb-action-soft)', c: 'var(--rb-action)' }
    const stLabel = r.status === 'open' ? 'OPEN' : r.status === 'in_progress' ? 'IN PROGRESS' : 'DONE'
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14, alignItems: 'center', padding: 12, borderRadius: 10, background: 'var(--rb-surface)', marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--rb-ink)' }}>{r.title}</div>
          <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>{isLandlord ? (r.rental?.property?.name || '') : relDate(r.created_at)}</div>
        </div>
        <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 9, fontWeight: 700, padding: '4px 9px', borderRadius: 999, letterSpacing: '.04em', background: stColor.bg, color: stColor.c }}>{stLabel}</span>
      </div>
    )
  }

  function ProofGrid({ photos }: { photos: ProofPhoto[] }) {
    const colors = ['#a87a4f','#9aa6a3','#c9a878','#a89280','#7a5d35','#5b3a20']
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {photos.slice(0, 8).map((p, i) => (
          <div key={p.id} onClick={() => setLightbox({ url: p.public_url || '', label: p.room_label || 'Room' })}
            style={{ aspectRatio: '1', borderRadius: 8, position: 'relative', overflow: 'hidden', cursor: 'pointer', background: p.public_url ? 'none' : `linear-gradient(135deg,${colors[i % colors.length]},#2c1c0e)` }}>
            {p.public_url && <img src={p.public_url} alt={p.room_label || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 50%,rgba(0,0,0,.55))' }} />
            <span style={{ position: 'absolute', bottom: 8, left: 10, color: '#fff', fontSize: 11, fontWeight: 600, zIndex: 1 }}>{p.room_label || 'Room'}</span>
          </div>
        ))}
      </div>
    )
  }

  // ── Landlord views ───────────────────────────────────────────────────────
  function LandlordHome() {
    const d = landlordData
    if (!d || d.rentals?.length === 0) return <LandlordEmpty />
    const { rentals, currentPayments, ytdTotal, totalMonthlyRent, paidThisMonth, dueThisMonth, onTimeCount, activeRentals, collectionRate, score, recentRepairs } = d
    const band = scoreBand(score)
    const pct = totalMonthlyRent > 0 ? Math.min(100, Math.round(paidThisMonth / totalMonthlyRent * 100)) : 0
    const openRepairs = recentRepairs.filter((r: RepairRequest) => r.status === 'open' || r.status === 'in_progress')
    return (
      <>
        <div style={topStyle}>
          <div>
            <div style={eyebrowStyle}>Landlord · Overview</div>
            <h1 style={h1Style}>Good morning, {firstName}.</h1>
            <p style={subStyle}>You have <strong>{activeRentals.length} active propert{activeRentals.length === 1 ? 'y' : 'ies'}</strong>{dueThisMonth > 0 ? <> — <strong>{inr(dueThisMonth)} pending</strong> this month</> : ' — all collections up to date'}. Score <strong>{score}/900</strong>.</p>
          </div>
        </div>
        <div style={gridStyle}>
          <section style={{ ...cardStyle, gridColumn: 'span 2', background: 'linear-gradient(135deg,#0F4C5C,#163A47)', color: '#F6F4EE', border: 0 }}>
            <div style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 11, letterSpacing: '.14em', color: 'rgba(246,244,238,.6)' }}>COLLECTED · {monthLabel(currentMonth).toUpperCase()}</div>
            <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 56, lineHeight: 1, letterSpacing: '-.025em', marginTop: 10 }}>{inr(paidThisMonth)} <span style={{ fontSize: 24, color: 'rgba(246,244,238,.5)' }}>/ {inr(totalMonthlyRent)}</span></div>
            <div style={{ height: 6, background: 'rgba(246,244,238,.12)', borderRadius: 999, marginTop: 18, overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, background: 'var(--rb-accent)', borderRadius: 999 }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginTop: 22, paddingTop: 20, borderTop: '1px solid rgba(246,244,238,.12)' }}>
              {[{ l: 'On time', v: `${onTimeCount} / ${activeRentals.length}` }, { l: 'Pending', v: dueThisMonth > 0 ? inr(dueThisMonth) : '—', accent: true }, { l: 'YTD income', v: ytdTotal > 100000 ? (ytdTotal/100000).toFixed(1)+'L' : inr(ytdTotal) }, { l: 'Score', v: `${score}`, of: '/900' }].map(s => (
                <div key={s.l}>
                  <div style={{ fontSize: 11, color: 'rgba(246,244,238,.55)', letterSpacing: '.08em', textTransform: 'uppercase' as const }}>{s.l}</div>
                  <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 24, marginTop: 4, color: s.accent ? 'var(--rb-accent)' : undefined }}>{s.v}{s.of && <span style={{ fontSize: 14, color: 'rgba(246,244,238,.5)' }}>{s.of}</span>}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)' }}>Landlord score</div>
            <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 64, lineHeight: 1, marginTop: 10, letterSpacing: '-.03em', color: 'var(--rb-accent)' }}>{score}</div>
            <span style={{ display: 'inline-block', marginTop: 8, padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '.12em', background: 'var(--rb-accent-soft)', color: 'var(--rb-accent)' }}>{band.label}</span>
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[{ l: `Collection rate · ${collectionRate}%`, w: collectionRate }, { l: `${rentals.length} propert${rentals.length===1?'y':'ies'} managed`, w: Math.min(100, rentals.length * 25) }, { l: openRepairs.length === 0 ? 'No open repairs' : `${openRepairs.length} open repair${openRepairs.length>1?'s':''}`, w: openRepairs.length === 0 ? 100 : Math.max(10, 100 - openRepairs.length * 20) }].map(b => (
                <div key={b.l}><span style={{ fontSize: 12, color: 'var(--rb-ink-2)' }}>{b.l}</span><div style={{ height: 4, background: 'var(--rb-fill-2)', borderRadius: 4, marginTop: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${b.w}%`, background: 'var(--rb-accent)', borderRadius: 4 }} /></div></div>
              ))}
            </div>
          </section>

          <section style={{ ...cardStyle, gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div><h3 style={cardH3Style}>Properties</h3><span style={{ fontSize: 12, color: 'var(--rb-ink-3)', display: 'block', marginTop: 4 }}>{activeRentals.length} active · {rentals.length} total</span></div>
              <button onClick={() => setModal('add-property')} style={actBtnPrimary}>+ Add property</button>
            </div>
            <PropList rentals={rentals} currentPayments={currentPayments} />
          </section>

          <section style={cardStyle}>
            <h3 style={cardH3Style}>Quick actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
              {[{ icon: '🏠', label: 'Add property', sub: 'Create & invite tenant', fn: () => setModal('add-property') }, { icon: '📄', label: 'HRA receipts', sub: 'View all issued', fn: () => navigate('hra') }, { icon: '🛠', label: 'Repairs', sub: 'Review open requests', fn: () => navigate('rep') }, { icon: '≡', label: 'Full ledger', sub: 'All transactions', fn: () => navigate('led') }].map(a => (
                <button key={a.label} onClick={a.fn} style={{ padding: 14, background: 'var(--rb-surface)', border: '1px solid var(--rb-border-soft)', borderRadius: 10, textAlign: 'left', cursor: 'pointer', transition: 'all .2s', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 18 }}>{a.icon}</span><strong style={{ fontSize: 13, color: 'var(--rb-ink)' }}>{a.label}</strong><span style={{ fontSize: 11, color: 'var(--rb-ink-3)' }}>{a.sub}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </>
    )
  }

  function LandlordEmpty() {
    return (
      <>
        <div style={topStyle}><div><div style={eyebrowStyle}>Landlord · Overview</div><h1 style={h1Style}>Good to see you, {firstName}.</h1></div></div>
        <div style={{ background: 'linear-gradient(135deg,var(--rb-action),var(--rb-action-hover))', borderRadius: 16, padding: '28px 32px', color: '#F6F4EE', marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: 'rgba(246,244,238,.6)' }}>No properties yet</div>
          <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-.02em', marginTop: 6 }}>Add your first property.</h2>
          <p style={{ fontSize: 14, color: 'rgba(246,244,238,.8)', marginTop: 8, lineHeight: 1.55 }}>Create a property, set rent terms, and share the invite link with your tenant.</p>
          <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
            <button onClick={() => setModal('add-property')} style={{ ...actBtnPrimary, background: 'rgba(246,244,238,.15)', border: '1px solid rgba(246,244,238,.3)' }}>+ Add property →</button>
          </div>
        </div>
      </>
    )
  }

  function PropList({ rentals, currentPayments }: { rentals: Rental[]; currentPayments: RentPayment[] }) {
    if (rentals.length === 0) return <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--rb-ink-3)' }}>No properties yet.</div>
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rentals.map((r, i) => {
          const pmt = currentPayments.find(p => p.rental_id === r.id)
          const pill = !pmt ? { t: 'No tenant', cls: 'none' } : pmt.status === 'paid' ? { t: 'Paid', cls: 'paid' } : pmt.status === 'pending_verification' ? { t: 'Pending review', cls: 'pending' } : { t: 'Due', cls: 'due' }
          const pillColor = { paid: { bg: 'var(--rb-action-soft)', c: 'var(--rb-action)' }, due: { bg: 'var(--rb-warning-soft)', c: 'var(--rb-warning)' }, pending: { bg: 'var(--rb-accent-soft)', c: 'var(--rb-accent)' }, none: { bg: 'var(--rb-fill-2)', c: 'var(--rb-ink-3)' } }[pill.cls] || { bg: 'var(--rb-fill-2)', c: 'var(--rb-ink-3)' }
          const colors = ['#a87a4f','#9aa6a3','#c9a878','#a89280']
          return (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: 16, alignItems: 'center', padding: 12, background: 'var(--rb-surface)', border: '1px solid var(--rb-border-soft)', borderRadius: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: 8, background: `linear-gradient(135deg,${colors[i%colors.length]},#2c1c0e)`, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 22 }}>🏠</div>
              <div>
                <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)', fontWeight: 600 }}>{r.property?.city || 'City'}</div>
                <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 18, lineHeight: 1.15, letterSpacing: '-.01em', marginTop: 2 }}>{r.property?.name || r.property?.address || 'Property'}</div>
                <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>{r.tenant?.full_name || 'No tenant yet'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 22, letterSpacing: '-.015em' }}>{inr(r.monthly_rent)}<span style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginLeft: 2 }}>/mo</span></div>
                <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999, marginTop: 4, display: 'inline-block', letterSpacing: '.04em', background: pillColor.bg, color: pillColor.c }}>{pill.t}</span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function LandlordProperties() {
    return (
      <>
        <div style={topStyle}>
          <div><div style={eyebrowStyle}>Landlord · Properties</div><h1 style={h1Style}>Properties.</h1></div>
          <button onClick={() => setModal('add-property')} style={actBtnPrimary}>+ Add property</button>
        </div>
        <section style={cardStyle}><PropList rentals={landlordData?.rentals || []} currentPayments={landlordData?.currentPayments || []} /></section>
      </>
    )
  }

  function LandlordRepairs() {
    const repairs: RepairRequest[] = landlordData?.recentRepairs || []
    return (
      <>
        <div style={topStyle}><div><div style={eyebrowStyle}>Landlord · Repairs</div><h1 style={h1Style}>Repair requests.</h1><p style={subStyle}>{repairs.filter(r => r.status === 'open' || r.status === 'in_progress').length} open · {repairs.length} total</p></div></div>
        <section style={cardStyle}>{repairs.length > 0 ? repairs.map(r => <RepairRow key={r.id} r={r} isLandlord />) : <div style={emptyStyle}><div style={{ fontSize: 32, marginBottom: 12 }}>🛠</div><p>No repair requests.</p></div>}</section>
      </>
    )
  }

  function LandlordHRA() {
    const payments: RentPayment[] = landlordData?.ytdPayments || []
    return (
      <>
        <div style={topStyle}><div><div style={eyebrowStyle}>Landlord · Receipts</div><h1 style={h1Style}>HRA receipts.</h1></div></div>
        <section style={cardStyle}>
          {payments.length > 0 ? <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {payments.map(p => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 14, alignItems: 'center', padding: '10px 12px', background: 'var(--rb-surface)', borderRadius: 10 }}>
                  <div><div style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--rb-ink-3)', fontWeight: 600 }}>{monthLabel(p.month).toUpperCase()}</div></div>
                  <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 18 }}>{inr(p.amount)}</div>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--rb-action-soft)', color: 'var(--rb-action)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>✓</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--rb-border)', fontSize: 13, color: 'var(--rb-ink-2)', alignItems: 'center' }}>
              <span>YTD income</span><strong style={{ fontFamily: 'var(--rb-font-display)', fontSize: 22, color: 'var(--rb-action)', letterSpacing: '-.015em' }}>{inr(landlordData?.ytdTotal)}</strong>
            </div>
          </> : <div style={emptyStyle}><div style={{ fontSize: 32, marginBottom: 12 }}>📄</div><p>No receipts yet.</p></div>}
        </section>
      </>
    )
  }

  function LandlordLedger() {
    const payments: RentPayment[] = landlordData?.ytdPayments || []
    return (
      <>
        <div style={topStyle}><div><div style={eyebrowStyle}>Landlord · Ledger</div><h1 style={h1Style}>Activity ledger.</h1><p style={subStyle}>Sealed record · {inr(landlordData?.ytdTotal)} collected YTD</p></div></div>
        <section style={cardStyle}>
          {payments.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
              <thead><tr>{['Date','Item','Amount'].map(h => <th key={h} style={{ textAlign: h === 'Amount' ? 'right' : 'left', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)', fontWeight: 700, padding: '10px 8px', borderBottom: '1px solid var(--rb-border)' }}>{h}</th>)}</tr></thead>
              <tbody>{payments.map(p => (
                <tr key={p.id}>
                  <td style={{ padding: '12px 8px', fontSize: 13, fontFamily: 'var(--rb-font-mono)', borderBottom: '1px solid var(--rb-border-soft)', color: 'var(--rb-ink-2)' }}>{relDate(p.created_at)}</td>
                  <td style={{ padding: '12px 8px', fontSize: 13, borderBottom: '1px solid var(--rb-border-soft)', color: 'var(--rb-ink-2)' }}><span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, marginRight: 8, background: 'var(--rb-action-soft)', color: 'var(--rb-action)' }}>IN</span>Rent</td>
                  <td style={{ padding: '12px 8px', fontSize: 13, borderBottom: '1px solid var(--rb-border-soft)', fontFamily: 'var(--rb-font-mono)', textAlign: 'right', color: 'var(--rb-action)', fontWeight: 600 }}>+{inr(p.amount)}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <div style={emptyStyle}><div style={{ fontSize: 32, marginBottom: 12 }}>📋</div><p>No activity yet.</p></div>}
        </section>
      </>
    )
  }

  // ── Tenant views ─────────────────────────────────────────────────────────
  function TenantHome() {
    const d = tenantData
    if (!d?.rental) return <TenantEmpty />
    const { rental, currentPayment, recentPayments, openRepairs, proofs, ytdTotal, score, nextDueDate } = d
    const band = scoreBand(score)
    const isPaid = currentPayment?.status === 'paid'
    const isPending = currentPayment?.status === 'pending_verification'
    const daysLeft = nextDueDate ? Math.ceil((nextDueDate.getTime() - now.getTime()) / 86400000) : null
    const nextMonthStr = nextDueDate ? `${MONTHS[nextDueDate.getMonth()]} ${nextDueDate.getFullYear()}` : ''
    const property = rental.property || {}
    const propLine = [property.name, property.city].filter(Boolean).join(' · ')
    const landlordName = rental.landlord?.full_name || 'Landlord'
    return (
      <>
        <div style={topStyle}><div>
          <div style={eyebrowStyle}>Tenant · Dashboard</div>
          <h1 style={h1Style}>Hi, {firstName}.</h1>
          <p style={subStyle}>Rent for <strong>{monthLabel(currentMonth)}</strong> is {isPaid ? <strong style={{ color: 'var(--rb-success)' }}>paid & receipted ✓</strong> : isPending ? <strong style={{ color: 'var(--rb-accent)' }}>pending landlord review</strong> : <strong style={{ color: 'var(--rb-accent)' }}>pending</strong>}. Score <strong>{score}/900</strong>.</p>
        </div></div>
        <div style={gridStyle}>
          <section style={{ ...cardStyle, gridColumn: 'span 2', background: 'linear-gradient(135deg,#14403E,#0F2A2D)', color: '#F6F4EE', border: 0 }}>
            <div style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 11, letterSpacing: '.14em', color: 'rgba(246,244,238,.6)' }}>{isPaid ? `CURRENT RENT · ${monthLabel(currentMonth).toUpperCase()}` : `NEXT RENT · ${nextMonthStr.toUpperCase()}`}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, marginTop: 14, flexWrap: 'wrap' as const }}>
              <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 64, lineHeight: 1, letterSpacing: '-.03em' }}>{inr(rental.monthly_rent)}</div>
              {isPaid ? <div style={{ color: 'rgba(168,230,200,.9)' }}>✓ <strong style={{ color: '#A8E6C8' }}>Paid</strong> · {relDate(currentPayment?.updated_at || currentPayment?.created_at)}</div>
                : daysLeft !== null ? <div style={{ color: 'rgba(246,244,238,.78)', fontSize: 15 }}>Due in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong></div> : null}
            </div>
            {isPaid ? <div style={{ marginTop: 18 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'rgba(31,122,85,.25)', border: '1px solid rgba(31,122,85,.35)', borderRadius: 999, fontSize: 13, fontWeight: 600, color: '#A8E6C8' }}>✓ Paid this month</span></div>
              : isPending ? <div style={{ marginTop: 18 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'rgba(201,122,58,.15)', border: '1px solid rgba(201,122,58,.3)', borderRadius: 999, fontSize: 13, fontWeight: 600, color: 'var(--rb-accent)' }}>⏳ Awaiting landlord confirmation</span></div>
              : <div style={{ marginTop: 18, display: 'flex', gap: 10 }}><button onClick={() => setModal('pay-rent')} style={{ ...actBtnPrimary, background: '#fff', color: 'var(--rb-action)' }}>Pay / record payment →</button></div>}
            <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(246,244,238,.12)', display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12, color: 'rgba(246,244,238,.65)' }}>
              <span>{propLine}</span><span>Landlord · {landlordName}</span>
            </div>
          </section>

          <section style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)' }}>Tenant score</div>
            <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 64, lineHeight: 1, marginTop: 10, letterSpacing: '-.03em', color: 'var(--rb-action)' }}>{score}</div>
            <span style={{ display: 'inline-block', marginTop: 8, padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '.12em', background: 'var(--rb-action-soft)', color: 'var(--rb-action)' }}>{band.label}</span>
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[{ l: `On-time rent · ${recentPayments.length} month${recentPayments.length!==1?'s':''} paid`, w: Math.min(100, recentPayments.length*12+28) }, { l: `Move-in proof · ${proofs ? 'submitted ✓' : 'pending'}`, w: proofs ? 100 : 0 }, { l: openRepairs.length===0 ? 'No open repairs' : `${openRepairs.length} open`, w: openRepairs.length===0 ? 100 : 60 }].map(b => (
                <div key={b.l}><span style={{ fontSize: 12, color: 'var(--rb-ink-2)' }}>{b.l}</span><div style={{ height: 4, background: 'var(--rb-fill-2)', borderRadius: 4, marginTop: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${b.w}%`, background: 'var(--rb-action)', borderRadius: 4 }} /></div></div>
              ))}
            </div>
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px dashed var(--rb-border)', fontSize: 12, color: 'var(--rb-ink-3)' }}>Score carries to your next rental →</div>
          </section>

          <section style={{ ...cardStyle, gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div><h3 style={cardH3Style}>Move-in proof</h3><span style={{ fontSize: 12, color: 'var(--rb-ink-3)', display: 'block', marginTop: 4 }}>{proofs ? `${proofs.proof_photos?.length || 0} photos · ${proofs.status}` : 'Not yet submitted'}</span></div>
              {(!proofs || proofs.status === 'pending') && <button onClick={() => navigate('proof')} style={actBtnSm}>+ Add photos</button>}
            </div>
            {proofs && proofs.proof_photos && proofs.proof_photos.length > 0 ? <ProofGrid photos={proofs.proof_photos} /> : <div style={{ textAlign: 'center', padding: '20px 0' }}><p style={{ color: 'var(--rb-ink-3)', fontSize: 14 }}>Document your room condition at move-in.</p><button onClick={() => navigate('proof')} style={{ ...actBtnPrimary, marginTop: 12 }}>+ Add move-in photos</button></div>}
          </section>

          <section style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div><h3 style={cardH3Style}>HRA receipts</h3><span style={{ fontSize: 12, color: 'var(--rb-ink-3)', display: 'block', marginTop: 4 }}>Section 10(13A)</span></div>
            </div>
            {recentPayments.length > 0 ? <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recentPayments.slice(0, 5).map((p: RentPayment) => (
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 14, alignItems: 'center', padding: '10px 12px', background: 'var(--rb-surface)', borderRadius: 10 }}>
                    <div><div style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--rb-ink-3)', fontWeight: 600 }}>{monthLabel(p.month).toUpperCase()}</div><div style={{ fontSize: 11, color: 'var(--rb-ink-3)', marginTop: 2, fontFamily: 'var(--rb-font-mono)' }}>{propLine}</div></div>
                    <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 18 }}>{inr(p.amount)}</div>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--rb-action-soft)', color: 'var(--rb-action)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>✓</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--rb-border)', fontSize: 13, color: 'var(--rb-ink-2)', alignItems: 'center' }}>
                <span>YTD HRA eligible</span><strong style={{ fontFamily: 'var(--rb-font-display)', fontSize: 22, color: 'var(--rb-action)', letterSpacing: '-.015em' }}>{inr(ytdTotal)}</strong>
              </div>
            </> : <div style={emptyStyle}><div style={{ fontSize: 32, marginBottom: 12 }}>📄</div><p>Receipts appear after confirmed payments.</p></div>}
          </section>

          <section style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div><h3 style={cardH3Style}>Repairs</h3></div>
              <button onClick={() => setModal('new-repair')} style={actBtnSm}>+ New</button>
            </div>
            {openRepairs.length > 0 ? openRepairs.map((r: RepairRequest) => <RepairRow key={r.id} r={r} />) : <div style={emptyStyle}><div style={{ fontSize: 32, marginBottom: 12 }}>✓</div><p>No open repair requests.</p></div>}
          </section>
        </div>
      </>
    )
  }

  function TenantEmpty() {
    return (
      <>
        <div style={topStyle}><div><div style={eyebrowStyle}>Tenant · Dashboard</div><h1 style={h1Style}>Hi, {firstName}.</h1><p style={subStyle}>You haven't joined a rental yet.</p></div></div>
        <div style={{ background: 'linear-gradient(135deg,var(--rb-action),var(--rb-action-hover))', borderRadius: 16, padding: '28px 32px', color: '#F6F4EE' }}>
          <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 28, fontWeight: 400 }}>Join your rental.</h2>
          <p style={{ fontSize: 14, color: 'rgba(246,244,238,.8)', marginTop: 8, lineHeight: 1.55 }}>Ask your landlord to share an invite link. Your receipts and history will appear here once active.</p>
        </div>
      </>
    )
  }

  function TenantPay() {
    const d = tenantData
    if (!d?.rental) return <TenantEmpty />
    const { rental, currentPayment, nextDueDate } = d
    const isPaid = currentPayment?.status === 'paid'
    const isPending = currentPayment?.status === 'pending_verification'
    return (
      <>
        <div style={topStyle}><div><div style={eyebrowStyle}>Tenant · Pay rent</div><h1 style={h1Style}>Pay rent.</h1><p style={subStyle}>{monthLabel(currentMonth)} · {inr(rental.monthly_rent)}</p></div></div>
        <section style={{ ...cardStyle, background: 'linear-gradient(135deg,#14403E,#0F2A2D)', color: '#F6F4EE', border: 0, marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 11, letterSpacing: '.14em', color: 'rgba(246,244,238,.6)' }}>RENT · {monthLabel(currentMonth).toUpperCase()}</div>
          <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 64, lineHeight: 1, letterSpacing: '-.03em', marginTop: 14 }}>{inr(rental.monthly_rent)}</div>
          {isPaid ? <div style={{ marginTop: 18 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'rgba(31,122,85,.25)', border: '1px solid rgba(31,122,85,.35)', borderRadius: 999, fontSize: 13, fontWeight: 600, color: '#A8E6C8' }}>✓ Paid · {relDate(currentPayment?.updated_at || currentPayment?.created_at)}</span></div>
            : isPending ? <div style={{ marginTop: 18 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'rgba(201,122,58,.15)', border: '1px solid rgba(201,122,58,.3)', borderRadius: 999, fontSize: 13, fontWeight: 600, color: 'var(--rb-accent)' }}>⏳ Pending landlord confirmation</span>
              {currentPayment?.payment_method && <div style={{ marginTop: 14, padding: 14, background: 'rgba(246,244,238,.06)', borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: 'rgba(246,244,238,.6)', marginBottom: 8 }}>Payment details</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{methodLabel(currentPayment.payment_method)}</div>
                {currentPayment.utr_number && <div style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 13, color: 'rgba(246,244,238,.8)', marginTop: 4 }}>Ref: {currentPayment.utr_number}</div>}
                {currentPayment.payment_note && <div style={{ fontSize: 12, color: 'rgba(246,244,238,.6)', marginTop: 4 }}>{currentPayment.payment_note}</div>}
                {currentPayment.payment_proof_url && <img src={currentPayment.payment_proof_url} alt="Receipt" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, marginTop: 8, cursor: 'pointer' }} onClick={() => setLightbox({ url: currentPayment.payment_proof_url!, label: 'Payment receipt' })} />}
              </div>}
            </div>
            : <div style={{ marginTop: 18, display: 'flex', gap: 10 }}><button onClick={() => setModal('pay-rent')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 999, background: '#fff', color: 'var(--rb-action)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 0 }}>Pay / record payment →</button></div>}
        </section>
        <section style={cardStyle}>
          <h3 style={cardH3Style}>Payment history</h3>
          {d.recentPayments?.length > 0 ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
            {d.recentPayments.map((p: RentPayment) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--rb-surface)', borderRadius: 10 }}>
                <div><div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', color: 'var(--rb-ink-3)' }}>{monthLabel(p.month).toUpperCase()}</div><div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>{methodLabel(p.payment_method)}</div></div>
                <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 18 }}>{inr(p.amount)}</div>
                <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'var(--rb-action-soft)', color: 'var(--rb-action)' }}>PAID</span>
              </div>
            ))}
          </div> : <div style={{ ...emptyStyle, marginTop: 14 }}><p>No payment history yet.</p></div>}
        </section>
      </>
    )
  }

  function TenantHRA() {
    const d = tenantData
    const payments: RentPayment[] = d?.recentPayments || []
    const propLine = d?.rental ? [d.rental.property?.name, d.rental.property?.city].filter(Boolean).join(' · ') : ''
    return (
      <>
        <div style={topStyle}><div><div style={eyebrowStyle}>Tenant · HRA</div><h1 style={h1Style}>HRA receipts.</h1><p style={subStyle}>Section 10(13A) · FY {now.getFullYear()-1}–{String(now.getFullYear()).slice(2)}</p></div></div>
        <section style={cardStyle}>
          {payments.length > 0 ? <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {payments.map(p => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 14, alignItems: 'center', padding: '10px 12px', background: 'var(--rb-surface)', borderRadius: 10 }}>
                  <div><div style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--rb-ink-3)', fontWeight: 600 }}>{monthLabel(p.month).toUpperCase()}</div><div style={{ fontSize: 11, color: 'var(--rb-ink-3)', marginTop: 2, fontFamily: 'var(--rb-font-mono)' }}>{propLine}</div></div>
                  <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 18 }}>{inr(p.amount)}</div>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--rb-action-soft)', color: 'var(--rb-action)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>✓</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--rb-border)', fontSize: 13, alignItems: 'center' }}>
              <span style={{ color: 'var(--rb-ink-2)' }}>YTD HRA eligible</span><strong style={{ fontFamily: 'var(--rb-font-display)', fontSize: 22, color: 'var(--rb-action)' }}>{inr(d?.ytdTotal)}</strong>
            </div>
          </> : <div style={emptyStyle}><div style={{ fontSize: 32, marginBottom: 12 }}>📄</div><p>No receipts yet. They appear after confirmed payments.</p></div>}
        </section>
      </>
    )
  }

  function TenantRepairs() {
    const repairs: RepairRequest[] = tenantData?.openRepairs || []
    return (
      <>
        <div style={topStyle}>
          <div><div style={eyebrowStyle}>Tenant · Repairs</div><h1 style={h1Style}>Repair requests.</h1></div>
          <button onClick={() => setModal('new-repair')} style={actBtnPrimary}>+ New request</button>
        </div>
        <section style={cardStyle}>{repairs.length > 0 ? repairs.map(r => <RepairRow key={r.id} r={r} />) : <div style={emptyStyle}><div style={{ fontSize: 32, marginBottom: 12 }}>✓</div><p>No open repair requests. All good!</p></div>}</section>
      </>
    )
  }

  function TenantProof() {
    const proofs: Proof | null = tenantData?.proofs || null
    const photos: ProofPhoto[] = proofs?.proof_photos || []
    return (
      <>
        <div style={topStyle}>
          <div><div style={eyebrowStyle}>Tenant · Move-in proof</div><h1 style={h1Style}>Move-in proof.</h1><p style={subStyle}>{proofs ? `${photos.length} photos · ${proofs.status}` : 'Not yet submitted'}</p></div>
          {(!proofs || proofs.status === 'pending') && <button onClick={() => setModal('add-proof-photo')} style={actBtnPrimary}>+ Add photos</button>}
        </div>
        <section style={cardStyle}>
          {proofs?.status === 'approved' && <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--rb-action-soft)', border: '1px solid rgba(15,76,92,.2)', color: 'var(--rb-action)', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>✓ Approved by landlord</div>}
          {photos.length > 0 ? <ProofGrid photos={photos} /> : <div style={emptyStyle}><div style={{ fontSize: 32, marginBottom: 12 }}>📷</div><p>No photos yet. Document your room condition at move-in.</p><button onClick={() => setModal('add-proof-photo')} style={{ ...actBtnPrimary, marginTop: 12 }}>+ Add photos</button></div>}
        </section>
      </>
    )
  }

  function TenantDeposit() {
    const transactions: DepositTx[] = tenantData?.depositTransactions || []
    const balance = transactions.reduce((s: number, t: DepositTx) => s + (t.type === 'received' ? Number(t.amount) : -Number(t.amount)), 0)
    return (
      <>
        <div style={topStyle}><div><div style={eyebrowStyle}>Tenant · Deposit</div><h1 style={h1Style}>Security deposit.</h1><p style={subStyle}>{inr(balance)} held</p></div></div>
        <section style={cardStyle}>
          {transactions.length > 0 ? transactions.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--rb-border-soft)' }}>
              <div><div style={{ fontSize: 13, fontWeight: 600 }}>{t.description || t.type}</div><div style={{ fontSize: 11, color: 'var(--rb-ink-3)', marginTop: 2 }}>{relDate(t.created_at)}</div></div>
              <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 18, color: t.type === 'received' ? 'var(--rb-action)' : 'var(--rb-warning)' }}>{t.type === 'received' ? '+' : '-'}{inr(t.amount)}</div>
            </div>
          )) : <div style={emptyStyle}><div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div><p>No deposit transactions yet.</p></div>}
        </section>
      </>
    )
  }

  function TenantAgreement() {
    const rental: Rental | null = tenantData?.rental || null
    return (
      <>
        <div style={topStyle}><div><div style={eyebrowStyle}>Tenant · Agreement</div><h1 style={h1Style}>Rental agreement.</h1></div></div>
        <section style={cardStyle}>
          {rental ? <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[{ l: 'Monthly rent', v: inr(rental.monthly_rent) }, { l: 'Security deposit', v: inr(rental.security_deposit) }, { l: 'Rent due day', v: `${rental.rent_due_day}th of every month` }, { l: 'Status', v: rental.status }, { l: 'Agreement signed', v: rental.agreement_signed_at ? relDate(rental.agreement_signed_at) : 'Not signed' }].map(f => (
                <div key={f.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--rb-border-soft)' }}>
                  <span style={{ fontSize: 13, color: 'var(--rb-ink-3)' }}>{f.l}</span><span style={{ fontSize: 13, fontWeight: 600 }}>{f.v}</span>
                </div>
              ))}
            </div>
            {!rental.agreement_signed_at && <button style={{ ...actBtnPrimary, marginTop: 18 }}>Sign agreement</button>}
          </> : <div style={emptyStyle}><p>No active rental found.</p></div>}
        </section>
      </>
    )
  }

  function TenantScore() {
    const d = tenantData
    const score: number = d?.score || 700
    const band = scoreBand(score)
    const r: RentPayment[] = d?.recentPayments || []
    return (
      <>
        <div style={topStyle}><div><div style={eyebrowStyle}>Tenant · Score</div><h1 style={h1Style}>Renter score.</h1></div></div>
        <section style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
            <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 96, lineHeight: 1, letterSpacing: '-.03em', color: 'var(--rb-action)' }}>{score}</div>
            <span style={{ display: 'inline-block', marginTop: 8, padding: '4px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: '.12em', background: 'var(--rb-action-soft)', color: 'var(--rb-action)' }}>{band.label}</span>
            <p style={{ fontSize: 13, color: 'var(--rb-ink-3)', marginTop: 12 }}>out of 900</p>
          </div>
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[{ l: `On-time payments · ${r.length} months`, w: Math.min(100, r.length*12+28) }, { l: `Move-in proof · ${d?.proofs ? 'submitted' : 'pending'}`, w: d?.proofs ? 100 : 0 }, { l: 'No pending repairs', w: (d?.openRepairs?.length || 0) === 0 ? 100 : 60 }].map(b => (
              <div key={b.l}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 13, color: 'var(--rb-ink-2)' }}>{b.l}</span><span style={{ fontSize: 13, fontWeight: 600 }}>{b.w}%</span></div><div style={{ height: 6, background: 'var(--rb-fill-2)', borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${b.w}%`, background: 'var(--rb-action)', borderRadius: 4 }} /></div></div>
            ))}
          </div>
          <div style={{ marginTop: 24, padding: 16, background: 'var(--rb-fill)', borderRadius: 12, fontSize: 13, color: 'var(--rb-ink-2)', lineHeight: 1.55 }}>This score carries to your next rental. Pay on time every month to build toward Excellent (850+).</div>
        </section>
      </>
    )
  }

  function ProfileView() {
    const isTenant = role === 'tenant'
    const d = tenantData
    const featureCards = isTenant ? [
      { k: 'agree', icon: '📋', title: 'Agreement', sub: 'View terms', badge: d?.rental?.agreement_signed_at ? '✅ Signed' : '⏳ Pending' },
      { k: 'proof', icon: '📷', title: 'Move-in proof', sub: 'Photo record', badge: d?.proofs ? (d.proofs.status === 'approved' ? '✅ Approved' : '📷 Submitted') : '📷 Not submitted' },
      { k: 'dep', icon: '🔒', title: 'Deposit', sub: 'Security deposit', badge: `🔒 Held` },
      { k: 'score', icon: '★', title: 'Renter score', sub: 'Your rating', badge: `⭐ ${d?.score || 700}/900` },
    ] : []
    return (
      <>
        <div style={topStyle}><div><div style={eyebrowStyle}>Profile</div><h1 style={h1Style}>{firstName}.</h1></div></div>
        <div style={gridStyle}>
          <section style={{ ...cardStyle, gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: avatarBg, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 24, fontFamily: 'var(--rb-font-display)', fontWeight: 700, overflow: 'hidden' }}>
                {avatarUrl ? <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : firstName.charAt(0).toUpperCase()}
              </div>
              <div><div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 24, letterSpacing: '-.02em' }}>{name}</div><div style={{ fontSize: 13, color: 'var(--rb-ink-3)', marginTop: 2 }}>{user?.email} · <span style={{ textTransform: 'capitalize' as const }}>{role}</span></div></div>
            </div>
            {[{ l: 'Email', v: user?.email }, { l: 'Role', v: role }, { l: 'Phone', v: profile?.phone || '—' }].map(f => (
              <div key={f.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--rb-border-soft)' }}>
                <span style={{ fontSize: 13, color: 'var(--rb-ink-3)' }}>{f.l}</span><span style={{ fontSize: 13, fontWeight: 600 }}>{f.v}</span>
              </div>
            ))}
            <button onClick={handleSignOut} style={{ marginTop: 20, padding: '8px 16px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--rb-ink-3)', fontFamily: 'inherit' }}>Sign out</button>
          </section>
          {isTenant && featureCards.map(c => (
            <section key={c.k} style={{ ...cardStyle, cursor: 'pointer' }} onClick={() => navigate(c.k)}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{c.icon}</div>
              <h3 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 20, fontWeight: 400 }}>{c.title}</h3>
              <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 4 }}>{c.sub}</div>
              <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: 'var(--rb-action)' }}>{c.badge}</div>
            </section>
          ))}
        </div>
      </>
    )
  }

  // ── Modal actions ────────────────────────────────────────────────────────
  function AddPropertyModal() {
    const [form, setForm] = useState({ name: '', city: '', address: '', monthly_rent: '', security_deposit: '', rent_due_day: '5' })
    const [saving, setSaving] = useState(false)
    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

    const handleSubmit = async () => {
      if (!form.name || !form.monthly_rent) { toast('Fill in property name and rent', 'error'); return }
      setSaving(true)
      try {
        const { data: prop } = await sb.from('properties').insert({ name: form.name, city: form.city, address: form.address, landlord_id: user.id }).select().single()
        if (!prop) throw new Error('Property insert failed')
        const token = Math.random().toString(36).slice(2, 10).toUpperCase()
        const expires = new Date(Date.now() + 72 * 3600000).toISOString()
        await sb.from('rentals').insert({ property_id: prop.id, landlord_id: user.id, monthly_rent: Number(form.monthly_rent), security_deposit: Number(form.security_deposit || 0), rent_due_day: Number(form.rent_due_day), status: 'pending', invite_token: token, invite_expires_at: expires })
        toast('Property added! Share the invite link with your tenant.', 'success')
        setModal(null)
        window.location.reload()
      } catch (e) { console.error(e); toast('Failed to add property', 'error'); setSaving(false) }
    }

    return (
      <Modal title="Add property" onClose={() => setModal(null)}>
        <Field label="Property name"><input style={inputStyle} value={form.name} onChange={set('name')} placeholder="e.g. 2BHK Apartment" /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="City"><input style={inputStyle} value={form.city} onChange={set('city')} placeholder="Hyderabad" /></Field>
          <Field label="Rent due day"><select style={inputStyle} value={form.rent_due_day} onChange={set('rent_due_day')}>{Array.from({length:28},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}th</option>)}</select></Field>
        </div>
        <Field label="Address"><input style={inputStyle} value={form.address} onChange={set('address')} placeholder="Full address" /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Monthly rent (₹)"><input style={inputStyle} type="number" value={form.monthly_rent} onChange={set('monthly_rent')} placeholder="25000" /></Field>
          <Field label="Security deposit (₹)"><input style={inputStyle} type="number" value={form.security_deposit} onChange={set('security_deposit')} placeholder="50000" /></Field>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--rb-border)' }}>
          <button onClick={() => setModal(null)} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 18px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{saving ? 'Saving…' : 'Add property'}</button>
        </div>
      </Modal>
    )
  }

  function PayRentModal() {
    const d = tenantData
    const rental: Rental = d?.rental
    const currentPayment: RentPayment | null = d?.currentPayment || null
    const [method, setMethod] = useState('upi')
    const [utr, setUtr] = useState('')
    const [note, setNote] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState('')
    const [saving, setSaving] = useState(false)

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) { setFile(f); const r = new FileReader(); r.onload = ev => setPreview(ev.target?.result as string); r.readAsDataURL(f) }
    }

    const handleSubmit = async () => {
      setSaving(true)
      try {
        let proofUrl = ''
        if (file) {
          const ts = Date.now()
          const ext = file.name.split('.').pop()
          const path = `payment-receipts/${rental.id}/${ts}.${ext}`
          await sb.storage.from('proof-photos').upload(path, file, { upsert: true })
          const { data: urlData } = sb.storage.from('proof-photos').getPublicUrl(path)
          proofUrl = urlData?.publicUrl || ''
        }
        const pmtData = { payment_method: method, utr_number: utr, payment_note: note, payment_proof_url: proofUrl, status: 'pending_verification', updated_at: new Date().toISOString() }
        if (currentPayment) {
          await sb.from('rent_payments').update(pmtData).eq('id', currentPayment.id)
        } else {
          await sb.from('rent_payments').insert({ ...pmtData, rental_id: rental.id, month: currentMonthDate, amount: rental.monthly_rent })
        }
        toast('Payment recorded! Your landlord will confirm shortly.', 'success')
        setModal(null)
        window.location.reload()
      } catch (e) { console.error(e); toast('Failed to record payment', 'error'); setSaving(false) }
    }

    return (
      <Modal title="Record payment" onClose={() => setModal(null)}>
        <Field label="Payment method">
          <select style={inputStyle} value={method} onChange={e => setMethod(e.target.value)}>
            <option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option><option value="cash">Cash</option>
          </select>
        </Field>
        <Field label="UTR / Reference number"><input style={inputStyle} value={utr} onChange={e => setUtr(e.target.value)} placeholder="e.g. 123456789012" /></Field>
        <Field label="Note (optional)"><input style={inputStyle} value={note} onChange={e => setNote(e.target.value)} placeholder="Any note for your landlord" /></Field>
        <Field label="Upload receipt (optional)">
          <div style={{ border: '1.5px dashed var(--rb-border)', borderRadius: 10, padding: '20px', textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
            {preview ? <img src={preview} alt="Receipt" style={{ maxHeight: 120, borderRadius: 8 }} /> : <div style={{ color: 'var(--rb-ink-3)', fontSize: 13 }}>📎 Tap to attach screenshot</div>}
            <input type="file" accept="image/*" onChange={handleFile} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
          </div>
        </Field>
        <div style={{ padding: 14, background: 'var(--rb-fill)', borderRadius: 10, fontSize: 13, color: 'var(--rb-ink-2)', marginBottom: 8 }}>Amount: <strong>{inr(rental?.monthly_rent)}</strong> for {monthLabel(currentMonth)}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--rb-border)' }}>
          <button onClick={() => setModal(null)} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 18px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{saving ? 'Recording…' : 'Record payment'}</button>
        </div>
      </Modal>
    )
  }

  function NewRepairModal() {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [saving, setSaving] = useState(false)
    const rentalId = role === 'tenant' ? tenantData?.rental?.id : null

    const handleSubmit = async () => {
      if (!title || !rentalId) { toast('Enter a title', 'error'); return }
      setSaving(true)
      try {
        await sb.from('repair_requests').insert({ rental_id: rentalId, title, description, status: 'open', raised_by: user.id })
        toast('Repair request raised!', 'success')
        setModal(null)
        window.location.reload()
      } catch { toast('Failed to raise request', 'error'); setSaving(false) }
    }

    return (
      <Modal title="New repair request" onClose={() => setModal(null)}>
        <Field label="Title"><input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Leaking tap in bathroom" /></Field>
        <Field label="Description (optional)"><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' as const }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue…" /></Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--rb-border)' }}>
          <button onClick={() => setModal(null)} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 18px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{saving ? 'Raising…' : 'Raise request'}</button>
        </div>
      </Modal>
    )
  }

  // ── View router ──────────────────────────────────────────────────────────
  function renderView() {
    if (role === 'landlord') {
      switch (activeView) {
        case 'props': return <LandlordProperties />
        case 'led': return <LandlordLedger />
        case 'hra': return <LandlordHRA />
        case 'rep': return <LandlordRepairs />
        case 'profile': return <ProfileView />
        default: return <LandlordHome />
      }
    } else if (role === 'tenant') {
      switch (activeView) {
        case 'pay': return <TenantPay />
        case 'hra': return <TenantHRA />
        case 'rep': return <TenantRepairs />
        case 'proof': return <TenantProof />
        case 'dep': return <TenantDeposit />
        case 'agree': return <TenantAgreement />
        case 'score': return <TenantScore />
        case 'profile': return <ProfileView />
        default: return <TenantHome />
      }
    }
    return (
      <div>
        <div style={topStyle}><div><div style={eyebrowStyle}>Welcome</div><h1 style={h1Style}>Hi, {firstName}.</h1></div></div>
        <div style={{ background: 'var(--rb-action)', borderRadius: 16, padding: '28px 32px', color: '#F6F4EE' }}>
          <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 28 }}>Complete setup.</h2>
          <p style={{ fontSize: 14, marginTop: 8, lineHeight: 1.55, color: 'rgba(246,244,238,.8)' }}>Open the RentyBase app to choose your role and complete setup.</p>
        </div>
      </div>
    )
  }

  // ── Layout ───────────────────────────────────────────────────────────────
  const mobileItems = navItems.slice(0, 5)

  return (
    <>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:767px){
          .d-shell{display:block!important}
          .d-side{display:none!important}
          .d-main{padding:72px 16px 96px!important;max-width:100%!important}
          .m-head{display:flex!important}
          .m-tabs{display:flex!important}
          .d-grid-inner{flex-direction:column!important;gap:14px!important}
        }
        @media(min-width:768px){
          .m-head{display:none!important}
          .m-tabs{display:none!important}
        }
      `}</style>

      {/* Mobile fixed header */}
      <div className="m-head" style={{ display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'var(--rb-canvas)', borderBottom: '1px solid var(--rb-border)', padding: '13px 18px', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, fontFamily: 'var(--rb-font-display)', fontSize: 18, color: 'var(--rb-ink)', textDecoration: 'none' }}>
          <svg viewBox="0 0 40 40" width="26" height="26" fill="none"><rect width="40" height="40" rx="9" fill="#0E1413"/><path d="M20 7 L34 19 V31 a3 3 0 0 1 -3 3 H9 a3 3 0 0 1 -3 -3 V19 Z" fill="#F6F4EE"/><path d="M13 34 V25 a7 7 0 0 1 14 0 V34 Z" fill="#0E1413"/><rect x="13" y="33" width="14" height="1.4" fill="#C97A3A"/></svg>
          Renty<span style={{ color: '#C97A3A' }}>Base</span>
        </a>
        <button onClick={() => navigate('profile')} style={{ width: 32, height: 32, borderRadius: '50%', background: avatarBg, border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 13, fontFamily: 'var(--rb-font-display)', fontWeight: 700, overflow: 'hidden' }}>
          {avatarUrl ? <img src={avatarUrl} alt={firstName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : firstName.charAt(0).toUpperCase()}
        </button>
      </div>

      {/* Desktop shell */}
      <div className="d-shell" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside className="d-side" style={{ padding: '28px 18px', background: 'var(--rb-canvas)', borderRight: '1px solid var(--rb-border)', display: 'flex', flexDirection: 'column', gap: 28, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--rb-font-display)', fontWeight: 800, fontSize: 19, letterSpacing: '-.02em', color: 'var(--rb-ink)', padding: '0 8px', textDecoration: 'none' }}>
            <svg viewBox="0 0 40 40" width="28" height="28" fill="none"><rect width="40" height="40" rx="9" fill="#0E1413"/><path d="M20 7 L34 19 V31 a3 3 0 0 1 -3 3 H9 a3 3 0 0 1 -3 -3 V19 Z" fill="#F6F4EE"/><path d="M13 34 V25 a7 7 0 0 1 14 0 V34 Z" fill="#0E1413"/><rect x="13" y="33" width="14" height="1.4" fill="#C97A3A"/></svg>
            Renty<span style={{ color: 'var(--rb-accent)' }}>Base</span>
          </a>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            {navItems.map(it => (
              <button key={it.k} onClick={() => navigate(it.k)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: activeView === it.k ? 'var(--rb-ink)' : 'transparent', color: activeView === it.k ? 'var(--rb-canvas)' : 'var(--rb-ink-2)', border: 0, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all .2s' }}>
                <span style={{ width: 22, display: 'grid', placeItems: 'center' }}><NavIcon k={it.k} size={18} active={activeView === it.k} /></span>
                <span>{it.label}</span>
              </button>
            ))}
          </nav>

          <div style={{ paddingTop: 18, borderTop: '1px solid var(--rb-border)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 6px 12px' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: avatarBg, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 16, fontFamily: 'var(--rb-font-display)', fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
                {avatarUrl ? <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : firstName.charAt(0).toUpperCase()}
              </div>
              <div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--rb-ink)' }}>{name}</div><div style={{ fontSize: 11, color: 'var(--rb-ink-3)', textTransform: 'capitalize' }}>{role}</div></div>
            </div>
            <button onClick={handleSignOut} style={{ display: 'block', padding: '8px 12px', fontSize: 12, color: 'var(--rb-ink-3)', borderRadius: 8, border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%' }}>Sign out</button>
          </div>
        </aside>

        {/* Main */}
        <main className="d-main" style={{ padding: '32px 36px 60px', maxWidth: 1200, minWidth: 0 }}>
          {renderView()}
        </main>
      </div>

      {/* Mobile tabs */}
      <div className="m-tabs" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: 'var(--rb-surface)', borderTop: '1px solid var(--rb-border)', padding: '6px 0 12px', boxShadow: '0 -4px 16px rgba(14,20,19,.06)' }}>
        {mobileItems.map(it => (
          <button key={it.k} onClick={() => navigate(it.k)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 2px', border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', color: activeView === it.k ? 'var(--rb-action)' : 'var(--rb-ink-3)', minWidth: 0, transition: 'color .18s' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 46, height: 30, borderRadius: 15, transition: 'background .18s', background: activeView === it.k ? 'var(--rb-action-soft)' : 'transparent' }}>
              <NavIcon k={it.k} size={22} active={activeView === it.k} />
            </span>
            <span style={{ fontSize: 10, fontWeight: activeView === it.k ? 700 : 500, letterSpacing: '.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 62 }}>{it.short || it.label}</span>
          </button>
        ))}
      </div>

      {/* Modals */}
      {modal === 'add-property' && <AddPropertyModal />}
      {modal === 'pay-rent' && <PayRentModal />}
      {modal === 'new-repair' && <NewRepairModal />}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,.88)', display: 'grid', placeItems: 'center', padding: 20 }}>
          <img src={lightbox.url} alt={lightbox.label} style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain' }} />
          <div style={{ position: 'absolute', bottom: 32, color: '#fff', fontSize: 14, fontWeight: 600 }}>{lightbox.label}</div>
        </div>
      )}

      {/* Toasts */}
      <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 700, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: t.type === 'success' ? 'var(--rb-success)' : t.type === 'error' ? 'var(--rb-danger)' : 'var(--rb-ink)', color: 'var(--rb-canvas)', padding: '11px 20px', borderRadius: 999, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}>{t.msg}</div>
        ))}
      </div>
    </>
  )
}

// ── Shared style constants ─────────────────────────────────────────────────
const topStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 28, flexWrap: 'wrap' }
const eyebrowStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--rb-ink-3)' }
const h1Style: React.CSSProperties = { fontFamily: 'var(--rb-font-display)', fontSize: 40, fontWeight: 400, letterSpacing: '-.025em', lineHeight: 1.05, color: 'var(--rb-ink)', marginTop: 4 }
const subStyle: React.CSSProperties = { color: 'var(--rb-ink-2)', marginTop: 6, fontSize: 14, lineHeight: 1.55 }
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }
const cardStyle: React.CSSProperties = { background: 'var(--rb-canvas)', border: '1px solid var(--rb-border-soft)', borderRadius: 16, padding: 22, boxShadow: '0 1px 2px rgba(20,18,12,.03)' }
const cardH3Style: React.CSSProperties = { fontFamily: 'var(--rb-font-display)', fontSize: 22, fontWeight: 400, letterSpacing: '-.015em', lineHeight: 1.1 }
const emptyStyle: React.CSSProperties = { textAlign: 'center', padding: '40px 20px', color: 'var(--rb-ink-3)' }
const actBtnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const actBtnSm: React.CSSProperties = { ...actBtnPrimary, padding: '5px 12px', fontSize: 11 }
