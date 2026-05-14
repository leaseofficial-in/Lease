'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoLockup } from '@/components/brand'

// ── Types ─────────────────────────────────────────────────────────────────
type Profile = { id: string; full_name?: string; avatar_url?: string; role?: string; phone?: string; upi_id?: string; pan_number?: string }
type Building = { id: string; name: string; address_line1: string; address_line2?: string; city: string; state: string; pincode: string; property_type?: string; total_units?: number; created_at: string }
type Rental = { id: string; monthly_rent: number; security_deposit: number; rent_due_day?: number; status: string; invite_token?: string; invite_expires_at?: string; agreement_signed_at?: string; notice_period_days?: number; furnished_status?: string; late_fee_percent?: number; maintenance_charges?: number; lock_in_period_months?: number; rent_increment_percent?: number; property?: Property; landlord?: Profile; tenant?: Profile; landlord_id?: string; tenant_id?: string }
type Property = { id: string; name: string; address_line1?: string; address_line2?: string; city?: string; state?: string; pincode?: string; property_type?: string; bedrooms?: number; bathrooms?: number; area_sqft?: number; floor_number?: number; parking?: boolean; building_id?: string; unit_number?: string; building?: Building }
type RentPayment = { id: string; rental_id: string; month: string; amount: number; status: string; payment_method?: string; utr_number?: string; payment_note?: string; payment_proof_url?: string; created_at: string; updated_at?: string }
type RepairRequest = { id: string; rental_id: string; title: string; description?: string; status: string; cost?: number; category?: string; urgency?: string; photo_url?: string; landlord_note?: string; scheduled_date?: string; deduct_from_deposit?: boolean; created_at: string; rental?: { property?: Property } }
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
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null)
  const [selectedRepair, setSelectedRepair] = useState<RepairRequest | null>(null)
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)

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
          const [rentalsRes, ytdRes, buildingsRes] = await Promise.all([
            sb.from('rentals').select('*, property:properties(*, building:buildings(*)), tenant:profiles!rentals_tenant_id_fkey(full_name, phone, avatar_url)').eq('landlord_id', u.id).neq('status', 'ended').order('created_at', { ascending: false }),
            sb.from('rent_payments').select('id, amount, month, status, rental_id, created_at, rental:rentals!inner(landlord_id, tenant:profiles!rentals_tenant_id_fkey(full_name), property:properties(name, city))').eq('rental.landlord_id', u.id).gte('month', `${now.getFullYear()}-01-01`).order('month', { ascending: false }),
            sb.from('buildings').select('*').eq('landlord_id', u.id).order('created_at', { ascending: false }),
          ])
          const rentals: Rental[] = rentalsRes.data || []
          const buildings: Building[] = buildingsRes.data || []
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
          const allLedgerPayments: any[] = ytdRes.data || []
          const ytdPayments: RentPayment[] = allLedgerPayments.filter((p: any) => p.status === 'paid')
          const activeRentals = rentals.filter(r => r.status === 'active')
          const totalMonthlyRent = activeRentals.reduce((s, r) => s + Number(r.monthly_rent), 0)
          const paidThisMonth = currentPayments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
          const dueThisMonth = currentPayments.filter(p => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0)
          const onTimeCount = currentPayments.filter(p => p.status === 'paid').length
          const collectionRate = totalMonthlyRent > 0 ? Math.round((paidThisMonth / totalMonthlyRent) * 100) : 0
          const ytdTotal = ytdPayments.reduce((s, p) => s + Number(p.amount), 0)
          const score = Math.min(900, Math.round(600 + (collectionRate / 100) * 180 + (rentals.length > 0 ? 20 : 0)))
          setLandlordData({ rentals, buildings, currentPayments, allLedgerPayments, ytdTotal, totalMonthlyRent, paidThisMonth, dueThisMonth, onTimeCount, activeRentals, collectionRate, score, recentRepairs, ytdPayments })
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
    const dotColor = r.urgency === 'emergency' ? 'var(--rb-danger)' : r.status === 'open' ? 'var(--rb-accent)' : r.status === 'in_progress' ? 'var(--rb-warning)' : 'var(--rb-action)'
    const stColor = r.status === 'open' ? { bg: 'var(--rb-accent-soft)', c: 'var(--rb-accent)' } : r.status === 'in_progress' ? { bg: 'var(--rb-warning-soft)', c: 'var(--rb-warning)' } : { bg: 'var(--rb-action-soft)', c: 'var(--rb-action)' }
    const stLabel = r.status === 'open' ? 'OPEN' : r.status === 'in_progress' ? 'IN PROGRESS' : 'DONE'
    const handleClick = () => {
      setSelectedRepair(r)
      setModal(isLandlord ? 'repair-update' : 'repair-detail')
    }
    return (
      <div onClick={handleClick} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14, alignItems: 'center', padding: 12, borderRadius: 10, background: 'var(--rb-surface)', marginBottom: 8, cursor: 'pointer' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--rb-ink)' }}>{r.title}</span>
            {r.urgency === 'emergency' && <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'rgba(239,68,68,.12)', color: 'var(--rb-danger)', letterSpacing: '.06em' }}>EMERGENCY</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>
            {r.category && <span style={{ marginRight: 8 }}>{r.category}</span>}
            {isLandlord ? (r.rental?.property?.name || '') : relDate(r.created_at)}
          </div>
        </div>
        <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 9, fontWeight: 700, padding: '4px 9px', borderRadius: 999, letterSpacing: '.04em', background: stColor.bg, color: stColor.c, whiteSpace: 'nowrap' as const }}>{stLabel}</span>
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

  // Unit row inside a building card
  function UnitRow({ r, currentPayments }: { r: Rental; currentPayments: RentPayment[] }) {
    const pmt = currentPayments.find(p => p.rental_id === r.id)
    const pillMap = { paid: { t: 'Paid', bg: 'var(--rb-action-soft)', c: 'var(--rb-action)' }, pending_verification: { t: 'Review', bg: 'var(--rb-accent-soft)', c: 'var(--rb-accent)' }, pending: { t: 'Due', bg: 'var(--rb-warning-soft)', c: 'var(--rb-warning)' }, overdue: { t: 'Overdue', bg: 'rgba(239,68,68,.1)', c: 'var(--rb-danger)' } }
    const pill = (pmt && (pillMap as any)[pmt.status]) || (!r.tenant_id ? { t: 'Vacant', bg: 'var(--rb-fill-2)', c: 'var(--rb-ink-3)' } : { t: 'Pending', bg: 'var(--rb-fill-2)', c: 'var(--rb-ink-3)' })
    return (
      <div onClick={() => { setSelectedRental(r); setModal('property-detail') }} style={{ display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 12px', background: 'var(--rb-surface)', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--rb-border-soft)' }}>
        <div style={{ width: 48, height: 48, borderRadius: 8, background: r.tenant_id ? 'linear-gradient(135deg,#2a5298,#1e3c72)' : 'var(--rb-fill-2)', display: 'grid', placeItems: 'center', fontSize: 18 }}>{r.tenant_id ? '🔑' : '🔓'}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rb-ink)' }}>
            {r.property?.unit_number ? `Unit ${r.property.unit_number}` : r.property?.name || 'Unit'}
            {r.property?.bedrooms && <span style={{ fontSize: 11, color: 'var(--rb-ink-3)', fontWeight: 400, marginLeft: 6 }}>{r.property.bedrooms} BHK{r.property.area_sqft ? ` · ${r.property.area_sqft} sqft` : ''}</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>{r.tenant?.full_name || 'Vacant'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{inr(r.monthly_rent)}<span style={{ fontSize: 11, color: 'var(--rb-ink-3)' }}>/mo</span></div>
          <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, display: 'inline-block', marginTop: 3, letterSpacing: '.04em', background: pill.bg, color: pill.c }}>{pill.t}</span>
        </div>
      </div>
    )
  }

  // Building card — shows occupancy stats + all its units
  function BuildingCard({ building, rentals, currentPayments }: { building: Building; rentals: Rental[]; currentPayments: RentPayment[] }) {
    const [expanded, setExpanded] = useState(true)
    const occupied = rentals.filter(r => r.tenant_id && r.status === 'active').length
    const totalRent = rentals.reduce((s, r) => s + Number(r.monthly_rent), 0)
    const collected = currentPayments.filter(p => p.status === 'paid' && rentals.some(r => r.id === p.rental_id)).reduce((s, p) => s + Number(p.amount), 0)
    const pct = totalRent > 0 ? Math.round(collected / totalRent * 100) : 0
    const openPmt = currentPayments.find(p => p.status === 'pending_verification' && rentals.some(r => r.id === p.rental_id))
    return (
      <div style={{ border: '1px solid var(--rb-border)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
        {/* Building header */}
        <div style={{ padding: '16px 18px', background: 'var(--rb-surface)', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#0E1413,#2a3a38)', display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0 }}>🏢</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--rb-ink)' }}>{building.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>{building.address_line1}, {building.city}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                {[
                  { l: 'Units', v: `${rentals.length}` },
                  { l: 'Occupied', v: `${occupied}` },
                  { l: 'Vacant', v: `${rentals.length - occupied}` },
                  { l: 'Collection', v: `${pct}%` },
                  { l: 'Total rent', v: inr(totalRent) + '/mo' },
                ].map(s => (
                  <div key={s.l}>
                    <div style={{ fontSize: 10, color: 'var(--rb-ink-3)', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' as const }}>{s.l}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--rb-ink)', marginTop: 1 }}>{s.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ height: 4, background: 'var(--rb-fill-2)', borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--rb-action)', borderRadius: 4, transition: 'width .4s' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 12, flexShrink: 0, alignItems: 'flex-start' }}>
              <button onClick={e => { e.stopPropagation(); setSelectedBuilding(building); setModal('add-unit') }} style={{ padding: '6px 12px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600 }}>+ Add unit</button>
              <button onClick={e => { e.stopPropagation(); setSelectedBuilding(building); setModal('building-detail') }} style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: 'var(--rb-ink-3)' }}>Edit</button>
              <span style={{ fontSize: 18, color: 'var(--rb-ink-3)', lineHeight: 1, marginTop: 4 }}>{expanded ? '▾' : '▸'}</span>
            </div>
          </div>
          {openPmt && <div style={{ marginTop: 10, padding: '6px 12px', background: 'var(--rb-warning-soft)', borderRadius: 8, fontSize: 12, color: 'var(--rb-warning)', fontWeight: 600 }}>⏳ Payment awaiting review</div>}
        </div>
        {/* Unit list */}
        {expanded && (
          <div style={{ padding: '12px 18px 16px', background: 'var(--rb-canvas)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rentals.length === 0
              ? <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--rb-ink-3)', fontSize: 13 }}>No units added yet. <button onClick={() => { setSelectedBuilding(building); setModal('add-unit') }} style={{ color: 'var(--rb-action)', background: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>Add first unit →</button></div>
              : rentals.map(r => <UnitRow key={r.id} r={r} currentPayments={currentPayments} />)
            }
          </div>
        )}
      </div>
    )
  }

  function LandlordHome() {
    const d = landlordData
    if (!d || (d.rentals?.length === 0 && d.buildings?.length === 0)) return <LandlordEmpty />
    const { rentals, buildings, currentPayments, ytdTotal, totalMonthlyRent, paidThisMonth, dueThisMonth, onTimeCount, activeRentals, collectionRate, score, recentRepairs } = d
    const band = scoreBand(score)
    const pct = totalMonthlyRent > 0 ? Math.min(100, Math.round(paidThisMonth / totalMonthlyRent * 100)) : 0
    const openRepairs = recentRepairs.filter((r: RepairRequest) => r.status === 'open' || r.status === 'in_progress')

    // Group rentals by building
    const buildingRentalsMap = new Map<string, Rental[]>()
    const standaloneRentals: Rental[] = []
    for (const r of rentals) {
      const bid = r.property?.building_id
      if (bid) {
        if (!buildingRentalsMap.has(bid)) buildingRentalsMap.set(bid, [])
        buildingRentalsMap.get(bid)!.push(r)
      } else {
        standaloneRentals.push(r)
      }
    }
    // Include buildings that have no rentals yet
    const allBuildings = buildings.filter((b: Building) => !buildingRentalsMap.has(b.id) ? true : true)

    return (
      <>
        <div style={topStyle}>
          <div>
            <div style={eyebrowStyle}>Landlord · Overview</div>
            <h1 style={h1Style}>Good morning, {firstName}.</h1>
            <p style={subStyle}>You have <strong>{activeRentals.length} active unit{activeRentals.length === 1 ? '' : 's'}</strong>{dueThisMonth > 0 ? <> — <strong>{inr(dueThisMonth)} pending</strong> this month</> : ' — all collections up to date'}. Score <strong>{score}/900</strong>.</p>
          </div>
        </div>
        <div className="d-grid-inner" style={gridStyle}>
          <section style={{ ...cardStyle, gridColumn: 'span 2', background: 'linear-gradient(135deg,#0F4C5C,#163A47)', color: '#F6F4EE', border: 0 }}>
            <div style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 11, letterSpacing: '.14em', color: 'rgba(246,244,238,.6)' }}>COLLECTED · {monthLabel(currentMonth).toUpperCase()}</div>
            <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 56, lineHeight: 1, letterSpacing: '-.025em', marginTop: 10 }}>{inr(paidThisMonth)} <span style={{ fontSize: 24, color: 'rgba(246,244,238,.5)' }}>/ {inr(totalMonthlyRent)}</span></div>
            <div style={{ height: 6, background: 'rgba(246,244,238,.12)', borderRadius: 999, marginTop: 18, overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, background: 'var(--rb-accent)', borderRadius: 999 }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginTop: 22, paddingTop: 20, borderTop: '1px solid rgba(246,244,238,.12)' }}>
              {[{ l: 'On time', v: `${onTimeCount} / ${activeRentals.length}` }, { l: 'Pending', v: dueThisMonth > 0 ? inr(dueThisMonth) : '—', accent: true }, { l: 'YTD income', v: ytdTotal > 100000 ? (ytdTotal/100000).toFixed(1)+'L' : inr(ytdTotal) }, { l: 'Score', v: `${score}`, of: '/900' }].map(s => (
                <div key={s.l}><div style={{ fontSize: 11, color: 'rgba(246,244,238,.55)', letterSpacing: '.08em', textTransform: 'uppercase' as const }}>{s.l}</div><div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 24, marginTop: 4, color: s.accent ? 'var(--rb-accent)' : undefined }}>{s.v}{s.of && <span style={{ fontSize: 14, color: 'rgba(246,244,238,.5)' }}>{s.of}</span>}</div></div>
              ))}
            </div>
          </section>

          <section style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)' }}>Landlord score</div>
            <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 64, lineHeight: 1, marginTop: 10, letterSpacing: '-.03em', color: 'var(--rb-accent)' }}>{score}</div>
            <span style={{ display: 'inline-block', marginTop: 8, padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '.12em', background: 'var(--rb-accent-soft)', color: 'var(--rb-accent)' }}>{band.label}</span>
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[{ l: `Collection rate · ${collectionRate}%`, w: collectionRate }, { l: `${rentals.length} unit${rentals.length===1?'':'s'} · ${buildings.length} building${buildings.length===1?'':'s'}`, w: Math.min(100, rentals.length * 20) }, { l: openRepairs.length === 0 ? 'No open repairs' : `${openRepairs.length} open repair${openRepairs.length>1?'s':''}`, w: openRepairs.length === 0 ? 100 : Math.max(10, 100 - openRepairs.length * 20) }].map(b => (
                <div key={b.l}><span style={{ fontSize: 12, color: 'var(--rb-ink-2)' }}>{b.l}</span><div style={{ height: 4, background: 'var(--rb-fill-2)', borderRadius: 4, marginTop: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${b.w}%`, background: 'var(--rb-accent)', borderRadius: 4 }} /></div></div>
              ))}
            </div>
          </section>

          <section style={{ ...cardStyle, gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div><h3 style={cardH3Style}>Portfolio</h3><span style={{ fontSize: 12, color: 'var(--rb-ink-3)', display: 'block', marginTop: 4 }}>{buildings.length} building{buildings.length!==1?'s':''} · {standaloneRentals.length} standalone · {activeRentals.length} active</span></div>
              <button onClick={() => setModal('add-property')} style={actBtnPrimary}>+ Add</button>
            </div>
            {allBuildings.map((b: Building) => (
              <BuildingCard key={b.id} building={b} rentals={buildingRentalsMap.get(b.id) || []} currentPayments={currentPayments} />
            ))}
            {standaloneRentals.length > 0 && (
              <>
                {allBuildings.length > 0 && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)', margin: '20px 0 12px' }}>Standalone properties</div>}
                <StandaloneList rentals={standaloneRentals} currentPayments={currentPayments} />
              </>
            )}
            {allBuildings.length === 0 && standaloneRentals.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--rb-ink-3)', fontSize: 14 }}>No properties yet.</div>
            )}
          </section>

          <section style={cardStyle}>
            <h3 style={cardH3Style}>Quick actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
              {[{ icon: '🏢', label: 'Add building', sub: 'Multi-unit complex', fn: () => setModal('add-building') }, { icon: '🏠', label: 'Standalone unit', sub: 'Single property', fn: () => setModal('add-property') }, { icon: '🛠', label: 'Repairs', sub: 'Review open requests', fn: () => navigate('rep') }, { icon: '≡', label: 'Full ledger', sub: 'All transactions', fn: () => navigate('led') }].map(a => (
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
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: 'rgba(246,244,238,.6)' }}>Get started</div>
          <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-.02em', marginTop: 6 }}>Add your first property.</h2>
          <p style={{ fontSize: 14, color: 'rgba(246,244,238,.8)', marginTop: 8, lineHeight: 1.55 }}>Add a building with multiple units, or a single standalone property. Set rent terms and share the invite link.</p>
          <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
            <button onClick={() => setModal('add-property')} style={{ ...actBtnPrimary, background: 'rgba(246,244,238,.15)', border: '1px solid rgba(246,244,238,.3)' }}>+ Add property →</button>
          </div>
        </div>
      </>
    )
  }

  function StandaloneList({ rentals, currentPayments }: { rentals: Rental[]; currentPayments: RentPayment[] }) {
    if (rentals.length === 0) return null
    const colors = ['#a87a4f','#9aa6a3','#c9a878','#a89280']
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rentals.map((r, i) => {
          const pmt = currentPayments.find(p => p.rental_id === r.id)
          const pill = !r.tenant_id ? { t: 'No tenant', cls: 'none' } : pmt?.status === 'paid' ? { t: 'Paid', cls: 'paid' } : pmt?.status === 'pending_verification' ? { t: 'Pending review', cls: 'pending' } : { t: 'Due', cls: 'due' }
          const pillColor = { paid: { bg: 'var(--rb-action-soft)', c: 'var(--rb-action)' }, due: { bg: 'var(--rb-warning-soft)', c: 'var(--rb-warning)' }, pending: { bg: 'var(--rb-accent-soft)', c: 'var(--rb-accent)' }, none: { bg: 'var(--rb-fill-2)', c: 'var(--rb-ink-3)' } }[pill.cls] || { bg: 'var(--rb-fill-2)', c: 'var(--rb-ink-3)' }
          return (
            <div key={r.id} onClick={() => { setSelectedRental(r); setModal('property-detail') }} style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: 16, alignItems: 'center', padding: 12, background: 'var(--rb-surface)', border: '1px solid var(--rb-border-soft)', borderRadius: 12, cursor: 'pointer' }}>
              <div style={{ width: 56, height: 56, borderRadius: 8, background: `linear-gradient(135deg,${colors[i%colors.length]},#2c1c0e)`, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 22 }}>🏠</div>
              <div>
                <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)', fontWeight: 600 }}>{r.property?.city || 'City'}</div>
                <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 18, lineHeight: 1.15, letterSpacing: '-.01em', marginTop: 2 }}>{r.property?.name || r.property?.address_line1 || 'Property'}</div>
                <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {r.property?.bedrooms && <span>{r.property.bedrooms} BHK</span>}
                  {r.property?.area_sqft && <span>{r.property.area_sqft} sq ft</span>}
                  {r.furnished_status && <span style={{ textTransform: 'capitalize' }}>{r.furnished_status.replace('_', ' ')}</span>}
                  {!r.property?.bedrooms && <span>{r.tenant?.full_name || 'No tenant yet'}</span>}
                </div>
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
    const d = landlordData
    const rentals: Rental[] = d?.rentals || []
    const buildings: Building[] = d?.buildings || []
    const currentPayments: RentPayment[] = d?.currentPayments || []
    const buildingRentalsMap = new Map<string, Rental[]>()
    const standaloneRentals: Rental[] = []
    for (const r of rentals) {
      const bid = r.property?.building_id
      if (bid) { if (!buildingRentalsMap.has(bid)) buildingRentalsMap.set(bid, []); buildingRentalsMap.get(bid)!.push(r) }
      else standaloneRentals.push(r)
    }
    return (
      <>
        <div style={topStyle}>
          <div><div style={eyebrowStyle}>Landlord · Properties</div><h1 style={h1Style}>Portfolio.</h1></div>
          <button onClick={() => setModal('add-property')} style={actBtnPrimary}>+ Add</button>
        </div>
        <section style={cardStyle}>
          {buildings.map((b: Building) => <BuildingCard key={b.id} building={b} rentals={buildingRentalsMap.get(b.id) || []} currentPayments={currentPayments} />)}
          {standaloneRentals.length > 0 && <>
            {buildings.length > 0 && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)', margin: '20px 0 12px' }}>Standalone</div>}
            <StandaloneList rentals={standaloneRentals} currentPayments={currentPayments} />
          </>}
          {buildings.length === 0 && standaloneRentals.length === 0 && <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--rb-ink-3)' }}><p>No properties yet.</p><button onClick={() => setModal('add-property')} style={{ ...actBtnPrimary, marginTop: 16 }}>+ Add your first</button></div>}
        </section>
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
    const allPayments: any[] = landlordData?.allLedgerPayments || []
    const [filter, setFilter] = useState<'month' | 'ytd'>('ytd')

    const filtered = filter === 'month'
      ? allPayments.filter(p => p.month >= currentMonthDate)
      : allPayments

    // Group by YYYY-MM
    const byMonth: Record<string, any[]> = {}
    for (const p of filtered) {
      const key = (p.month as string).slice(0, 7)
      if (!byMonth[key]) byMonth[key] = []
      byMonth[key].push(p)
    }
    const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a))

    const sumBy = (pred: (p: any) => boolean) => filtered.filter(pred).reduce((s: number, p: any) => s + Number(p.amount), 0)
    const collected = sumBy(p => p.status === 'paid')
    const pending = sumBy(p => p.status === 'pending' || p.status === 'pending_verification')
    const overdue = sumBy(p => p.status === 'overdue')
    const total = sumBy(() => true)

    const stMap: Record<string, { t: string; bg: string; c: string }> = {
      paid:                 { t: 'PAID',    bg: 'var(--rb-action-soft)',       c: 'var(--rb-action)' },
      pending_verification: { t: 'REVIEW',  bg: 'var(--rb-accent-soft)',       c: 'var(--rb-accent)' },
      pending:              { t: 'DUE',     bg: 'var(--rb-warning-soft)',      c: 'var(--rb-warning)' },
      overdue:              { t: 'OVERDUE', bg: 'rgba(239,68,68,.1)',          c: 'var(--rb-danger)' },
      partial:              { t: 'PARTIAL', bg: 'var(--rb-warning-soft)',      c: 'var(--rb-warning)' },
    }
    const filterBtn = (f: string, label: string) => ({
      padding: '6px 14px', borderRadius: 999,
      background: filter === f ? 'var(--rb-ink)' : 'transparent',
      color: filter === f ? 'var(--rb-canvas)' : 'var(--rb-ink-3)',
      border: `1px solid ${filter === f ? 'var(--rb-ink)' : 'var(--rb-border)'}`,
      cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, transition: 'all .15s',
    })

    return (
      <>
        <div style={topStyle}>
          <div>
            <div style={eyebrowStyle}>Landlord · Ledger</div>
            <h1 style={h1Style}>Activity ledger.</h1>
            <p style={subStyle}>All rent payments · {filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'} · {now.getFullYear()}</p>
          </div>
        </div>

        {/* Summary strip */}
        <div className="stat-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          {[
            { l: 'Collected',     v: inr(collected), c: 'var(--rb-action)' },
            { l: 'Pending review', v: inr(pending),  c: pending > 0 ? 'var(--rb-accent)' : 'var(--rb-ink-3)' },
            { l: 'Overdue',       v: inr(overdue),   c: overdue > 0 ? 'var(--rb-danger)' : 'var(--rb-ink-3)' },
            { l: 'Total expected', v: inr(total),    c: 'var(--rb-ink)' },
          ].map(s => (
            <div key={s.l} style={{ ...cardStyle, padding: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)' }}>{s.l}</div>
              <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 22, letterSpacing: '-.015em', marginTop: 6, color: s.c }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button style={filterBtn('month', 'This month')} onClick={() => setFilter('month')}>This month</button>
          <button style={filterBtn('ytd',   `Full year ${now.getFullYear()}`)} onClick={() => setFilter('ytd')}>Full year {now.getFullYear()}</button>
        </div>

        <section style={cardStyle}>
          {filtered.length === 0
            ? <div style={emptyStyle}><div style={{ fontSize: 32, marginBottom: 12 }}>📋</div><p>No entries for this period.</p></div>
            : months.map(m => {
                const mPayments = byMonth[m]
                const mCollected = mPayments.filter(p => p.status === 'paid').reduce((s: number, p: any) => s + Number(p.amount), 0)
                const mTotal    = mPayments.reduce((s: number, p: any) => s + Number(p.amount), 0)
                const allPaid   = mCollected === mTotal
                return (
                  <div key={m} style={{ marginBottom: 26 }}>
                    {/* Month header + subtotal */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 10px', borderBottom: '2px solid var(--rb-border)' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: 'var(--rb-ink)' }}>{monthLabel(m + '-01')}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: allPaid ? 'var(--rb-action)' : 'var(--rb-ink-3)' }}>
                        {inr(mCollected)}
                        <span style={{ fontWeight: 400, color: 'var(--rb-ink-3)', fontSize: 12 }}> / {inr(mTotal)}</span>
                      </span>
                    </div>
                    {/* Rows */}
                    {mPayments.map((p: any) => {
                      const st = stMap[p.status] || { t: p.status?.toUpperCase() || '?', bg: 'var(--rb-fill-2)', c: 'var(--rb-ink-3)' }
                      const payDate = new Date(p.created_at)
                      const dateStr = payDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                      const propName   = p.rental?.property?.name || '—'
                      const tenantName = p.rental?.tenant?.full_name || '—'
                      const amtColor   = p.status === 'paid' ? 'var(--rb-action)' : p.status === 'overdue' ? 'var(--rb-danger)' : 'var(--rb-ink-2)'
                      return (
                        <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '52px 1fr auto auto', gap: 12, alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--rb-border-soft)' }}>
                          <div style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 11, color: 'var(--rb-ink-3)', textAlign: 'center' as const, lineHeight: 1.3 }}>{dateStr}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--rb-ink)' }}>{propName}</div>
                            <div style={{ fontSize: 11, color: 'var(--rb-ink-3)', marginTop: 2 }}>{tenantName}</div>
                          </div>
                          <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 999, letterSpacing: '.05em', whiteSpace: 'nowrap' as const, background: st.bg, color: st.c }}>{st.t}</span>
                          <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 16, fontWeight: 600, textAlign: 'right' as const, color: amtColor, minWidth: 88 }}>
                            {p.status === 'paid' ? '+' : ''}{inr(p.amount)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })
          }
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
        <div className="d-grid-inner" style={gridStyle}>
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
              {[
                { l: 'Property', v: rental.property?.name || '—' },
                ...(rental.property?.bedrooms ? [{ l: 'Configuration', v: `${rental.property.bedrooms} BHK · ${rental.property.bathrooms || 1} Bath${rental.property.area_sqft ? ` · ${rental.property.area_sqft} sq ft` : ''}` }] : []),
                { l: 'Furnishing', v: rental.furnished_status ? rental.furnished_status.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : '—' },
                { l: 'Monthly rent', v: inr(rental.monthly_rent) },
                { l: 'Security deposit', v: inr(rental.security_deposit) },
                ...(rental.maintenance_charges ? [{ l: 'Maintenance', v: `${inr(rental.maintenance_charges)}/mo` }] : []),
                { l: 'Rent due day', v: `${rental.rent_due_day}th of every month` },
                { l: 'Notice period', v: `${rental.notice_period_days ?? 30} days` },
                { l: 'Lock-in period', v: `${rental.lock_in_period_months ?? 11} months` },
                { l: 'Late fee', v: `${rental.late_fee_percent ?? 5}% of monthly rent` },
                { l: 'Annual increment', v: `${rental.rent_increment_percent ?? 5}%` },
                { l: 'Status', v: rental.status },
                { l: 'Agreement signed', v: rental.agreement_signed_at ? relDate(rental.agreement_signed_at) : 'Not signed' },
              ].map(f => (
                <div key={f.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--rb-border-soft)' }}>
                  <span style={{ fontSize: 13, color: 'var(--rb-ink-3)', flexShrink: 0, marginRight: 12 }}>{f.l}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', textTransform: f.l === 'Status' ? 'capitalize' as const : undefined }}>{f.v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' as const }}>
              {!rental.agreement_signed_at && <button onClick={() => setModal('sign-agreement')} style={actBtnPrimary}>✍ Sign agreement</button>}
              {rental.status === 'active' && <button onClick={() => { setSelectedRental(rental); setModal('end-lease') }} style={{ padding: '7px 14px', borderRadius: 999, border: '1px solid var(--rb-danger)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: 'var(--rb-danger)', fontWeight: 600 }}>Request lease termination</button>}
            </div>
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
    const [copied, setCopied] = useState(false)

    const copyUpi = () => {
      if (!profile?.upi_id) return
      navigator.clipboard.writeText(profile.upi_id).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
    }

    const score = isTenant ? (tenantData?.score || 700) : (landlordData?.score || 600)
    const band = scoreBand(score)
    const rental = isTenant ? tenantData?.rental : null
    const depositBal = isTenant
      ? (tenantData?.depositTransactions || []).reduce((s: number, t: DepositTx) => s + (t.type === 'received' ? Number(t.amount) : -Number(t.amount)), 0)
      : 0

    return (
      <>
        <div style={topStyle}>
          <div><div style={eyebrowStyle}>Profile</div><h1 style={h1Style}>{firstName}.</h1></div>
          <button onClick={() => setModal('edit-profile')} style={actBtnPrimary}>Edit profile</button>
        </div>
        <div className="d-grid-inner" style={gridStyle}>

          {/* ── Identity card ── */}
          <section style={{ ...cardStyle, gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
              <div style={{ width: 68, height: 68, borderRadius: '50%', background: avatarBg, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 26, fontFamily: 'var(--rb-font-display)', fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
                {avatarUrl ? <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : firstName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 26, letterSpacing: '-.02em', lineHeight: 1.1 }}>{name}</div>
                <div style={{ fontSize: 13, color: 'var(--rb-ink-3)', marginTop: 3 }}>{user?.email}</div>
                <span style={{ display: 'inline-block', marginTop: 8, padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, background: isTenant ? 'var(--rb-action-soft)' : 'rgba(15,76,92,.1)', color: isTenant ? 'var(--rb-action)' : '#0F4C5C' }}>{role}</span>
              </div>
            </div>

            {/* Account fields: 3-col strip */}
            <div className="inner-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid var(--rb-border-soft)', marginTop: 20 }}>
              {[
                { l: 'Phone', v: profile?.phone || '—', mono: false },
                { l: 'PAN number', v: profile?.pan_number || '—', mono: true },
                { l: isTenant ? 'UPI (refund)' : 'UPI ID', v: profile?.upi_id || '—', mono: true },
              ].map((f, i) => (
                <div key={f.l} style={{ padding: '14px 16px', borderRight: i < 2 ? '1px solid var(--rb-border-soft)' : undefined, ...(i === 0 ? { paddingLeft: 0 } : {}) }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)' }}>{f.l}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 5, color: f.v === '—' ? 'var(--rb-ink-3)' : 'var(--rb-ink)', fontFamily: f.mono ? 'var(--rb-font-mono)' : 'inherit' }}>
                    {f.v === '—' ? <span style={{ color: 'var(--rb-ink-3)' }}>Not set · <button onClick={() => setModal('edit-profile')} style={{ color: 'var(--rb-action)', background: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, padding: 0 }}>Add →</button></span> : f.v}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--rb-border-soft)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={() => setModal('edit-profile')} style={actBtnPrimary}>Edit profile</button>
              <button onClick={handleSignOut} style={{ padding: '7px 14px', borderRadius: 999, border: '1.5px solid var(--rb-danger)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--rb-danger)', fontFamily: 'inherit', fontWeight: 600 }}>Sign out</button>
            </div>
          </section>

          {/* ── Score card ── */}
          <section style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)' }}>{isTenant ? 'Renter' : 'Landlord'} score</div>
            <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 64, lineHeight: 1, marginTop: 10, letterSpacing: '-.03em', color: 'var(--rb-action)' }}>{score}</div>
            <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 4 }}>out of 900</div>
            <span style={{ display: 'inline-block', marginTop: 10, padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '.12em', background: 'var(--rb-action-soft)', color: 'var(--rb-action)' }}>{band.label}</span>
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--rb-border)', fontSize: 12, color: 'var(--rb-ink-3)', lineHeight: 1.55 }}>
              {isTenant ? 'Carries to your next rental. Pay on time to build toward 850+.' : `${landlordData?.collectionRate || 0}% collection rate this month.`}
            </div>
          </section>

          {/* ── Landlord: UPI collection card ── */}
          {!isTenant && (
            <section style={{ ...cardStyle, background: profile?.upi_id ? 'var(--rb-surface)' : 'var(--rb-fill)', border: profile?.upi_id ? '1px solid var(--rb-border-soft)' : '1.5px dashed var(--rb-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)', marginBottom: 12 }}>Collect rent · UPI</div>
              {profile?.upi_id ? (
                <>
                  <div style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 14, fontWeight: 600, padding: '10px 14px', background: 'var(--rb-fill)', borderRadius: 10, marginBottom: 12, wordBreak: 'break-all' as const, color: 'var(--rb-ink)' }}>{profile.upi_id}</div>
                  <button onClick={copyUpi} style={{ ...actBtnPrimary, fontSize: 12 }}>{copied ? '✓ Copied!' : '📋 Copy UPI ID'}</button>
                  <div style={{ fontSize: 11, color: 'var(--rb-ink-3)', marginTop: 8, lineHeight: 1.5 }}>Share with tenants so they know where to send rent.</div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: 'var(--rb-ink-3)', lineHeight: 1.55, marginBottom: 14 }}>Add your UPI ID so tenants know where to send rent. They'll see it on their pay screen.</p>
                  <button onClick={() => setModal('edit-profile')} style={actBtnPrimary}>+ Add UPI ID</button>
                </>
              )}
            </section>
          )}

          {/* ── Tenant: Current rental card ── */}
          {isTenant && rental && (
            <section style={{ ...cardStyle, gridColumn: 'span 1' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)', marginBottom: 14 }}>Current rental</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { l: 'Property', v: rental.property?.name || '—' },
                  { l: 'Landlord', v: rental.landlord?.full_name || '—' },
                  { l: 'Monthly rent', v: inr(rental.monthly_rent) },
                  { l: 'Due on', v: `${rental.rent_due_day}th of month` },
                  { l: 'Deposit held', v: inr(depositBal) },
                ].map(f => (
                  <div key={f.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--rb-border-soft)' }}>
                    <span style={{ fontSize: 12, color: 'var(--rb-ink-3)' }}>{f.l}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{f.v}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Landlord: Portfolio strip ── */}
          {!isTenant && (
            <section style={{ ...cardStyle, gridColumn: 'span 3' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)', marginBottom: 16 }}>Portfolio snapshot</div>
              <div className="inner-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 0 }}>
                {[
                  { l: 'Buildings', v: String(landlordData?.buildings?.length || 0) },
                  { l: 'Units', v: String(landlordData?.rentals?.length || 0) },
                  { l: 'Active tenants', v: String(landlordData?.activeRentals?.length || 0) },
                  { l: monthLabel(currentMonth) + ' collected', v: inr(landlordData?.paidThisMonth || 0) },
                  { l: 'Collection rate', v: `${landlordData?.collectionRate || 0}%` },
                ].map((s, i) => (
                  <div key={s.l} style={{ padding: '0 20px', borderRight: i < 4 ? '1px solid var(--rb-border-soft)' : undefined, ...(i === 0 ? { paddingLeft: 0 } : {}) }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)' }}>{s.l}</div>
                    <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 22, letterSpacing: '-.015em', marginTop: 6 }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </>
    )
  }

  // ── Modal actions ────────────────────────────────────────────────────────
  function AddPropertyModal() {
    const [mode, setMode] = useState<'pick' | 'standalone'>('pick')
    const [form, setForm] = useState({
      property_type: 'apartment', bedrooms: '2', bathrooms: '1', area_sqft: '', floor_number: '', parking: false,
      name: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '',
      monthly_rent: '', security_deposit: '', maintenance_charges: '0', rent_due_day: '5',
      furnished_status: 'unfurnished', notice_period_days: '30', lock_in_period_months: '11',
      late_fee_percent: '5', rent_increment_percent: '5',
    })
    const [saving, setSaving] = useState(false)
    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
    const toggle = (k: string) => setForm(f => ({ ...f, [k]: !(f as any)[k] }))
    const chip = (k: string, v: string) => {
      const active = (form as any)[k] === v
      return { padding: '7px 14px', borderRadius: 999, border: `1.5px solid ${active ? 'var(--rb-action)' : 'var(--rb-border)'}`, background: active ? 'var(--rb-action)' : 'transparent', color: active ? '#fff' : 'var(--rb-ink-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'all .15s' }
    }
    const SectionHead = ({ label }: { label: string }) => (
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)', marginTop: 22, marginBottom: 12, paddingTop: 18, borderTop: '1px solid var(--rb-border)' }}>{label}</div>
    )

    const handleSubmit = async () => {
      if (!form.name || !form.address_line1 || !form.city || !form.state || !form.pincode || !form.monthly_rent) {
        toast('Fill in all required fields', 'error'); return
      }
      setSaving(true)
      try {
        const { data: prop, error: propErr } = await sb.from('properties').insert({
          name: form.name, address_line1: form.address_line1, address_line2: form.address_line2 || null,
          city: form.city, state: form.state, pincode: form.pincode, landlord_id: user.id,
          property_type: form.property_type,
          bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
          bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
          area_sqft: form.area_sqft ? Number(form.area_sqft) : null,
          floor_number: form.floor_number ? Number(form.floor_number) : null,
          parking: form.parking,
        }).select().single()
        if (propErr) throw propErr
        if (!prop) throw new Error('Property insert returned no data')
        const { error: rentalErr } = await sb.from('rentals').insert({
          property_id: prop.id, landlord_id: user.id, status: 'pending_tenant',
          start_date: new Date().toISOString().slice(0, 10),
          monthly_rent: Number(form.monthly_rent),
          security_deposit: Number(form.security_deposit || 0),
          maintenance_charges: Number(form.maintenance_charges || 0),
          rent_due_day: Number(form.rent_due_day),
          furnished_status: form.furnished_status,
          notice_period_days: Number(form.notice_period_days || 30),
          lock_in_period_months: Number(form.lock_in_period_months || 11),
          late_fee_percent: Number(form.late_fee_percent || 5),
          rent_increment_percent: Number(form.rent_increment_percent || 5),
        })
        if (rentalErr) throw rentalErr
        toast('Property added! Share the invite link with your tenant.', 'success')
        setModal(null); window.location.reload()
      } catch (e: any) { console.error('[AddProperty]', e); toast(e?.message || 'Failed to add property', 'error'); setSaving(false) }
    }

    if (mode === 'pick') {
      return (
        <Modal title="Add property" onClose={() => setModal(null)}>
          <p style={{ fontSize: 14, color: 'var(--rb-ink-2)', marginBottom: 22, lineHeight: 1.55 }}>What are you adding?</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <button onClick={() => setModal('add-building')} style={{ padding: 22, background: 'linear-gradient(135deg,#0E1413,#1a2e2c)', border: 0, borderRadius: 14, textAlign: 'left', cursor: 'pointer', color: '#F6F4EE' }}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>🏢</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Building</div>
              <div style={{ fontSize: 12, color: 'rgba(246,244,238,.6)', marginTop: 6, lineHeight: 1.55 }}>Apartments, PGs, or multi-unit complexes — manage all units together</div>
            </button>
            <button onClick={() => setMode('standalone')} style={{ padding: 22, background: 'var(--rb-surface)', border: '1.5px solid var(--rb-border)', borderRadius: 14, textAlign: 'left', cursor: 'pointer', color: 'var(--rb-ink)' }}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>🏠</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Standalone</div>
              <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 6, lineHeight: 1.55 }}>A single property rented to one household</div>
            </button>
          </div>
        </Modal>
      )
    }

    return (
      <Modal title="Add standalone property" onClose={() => setModal(null)}>
        {/* ── Property details ── */}
        <Field label="Property type">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[['apartment','Apartment'],['house','House'],['pg','PG'],['commercial','Commercial']].map(([v,l]) => (
              <button key={v} style={chip('property_type', v)} onClick={() => setForm(f => ({ ...f, property_type: v }))}>{l}</button>
            ))}
          </div>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Bedrooms (BHK)">
            <div style={{ display: 'flex', gap: 6 }}>
              {['1','2','3','4'].map(v => <button key={v} style={chip('bedrooms', v)} onClick={() => setForm(f => ({ ...f, bedrooms: v }))}>{v === '4' ? '4+' : v}</button>)}
            </div>
          </Field>
          <Field label="Bathrooms">
            <div style={{ display: 'flex', gap: 6 }}>
              {['1','2','3'].map(v => <button key={v} style={chip('bathrooms', v)} onClick={() => setForm(f => ({ ...f, bathrooms: v }))}>{v === '3' ? '3+' : v}</button>)}
            </div>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Area (sq ft)"><input style={inputStyle} type="number" value={form.area_sqft} onChange={set('area_sqft')} placeholder="850" /></Field>
          <Field label="Floor number"><input style={inputStyle} type="number" value={form.floor_number} onChange={set('floor_number')} placeholder="3" /></Field>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
          <span style={{ fontSize: 14, color: 'var(--rb-ink)' }}>Parking available</span>
          <button onClick={() => toggle('parking')} style={{ width: 44, height: 24, borderRadius: 999, background: form.parking ? 'var(--rb-action)' : 'var(--rb-border)', border: 0, cursor: 'pointer', position: 'relative', transition: 'background .2s' }}>
            <span style={{ position: 'absolute', top: 2, left: form.parking ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
          </button>
        </div>

        <SectionHead label="Address" />
        <Field label="Property name / label *"><input style={inputStyle} value={form.name} onChange={set('name')} placeholder="e.g. Sunrise Apt 4B" /></Field>
        <Field label="Street address *"><input style={inputStyle} value={form.address_line1} onChange={set('address_line1')} placeholder="Flat no., building, street" /></Field>
        <Field label="Landmark / area (optional)"><input style={inputStyle} value={form.address_line2} onChange={set('address_line2')} placeholder="Near Metro station" /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="City *"><input style={inputStyle} value={form.city} onChange={set('city')} placeholder="Hyderabad" /></Field>
          <Field label="State *"><input style={inputStyle} value={form.state} onChange={set('state')} placeholder="Telangana" /></Field>
        </div>
        <Field label="Pincode *"><input style={inputStyle} value={form.pincode} onChange={set('pincode')} placeholder="500001" /></Field>

        <SectionHead label="Rental terms" />
        <Field label="Furnishing">
          <div style={{ display: 'flex', gap: 8 }}>
            {[['unfurnished','Unfurnished'],['semi_furnished','Semi'],['fully_furnished','Fully furnished']].map(([v,l]) => (
              <button key={v} style={chip('furnished_status', v)} onClick={() => setForm(f => ({ ...f, furnished_status: v }))}>{l}</button>
            ))}
          </div>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Monthly rent (₹) *"><input style={inputStyle} type="number" value={form.monthly_rent} onChange={set('monthly_rent')} placeholder="25000" /></Field>
          <Field label="Security deposit (₹)"><input style={inputStyle} type="number" value={form.security_deposit} onChange={set('security_deposit')} placeholder="50000" /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Maintenance / society (₹/mo)"><input style={inputStyle} type="number" value={form.maintenance_charges} onChange={set('maintenance_charges')} placeholder="0" /></Field>
          <Field label="Rent due day"><select style={inputStyle} value={form.rent_due_day} onChange={set('rent_due_day')}>{Array.from({length:28},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}th</option>)}</select></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Notice period (days)"><input style={inputStyle} type="number" value={form.notice_period_days} onChange={set('notice_period_days')} placeholder="30" /></Field>
          <Field label="Lock-in period (months)"><input style={inputStyle} type="number" value={form.lock_in_period_months} onChange={set('lock_in_period_months')} placeholder="11" /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Late fee (% of rent)"><input style={inputStyle} type="number" value={form.late_fee_percent} onChange={set('late_fee_percent')} placeholder="5" /></Field>
          <Field label="Annual rent increment (%)"><input style={inputStyle} type="number" value={form.rent_increment_percent} onChange={set('rent_increment_percent')} placeholder="5" /></Field>
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
          const { error: uploadErr } = await sb.storage.from('proof-photos').upload(path, file, { upsert: true })
          if (uploadErr) throw uploadErr
          const { data: urlData } = sb.storage.from('proof-photos').getPublicUrl(path)
          proofUrl = urlData?.publicUrl || ''
        }
        const pmtData = { payment_method: method, utr_number: utr, payment_note: note, payment_proof_url: proofUrl, status: 'pending_verification', updated_at: new Date().toISOString() }
        if (currentPayment) {
          const { error: updErr } = await sb.from('rent_payments').update(pmtData).eq('id', currentPayment.id)
          if (updErr) throw updErr
        } else {
          const { error: insErr } = await sb.from('rent_payments').insert({ ...pmtData, rental_id: rental.id, tenant_id: user.id, month: currentMonthDate, amount: rental.monthly_rent })
          if (insErr) throw insErr
        }
        toast('Payment recorded! Your landlord will confirm shortly.', 'success')
        setModal(null)
        window.location.reload()
      } catch (e: any) { console.error('[PayRent]', e); toast(e?.message || 'Failed to record payment', 'error'); setSaving(false) }
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
    const CATEGORIES = ['Plumbing', 'Electrical', 'Carpentry', 'Appliance', 'Structural', 'Pest Control']
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('')
    const [urgency, setUrgency] = useState<'normal' | 'emergency'>('normal')
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState('')
    const [saving, setSaving] = useState(false)
    const rentalId = role === 'tenant' ? tenantData?.rental?.id : null

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) { setFile(f); const r2 = new FileReader(); r2.onload = ev => setPreview(ev.target?.result as string); r2.readAsDataURL(f) }
    }

    const handleSubmit = async () => {
      if (!title || !rentalId) { toast('Enter a title', 'error'); return }
      setSaving(true)
      try {
        let photo_url: string | undefined
        if (file) {
          const ext = file.name.split('.').pop()
          const path = `${rentalId}/${Date.now()}.${ext}`
          const { error: upErr } = await sb.storage.from('repair-photos').upload(path, file, { upsert: true })
          if (upErr) throw upErr
          const { data: urlData } = sb.storage.from('repair-photos').getPublicUrl(path)
          photo_url = urlData.publicUrl
        }
        const { error: repErr } = await sb.from('repair_requests').insert({
          rental_id: rentalId, title, description, status: 'open', raised_by: user.id,
          category: category || null, urgency, photo_url: photo_url || null,
        })
        if (repErr) throw repErr
        toast('Repair request raised!', 'success')
        setModal(null)
        window.location.reload()
      } catch (e: any) { console.error('[NewRepair]', e); toast(e?.message || 'Failed to raise request', 'error'); setSaving(false) }
    }

    const catBtn = (c: string) => ({
      padding: '7px 12px', borderRadius: 999, border: `1.5px solid ${category === c ? 'var(--rb-action)' : 'var(--rb-border)'}`,
      background: category === c ? 'var(--rb-action)' : 'transparent', color: category === c ? '#fff' : 'var(--rb-ink-2)',
      cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, transition: 'all .15s',
    })
    const urgBtn = (u: 'normal' | 'emergency') => ({
      flex: 1, padding: '9px 0', borderRadius: 999,
      border: `1.5px solid ${urgency === u ? (u === 'emergency' ? 'var(--rb-danger)' : 'var(--rb-action)') : 'var(--rb-border)'}`,
      background: urgency === u ? (u === 'emergency' ? 'var(--rb-danger)' : 'var(--rb-action)') : 'transparent',
      color: urgency === u ? '#fff' : 'var(--rb-ink-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'all .15s',
    })

    return (
      <Modal title="New repair request" onClose={() => setModal(null)}>
        <Field label="Category">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map(c => <button key={c} style={catBtn(c)} onClick={() => setCategory(category === c ? '' : c)}>{c}</button>)}
          </div>
        </Field>
        <Field label="Urgency">
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={urgBtn('normal')} onClick={() => setUrgency('normal')}>Normal</button>
            <button style={urgBtn('emergency')} onClick={() => setUrgency('emergency')}>Emergency</button>
          </div>
        </Field>
        <Field label="Title *"><input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Leaking tap in bathroom" /></Field>
        <Field label="Description (optional)"><textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' as const }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue…" /></Field>
        <Field label="Photo of damage (optional)">
          {preview
            ? <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
                <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
                <button onClick={() => { setFile(null); setPreview('') }} style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,.6)', border: 0, color: '#fff', cursor: 'pointer', fontSize: 14, display: 'grid', placeItems: 'center' }}>×</button>
              </div>
            : <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1.5px dashed var(--rb-border)', cursor: 'pointer' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--rb-ink-3)" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span style={{ fontSize: 13, color: 'var(--rb-ink-3)' }}>Upload a photo</span>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
              </label>
          }
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--rb-border)' }}>
          <button onClick={() => setModal(null)} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 18px', borderRadius: 999, background: urgency === 'emergency' ? 'var(--rb-danger)' : 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{saving ? 'Raising…' : 'Raise request'}</button>
        </div>
      </Modal>
    )
  }

  // ── Landlord: update repair status / cost ───────────────────────────────
  function LandlordUpdateRepairModal() {
    const r = selectedRepair
    const [status, setStatus] = useState(r?.status || 'open')
    const [cost, setCost] = useState(r?.cost ? String(r.cost) : '')
    const [landlordNote, setLandlordNote] = useState(r?.landlord_note || '')
    const [scheduledDate, setScheduledDate] = useState(r?.scheduled_date || '')
    const [deductFromDeposit, setDeductFromDeposit] = useState(r?.deduct_from_deposit || false)
    const [saving, setSaving] = useState(false)
    if (!r) return null

    const handleSave = async () => {
      setSaving(true)
      try {
        const wasResolved = r.status !== 'resolved' && status === 'resolved'
        const { error } = await sb.from('repair_requests').update({
          status,
          cost: cost ? Number(cost) : null,
          landlord_note: landlordNote || null,
          scheduled_date: scheduledDate || null,
          deduct_from_deposit: deductFromDeposit,
        }).eq('id', r.id)
        if (error) throw error
        // Auto-create deposit deduction when resolving with cost
        if (wasResolved && deductFromDeposit && cost) {
          await sb.from('deposit_transactions').insert({
            rental_id: r.rental_id, type: 'deduction',
            amount: Number(cost), description: `Repair: ${r.title}`,
          })
        }
        toast('Repair updated', 'success')
        setModal(null)
        window.location.reload()
      } catch (e: any) { console.error('[RepairUpdate]', e); toast(e?.message || 'Failed to update', 'error'); setSaving(false) }
    }

    const stBtn = (v: string) => ({ flex: 1, padding: '9px 0', borderRadius: 999, border: `1.5px solid ${status === v ? 'var(--rb-action)' : 'var(--rb-border)'}`, background: status === v ? 'var(--rb-action)' : 'transparent', color: status === v ? '#fff' : 'var(--rb-ink-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'all .15s' })

    return (
      <Modal title="Update repair" onClose={() => setModal(null)}>
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: 'var(--rb-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{r.title}</span>
            {r.urgency === 'emergency' && <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'rgba(239,68,68,.12)', color: 'var(--rb-danger)', letterSpacing: '.06em' }}>EMERGENCY</span>}
            {r.category && <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 9, color: 'var(--rb-ink-3)', padding: '2px 8px', borderRadius: 999, border: '1px solid var(--rb-border)' }}>{r.category}</span>}
          </div>
          {r.description && <div style={{ fontSize: 13, color: 'var(--rb-ink-2)', marginTop: 6, lineHeight: 1.5 }}>{r.description}</div>}
          {r.photo_url && <img src={r.photo_url} alt="Damage photo" style={{ marginTop: 10, width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, display: 'block' }} />}
        </div>
        <Field label="Status">
          <div style={{ display: 'flex', gap: 8 }}>
            {(['open', 'in_progress', 'resolved'] as const).map(s => (
              <button key={s} style={stBtn(s)} onClick={() => setStatus(s)}>
                {s === 'open' ? 'Open' : s === 'in_progress' ? 'In progress' : 'Resolved'}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Note to tenant (optional)">
          <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' as const }} value={landlordNote} onChange={e => setLandlordNote(e.target.value)} placeholder="e.g. Plumber coming Friday 10am…" />
        </Field>
        <Field label="Scheduled repair date (optional)">
          <input style={inputStyle} type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
        </Field>
        <Field label="Estimated cost (₹, optional)">
          <input style={inputStyle} type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0" />
        </Field>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--rb-border)', marginTop: 4 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Deduct from deposit</div>
            <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>Creates a deposit ledger entry when resolved</div>
          </div>
          <button onClick={() => setDeductFromDeposit(d => !d)} style={{ width: 44, height: 24, borderRadius: 999, background: deductFromDeposit ? 'var(--rb-action)' : 'var(--rb-border)', border: 0, cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: 2, left: deductFromDeposit ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--rb-border)' }}>
          <button onClick={() => setModal(null)} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </Modal>
    )
  }

  // ── Tenant: view repair detail / cancel ─────────────────────────────────
  function TenantRepairDetailModal() {
    const r = selectedRepair
    const [saving, setSaving] = useState(false)
    if (!r) return null

    const canCancel = r.status === 'open'
    const stLabel = r.status === 'open' ? 'Open' : r.status === 'in_progress' ? 'In progress' : 'Resolved'

    const handleCancel = async () => {
      if (!confirm('Cancel this repair request?')) return
      setSaving(true)
      try {
        const { error } = await sb.from('repair_requests').update({ status: 'resolved' }).eq('id', r.id)
        if (error) throw error
        toast('Repair request closed', 'success')
        setModal(null)
        window.location.reload()
      } catch (e: any) { console.error('[RepairCancel]', e); toast(e?.message || 'Failed to close', 'error'); setSaving(false) }
    }

    const rows = [
      { l: 'Status', v: stLabel },
      { l: 'Raised', v: relDate(r.created_at) },
      ...(r.category ? [{ l: 'Category', v: r.category }] : []),
      ...(r.urgency === 'emergency' ? [{ l: 'Urgency', v: 'Emergency' }] : []),
      ...(r.scheduled_date ? [{ l: 'Scheduled', v: new Date(r.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }] : []),
      ...(r.cost ? [{ l: 'Estimated cost', v: '₹' + Number(r.cost).toLocaleString('en-IN') }] : []),
      ...(r.deduct_from_deposit ? [{ l: 'Deposit impact', v: 'Will be deducted from deposit' }] : []),
    ]

    return (
      <Modal title="Repair request" onClose={() => setModal(null)}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{r.title}</span>
            {r.urgency === 'emergency' && <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'rgba(239,68,68,.12)', color: 'var(--rb-danger)', letterSpacing: '.06em' }}>EMERGENCY</span>}
          </div>
          {r.description && <div style={{ fontSize: 14, color: 'var(--rb-ink-2)', marginTop: 6, lineHeight: 1.55 }}>{r.description}</div>}
          {r.photo_url && <img src={r.photo_url} alt="Damage photo" style={{ marginTop: 10, width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, display: 'block', cursor: 'pointer' }} onClick={() => setLightbox({ url: r.photo_url!, label: r.title })} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map(f => (
            <div key={f.l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '9px 0', borderBottom: '1px solid var(--rb-border)' }}>
              <span style={{ color: 'var(--rb-ink-3)' }}>{f.l}</span>
              <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{f.v}</span>
            </div>
          ))}
        </div>
        {r.landlord_note && (
          <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'var(--rb-surface)', borderLeft: '3px solid var(--rb-action)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--rb-action)', marginBottom: 4 }}>Landlord note</div>
            <div style={{ fontSize: 14, color: 'var(--rb-ink)', lineHeight: 1.55 }}>{r.landlord_note}</div>
          </div>
        )}
        {canCancel && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--rb-border)' }}>
            <button onClick={handleCancel} disabled={saving} style={{ width: '100%', padding: '10px 0', borderRadius: 999, border: '1.5px solid var(--rb-danger)', background: 'transparent', color: 'var(--rb-danger)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>{saving ? 'Closing…' : 'Close / cancel request'}</button>
          </div>
        )}
      </Modal>
    )
  }

  // ── Add move-in proof photo modal (tenant) ──────────────────────────────
  function AddProofPhotoModal() {
    const rental = tenantData?.rental
    const existingProof = tenantData?.proofs
    const ROOM_LABELS = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Balcony', 'Other']
    const [roomLabel, setRoomLabel] = useState(ROOM_LABELS[0])
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState('')
    const [annotation, setAnnotation] = useState('')
    const [saving, setSaving] = useState(false)

    if (!rental) return null

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) { setFile(f); const r = new FileReader(); r.onload = ev => setPreview(ev.target?.result as string); r.readAsDataURL(f) }
    }

    const handleSubmit = async () => {
      if (!file) { toast('Select a photo first', 'error'); return }
      setSaving(true)
      try {
        let proofId = existingProof?.id
        if (!proofId) {
          const { data: proof, error: proofErr } = await sb.from('proofs').insert({ rental_id: rental.id, type: 'move_in', submitted_by: user.id }).select().single()
          if (proofErr) throw proofErr
          proofId = proof.id
        }
        const ext = file.name.split('.').pop()
        const path = `move-in/${rental.id}/${Date.now()}.${ext}`
        const { error: upErr } = await sb.storage.from('proof-photos').upload(path, file, { upsert: true })
        if (upErr) throw upErr
        const { data: urlData } = sb.storage.from('proof-photos').getPublicUrl(path)
        const { error: photoErr } = await sb.from('proof_photos').insert({ proof_id: proofId, room_label: roomLabel, storage_path: path, public_url: urlData.publicUrl, annotation, uploaded_by: user.id })
        if (photoErr) throw photoErr
        toast('Photo added ✓', 'success')
        setModal(null)
        window.location.reload()
      } catch (e: any) { console.error('[AddProofPhoto]', e); toast(e?.message || 'Failed to upload photo', 'error') } finally { setSaving(false) }
    }

    return (
      <Modal title="Add move-in photo" onClose={() => setModal(null)}>
        <Field label="Room">
          <select style={inputStyle} value={roomLabel} onChange={e => setRoomLabel(e.target.value)}>
            {ROOM_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="Photo">
          <div style={{ border: '1.5px dashed var(--rb-border)', borderRadius: 10, padding: '20px', textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
            {preview ? <img src={preview} alt="Preview" style={{ maxHeight: 140, borderRadius: 8, maxWidth: '100%' }} /> : <div style={{ color: 'var(--rb-ink-3)', fontSize: 13 }}>📷 Tap to choose photo</div>}
            <input type="file" accept="image/*" onChange={handleFile} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
          </div>
        </Field>
        <Field label="Note (optional)"><input style={inputStyle} value={annotation} onChange={e => setAnnotation(e.target.value)} placeholder="e.g. crack on wall, pre-existing damage" /></Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--rb-border)' }}>
          <button onClick={() => setModal(null)} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !file} style={{ padding: '8px 18px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{saving ? 'Uploading…' : 'Add photo'}</button>
        </div>
      </Modal>
    )
  }

  // ── Property detail modal (landlord) ────────────────────────────────────
  function PropertyDetailModal() {
    const r = selectedRental
    if (!r) return null
    const currentPmt = landlordData?.currentPayments?.find((p: RentPayment) => p.rental_id === r.id)
    const hasPending = currentPmt?.status === 'pending_verification'
    const [editMode, setEditMode] = useState(false)
    const [form, setForm] = useState({
      property_type: r.property?.property_type || 'apartment',
      bedrooms: r.property?.bedrooms ? String(r.property.bedrooms) : '2',
      bathrooms: r.property?.bathrooms ? String(r.property.bathrooms) : '1',
      area_sqft: r.property?.area_sqft ? String(r.property.area_sqft) : '',
      floor_number: r.property?.floor_number ? String(r.property.floor_number) : '',
      parking: r.property?.parking || false,
      name: r.property?.name || '', address_line1: r.property?.address_line1 || '',
      address_line2: r.property?.address_line2 || '',
      city: r.property?.city || '', state: r.property?.state || '', pincode: r.property?.pincode || '',
      monthly_rent: String(r.monthly_rent), security_deposit: String(r.security_deposit),
      maintenance_charges: String(r.maintenance_charges ?? 0),
      rent_due_day: String(r.rent_due_day || 5),
      furnished_status: r.furnished_status || 'unfurnished',
      notice_period_days: String(r.notice_period_days ?? 30),
      lock_in_period_months: String(r.lock_in_period_months ?? 11),
      late_fee_percent: String(r.late_fee_percent ?? 5),
      rent_increment_percent: String(r.rent_increment_percent ?? 5),
    })
    const [saving, setSaving] = useState(false)
    const [copied, setCopied] = useState(false)
    const inviteLink = r.invite_token ? `${window.location.origin}/join/${r.invite_token}` : null
    const inviteExpired = r.invite_expires_at ? new Date(r.invite_expires_at) < new Date() : true
    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
    const toggle = (k: string) => setForm(f => ({ ...f, [k]: !(f as any)[k] }))
    const chip = (k: string, v: string) => {
      const active = (form as any)[k] === v
      return { padding: '6px 12px', borderRadius: 999, border: `1.5px solid ${active ? 'var(--rb-action)' : 'var(--rb-border)'}`, background: active ? 'var(--rb-action)' : 'transparent', color: active ? '#fff' : 'var(--rb-ink-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, transition: 'all .15s' }
    }
    const SectionHead = ({ label }: { label: string }) => (
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)', marginTop: 20, marginBottom: 10, paddingTop: 16, borderTop: '1px solid var(--rb-border)' }}>{label}</div>
    )

    const handleCopyLink = () => {
      if (!inviteLink) return
      navigator.clipboard.writeText(inviteLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
    }

    const handleRegenerateLink = async () => {
      setSaving(true)
      try {
        const token = Math.random().toString(36).slice(2, 10).toUpperCase()
        const expires = new Date(Date.now() + 72 * 3600000).toISOString()
        const { error } = await sb.from('rentals').update({ invite_token: token, invite_expires_at: expires }).eq('id', r.id)
        if (error) throw error
        toast('New invite link generated!', 'success')
        setModal(null); setSelectedRental(null); window.location.reload()
      } catch (e: any) { toast(e?.message || 'Failed to generate link', 'error') } finally { setSaving(false) }
    }

    const handleSave = async () => {
      setSaving(true)
      try {
        if (r.property?.id) {
          const { error } = await sb.from('properties').update({
            name: form.name, address_line1: form.address_line1, address_line2: form.address_line2 || null,
            city: form.city, state: form.state, pincode: form.pincode, property_type: form.property_type,
            bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
            bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
            area_sqft: form.area_sqft ? Number(form.area_sqft) : null,
            floor_number: form.floor_number ? Number(form.floor_number) : null,
            parking: form.parking,
          }).eq('id', r.property.id)
          if (error) throw error
        }
        const { error } = await sb.from('rentals').update({
          monthly_rent: Number(form.monthly_rent), security_deposit: Number(form.security_deposit),
          maintenance_charges: Number(form.maintenance_charges || 0),
          rent_due_day: Number(form.rent_due_day), furnished_status: form.furnished_status,
          notice_period_days: Number(form.notice_period_days || 30),
          lock_in_period_months: Number(form.lock_in_period_months || 11),
          late_fee_percent: Number(form.late_fee_percent || 5),
          rent_increment_percent: Number(form.rent_increment_percent || 5),
        }).eq('id', r.id)
        if (error) throw error
        toast('Property updated!', 'success')
        setModal(null); setSelectedRental(null); window.location.reload()
      } catch (e: any) { console.error('[EditProperty]', e); toast(e?.message || 'Failed to update property', 'error') } finally { setSaving(false) }
    }

    const handleAcceptPayment = async () => {
      if (!currentPmt) return
      setSaving(true)
      try {
        const { error } = await sb.rpc('confirm_rent_payment', { payment_id: currentPmt.id })
        if (error) throw error
        toast('Payment confirmed ✓', 'success')
        setModal(null); setSelectedRental(null); window.location.reload()
      } catch (e: any) { toast(e?.message || 'Failed to confirm payment', 'error') } finally { setSaving(false) }
    }

    const handleRejectPayment = async () => {
      if (!currentPmt) return
      setSaving(true)
      try {
        const { error } = await sb.from('rent_payments').update({ status: 'pending', updated_at: new Date().toISOString() }).eq('id', currentPmt.id)
        if (error) throw error
        toast('Payment returned to pending.', 'info')
        setModal(null); setSelectedRental(null); window.location.reload()
      } catch (e: any) { toast(e?.message || 'Failed to reject payment', 'error') } finally { setSaving(false) }
    }

    return (
      <Modal title={editMode ? 'Edit property' : (r.property?.name || 'Property')} onClose={() => { setModal(null); setSelectedRental(null) }}>
        {/* Pending payment review */}
        {hasPending && currentPmt && (
          <div style={{ marginBottom: 20, padding: 16, background: 'var(--rb-warning-soft)', borderRadius: 12, border: '1px solid rgba(184,116,15,.25)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--rb-warning)', marginBottom: 8 }}>⏳ Payment awaiting review</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{inr(currentPmt.amount)} · {monthLabel(currentPmt.month)}</div>
            {currentPmt.payment_method && <div style={{ fontSize: 12, color: 'var(--rb-ink-2)', marginTop: 4 }}>via {methodLabel(currentPmt.payment_method)}</div>}
            {currentPmt.utr_number && <div style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>Ref: {currentPmt.utr_number}</div>}
            {currentPmt.payment_note && <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>{currentPmt.payment_note}</div>}
            {currentPmt.payment_proof_url && <img src={currentPmt.payment_proof_url} alt="Receipt" onClick={() => { setLightbox({ url: currentPmt.payment_proof_url!, label: 'Payment receipt' }); setModal(null) }} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, marginTop: 8, cursor: 'pointer' }} />}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={handleAcceptPayment} disabled={saving} style={{ ...actBtnPrimary, fontSize: 12, padding: '7px 16px', background: 'var(--rb-success)' }}>✓ Accept payment</button>
              <button onClick={handleRejectPayment} disabled={saving} style={{ padding: '7px 14px', borderRadius: 999, border: '1px solid var(--rb-danger)', background: 'transparent', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--rb-danger)', fontWeight: 600 }}>Reject</button>
            </div>
          </div>
        )}

        {/* Invite link */}
        {!r.tenant_id && (
          <div style={{ marginBottom: 20, padding: 14, background: 'var(--rb-fill)', borderRadius: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)', marginBottom: 8 }}>Invite tenant</div>
            {inviteLink && !inviteExpired ? (
              <>
                <div style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 11, padding: '8px 10px', background: 'var(--rb-surface)', borderRadius: 8, border: '1px solid var(--rb-border)', wordBreak: 'break-all' as const, color: 'var(--rb-ink-2)', marginBottom: 8 }}>{inviteLink}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  <button onClick={handleCopyLink} style={{ ...actBtnPrimary, fontSize: 12, padding: '6px 14px' }}>{copied ? '✓ Copied!' : '📋 Copy link'}</button>
                  <button onClick={handleRegenerateLink} disabled={saving} style={{ padding: '6px 14px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--rb-ink-3)' }}>New link</button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--rb-ink-3)', marginTop: 6 }}>Expires {relDate(r.invite_expires_at)}</div>
              </>
            ) : (
              <button onClick={handleRegenerateLink} disabled={saving} style={actBtnPrimary}>{saving ? 'Generating…' : 'Generate invite link'}</button>
            )}
          </div>
        )}

        {/* Details or edit form */}
        {editMode ? (
          <>
            <Field label="Property type">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['apartment','Apartment'],['house','House'],['pg','PG'],['commercial','Commercial']].map(([v,l]) => (
                  <button key={v} style={chip('property_type', v)} onClick={() => setForm(f => ({ ...f, property_type: v }))}>{l}</button>
                ))}
              </div>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Bedrooms">
                <div style={{ display: 'flex', gap: 6 }}>
                  {['1','2','3','4'].map(v => <button key={v} style={chip('bedrooms', v)} onClick={() => setForm(f => ({ ...f, bedrooms: v }))}>{v === '4' ? '4+' : v}</button>)}
                </div>
              </Field>
              <Field label="Bathrooms">
                <div style={{ display: 'flex', gap: 6 }}>
                  {['1','2','3'].map(v => <button key={v} style={chip('bathrooms', v)} onClick={() => setForm(f => ({ ...f, bathrooms: v }))}>{v === '3' ? '3+' : v}</button>)}
                </div>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Area (sq ft)"><input style={inputStyle} type="number" value={form.area_sqft} onChange={set('area_sqft')} placeholder="850" /></Field>
              <Field label="Floor number"><input style={inputStyle} type="number" value={form.floor_number} onChange={set('floor_number')} placeholder="3" /></Field>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={{ fontSize: 14 }}>Parking available</span>
              <button onClick={() => toggle('parking')} style={{ width: 44, height: 24, borderRadius: 999, background: form.parking ? 'var(--rb-action)' : 'var(--rb-border)', border: 0, cursor: 'pointer', position: 'relative', transition: 'background .2s' }}>
                <span style={{ position: 'absolute', top: 2, left: form.parking ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
              </button>
            </div>
            <SectionHead label="Address" />
            <Field label="Property name / label"><input style={inputStyle} value={form.name} onChange={set('name')} /></Field>
            <Field label="Street address"><input style={inputStyle} value={form.address_line1} onChange={set('address_line1')} /></Field>
            <Field label="Landmark / area"><input style={inputStyle} value={form.address_line2} onChange={set('address_line2')} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="City"><input style={inputStyle} value={form.city} onChange={set('city')} /></Field>
              <Field label="State"><input style={inputStyle} value={form.state} onChange={set('state')} /></Field>
            </div>
            <Field label="Pincode"><input style={inputStyle} value={form.pincode} onChange={set('pincode')} /></Field>
            <SectionHead label="Rental terms" />
            <Field label="Furnishing">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['unfurnished','Unfurnished'],['semi_furnished','Semi'],['fully_furnished','Fully']].map(([v,l]) => (
                  <button key={v} style={chip('furnished_status', v)} onClick={() => setForm(f => ({ ...f, furnished_status: v }))}>{l}</button>
                ))}
              </div>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Monthly rent (₹)"><input style={inputStyle} type="number" value={form.monthly_rent} onChange={set('monthly_rent')} /></Field>
              <Field label="Security deposit (₹)"><input style={inputStyle} type="number" value={form.security_deposit} onChange={set('security_deposit')} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Maintenance (₹/mo)"><input style={inputStyle} type="number" value={form.maintenance_charges} onChange={set('maintenance_charges')} /></Field>
              <Field label="Rent due day"><select style={inputStyle} value={form.rent_due_day} onChange={set('rent_due_day')}>{Array.from({length:28},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}th</option>)}</select></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Notice period (days)"><input style={inputStyle} type="number" value={form.notice_period_days} onChange={set('notice_period_days')} /></Field>
              <Field label="Lock-in (months)"><input style={inputStyle} type="number" value={form.lock_in_period_months} onChange={set('lock_in_period_months')} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Late fee (%)"><input style={inputStyle} type="number" value={form.late_fee_percent} onChange={set('late_fee_percent')} /></Field>
              <Field label="Annual increment (%)"><input style={inputStyle} type="number" value={form.rent_increment_percent} onChange={set('rent_increment_percent')} /></Field>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--rb-border)' }}>
              <button onClick={() => setEditMode(false)} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </>
        ) : (
          <>
            {[
              { l: 'Property', v: r.property?.name || '—' },
              { l: 'Type', v: r.property?.property_type ? (r.property.property_type.charAt(0).toUpperCase() + r.property.property_type.slice(1)) : '—' },
              ...(r.property?.bedrooms ? [{ l: 'Configuration', v: `${r.property.bedrooms} BHK · ${r.property.bathrooms || 1} Bath${r.property.area_sqft ? ` · ${r.property.area_sqft} sq ft` : ''}` }] : []),
              ...(r.property?.floor_number ? [{ l: 'Floor', v: `Floor ${r.property.floor_number}` }] : []),
              { l: 'Parking', v: r.property?.parking ? 'Yes' : 'No' },
              { l: 'Address', v: [r.property?.address_line1, r.property?.address_line2, r.property?.city, r.property?.state].filter(Boolean).join(', ') || '—' },
              { l: 'Furnishing', v: r.furnished_status ? r.furnished_status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—' },
              { l: 'Monthly rent', v: inr(r.monthly_rent) },
              { l: 'Security deposit', v: inr(r.security_deposit) },
              ...(r.maintenance_charges ? [{ l: 'Maintenance', v: `${inr(r.maintenance_charges)}/mo` }] : []),
              { l: 'Rent due', v: `${r.rent_due_day || '—'}th of month` },
              { l: 'Notice period', v: `${r.notice_period_days ?? 30} days` },
              { l: 'Lock-in period', v: `${r.lock_in_period_months ?? 11} months` },
              { l: 'Late fee', v: `${r.late_fee_percent ?? 5}% of rent` },
              { l: 'Annual increment', v: `${r.rent_increment_percent ?? 5}%` },
              { l: 'Tenant', v: r.tenant?.full_name || 'No tenant yet' },
              { l: 'Status', v: r.status },
              { l: 'Agreement', v: r.agreement_signed_at ? `Signed ${relDate(r.agreement_signed_at)}` : 'Not signed' },
            ].map(f => (
              <div key={f.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--rb-border-soft)' }}>
                <span style={{ fontSize: 13, color: 'var(--rb-ink-3)', flexShrink: 0, marginRight: 12 }}>{f.l}</span>
                <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', textTransform: f.l === 'Status' ? 'capitalize' as const : undefined }}>{f.v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const }}>
              <button onClick={() => setEditMode(true)} style={actBtnPrimary}>Edit details</button>
              {r.status === 'active' && (
                <button onClick={() => setModal('end-lease')} style={{ padding: '7px 14px', borderRadius: 999, border: '1px solid var(--rb-danger)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: 'var(--rb-danger)', fontWeight: 600 }}>End lease</button>
              )}
            </div>
          </>
        )}
      </Modal>
    )
  }

  // ── End lease modal ──────────────────────────────────────────────────────
  function EndLeaseModal() {
    const r = selectedRental || tenantData?.rental
    if (!r) return null
    const [saving, setSaving] = useState(false)
    const isLandlord = role === 'landlord'

    const handleEnd = async () => {
      setSaving(true)
      try {
        const { error } = await sb.from('rentals').update({ status: 'ended' }).eq('id', r.id)
        if (error) throw error
        toast('Lease ended.', 'success')
        setModal(null); setSelectedRental(null); window.location.reload()
      } catch (e: any) { console.error('[EndLease]', e); toast(e?.message || 'Failed to end lease', 'error') } finally { setSaving(false) }
    }

    return (
      <Modal title="End lease" onClose={() => setModal(isLandlord ? 'property-detail' : null)}>
        <p style={{ fontSize: 14, color: 'var(--rb-ink-2)', lineHeight: 1.6 }}>
          {isLandlord
            ? <>This will end the lease for <strong>{r.property?.name}</strong>. The tenant will lose access to this rental.</>
            : <>This will send a lease termination request for <strong>{r.property?.name}</strong>. Your landlord will be notified.</>}
        </p>
        <div style={{ marginTop: 14, padding: 14, background: 'var(--rb-danger-soft)', borderRadius: 10, fontSize: 13, color: 'var(--rb-danger)', lineHeight: 1.5 }}>
          ⚠ This action cannot be undone. All data will be archived.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--rb-border)' }}>
          <button onClick={() => setModal(isLandlord ? 'property-detail' : null)} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancel</button>
          <button onClick={handleEnd} disabled={saving} style={{ padding: '8px 18px', borderRadius: 999, background: 'var(--rb-danger)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{saving ? 'Ending…' : 'Yes, end lease'}</button>
        </div>
      </Modal>
    )
  }

  // ── Sign agreement modal (tenant) ────────────────────────────────────────
  function SignAgreementModal() {
    const rental: Rental | null = tenantData?.rental || null
    if (!rental) return null
    const [saving, setSaving] = useState(false)

    const handleSign = async () => {
      setSaving(true)
      try {
        const { error } = await sb.from('rentals').update({ agreement_signed_at: new Date().toISOString() }).eq('id', rental.id)
        if (error) throw error
        toast('Agreement signed ✓', 'success')
        setModal(null); window.location.reload()
      } catch (e: any) { console.error('[SignAgreement]', e); toast(e?.message || 'Failed to sign agreement', 'error') } finally { setSaving(false) }
    }

    return (
      <Modal title="Sign rental agreement" onClose={() => setModal(null)}>
        <div style={{ padding: 16, background: 'var(--rb-fill)', borderRadius: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)', marginBottom: 12 }}>Rental terms</div>
          {[
            { l: 'Property', v: rental.property?.name || '—' },
            { l: 'Address', v: rental.property?.address_line1 || '—' },
            { l: 'Monthly rent', v: inr(rental.monthly_rent) },
            { l: 'Security deposit', v: inr(rental.security_deposit) },
            { l: 'Rent due', v: `${rental.rent_due_day || '—'}th of every month` },
          ].map(f => (
            <div key={f.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--rb-border-soft)' }}>
              <span style={{ fontSize: 13, color: 'var(--rb-ink-3)' }}>{f.l}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{f.v}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--rb-ink-2)', lineHeight: 1.6, marginBottom: 16 }}>
          By signing, you confirm you have read and agree to the terms above. Your digital signature will be timestamped and stored on record.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--rb-border)' }}>
          <button onClick={() => setModal(null)} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSign} disabled={saving} style={{ padding: '8px 18px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{saving ? 'Signing…' : '✍ Sign agreement'}</button>
        </div>
      </Modal>
    )
  }

  // ── Add building modal ───────────────────────────────────────────────────
  function AddBuildingModal() {
    const [form, setForm] = useState({
      name: '', property_type: 'apartment', total_units: '',
      address_line1: '', address_line2: '', city: '', state: '', pincode: '',
    })
    const [saving, setSaving] = useState(false)
    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
    const chip = (k: string, v: string) => {
      const active = (form as any)[k] === v
      return { padding: '7px 14px', borderRadius: 999, border: `1.5px solid ${active ? 'var(--rb-action)' : 'var(--rb-border)'}`, background: active ? 'var(--rb-action)' : 'transparent', color: active ? '#fff' : 'var(--rb-ink-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'all .15s' }
    }
    const handleSubmit = async () => {
      if (!form.name || !form.address_line1 || !form.city || !form.state || !form.pincode) {
        toast('Fill in all required fields', 'error'); return
      }
      setSaving(true)
      try {
        const { error } = await sb.from('buildings').insert({
          name: form.name, landlord_id: user.id, property_type: form.property_type,
          total_units: form.total_units ? Number(form.total_units) : null,
          address_line1: form.address_line1, address_line2: form.address_line2 || null,
          city: form.city, state: form.state, pincode: form.pincode,
        })
        if (error) throw error
        toast('Building created! Now add units to it.', 'success')
        setModal(null); window.location.reload()
      } catch (e: any) { console.error('[AddBuilding]', e); toast(e?.message || 'Failed to create building', 'error'); setSaving(false) }
    }
    return (
      <Modal title="Add building" onClose={() => setModal(null)}>
        <Field label="Building type">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[['apartment','Apartments'],['house','Villas / Row houses'],['pg','PG / Hostel'],['commercial','Commercial']].map(([v,l]) => (
              <button key={v} style={chip('property_type', v)} onClick={() => setForm(f => ({ ...f, property_type: v }))}>{l}</button>
            ))}
          </div>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Building name *"><input style={inputStyle} value={form.name} onChange={set('name')} placeholder="e.g. Sunrise Heights" /></Field>
          <Field label="Total units"><input style={inputStyle} type="number" value={form.total_units} onChange={set('total_units')} placeholder="12" /></Field>
        </div>
        <Field label="Street address *"><input style={inputStyle} value={form.address_line1} onChange={set('address_line1')} placeholder="Building no., street name" /></Field>
        <Field label="Landmark / area"><input style={inputStyle} value={form.address_line2} onChange={set('address_line2')} placeholder="Near Metro station" /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="City *"><input style={inputStyle} value={form.city} onChange={set('city')} placeholder="Hyderabad" /></Field>
          <Field label="State *"><input style={inputStyle} value={form.state} onChange={set('state')} placeholder="Telangana" /></Field>
        </div>
        <Field label="Pincode *"><input style={inputStyle} value={form.pincode} onChange={set('pincode')} placeholder="500001" /></Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--rb-border)' }}>
          <button onClick={() => setModal(null)} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 18px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{saving ? 'Creating…' : 'Create building'}</button>
        </div>
      </Modal>
    )
  }

  // ── Add unit to a building ───────────────────────────────────────────────
  function AddUnitModal() {
    const building = selectedBuilding
    if (!building) return null
    const [form, setForm] = useState({
      unit_number: '', bedrooms: '2', bathrooms: '1', area_sqft: '', floor_number: '', parking: false,
      monthly_rent: '', security_deposit: '', maintenance_charges: '0', rent_due_day: '5',
      furnished_status: 'unfurnished', notice_period_days: '30', lock_in_period_months: '11',
      late_fee_percent: '5', rent_increment_percent: '5',
    })
    const [saving, setSaving] = useState(false)
    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
    const toggle = (k: string) => setForm(f => ({ ...f, [k]: !(f as any)[k] }))
    const chip = (k: string, v: string) => {
      const active = (form as any)[k] === v
      return { padding: '6px 12px', borderRadius: 999, border: `1.5px solid ${active ? 'var(--rb-action)' : 'var(--rb-border)'}`, background: active ? 'var(--rb-action)' : 'transparent', color: active ? '#fff' : 'var(--rb-ink-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, transition: 'all .15s' }
    }
    const SectionHead = ({ label }: { label: string }) => (
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)', marginTop: 22, marginBottom: 12, paddingTop: 18, borderTop: '1px solid var(--rb-border)' }}>{label}</div>
    )
    const handleSubmit = async () => {
      if (!form.unit_number || !form.monthly_rent) {
        toast('Enter unit number and monthly rent', 'error'); return
      }
      setSaving(true)
      try {
        const { data: prop, error: propErr } = await sb.from('properties').insert({
          name: `${building.name} – Unit ${form.unit_number}`,
          unit_number: form.unit_number, building_id: building.id, landlord_id: user.id,
          address_line1: building.address_line1, address_line2: building.address_line2 || null,
          city: building.city, state: building.state, pincode: building.pincode,
          property_type: building.property_type || 'apartment',
          bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
          bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
          area_sqft: form.area_sqft ? Number(form.area_sqft) : null,
          floor_number: form.floor_number ? Number(form.floor_number) : null,
          parking: form.parking,
        }).select().single()
        if (propErr) throw propErr
        const { error: rentalErr } = await sb.from('rentals').insert({
          property_id: prop.id, landlord_id: user.id, status: 'pending_tenant',
          start_date: new Date().toISOString().slice(0, 10),
          monthly_rent: Number(form.monthly_rent), security_deposit: Number(form.security_deposit || 0),
          maintenance_charges: Number(form.maintenance_charges || 0), rent_due_day: Number(form.rent_due_day),
          furnished_status: form.furnished_status, notice_period_days: Number(form.notice_period_days || 30),
          lock_in_period_months: Number(form.lock_in_period_months || 11),
          late_fee_percent: Number(form.late_fee_percent || 5), rent_increment_percent: Number(form.rent_increment_percent || 5),
        })
        if (rentalErr) throw rentalErr
        toast('Unit added!', 'success')
        setModal(null); window.location.reload()
      } catch (e: any) { console.error('[AddUnit]', e); toast(e?.message || 'Failed to add unit', 'error'); setSaving(false) }
    }
    return (
      <Modal title={`Add unit · ${building.name}`} onClose={() => { setModal(null); setSelectedBuilding(null) }}>
        <div style={{ padding: '10px 12px', background: 'var(--rb-surface)', borderRadius: 10, marginBottom: 18, fontSize: 13, color: 'var(--rb-ink-3)' }}>
          🏢 {building.address_line1}, {building.city}
        </div>
        <Field label="Unit number *"><input style={inputStyle} value={form.unit_number} onChange={set('unit_number')} placeholder="e.g. 4B, 201, G1" /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Bedrooms (BHK)">
            <div style={{ display: 'flex', gap: 6 }}>
              {['1','2','3','4'].map(v => <button key={v} style={chip('bedrooms', v)} onClick={() => setForm(f => ({ ...f, bedrooms: v }))}>{v === '4' ? '4+' : v}</button>)}
            </div>
          </Field>
          <Field label="Bathrooms">
            <div style={{ display: 'flex', gap: 6 }}>
              {['1','2','3'].map(v => <button key={v} style={chip('bathrooms', v)} onClick={() => setForm(f => ({ ...f, bathrooms: v }))}>{v === '3' ? '3+' : v}</button>)}
            </div>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Area (sq ft)"><input style={inputStyle} type="number" value={form.area_sqft} onChange={set('area_sqft')} placeholder="850" /></Field>
          <Field label="Floor number"><input style={inputStyle} type="number" value={form.floor_number} onChange={set('floor_number')} placeholder="3" /></Field>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
          <span style={{ fontSize: 14, color: 'var(--rb-ink)' }}>Parking available</span>
          <button onClick={() => toggle('parking')} style={{ width: 44, height: 24, borderRadius: 999, background: form.parking ? 'var(--rb-action)' : 'var(--rb-border)', border: 0, cursor: 'pointer', position: 'relative', transition: 'background .2s' }}>
            <span style={{ position: 'absolute', top: 2, left: form.parking ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
          </button>
        </div>
        <SectionHead label="Rental terms" />
        <Field label="Furnishing">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[['unfurnished','Unfurnished'],['semi_furnished','Semi'],['fully_furnished','Fully furnished']].map(([v,l]) => (
              <button key={v} style={chip('furnished_status', v)} onClick={() => setForm(f => ({ ...f, furnished_status: v }))}>{l}</button>
            ))}
          </div>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Monthly rent (₹) *"><input style={inputStyle} type="number" value={form.monthly_rent} onChange={set('monthly_rent')} placeholder="25000" /></Field>
          <Field label="Security deposit (₹)"><input style={inputStyle} type="number" value={form.security_deposit} onChange={set('security_deposit')} placeholder="50000" /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Maintenance (₹/mo)"><input style={inputStyle} type="number" value={form.maintenance_charges} onChange={set('maintenance_charges')} placeholder="0" /></Field>
          <Field label="Rent due day"><select style={inputStyle} value={form.rent_due_day} onChange={set('rent_due_day')}>{Array.from({length:28},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}th</option>)}</select></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Notice period (days)"><input style={inputStyle} type="number" value={form.notice_period_days} onChange={set('notice_period_days')} placeholder="30" /></Field>
          <Field label="Lock-in (months)"><input style={inputStyle} type="number" value={form.lock_in_period_months} onChange={set('lock_in_period_months')} placeholder="11" /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Late fee (% of rent)"><input style={inputStyle} type="number" value={form.late_fee_percent} onChange={set('late_fee_percent')} placeholder="5" /></Field>
          <Field label="Annual increment (%)"><input style={inputStyle} type="number" value={form.rent_increment_percent} onChange={set('rent_increment_percent')} placeholder="5" /></Field>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--rb-border)' }}>
          <button onClick={() => { setModal(null); setSelectedBuilding(null) }} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 18px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{saving ? 'Adding…' : 'Add unit'}</button>
        </div>
      </Modal>
    )
  }

  // ── Building detail / edit modal ─────────────────────────────────────────
  function BuildingDetailModal() {
    const building = selectedBuilding
    if (!building) return null
    const [editMode, setEditMode] = useState(false)
    const [form, setForm] = useState({
      name: building.name, property_type: building.property_type || 'apartment',
      total_units: building.total_units ? String(building.total_units) : '',
      address_line1: building.address_line1, address_line2: building.address_line2 || '',
      city: building.city, state: building.state, pincode: building.pincode,
    })
    const [saving, setSaving] = useState(false)
    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
    const chip = (k: string, v: string) => {
      const active = (form as any)[k] === v
      return { padding: '6px 12px', borderRadius: 999, border: `1.5px solid ${active ? 'var(--rb-action)' : 'var(--rb-border)'}`, background: active ? 'var(--rb-action)' : 'transparent', color: active ? '#fff' : 'var(--rb-ink-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, transition: 'all .15s' }
    }
    const handleSave = async () => {
      setSaving(true)
      try {
        const { error } = await sb.from('buildings').update({
          name: form.name, property_type: form.property_type,
          total_units: form.total_units ? Number(form.total_units) : null,
          address_line1: form.address_line1, address_line2: form.address_line2 || null,
          city: form.city, state: form.state, pincode: form.pincode,
        }).eq('id', building.id)
        if (error) throw error
        toast('Building updated!', 'success')
        setModal(null); setSelectedBuilding(null); window.location.reload()
      } catch (e: any) { console.error('[EditBuilding]', e); toast(e?.message || 'Failed to update building', 'error') } finally { setSaving(false) }
    }
    const onClose = () => { setModal(null); setSelectedBuilding(null) }
    const rentalsForBuilding = (landlordData?.rentals || []).filter((r: Rental) => r.property?.building_id === building.id)
    return (
      <Modal title={editMode ? 'Edit building' : building.name} onClose={onClose}>
        {editMode ? (
          <>
            <Field label="Building type">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['apartment','Apartments'],['house','Villas'],['pg','PG / Hostel'],['commercial','Commercial']].map(([v,l]) => (
                  <button key={v} style={chip('property_type', v)} onClick={() => setForm(f => ({ ...f, property_type: v }))}>{l}</button>
                ))}
              </div>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Building name"><input style={inputStyle} value={form.name} onChange={set('name')} /></Field>
              <Field label="Total units"><input style={inputStyle} type="number" value={form.total_units} onChange={set('total_units')} placeholder="12" /></Field>
            </div>
            <Field label="Street address"><input style={inputStyle} value={form.address_line1} onChange={set('address_line1')} /></Field>
            <Field label="Landmark / area"><input style={inputStyle} value={form.address_line2} onChange={set('address_line2')} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="City"><input style={inputStyle} value={form.city} onChange={set('city')} /></Field>
              <Field label="State"><input style={inputStyle} value={form.state} onChange={set('state')} /></Field>
            </div>
            <Field label="Pincode"><input style={inputStyle} value={form.pincode} onChange={set('pincode')} /></Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--rb-border)' }}>
              <button onClick={() => setEditMode(false)} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </>
        ) : (
          <>
            {[
              { l: 'Type', v: form.property_type.charAt(0).toUpperCase() + form.property_type.slice(1) },
              { l: 'Address', v: [building.address_line1, building.address_line2, building.city, building.state].filter(Boolean).join(', ') },
              { l: 'Pincode', v: building.pincode },
              { l: 'Total units', v: building.total_units ? String(building.total_units) : 'Not set' },
              { l: 'Units added', v: String(rentalsForBuilding.length) },
              { l: 'Occupied', v: String(rentalsForBuilding.filter((r: Rental) => r.tenant_id && r.status === 'active').length) },
            ].map(f => (
              <div key={f.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--rb-border-soft)' }}>
                <span style={{ fontSize: 13, color: 'var(--rb-ink-3)' }}>{f.l}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{f.v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' as const }}>
              <button onClick={() => setEditMode(true)} style={actBtnPrimary}>Edit details</button>
              <button onClick={() => { setModal('add-unit') }} style={{ ...actBtnPrimary, background: 'var(--rb-surface)', color: 'var(--rb-action)', border: '1.5px solid var(--rb-action)' }}>+ Add unit</button>
            </div>
          </>
        )}
      </Modal>
    )
  }

  // ── Edit profile modal ───────────────────────────────────────────────────
  function EditProfileModal() {
    const [form, setForm] = useState({
      full_name:   profile?.full_name   || '',
      phone:       profile?.phone       || '',
      upi_id:      profile?.upi_id      || '',
      pan_number:  profile?.pan_number  || '',
    })
    const [saving, setSaving] = useState(false)
    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

    const handleSave = async () => {
      setSaving(true)
      try {
        const { error } = await sb.from('profiles').update({
          full_name:  form.full_name  || null,
          phone:      form.phone      || null,
          upi_id:     form.upi_id     || null,
          pan_number: form.pan_number ? form.pan_number.toUpperCase() : null,
        }).eq('id', user.id)
        if (error) throw error
        toast('Profile updated!', 'success')
        setModal(null); window.location.reload()
      } catch (e: any) { console.error('[EditProfile]', e); toast(e?.message || 'Failed to update', 'error') } finally { setSaving(false) }
    }

    return (
      <Modal title="Edit profile" onClose={() => setModal(null)}>
        <Field label="Full name"><input style={inputStyle} value={form.full_name} onChange={set('full_name')} placeholder="Your full name" /></Field>
        <Field label="Phone number"><input style={inputStyle} value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" /></Field>
        <Field label={role === 'landlord' ? 'UPI ID — tenants pay you here' : 'UPI ID — for deposit refunds'}>
          <input style={{ ...inputStyle, fontFamily: 'var(--rb-font-mono)' }} value={form.upi_id} onChange={set('upi_id')} placeholder="yourname@upi" />
        </Field>
        <Field label="PAN number (for HRA receipts)">
          <input style={{ ...inputStyle, textTransform: 'uppercase' as const, fontFamily: 'var(--rb-font-mono)' }} value={form.pan_number} onChange={set('pan_number')} placeholder="ABCDE1234F" maxLength={10} />
        </Field>
        <div style={{ padding: 12, background: 'var(--rb-fill)', borderRadius: 10, fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 4, lineHeight: 1.55 }}>
          Your name and email come from Google and cannot be changed here.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--rb-border)' }}>
          <button onClick={() => setModal(null)} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{saving ? 'Saving…' : 'Save changes'}</button>
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
          .d-grid-inner{grid-template-columns:1fr!important;gap:14px!important}
          .d-grid-inner>*{grid-column:1/-1!important}
          .inner-stats{grid-template-columns:1fr!important}
          .inner-stats>*{border-right:none!important;border-bottom:1px solid var(--rb-border-soft)}
          .inner-stats>*:last-child{border-bottom:none!important}
          .stat-4{grid-template-columns:repeat(2,1fr)!important}
        }
        @media(min-width:768px){
          .m-head{display:none!important}
          .m-tabs{display:none!important}
        }
      `}</style>

      {/* Mobile fixed header */}
      <div className="m-head" style={{ display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'var(--rb-canvas)', borderBottom: '1px solid var(--rb-border)', padding: '13px 18px', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <LogoLockup size={26} fontSize={18} gap={9} />
        </a>
        <button onClick={() => navigate('profile')} style={{ width: 32, height: 32, borderRadius: '50%', background: avatarBg, border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 13, fontFamily: 'var(--rb-font-display)', fontWeight: 700, overflow: 'hidden' }}>
          {avatarUrl ? <img src={avatarUrl} alt={firstName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : firstName.charAt(0).toUpperCase()}
        </button>
      </div>

      {/* Desktop shell */}
      <div className="d-shell" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside className="d-side" style={{ padding: '28px 18px', background: 'var(--rb-canvas)', borderRight: '1px solid var(--rb-border)', display: 'flex', flexDirection: 'column', gap: 28, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
          <a href="/" style={{ textDecoration: 'none', padding: '0 8px' }}>
            <LogoLockup size={28} fontSize={19} gap={10} />
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
      {modal === 'edit-profile' && <EditProfileModal />}
      {modal === 'add-property' && <AddPropertyModal />}
      {modal === 'add-building' && <AddBuildingModal />}
      {modal === 'add-unit' && <AddUnitModal />}
      {modal === 'building-detail' && <BuildingDetailModal />}
      {modal === 'pay-rent' && <PayRentModal />}
      {modal === 'new-repair' && <NewRepairModal />}
      {modal === 'repair-update' && <LandlordUpdateRepairModal />}
      {modal === 'repair-detail' && <TenantRepairDetailModal />}
      {modal === 'add-proof-photo' && <AddProofPhotoModal />}
      {modal === 'property-detail' && <PropertyDetailModal />}
      {modal === 'end-lease' && <EndLeaseModal />}
      {modal === 'sign-agreement' && <SignAgreementModal />}

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
