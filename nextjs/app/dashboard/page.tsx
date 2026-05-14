'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoLockup } from '@/components/brand'

// ── Types ─────────────────────────────────────────────────────────────────
type Profile = { id: string; full_name?: string; avatar_url?: string; role?: string; phone?: string; upi_id?: string; pan_number?: string; email?: string }
type Building = { id: string; name: string; address_line1: string; address_line2?: string; city: string; state: string; pincode: string; property_type?: string; total_units?: number; created_at: string }
type Rental = { id: string; monthly_rent: number; security_deposit: number; rent_due_day?: number; status: string; invite_token?: string; invite_expires_at?: string; agreement_signed_at?: string; landlord_signed_at?: string; agreement_status?: string; agreement_custom_clauses?: string; notice_period_days?: number; furnished_status?: string; late_fee_percent?: number; maintenance_charges?: number; lock_in_period_months?: number; rent_increment_percent?: number; start_date?: string; end_date?: string; notice_given_at?: string; move_out_date?: string; escalation_applied_at?: string; property?: Property; landlord?: Profile; tenant?: Profile; landlord_id?: string; tenant_id?: string }
type Message = { id: string; rental_id: string; sender_id: string; body: string; read_at?: string; created_at: string; sender?: { full_name?: string; avatar_url?: string } }
type Property = { id: string; name: string; address_line1?: string; address_line2?: string; city?: string; state?: string; pincode?: string; property_type?: string; bedrooms?: number; bathrooms?: number; area_sqft?: number; floor_number?: number; parking?: boolean; building_id?: string; unit_number?: string; building?: Building }
type RentPayment = { id: string; rental_id: string; month: string; amount: number; status: string; payment_method?: string; utr_number?: string; payment_note?: string; payment_proof_url?: string; late_fee?: number; created_at: string; updated_at?: string }
type RepairRequest = { id: string; rental_id: string; title: string; description?: string; status: string; cost?: number; category?: string; urgency?: string; photo_url?: string; landlord_note?: string; scheduled_date?: string; deduct_from_deposit?: boolean; vendor_name?: string; vendor_phone?: string; resolved_confirmed_at?: string; created_at: string; rental?: { property?: Property } }
type Proof = { id: string; rental_id: string; type: string; status: string; proof_photos?: ProofPhoto[] }
type ProofPhoto = { id: string; room_label?: string; public_url?: string; annotation?: string; created_at: string }
type DepositTx = { id: string; rental_id: string; type: string; amount: number; note?: string; description?: string; tenant_dispute_note?: string; dispute_status?: string; created_at: string }

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
function leaseExpiryDays(rental: Rental): number | null {
  if (!rental.end_date) return null
  const d = Math.ceil((new Date(rental.end_date).getTime() - now.getTime()) / 86400000)
  return d >= 0 ? d : null
}
function escalationDueDays(rental: Rental): number | null {
  if (!rental.start_date) return null
  const start = new Date(rental.start_date)
  const ann = new Date(start)
  ann.setFullYear(now.getFullYear())
  if (ann <= now) ann.setFullYear(ann.getFullYear() + 1)
  const d = Math.ceil((ann.getTime() - now.getTime()) / 86400000)
  return d <= 90 ? d : null
}
function computeLateFee(rental: Rental): number {
  return Math.round(Number(rental.monthly_rent) * (Number(rental.late_fee_percent || 5) / 100))
}
function scoreNudge(score: number, months: number): string {
  if (score >= 850) return 'Excellent! Keep paying on time to maintain your top rating.'
  if (score >= 750) return `Pay on time for ${Math.max(1, Math.ceil((850 - score) / 12))} more month${Math.ceil((850 - score) / 12) === 1 ? '' : 's'} to reach Excellent (850+).`
  if (score >= 650) return `${Math.max(1, Math.ceil((750 - score) / 12))} more on-time payments to reach Trusted (750+).`
  return `Each on-time payment adds ~12 points. You need ${Math.max(1, Math.ceil((650 - score) / 12))} more months to reach Good (650+).`
}

// ── Invite token helper ───────────────────────────────────────────────────
function genToken() {
  const buf = new Uint8Array(6)
  crypto.getRandomValues(buf)
  return Array.from(buf, b => b.toString(36).padStart(2, '0')).join('').toUpperCase().slice(0, 8)
}
function tokenExpiry() { return new Date(Date.now() + 72 * 3600000).toISOString() }

// ── Nav icons (Lucide-style SVG paths) ────────────────────────────────────
const NAV_PATHS: Record<string, string> = {
  home:    `<path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7m-2 2v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7m5 8v-5a1 1 0 011-1h2a1 1 0 011 1v5"/>`,
  pay:     `<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="7" y1="15" x2="9" y2="15"/>`,
  rep:     `<path stroke-linecap="round" stroke-linejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>`,
  hra:     `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>`,
  profile: `<path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>`,
  props:   `<path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>`,
  led:     `<path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>`,
  msg:     `<path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>`,
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
  const [selectedDepositTx, setSelectedDepositTx] = useState<DepositTx | null>(null)
  const [messagingRental, setMessagingRental] = useState<Rental | null>(null)
  const msgChannelRef = useRef<any>(null)

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
            sb.from('rentals').select('*, property:properties(*, building:buildings(*)), tenant:profiles!rentals_tenant_id_fkey(id, full_name, phone, avatar_url, pan_number)').eq('landlord_id', u.id).neq('status', 'ended').order('created_at', { ascending: false }),
            sb.from('rent_payments').select('id, amount, month, status, rental_id, late_fee, created_at, rental:rentals!inner(landlord_id, tenant:profiles!rentals_tenant_id_fkey(full_name), property:properties(name, city))').eq('rental.landlord_id', u.id).gte('month', `${now.getFullYear()}-01-01`).order('month', { ascending: false }),
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
          const { data: rental } = await sb.from('rentals').select('*, property:properties(*), landlord:profiles!rentals_landlord_id_fkey(id, full_name, avatar_url, phone, pan_number)').eq('tenant_id', u.id).neq('status', 'ended').order('created_at', { ascending: false }).limit(1).maybeSingle()
          let currentPayment: RentPayment | null = null, recentPayments: RentPayment[] = [], openRepairs: RepairRequest[] = [], proofs: Proof | null = null, depositTransactions: DepositTx[] = []
          if (rental) {
            const [pmtRes, histRes, repRes, proofRes, depRes] = await Promise.all([
              sb.from('rent_payments').select('*').eq('rental_id', rental.id).eq('month', currentMonthDate).maybeSingle(),
              sb.from('rent_payments').select('*').eq('rental_id', rental.id).eq('status', 'paid').order('month', { ascending: false }).limit(12),
              sb.from('repair_requests').select('*').eq('rental_id', rental.id).in('status', ['open', 'in_progress']).order('created_at', { ascending: false }).limit(10),
              sb.from('proofs').select('*, proof_photos(id, room_label, public_url, annotation, created_at)').eq('rental_id', rental.id).eq('type', 'move_in').maybeSingle(),
              sb.from('deposit_transactions').select('id,rental_id,type,amount,note,category,payment_method,reference,tenant_dispute_note,dispute_status,created_at').eq('rental_id', rental.id).order('created_at', { ascending: false }),
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

  // Auto-apply late fee when tenant has an overdue payment without one yet
  useEffect(() => {
    const pmt = tenantData?.currentPayment
    const rental = tenantData?.rental
    if (!pmt || !rental || pmt.status !== 'overdue' || pmt.late_fee) return
    const fee = computeLateFee(rental)
    if (fee <= 0) return
    sb.from('rent_payments').update({ late_fee: fee }).eq('id', pmt.id).then(({ error }) => {
      if (!error) setTenantData((d: any) => ({ ...d, currentPayment: { ...d.currentPayment, late_fee: fee } }))
    })
  }, [tenantData?.currentPayment?.id])

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
    { k: 'msg', label: 'Messages', short: 'Msgs' },
    { k: 'agree', label: 'Agreements', short: 'Agree' },
    { k: 'rep', label: 'Repairs', short: 'Repairs' },
    { k: 'led', label: 'Ledger', short: 'Ledger' },
    { k: 'hra', label: 'Receipts', short: 'HRA' },
    { k: 'profile', label: 'Profile', short: 'Profile' },
  ]
  const tNavItems = [
    { k: 'home', label: 'My place', short: 'Home' },
    { k: 'pay', label: 'Pay rent', short: 'Pay' },
    { k: 'rep', label: 'Repairs', short: 'Repairs' },
    { k: 'msg', label: 'Messages', short: 'Msgs' },
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

  // ── Floor-map tile ──────────────────────────────────────────
  function UnitTile({ r, pmt }: { r: Rental; pmt?: RentPayment }) {
    const isVacant = !r.tenant_id
    const rawStatus = isVacant ? 'vacant' : (pmt?.status ?? 'pending')
    const st = {
      vacant:             { bg: 'var(--rb-fill)',        bd: '1.5px dashed var(--rb-border-strong)', lbl: 'VACANT', lc: 'var(--rb-ink-3)' },
      paid:               { bg: 'var(--rb-action-soft)', bd: '1.5px solid var(--rb-action)',         lbl: 'PAID',   lc: 'var(--rb-action)' },
      pending:            { bg: 'var(--rb-warning-soft)',bd: '1.5px solid var(--rb-warning)',         lbl: 'DUE',    lc: 'var(--rb-warning)' },
      overdue:            { bg: 'var(--rb-danger-soft)', bd: '1.5px solid var(--rb-danger)',          lbl: 'OVER',   lc: 'var(--rb-danger)' },
      pending_verification:{ bg: 'var(--rb-accent-soft)',bd: '1.5px solid var(--rb-accent)',          lbl: 'REVIEW', lc: 'var(--rb-accent)' },
      partial:            { bg: 'var(--rb-warning-soft)',bd: '1.5px solid var(--rb-warning)',         lbl: 'PART',   lc: 'var(--rb-warning)' },
    }[rawStatus] ?? { bg: 'var(--rb-fill)', bd: '1.5px solid var(--rb-border)', lbl: '—', lc: 'var(--rb-ink-3)' }
    const unitId = r.property?.unit_number || r.property?.name?.split(' ').pop() || '?'
    const initials = r.tenant?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
    return (
      <div
        onClick={() => { setSelectedRental(r); setModal('property-detail') }}
        title={r.tenant?.full_name ? `${r.property?.unit_number || r.property?.name} · ${r.tenant.full_name}` : `Unit ${unitId} · Vacant`}
        style={{ background: st.bg, border: st.bd, borderRadius: 12, padding: '10px 6px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minHeight: 96, transition: 'transform .12s, box-shadow .12s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(14,20,19,.1)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '' }}
      >
        <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--rb-ink)', lineHeight: 1 }}>{unitId}</span>
        {isVacant
          ? <div style={{ width: 30, height: 30, borderRadius: '50%', border: '1.5px dashed var(--rb-border-strong)', display: 'grid', placeItems: 'center', fontSize: 16, color: 'var(--rb-ink-3)' }}>+</div>
          : <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#2a5298,#163A47)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '.02em' }}>{initials}</div>
        }
        <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 8, fontWeight: 700, letterSpacing: '.12em', color: st.lc }}>{st.lbl}</span>
      </div>
    )
  }

  // ── Floor-map grid — groups units by floor_number, highest floor first ──
  function FloorMapGrid({ rentals, currentPayments }: { rentals: Rental[]; currentPayments: RentPayment[] }) {
    const [filter, setFilter] = useState<'all' | 'vacant' | 'overdue' | 'paid'>('all')

    const pmtOf = (r: Rental) => currentPayments.find(p => p.rental_id === r.id)
    const statusOf = (r: Rental) => {
      if (!r.tenant_id) return 'vacant'
      const p = pmtOf(r)
      return p ? p.status : 'pending'
    }

    const counts = {
      paid:    rentals.filter(r => statusOf(r) === 'paid').length,
      due:     rentals.filter(r => statusOf(r) === 'pending').length,
      overdue: rentals.filter(r => statusOf(r) === 'overdue').length,
      vacant:  rentals.filter(r => statusOf(r) === 'vacant').length,
    }

    const visible = filter === 'all'     ? rentals
                  : filter === 'vacant'  ? rentals.filter(r => !r.tenant_id)
                  : filter === 'overdue' ? rentals.filter(r => statusOf(r) === 'overdue')
                  : rentals.filter(r => statusOf(r) === 'paid')

    // group by floor_number (highest first, unassigned last)
    const byFloor = new Map<number | '_', Rental[]>()
    for (const r of visible) {
      const fl = r.property?.floor_number ?? '_'
      if (!byFloor.has(fl as any)) byFloor.set(fl as any, [])
      byFloor.get(fl as any)!.push(r)
    }
    const floorKeys = [...byFloor.keys()].sort((a, b) => {
      if (a === '_') return 1
      if (b === '_') return -1
      return (b as number) - (a as number)
    })

    const pillStyle = (active: boolean, bg: string, c: string): React.CSSProperties => ({
      display: 'inline-flex', alignItems: 'center', padding: '5px 11px', borderRadius: 999,
      fontFamily: 'var(--rb-font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '.1em',
      cursor: 'pointer', border: 'none', transition: 'all .14s',
      background: active ? bg : 'var(--rb-fill)', color: active ? c : 'var(--rb-ink-3)',
      outline: active ? `1.5px solid ${c}` : 'none', outlineOffset: 0,
    })

    const hasMultipleFloors = floorKeys.some(f => f !== '_') && floorKeys.length > 1

    return (
      <div style={{ padding: '14px 18px 18px' }}>
        {/* Summary + filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          <button style={pillStyle(filter === 'all', 'var(--rb-ink)', '#fff')} onClick={() => setFilter('all')}>All {rentals.length}</button>
          {counts.paid > 0    && <button style={pillStyle(filter === 'paid', 'var(--rb-action)', '#fff')} onClick={() => setFilter('paid')}>Paid {counts.paid}</button>}
          {counts.due > 0     && <button style={pillStyle(false, 'var(--rb-warning-soft)', 'var(--rb-warning)')} onClick={() => setFilter('all')}>Due {counts.due}</button>}
          {counts.overdue > 0 && <button style={pillStyle(filter === 'overdue', 'var(--rb-danger)', '#fff')} onClick={() => setFilter('overdue')}>Overdue {counts.overdue}</button>}
          {counts.vacant > 0  && <button style={pillStyle(filter === 'vacant', 'var(--rb-fill-2)', 'var(--rb-ink-2)')} onClick={() => setFilter('vacant')}>Vacant {counts.vacant}</button>}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { bg: 'var(--rb-action-soft)', bd: 'var(--rb-action)', label: 'Paid' },
            { bg: 'var(--rb-warning-soft)', bd: 'var(--rb-warning)', label: 'Due' },
            { bg: 'var(--rb-danger-soft)', bd: 'var(--rb-danger)', label: 'Overdue' },
            { bg: 'var(--rb-fill)', bd: 'var(--rb-border-strong)', label: 'Vacant', dashed: true },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: `1.5px ${l.dashed ? 'dashed' : 'solid'} ${l.bd}`, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--rb-ink-3)', fontFamily: 'var(--rb-font-mono)', letterSpacing: '.06em' }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* No results */}
        {floorKeys.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--rb-ink-3)', fontSize: 13 }}>No units match this filter.</div>
        )}

        {/* Floor rows */}
        {floorKeys.map(fl => (
          <div key={String(fl)} style={{ marginBottom: 20 }}>
            {hasMultipleFloors && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '.18em', color: 'var(--rb-ink-3)', flexShrink: 0 }}>
                  {fl === '_' ? 'UNASSIGNED' : `FLOOR ${fl}`}
                </span>
                <span style={{ flex: 1, height: 1, background: 'var(--rb-border)' }} />
                <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 9, color: 'var(--rb-ink-3)', flexShrink: 0 }}>{byFloor.get(fl)!.length} unit{byFloor.get(fl)!.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
              {byFloor.get(fl)!.map(r => <UnitTile key={r.id} r={r} pmt={pmtOf(r)} />)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Building card — shows occupancy stats + all its units
  function BuildingCard({ building, rentals, currentPayments }: { building: Building; rentals: Rental[]; currentPayments: RentPayment[] }) {
    const [expanded, setExpanded] = useState(true)
    const [view, setView] = useState<'list' | 'map'>('list')
    const occupied = rentals.filter(r => r.tenant_id && r.status === 'active').length
    const totalRent = rentals.reduce((s, r) => s + Number(r.monthly_rent), 0)
    const collected = currentPayments.filter(p => p.status === 'paid' && rentals.some(r => r.id === p.rental_id)).reduce((s, p) => s + Number(p.amount), 0)
    const pct = totalRent > 0 ? Math.round(collected / totalRent * 100) : 0
    const openPmt = currentPayments.find(p => p.status === 'pending_verification' && rentals.some(r => r.id === p.rental_id))
    return (
      <div style={{ border: '1px solid var(--rb-border)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
        {/* Building header */}
        <div style={{ padding: '10px 14px', background: 'var(--rb-surface)', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#0E1413,#2a3a38)', display: 'grid', placeItems: 'center', fontSize: 15, flexShrink: 0 }}>🏢</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--rb-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{building.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--rb-ink-3)', marginTop: 1 }}>{building.address_line1}, {building.city}</div>
                </div>
              </div>
              <div style={{ marginTop: 5, fontSize: 12, color: 'var(--rb-ink-2)' }}>
                <span style={{ fontWeight: 600 }}>{occupied}/{rentals.length}</span> occupied · <span style={{ fontWeight: 600 }}>{inr(totalRent)}/mo</span> · <span style={{ color: pct >= 80 ? 'var(--rb-success)' : 'var(--rb-warning)', fontWeight: 600 }}>{pct}% collected</span>
              </div>
              <div style={{ height: 3, background: 'var(--rb-fill-2)', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? 'var(--rb-success)' : 'var(--rb-warning)', borderRadius: 4, transition: 'width .4s' }} />
              </div>
            </div>
            <div className="d-bcard-actions" style={{ display: 'flex', gap: 8, marginLeft: 8, flexShrink: 1, alignItems: 'center' }}>
              {rentals.length > 0 && (
                <div style={{ display: 'flex', borderRadius: 999, border: '1px solid var(--rb-border)', overflow: 'hidden', flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); setView('list') }} style={{ padding: '8px 12px', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, background: view === 'list' ? 'var(--rb-ink-1)' : 'transparent', color: view === 'list' ? '#fff' : 'var(--rb-ink-3)', transition: 'background .15s' }}>☰<span className="d-toggle-label"> List</span></button>
                  <button onClick={e => { e.stopPropagation(); setView('map') }} style={{ padding: '8px 12px', border: 0, borderLeft: '1px solid var(--rb-border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, background: view === 'map' ? 'var(--rb-ink-1)' : 'transparent', color: view === 'map' ? '#fff' : 'var(--rb-ink-3)', transition: 'background .15s' }}>⊞<span className="d-toggle-label"> Map</span></button>
                </div>
              )}
              <button onClick={e => { e.stopPropagation(); setSelectedBuilding(building); setModal('add-unit') }} style={{ padding: '8px 14px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>+ Add</button>
              <button onClick={e => { e.stopPropagation(); setSelectedBuilding(building); setModal('building-detail') }} style={{ padding: '8px 12px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: 'var(--rb-ink-3)' }}>Edit</button>
              <span style={{ fontSize: 18, color: 'var(--rb-ink-3)', lineHeight: 1 }}>{expanded ? '▾' : '▸'}</span>
            </div>
          </div>
          {openPmt && <div style={{ marginTop: 8, padding: '5px 10px', background: 'var(--rb-warning-soft)', borderRadius: 8, fontSize: 12, color: 'var(--rb-warning)', fontWeight: 600 }}>⏳ Payment awaiting review</div>}
        </div>
        {/* Unit list / map */}
        {expanded && (
          view === 'map' && rentals.length > 0
            ? <FloorMapGrid rentals={rentals} currentPayments={currentPayments} />
            : <div style={{ padding: '12px 18px 16px', background: 'var(--rb-canvas)', display: 'flex', flexDirection: 'column', gap: 8 }}>
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
            <div className="d-stat-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginTop: 22, paddingTop: 20, borderTop: '1px solid rgba(246,244,238,.12)' }}>
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

          {(() => {
            const escalating = activeRentals.filter((r: Rental) => escalationDueDays(r) !== null)
            if (escalating.length === 0) return null
            return (
              <section style={{ ...cardStyle, gridColumn: 'span 2', padding: '16px 20px' }}>
                <h3 style={{ ...cardH3Style, marginBottom: 14, fontSize: 18 }}>Rent revisions due</h3>
                {escalating.map((r: Rental) => {
                  const days = escalationDueDays(r)!
                  const newRent = Math.round(Number(r.monthly_rent) * (1 + Number(r.rent_increment_percent || 5) / 100))
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--rb-border-soft)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--rb-action-soft)', display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0 }}>📈</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.property?.name || '—'}</div>
                          <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>{r.tenant?.full_name || '—'} · {inr(r.monthly_rent)} → {inr(newRent)} · in {days} day{days !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <button onClick={() => { setSelectedRental(r); setModal('apply-escalation') }} style={{ padding: '8px 16px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>Apply now</button>
                    </div>
                  )
                })}
              </section>
            )
          })()}

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
            : (() => {
                // Compute running balance across all filtered entries (oldest→newest for accumulation)
                const sorted = [...filtered].sort((a, b) => a.month.localeCompare(b.month))
                const runningBal: Record<string, number> = {}
                let cum = 0
                for (const p of sorted) { if (p.status === 'paid') { cum += Number(p.amount); runningBal[p.id] = cum } }
                return months.map(m => {
                  const mPayments = byMonth[m]
                  const mCollected = mPayments.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + Number(p.amount), 0)
                  const mTotal    = mPayments.reduce((s: number, p: any) => s + Number(p.amount), 0)
                  const allPaid   = mCollected === mTotal
                  return (
                    <div key={m} style={{ marginBottom: 26 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 10px', borderBottom: '2px solid var(--rb-border)' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: 'var(--rb-ink)' }}>{monthLabel(m + '-01')}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: allPaid ? 'var(--rb-action)' : 'var(--rb-ink-3)' }}>
                          {inr(mCollected)}<span style={{ fontWeight: 400, color: 'var(--rb-ink-3)', fontSize: 12 }}> / {inr(mTotal)}</span>
                          {!allPaid && mTotal > mCollected && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--rb-danger)' }}>–{inr(mTotal - mCollected)} gap</span>}
                        </span>
                      </div>
                      {mPayments.map((p: any) => {
                        const st = stMap[p.status] || { t: p.status?.toUpperCase() || '?', bg: 'var(--rb-fill-2)', c: 'var(--rb-ink-3)' }
                        const payDate = new Date(p.created_at)
                        const dateStr = payDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        const propName   = p.rental?.property?.name || '—'
                        const tenantName = p.rental?.tenant?.full_name || '—'
                        const amtColor   = p.status === 'paid' ? 'var(--rb-action)' : p.status === 'overdue' ? 'var(--rb-danger)' : 'var(--rb-ink-2)'
                        const bal = runningBal[p.id]
                        return (
                          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '52px 1fr auto auto auto', gap: 10, alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--rb-border-soft)' }}>
                            <div style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 11, color: 'var(--rb-ink-3)', textAlign: 'center' as const, lineHeight: 1.3 }}>{dateStr}</div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--rb-ink)' }}>{propName}</div>
                              <div style={{ fontSize: 11, color: 'var(--rb-ink-3)', marginTop: 2 }}>{tenantName}</div>
                            </div>
                            <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 999, letterSpacing: '.05em', whiteSpace: 'nowrap' as const, background: st.bg, color: st.c }}>{st.t}</span>
                            <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 16, fontWeight: 600, textAlign: 'right' as const, color: amtColor, minWidth: 72 }}>
                              {p.status === 'paid' ? '+' : ''}{inr(p.amount)}
                              {p.status === 'overdue' && Number(p.late_fee) > 0 && <div style={{ fontSize: 10, color: 'var(--rb-danger)', fontFamily: 'var(--rb-font-mono)', fontWeight: 700, marginTop: 2 }}>+{inr(p.late_fee)} fee</div>}
                            </div>
                            <div style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 10, color: 'var(--rb-ink-3)', textAlign: 'right' as const, minWidth: 68 }}>
                              {bal !== undefined ? <span title="Running balance collected">{inr(bal)}</span> : <span style={{ opacity: .3 }}>—</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              })()
          }
          {filtered.length > 0 && <div style={{ paddingTop: 14, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--rb-ink-3)' }}><span>Running total: <strong style={{ color: 'var(--rb-action)', fontFamily: 'var(--rb-font-display)', fontSize: 16 }}>{inr(collected)}</strong> collected</span><span>{filtered.filter((p: any) => p.status === 'overdue').length} overdue</span></div>}
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
            {currentPayment?.status === 'overdue' && (currentPayment?.late_fee || 0) > 0 && (
              <div style={{ marginTop: 12, padding: '9px 14px', background: 'rgba(239,68,68,.18)', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#ffaaaa', display: 'flex', gap: 8, alignItems: 'center' }}>
                ⚠ Overdue · {inr(rental.monthly_rent)} rent + {inr(currentPayment.late_fee!)} late fee = <strong style={{ color: '#fff' }}>{inr(Number(rental.monthly_rent) + currentPayment.late_fee!)} total due</strong>
              </div>
            )}
            {Number(rental.monthly_rent) > 50000 && <div style={{ marginTop: 12, padding: '7px 12px', background: 'rgba(239,68,68,.18)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#ffaaaa' }}>⚠ Rent &gt;₹50,000/mo — you must deduct 2% TDS and file Form 26QC.</div>}
            <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(246,244,238,.12)', display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12, color: 'rgba(246,244,238,.65)' }}>
              <span>{propLine}</span>
              <button onClick={() => { setMessagingRental(rental); navigate('msg') }} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'rgba(246,244,238,.65)', fontSize: 12, fontFamily: 'inherit' }}>💬 Message landlord</button>
            </div>
          </section>

          {/* Lease alerts — expiry + escalation */}
          {(() => {
            const exDays = leaseExpiryDays(rental)
            const escDays = escalationDueDays(rental)
            if (!exDays && !escDays) return null
            return (
              <section style={{ ...cardStyle, gridColumn: 'span 2', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {exDays !== null && exDays <= 60 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: exDays <= 30 ? 'rgba(239,68,68,.1)' : 'var(--rb-warning-soft)', display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0 }}>{exDays <= 30 ? '🔴' : '🟡'}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: exDays <= 30 ? 'var(--rb-danger)' : 'var(--rb-warning)' }}>Lease expires in {exDays} day{exDays !== 1 ? 's' : ''}</div>
                        <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>{new Date(rental.end_date!).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · Talk to your landlord about renewal.</div>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedRental(rental); setModal('give-notice') }} style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid var(--rb-danger)', background: 'transparent', color: 'var(--rb-danger)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Give notice</button>
                  </div>
                )}
                {escDays !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--rb-action-soft)', display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0 }}>📈</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--rb-action)' }}>Annual rent revision in {escDays} day{escDays !== 1 ? 's' : ''}</div>
                      <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>Your lease has a {rental.rent_increment_percent ?? 5}% annual increment clause. Discuss with your landlord.</div>
                    </div>
                  </div>
                )}
              </section>
            )
          })()}

          {rental.escalation_applied_at && (() => {
            const appliedDate = new Date(rental.escalation_applied_at)
            const daysSince = Math.floor((now.getTime() - appliedDate.getTime()) / 86400000)
            if (daysSince > 60) return null
            return (
              <section style={{ ...cardStyle, gridColumn: 'span 2', padding: '12px 18px', background: 'var(--rb-action-soft)', border: '1px solid rgba(15,76,92,.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>📩</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--rb-action)' }}>Rent revised to {inr(rental.monthly_rent)}/month</div>
                    <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>Your landlord applied the annual increment {daysSince === 0 ? 'today' : `${daysSince} day${daysSince !== 1 ? 's' : ''} ago`}. Future payments will reflect the new amount.</div>
                  </div>
                </div>
              </section>
            )
          })()}

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
          {currentPayment?.status === 'overdue' && (currentPayment?.late_fee || 0) > 0 && (
            <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(239,68,68,.18)', borderRadius: 10, fontSize: 13, color: 'rgba(246,244,238,.9)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'rgba(246,244,238,.7)' }}>Rent</span><span>{inr(rental.monthly_rent)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, color: '#ffaaaa' }}>
                <span>Late fee ({rental.late_fee_percent ?? 5}%)</span><span>+{inr(currentPayment.late_fee!)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, borderTop: '1px solid rgba(246,244,238,.12)', paddingTop: 10 }}>
                <span>Total due</span><span>{inr(Number(rental.monthly_rent) + currentPayment.late_fee!)}</span>
              </div>
            </div>
          )}
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
    const deductions = transactions.filter(t => t.type === 'deduction')
    const disputed = deductions.filter(t => t.dispute_status === 'disputed').length
    return (
      <>
        <div style={topStyle}><div><div style={eyebrowStyle}>Tenant · Deposit</div><h1 style={h1Style}>Security deposit.</h1><p style={subStyle}>{inr(balance)} held{disputed > 0 ? ` · ${disputed} disputed` : ''}</p></div></div>
        {deductions.length > 0 && <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--rb-warning-soft)', borderRadius: 12, fontSize: 13, color: 'var(--rb-warning)', fontWeight: 500 }}>
          <strong>Deductions from your deposit</strong> — tap any deduction to view details or file a dispute.
        </div>}
        <section style={cardStyle}>
          {transactions.length > 0 ? transactions.map(t => (
            <div key={t.id}
              onClick={() => t.type === 'deduction' ? (setSelectedDepositTx(t), setModal('dispute-tx')) : undefined}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--rb-border-soft)', cursor: t.type === 'deduction' ? 'pointer' : 'default' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{t.note || t.description || t.type}</span>
                  {t.type === 'deduction' && t.dispute_status === 'disputed' && <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'rgba(239,68,68,.1)', color: 'var(--rb-danger)', letterSpacing: '.06em' }}>DISPUTED</span>}
                  {t.type === 'deduction' && !t.dispute_status || t.dispute_status === 'none' ? <span style={{ fontSize: 10, color: 'var(--rb-ink-3)' }}>Tap to dispute →</span> : null}
                </div>
                <div style={{ fontSize: 11, color: 'var(--rb-ink-3)', marginTop: 2 }}>{relDate(t.created_at)}</div>
              </div>
              <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 18, color: t.type === 'received' ? 'var(--rb-action)' : 'var(--rb-danger)', flexShrink: 0 }}>{t.type === 'received' ? '+' : '-'}{inr(t.amount)}</div>
            </div>
          )) : <div style={emptyStyle}><div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div><p>No deposit transactions yet.</p></div>}
          {transactions.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', marginTop: 6, fontSize: 13, color: 'var(--rb-ink-2)', alignItems: 'center' }}>
              <span>Estimated refund at move-out</span>
              <strong style={{ fontFamily: 'var(--rb-font-display)', fontSize: 22, color: balance > 0 ? 'var(--rb-action)' : 'var(--rb-danger)' }}>{inr(balance)}</strong>
            </div>
          )}
        </section>
      </>
    )
  }

  function TenantAgreement() {
    const rental: Rental | null = tenantData?.rental || null
    if (!rental) return (
      <>
        <div style={topStyle}><div><div style={eyebrowStyle}>Tenant · Agreement</div><h1 style={h1Style}>Rental agreement.</h1></div></div>
        <section style={cardStyle}><div style={emptyStyle}><p>No active rental found.</p></div></section>
      </>
    )

    const tenantSigned = !!rental.agreement_signed_at
    const landlordSigned = !!rental.landlord_signed_at
    const isExecuted = tenantSigned && landlordSigned
    const isPending = rental.agreement_status === 'pending_signature' || (tenantSigned && !landlordSigned)
    const isDraft = !rental.agreement_status || rental.agreement_status === 'draft'

    const statusBanner = () => {
      if (isExecuted) return { bg: 'var(--rb-action-soft)', c: 'var(--rb-action)', icon: '✅', text: `Fully executed · Tenant signed ${relDate(rental.agreement_signed_at)} · Landlord countersigned ${relDate(rental.landlord_signed_at)}` }
      if (tenantSigned) return { bg: 'var(--rb-warning-soft)', c: 'var(--rb-warning)', icon: '⏳', text: `You signed on ${relDate(rental.agreement_signed_at)} — awaiting landlord countersignature.` }
      if (rental.agreement_status === 'pending_signature') return { bg: 'var(--rb-accent-soft)', c: 'var(--rb-accent)', icon: '📋', text: 'Your landlord has sent this agreement for your signature. Read it fully before signing.' }
      return { bg: 'var(--rb-fill-2)', c: 'var(--rb-ink-3)', icon: '📝', text: 'Agreement is being prepared by your landlord.' }
    }
    const banner = statusBanner()

    return (
      <>
        <div style={topStyle}>
          <div><div style={eyebrowStyle}>Tenant · Agreement</div><h1 style={h1Style}>Rental agreement.</h1></div>
          <div style={{ display: 'flex', gap: 10 }}>
            {isExecuted && <button onClick={() => window.print()} style={actBtnSm}>⬇ Print / PDF</button>}
            {!tenantSigned && rental.agreement_status === 'pending_signature' && <button onClick={() => setModal('sign-agreement')} style={actBtnPrimary}>✍ Sign agreement</button>}
            {rental.status === 'active' && <button onClick={() => { setSelectedRental(rental); setModal('end-lease') }} style={{ padding: '7px 14px', borderRadius: 999, border: '1px solid var(--rb-danger)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: 'var(--rb-danger)', fontWeight: 600 }}>Give notice</button>}
          </div>
        </div>

        {/* Status banner */}
        <div style={{ marginBottom: 16, padding: '12px 18px', borderRadius: 12, background: banner.bg, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{banner.icon}</span>
          <span style={{ fontSize: 13, color: banner.c, fontWeight: 500, lineHeight: 1.55 }}>{banner.text}</span>
        </div>

        {/* Full agreement document */}
        {(rental.agreement_status === 'pending_signature' || tenantSigned) ? (
          <section style={{ ...cardStyle, padding: 0 }}>
            <div id="agreement-print-area">
              <AgreementDocument rental={rental} landlordProf={rental.landlord || null} tenantProf={profile} />
            </div>
            {!tenantSigned && (
              <div style={{ padding: '20px 28px', borderTop: '2px solid var(--rb-border)', background: 'var(--rb-fill)' }}>
                <p style={{ fontSize: 13, color: 'var(--rb-ink-2)', lineHeight: 1.6, marginBottom: 16 }}>
                  By clicking "Sign agreement" you confirm you have read and understood all terms above.
                  Your name, timestamp, and unique session ID will be recorded as your digital signature.
                </p>
                <button onClick={() => setModal('sign-agreement')} style={{ ...actBtnPrimary, width: '100%', justifyContent: 'center', padding: '13px 0', fontSize: 15 }}>✍ Sign agreement</button>
              </div>
            )}
          </section>
        ) : (
          <section style={cardStyle}>
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--rb-ink)' }}>Agreement being prepared</div>
              <p style={{ fontSize: 14, color: 'var(--rb-ink-3)', marginTop: 8, lineHeight: 1.6 }}>Your landlord is finalising the agreement. You'll be able to read and sign it here once it's sent.</p>
            </div>
          </section>
        )}
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
          <div style={{ marginTop: 24, padding: 16, background: 'var(--rb-action-soft)', borderRadius: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--rb-action)', marginBottom: 6 }}>Next step</div>
            <div style={{ fontSize: 13, color: 'var(--rb-ink-2)', lineHeight: 1.55 }}>{scoreNudge(score, r.length)}</div>
            <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 8 }}>Score carries to your next rental — landlords see this.</div>
          </div>
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
          invite_token: genToken(), invite_expires_at: tokenExpiry(),
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
          <button onClick={() => setModal(null)} style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '10px 22px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>{saving ? 'Saving…' : 'Add property'}</button>
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
          <button onClick={() => setModal(null)} style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '10px 22px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>{saving ? 'Recording…' : 'Record payment'}</button>
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
          <button onClick={() => setModal(null)} style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500 }}>Cancel</button>
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
    const [vendorName, setVendorName] = useState(r?.vendor_name || '')
    const [vendorPhone, setVendorPhone] = useState(r?.vendor_phone || '')
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
          vendor_name: vendorName || null,
          vendor_phone: vendorPhone || null,
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Vendor / contractor name">
            <input style={inputStyle} value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="e.g. Ram Plumbing" />
          </Field>
          <Field label="Vendor phone">
            <input style={inputStyle} value={vendorPhone} onChange={e => setVendorPhone(e.target.value)} placeholder="98765 43210" />
          </Field>
        </div>
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
          <button onClick={() => setModal(null)} style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '10px 22px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>{saving ? 'Saving…' : 'Save'}</button>
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
      ...(r.vendor_name ? [{ l: 'Contractor', v: r.vendor_name + (r.vendor_phone ? ` · ${r.vendor_phone}` : '') }] : []),
      ...(r.cost ? [{ l: 'Estimated cost', v: '₹' + Number(r.cost).toLocaleString('en-IN') }] : []),
      ...(r.deduct_from_deposit ? [{ l: 'Deposit impact', v: 'Will be deducted from deposit' }] : []),
    ]

    const handleConfirmResolved = async () => {
      setSaving(true)
      try {
        const { error } = await sb.from('repair_requests').update({ resolved_confirmed_at: new Date().toISOString() }).eq('id', r.id)
        if (error) throw error
        toast('Confirmed as resolved ✓', 'success')
        setModal(null)
        window.location.reload()
      } catch (e: any) { console.error('[RepairConfirm]', e); toast(e?.message || 'Failed', 'error'); setSaving(false) }
    }

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
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--rb-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {r.status === 'resolved' && !r.resolved_confirmed_at && (
            <button onClick={handleConfirmResolved} disabled={saving} style={{ width: '100%', padding: '10px 0', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>{saving ? 'Confirming…' : '✓ Confirm issue is fixed'}</button>
          )}
          {r.resolved_confirmed_at && <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--rb-success)', fontWeight: 600 }}>✓ You confirmed this as fixed on {relDate(r.resolved_confirmed_at)}</div>}
          {canCancel && (
            <button onClick={handleCancel} disabled={saving} style={{ width: '100%', padding: '10px 0', borderRadius: 999, border: '1.5px solid var(--rb-danger)', background: 'transparent', color: 'var(--rb-danger)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>{saving ? 'Closing…' : 'Close / cancel request'}</button>
          )}
        </div>
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
          <button onClick={() => setModal(null)} style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !file} style={{ padding: '10px 22px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>{saving ? 'Uploading…' : 'Add photo'}</button>
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
        const { error } = await sb.from('rentals').update({ invite_token: genToken(), invite_expires_at: tokenExpiry() }).eq('id', r.id)
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
                  <button onClick={handleCopyLink} style={actBtnPrimary}>{copied ? '✓ Copied!' : '📋 Copy link'}</button>
                  <button onClick={handleRegenerateLink} disabled={saving} style={{ padding: '10px 18px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, color: 'var(--rb-ink-3)' }}>↺ New link</button>
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
              <button onClick={() => setEditMode(false)} style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '10px 22px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>{saving ? 'Saving…' : 'Save changes'}</button>
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
          <button onClick={() => setModal(isLandlord ? 'property-detail' : null)} style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500 }}>Cancel</button>
          <button onClick={handleEnd} disabled={saving} style={{ padding: '8px 18px', borderRadius: 999, background: 'var(--rb-danger)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{saving ? 'Ending…' : 'Yes, end lease'}</button>
        </div>
      </Modal>
    )
  }

  // ── Sign agreement modal (tenant) ────────────────────────────────────────
  function SignAgreementModal() {
    const rental: Rental | null = tenantData?.rental || null
    if (!rental) return null
    const [confirmed, setConfirmed] = useState(false)
    const [saving, setSaving] = useState(false)

    const handleSign = async () => {
      if (!confirmed) { toast('Confirm you have read the full agreement', 'error'); return }
      setSaving(true)
      try {
        const { error } = await sb.from('rentals').update({
          agreement_signed_at: new Date().toISOString(),
          agreement_status: 'tenant_signed',
        }).eq('id', rental.id)
        if (error) throw error
        toast('Agreement signed ✓ Landlord will countersign.', 'success')
        setModal(null); window.location.reload()
      } catch (e: any) { console.error('[SignAgreement]', e); toast(e?.message || 'Failed to sign agreement', 'error') } finally { setSaving(false) }
    }

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(14,20,19,.55)', backdropFilter: 'blur(5px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'var(--rb-canvas)', borderBottom: '1px solid var(--rb-border)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 20, fontWeight: 400 }}>Sign rental agreement</div>
            <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>Read the full document before signing</div>
          </div>
          <button onClick={() => setModal(null)} style={{ width: 32, height: 32, border: 0, background: 'var(--rb-fill-2)', borderRadius: '50%', cursor: 'pointer', fontSize: 18, display: 'grid', placeItems: 'center', color: 'var(--rb-ink-3)' }}>×</button>
        </div>
        {/* Scrollable agreement */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--rb-surface)' }}>
          <AgreementDocument rental={rental} landlordProf={rental.landlord || null} tenantProf={profile} />
        </div>
        {/* Sign footer */}
        <div style={{ background: 'var(--rb-canvas)', borderTop: '2px solid var(--rb-border)', padding: '18px 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <button onClick={() => setConfirmed(c => !c)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${confirmed ? 'var(--rb-action)' : 'var(--rb-border)'}`, background: confirmed ? 'var(--rb-action)' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 14, marginTop: 2 }}>{confirmed ? '✓' : ''}</button>
            <label style={{ fontSize: 13, color: 'var(--rb-ink-2)', cursor: 'pointer', lineHeight: 1.55 }} onClick={() => setConfirmed(c => !c)}>I have read and understood the full agreement above. I agree to all terms and conditions.</label>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setModal(null)} style={{ flex: 1, padding: '11px 0', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Cancel</button>
            <button onClick={handleSign} disabled={saving || !confirmed} style={{ flex: 2, padding: '11px 0', borderRadius: 999, background: confirmed ? 'var(--rb-action)' : 'var(--rb-border)', color: '#fff', border: 0, cursor: confirmed ? 'pointer' : 'default', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, transition: 'background .2s' }}>{saving ? 'Signing…' : '✍ Sign agreement'}</button>
          </div>
        </div>
      </div>
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
          <button onClick={() => setModal(null)} style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: '10px 22px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>{saving ? 'Creating…' : 'Create building'}</button>
        </div>
      </Modal>
    )
  }

  // ── Add unit to a building ───────────────────────────────────────────────
  function AddUnitModal() {
    const building = selectedBuilding
    if (!building) return null

    const [mode, setMode] = useState<'single' | 'bulk'>('single')

    // ── Single unit form ──────────────────────────────────────────────────
    const [form, setForm] = useState({
      unit_number: '', bedrooms: '2', bathrooms: '1', area_sqft: '', floor_number: '', parking: false,
      monthly_rent: '', security_deposit: '', maintenance_charges: '0', rent_due_day: '5',
      furnished_status: 'unfurnished', notice_period_days: '30', lock_in_period_months: '11',
      late_fee_percent: '5', rent_increment_percent: '5',
    })
    const [saving, setSaving] = useState(false)
    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
    const toggle = (k: string) => setForm(f => ({ ...f, [k]: !(f as any)[k] }))
    const chip = (active: boolean) => ({
      padding: '6px 12px', borderRadius: 999, border: `1.5px solid ${active ? 'var(--rb-action)' : 'var(--rb-border)'}`,
      background: active ? 'var(--rb-action)' : 'transparent', color: active ? '#fff' : 'var(--rb-ink-2)',
      cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, transition: 'all .15s',
    })
    const SectionHead = ({ label }: { label: string }) => (
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)', marginTop: 22, marginBottom: 12, paddingTop: 18, borderTop: '1px solid var(--rb-border)' }}>{label}</div>
    )
    const handleSubmit = async () => {
      if (!form.unit_number || !form.monthly_rent) { toast('Enter unit number and monthly rent', 'error'); return }
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
          invite_token: genToken(), invite_expires_at: tokenExpiry(),
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

    // ── Bulk generate form ────────────────────────────────────────────────
    const [bulk, setBulk] = useState({
      floorFrom: '0', floorTo: '2', unitsPerFloor: '10',
      pattern: 'floor',   // 'floor' | 'sequential' | 'custom'
      customPrefix: 'Room ', startNum: '1',
      monthly_rent: '', security_deposit: '', maintenance_charges: '0',
      rent_due_day: '5', furnished_status: 'unfurnished',
      bedrooms: '1', notice_period_days: '30', lock_in_period_months: '11',
      late_fee_percent: '5', rent_increment_percent: '5',
    })
    const setB = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setBulk(b => ({ ...b, [k]: e.target.value }))

    // Compute preview unit list
    const bulkUnits: { unitNum: string; floor: number | null }[] = (() => {
      const fFrom = parseInt(bulk.floorFrom) || 0
      const fTo   = parseInt(bulk.floorTo)   || 0
      const uPF   = Math.min(Math.max(parseInt(bulk.unitsPerFloor) || 1, 1), 50)
      const start = parseInt(bulk.startNum) || 1
      const units: { unitNum: string; floor: number | null }[] = []
      if (bulk.pattern === 'sequential') {
        for (let i = 0; i < (fTo - fFrom + 1) * uPF; i++) {
          units.push({ unitNum: String(start + i), floor: null })
        }
      } else if (bulk.pattern === 'custom') {
        let n = start
        for (let f = fFrom; f <= fTo; f++) {
          for (let u = 0; u < uPF; u++) {
            units.push({ unitNum: `${bulk.customPrefix}${n}`, floor: f })
            n++
          }
        }
      } else {
        // floor prefix: Floor 1 → 101, 102…  Floor 2 → 201, 202…
        for (let f = fFrom; f <= fTo; f++) {
          for (let u = 1; u <= uPF; u++) {
            const num = (f + 1) * 100 + u
            units.push({ unitNum: String(num), floor: f })
          }
        }
      }
      return units
    })()

    const handleBulkSubmit = async () => {
      if (!bulk.monthly_rent) { toast('Enter monthly rent', 'error'); return }
      if (bulkUnits.length === 0) { toast('No units to generate', 'error'); return }
      if (bulkUnits.length > 100) { toast('Maximum 100 units at once', 'error'); return }
      setSaving(true)
      try {
        const today = new Date().toISOString().slice(0, 10)
        const propRows = bulkUnits.map(u => ({
          name: `${building.name} – Unit ${u.unitNum}`,
          unit_number: u.unitNum, building_id: building.id, landlord_id: user.id,
          address_line1: building.address_line1, address_line2: building.address_line2 || null,
          city: building.city, state: building.state, pincode: building.pincode,
          property_type: building.property_type || 'apartment',
          bedrooms: bulk.bedrooms ? Number(bulk.bedrooms) : null,
          floor_number: u.floor,
        }))
        const { data: props, error: propErr } = await sb.from('properties').insert(propRows).select('id, unit_number')
        if (propErr) throw propErr
        const rentalRows = (props || []).map(p => ({
          property_id: p.id, landlord_id: user.id, status: 'pending_tenant', start_date: today,
          invite_token: genToken(), invite_expires_at: tokenExpiry(),
          monthly_rent: Number(bulk.monthly_rent), security_deposit: Number(bulk.security_deposit || 0),
          maintenance_charges: Number(bulk.maintenance_charges || 0), rent_due_day: Number(bulk.rent_due_day),
          furnished_status: bulk.furnished_status, notice_period_days: Number(bulk.notice_period_days || 30),
          lock_in_period_months: Number(bulk.lock_in_period_months || 11),
          late_fee_percent: Number(bulk.late_fee_percent || 5), rent_increment_percent: Number(bulk.rent_increment_percent || 5),
        }))
        const { error: rentalErr } = await sb.from('rentals').insert(rentalRows)
        if (rentalErr) throw rentalErr
        toast(`${bulkUnits.length} units created!`, 'success')
        setModal(null); window.location.reload()
      } catch (e: any) { console.error('[BulkAdd]', e); toast(e?.message || 'Failed to create units', 'error'); setSaving(false) }
    }

    // ── Shared styles ─────────────────────────────────────────────────────
    const tabBtn = (active: boolean): React.CSSProperties => ({
      flex: 1, padding: '8px 0', border: 0, borderRadius: 10, cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'all .15s',
      background: active ? 'var(--rb-action)' : 'transparent',
      color: active ? '#fff' : 'var(--rb-ink-3)',
    })

    return (
      <Modal title={`Add unit · ${building.name}`} onClose={() => { setModal(null); setSelectedBuilding(null) }}>
        {/* Building address strip */}
        <div style={{ padding: '8px 12px', background: 'var(--rb-surface)', borderRadius: 10, marginBottom: 16, fontSize: 13, color: 'var(--rb-ink-3)' }}>
          🏢 {building.address_line1}, {building.city}
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'var(--rb-fill-2)', borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
          <button style={tabBtn(mode === 'single')} onClick={() => setMode('single')}>Single unit</button>
          <button style={tabBtn(mode === 'bulk')} onClick={() => setMode('bulk')}>⚡ Bulk generate</button>
        </div>

        {/* ── SINGLE UNIT FORM ── */}
        {mode === 'single' && (<>
          <Field label="Unit number *"><input style={inputStyle} value={form.unit_number} onChange={set('unit_number')} placeholder="e.g. 4B, 201, G1" /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Bedrooms (BHK)">
              <div style={{ display: 'flex', gap: 6 }}>
                {['1','2','3','4'].map(v => <button key={v} style={chip((form as any).bedrooms === v)} onClick={() => setForm(f => ({ ...f, bedrooms: v }))}>{v === '4' ? '4+' : v}</button>)}
              </div>
            </Field>
            <Field label="Bathrooms">
              <div style={{ display: 'flex', gap: 6 }}>
                {['1','2','3'].map(v => <button key={v} style={chip((form as any).bathrooms === v)} onClick={() => setForm(f => ({ ...f, bathrooms: v }))}>{v === '3' ? '3+' : v}</button>)}
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
                <button key={v} style={chip((form as any).furnished_status === v)} onClick={() => setForm(f => ({ ...f, furnished_status: v }))}>{l}</button>
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
            <button onClick={() => { setModal(null); setSelectedBuilding(null) }} style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500 }}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving} style={{ padding: '10px 22px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>{saving ? 'Adding…' : 'Add unit'}</button>
          </div>
        </>)}

        {/* ── BULK GENERATE FORM ── */}
        {mode === 'bulk' && (<>
          {/* Unit naming pattern */}
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)', marginBottom: 10 }}>Unit naming</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
            {[
              ['floor',      '🏢 Floor prefix',  'Floor 1 → 101, 102 … Floor 2 → 201, 202 …'],
              ['sequential', '🔢 Sequential',    'Simple numbers — 1, 2, 3 … 30'],
              ['custom',     '✏️ Custom prefix',  'e.g. "Room " → Room 1, Room 2 …'],
            ].map(([val, label, hint]) => (
              <label key={val} onClick={() => setBulk(b => ({ ...b, pattern: val }))} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${bulk.pattern === val ? 'var(--rb-action)' : 'var(--rb-border)'}`, background: bulk.pattern === val ? 'var(--rb-action-soft)' : 'transparent', cursor: 'pointer', transition: 'all .15s' }}>
                <span style={{ marginTop: 1, width: 16, height: 16, borderRadius: '50%', border: `2px solid ${bulk.pattern === val ? 'var(--rb-action)' : 'var(--rb-border)'}`, background: bulk.pattern === val ? 'var(--rb-action)' : 'transparent', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
                  {bulk.pattern === val && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--rb-ink)' }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--rb-ink-3)', marginTop: 2 }}>{hint}</div>
                </div>
              </label>
            ))}
          </div>

          {bulk.pattern === 'custom' && (
            <Field label="Custom prefix"><input style={inputStyle} value={bulk.customPrefix} onChange={setB('customPrefix')} placeholder="Room " /></Field>
          )}
          {bulk.pattern === 'sequential' && (
            <Field label="Starting number"><input style={inputStyle} type="number" value={bulk.startNum} onChange={setB('startNum')} placeholder="1" /></Field>
          )}

          {/* Floor & unit count */}
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)', marginTop: 18, marginBottom: 10, paddingTop: 16, borderTop: '1px solid var(--rb-border)' }}>Layout</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 4 }}>
            <Field label="From floor"><input style={inputStyle} type="number" value={bulk.floorFrom} onChange={setB('floorFrom')} placeholder="0" /></Field>
            <Field label="To floor"><input style={inputStyle} type="number" value={bulk.floorTo} onChange={setB('floorTo')} placeholder="3" /></Field>
            <Field label="Units / floor"><input style={inputStyle} type="number" value={bulk.unitsPerFloor} onChange={setB('unitsPerFloor')} placeholder="10" /></Field>
          </div>

          {/* Preview */}
          {bulkUnits.length > 0 && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--rb-surface)', borderRadius: 12, border: '1px solid var(--rb-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: 'var(--rb-ink-3)', marginBottom: 10 }}>
                PREVIEW · {bulkUnits.length} UNIT{bulkUnits.length !== 1 ? 'S' : ''} WILL BE CREATED
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {bulkUnits.slice(0, 60).map((u, i) => (
                  <span key={i} style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'var(--rb-fill-2)', color: 'var(--rb-ink-2)', border: '1px solid var(--rb-border)' }}>{u.unitNum}</span>
                ))}
                {bulkUnits.length > 60 && <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 11, padding: '3px 8px', borderRadius: 6, color: 'var(--rb-ink-3)' }}>+{bulkUnits.length - 60} more</span>}
              </div>
            </div>
          )}

          {/* Rental terms */}
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)', marginTop: 20, marginBottom: 10, paddingTop: 16, borderTop: '1px solid var(--rb-border)' }}>Rental terms (applied to all units)</div>
          <Field label="Furnishing">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[['unfurnished','Unfurnished'],['semi_furnished','Semi'],['fully_furnished','Fully furnished']].map(([v,l]) => (
                <button key={v} style={chip(bulk.furnished_status === v)} onClick={() => setBulk(b => ({ ...b, furnished_status: v }))}>{l}</button>
              ))}
            </div>
          </Field>
          <Field label="Bedrooms (BHK)">
            <div style={{ display: 'flex', gap: 6 }}>
              {['1','2','3','4'].map(v => <button key={v} style={chip(bulk.bedrooms === v)} onClick={() => setBulk(b => ({ ...b, bedrooms: v }))}>{v === '4' ? '4+' : v}</button>)}
            </div>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Monthly rent (₹) *"><input style={inputStyle} type="number" value={bulk.monthly_rent} onChange={setB('monthly_rent')} placeholder="8000" /></Field>
            <Field label="Security deposit (₹)"><input style={inputStyle} type="number" value={bulk.security_deposit} onChange={setB('security_deposit')} placeholder="16000" /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Maintenance (₹/mo)"><input style={inputStyle} type="number" value={bulk.maintenance_charges} onChange={setB('maintenance_charges')} placeholder="0" /></Field>
            <Field label="Rent due day"><select style={inputStyle} value={bulk.rent_due_day} onChange={setB('rent_due_day')}>{Array.from({length:28},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}th</option>)}</select></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Notice period (days)"><input style={inputStyle} type="number" value={bulk.notice_period_days} onChange={setB('notice_period_days')} placeholder="30" /></Field>
            <Field label="Lock-in (months)"><input style={inputStyle} type="number" value={bulk.lock_in_period_months} onChange={setB('lock_in_period_months')} placeholder="11" /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Late fee (% of rent)"><input style={inputStyle} type="number" value={bulk.late_fee_percent} onChange={setB('late_fee_percent')} placeholder="5" /></Field>
            <Field label="Annual increment (%)"><input style={inputStyle} type="number" value={bulk.rent_increment_percent} onChange={setB('rent_increment_percent')} placeholder="5" /></Field>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--rb-border)' }}>
            <button onClick={() => { setModal(null); setSelectedBuilding(null) }} style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500 }}>Cancel</button>
            <button onClick={handleBulkSubmit} disabled={saving || bulkUnits.length === 0} style={{ padding: '10px 22px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>
              {saving ? 'Creating…' : `Generate ${bulkUnits.length} unit${bulkUnits.length !== 1 ? 's' : ''} →`}
            </button>
          </div>
        </>)}
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
              <button onClick={() => setEditMode(false)} style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '10px 22px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>{saving ? 'Saving…' : 'Save changes'}</button>
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
          <button onClick={() => setModal(null)} style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '10px 22px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </Modal>
    )
  }

  // ── View router ──────────────────────────────────────────────────────────
  // ── Agreement document renderer ─────────────────────────────────────────
  function AgreementDocument({ rental, landlordProf, tenantProf, printMode = false }: {
    rental: Rental; landlordProf: Profile | null; tenantProf: Profile | null; printMode?: boolean
  }) {
    const p = rental.property
    const execDate = rental.agreement_signed_at
      ? new Date(rental.agreement_signed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    const startFmt = rental.start_date ? new Date(rental.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
    const endFmt = rental.end_date ? new Date(rental.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Month-to-month'
    const lName = landlordProf?.full_name || 'Landlord'
    const tName = tenantProf?.full_name || 'Tenant'
    const docStyle: React.CSSProperties = { fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 14, lineHeight: 1.75, color: '#1a1a1a', maxWidth: 720, margin: '0 auto', padding: printMode ? '0' : '32px 28px' }
    const h1s: React.CSSProperties = { fontSize: 22, fontWeight: 700, textAlign: 'center', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 4 }
    const h2s: React.CSSProperties = { fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 28, marginBottom: 10, paddingBottom: 6, borderBottom: '2px solid #1a1a1a' }
    const clauseStyle: React.CSSProperties = { marginBottom: 10, paddingLeft: 20 }
    const bold = (t: string) => <strong>{t}</strong>
    const tenantSigTs = rental.agreement_signed_at ? new Date(rental.agreement_signed_at).toLocaleString('en-IN') : null
    const landlordSigTs = rental.landlord_signed_at ? new Date(rental.landlord_signed_at).toLocaleString('en-IN') : null

    return (
      <div style={docStyle} id="agreement-document">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={h1s}>RENTAL AGREEMENT</div>
          <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>This agreement is executed on {bold(execDate)}</div>
        </div>

        {/* Parties */}
        <div style={h2s}>1. Parties</div>
        <p style={clauseStyle}>This Rental Agreement ("Agreement") is entered into between:</p>
        <div style={{ background: '#f9f8f4', border: '1px solid #e8e4d8', borderRadius: 8, padding: '14px 18px', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>LANDLORD</div>
          <div>{bold(lName)}{landlordProf?.phone ? ` · ${landlordProf.phone}` : ''}{landlordProf?.pan_number ? ` · PAN: ${landlordProf.pan_number}` : ''}</div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>(hereinafter referred to as "Landlord")</div>
        </div>
        <div style={{ background: '#f9f8f4', border: '1px solid #e8e4d8', borderRadius: 8, padding: '14px 18px', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>TENANT</div>
          <div>{bold(tName)}{tenantProf?.phone ? ` · ${tenantProf.phone}` : ''}{tenantProf?.pan_number ? ` · PAN: ${tenantProf.pan_number}` : ''}</div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>(hereinafter referred to as "Tenant")</div>
        </div>

        {/* Property */}
        <div style={h2s}>2. Premises</div>
        <p style={clauseStyle}>
          The Landlord agrees to let and the Tenant agrees to take on rent the residential premises described as:
          {bold(` ${p?.name || '—'}`)}
          {p?.address_line1 ? `, ${p.address_line1}` : ''}{p?.address_line2 ? `, ${p.address_line2}` : ''}
          {p?.city ? `, ${p.city}` : ''}{p?.state ? `, ${p.state}` : ''}{p?.pincode ? ` — ${p.pincode}` : ''}.
          {p?.bedrooms ? ` Configuration: ${p.bedrooms} BHK${p.bathrooms ? ` · ${p.bathrooms} Bath` : ''}${p.area_sqft ? ` · ${p.area_sqft} sq ft` : ''}.` : ''}
          {p?.floor_number !== undefined && p?.floor_number !== null ? ` Floor: ${p.floor_number}.` : ''}
          {` Furnishing: ${(rental.furnished_status || 'unfurnished').replace('_', ' ')}.`}
        </p>

        {/* Term */}
        <div style={h2s}>3. Term</div>
        <p style={clauseStyle}>
          The tenancy shall commence on {bold(startFmt)} and {rental.end_date ? <>end on {bold(endFmt)}</> : <>continue on a month-to-month basis</>}.
          {rental.lock_in_period_months ? <> A lock-in period of {bold(`${rental.lock_in_period_months} months`)} applies from the commencement date, during which neither party may terminate this Agreement.</> : ''}
        </p>

        {/* Financial Terms */}
        <div style={h2s}>4. Rent and Payment</div>
        <p style={clauseStyle}>
          4.1 The monthly rent is {bold(inr(rental.monthly_rent))} payable on or before the {bold(`${rental.rent_due_day || 1}th`)} day of each calendar month.
        </p>
        {rental.maintenance_charges ? <p style={clauseStyle}>4.2 Maintenance charges of {bold(inr(rental.maintenance_charges))}/month are payable in addition to rent.</p> : null}
        <p style={clauseStyle}>
          {rental.maintenance_charges ? '4.3' : '4.2'} A late payment fee of {bold(`${rental.late_fee_percent ?? 5}%`)} of the monthly rent shall be levied for each month of delayed payment, with a grace period of 5 days from the due date.
        </p>
        <p style={clauseStyle}>
          {rental.maintenance_charges ? '4.4' : '4.3'} Rent shall be revised annually by {bold(`${rental.rent_increment_percent ?? 5}%`)} on each anniversary of the commencement date.
        </p>

        {/* Security Deposit */}
        <div style={h2s}>5. Security Deposit</div>
        <p style={clauseStyle}>
          5.1 The Tenant has paid a refundable security deposit of {bold(inr(rental.security_deposit))} to the Landlord.
        </p>
        <p style={clauseStyle}>
          5.2 The deposit shall be refunded within {bold('30 days')} of the Tenant vacating the premises, after deducting any amounts due for unpaid rent, documented damage beyond normal wear and tear, or unreturned keys/items.
        </p>
        <p style={clauseStyle}>
          5.3 The Landlord shall provide itemised deduction receipts with photographic evidence before making any deductions.
        </p>

        {/* Notice Period */}
        <div style={h2s}>6. Termination and Notice</div>
        <p style={clauseStyle}>
          6.1 Either party may terminate this Agreement by giving {bold(`${rental.notice_period_days ?? 30} days`)} written notice to the other party.
        </p>
        <p style={clauseStyle}>
          6.2 The Tenant agrees to vacate the premises on or before the agreed move-out date and return the keys in the condition specified at move-in.
        </p>
        <p style={clauseStyle}>
          6.3 The Landlord reserves the right to terminate this Agreement immediately in the event of non-payment of rent for two consecutive months, or breach of any material term.
        </p>

        {/* Tenant Obligations */}
        <div style={h2s}>7. Tenant Obligations</div>
        {[
          'Pay rent by the due date each month without demand.',
          'Maintain the premises in clean and good condition, and return it in the same state (fair wear and tear excepted).',
          'Not make any structural alterations, additions, or improvements without prior written consent from the Landlord.',
          'Not sublet, assign, or license the premises or any part thereof without prior written consent.',
          'Not use the premises for any commercial, illegal, or immoral purpose.',
          'Allow the Landlord or their representative to inspect the premises with at least 24 hours\' prior notice.',
          'Report any damage, defect, or required repair promptly to the Landlord.',
          'Not keep pets on the premises without prior written consent from the Landlord.',
          'Pay for electricity, water, gas, and other utility charges as applicable.',
          'Not cause nuisance or disturbance to neighbours.',
        ].map((c, i) => <p key={i} style={clauseStyle}>{`7.${i + 1} ${c}`}</p>)}

        {/* Landlord Obligations */}
        <div style={h2s}>8. Landlord Obligations</div>
        {[
          'Ensure the premises are in habitable condition at the time of handover.',
          'Maintain the structural integrity, plumbing, and electrical systems in working order.',
          'Not enter the premises without prior notice (except in genuine emergency situations).',
          'Provide rent receipts for all payments received.',
          'Refund the security deposit within 30 days of move-out, less documented deductions.',
          'Not interfere with the Tenant\'s peaceful enjoyment of the premises.',
        ].map((c, i) => <p key={i} style={clauseStyle}>{`8.${i + 1} ${c}`}</p>)}

        {/* Prohibited Activities */}
        <div style={h2s}>9. Prohibited Activities</div>
        <p style={clauseStyle}>The Tenant shall not: store hazardous or flammable materials on the premises; conduct any activity that increases the insurance risk of the property; block common areas or exits; tamper with electrical, plumbing, or gas installations; or install any fixture without prior written approval.</p>

        {/* Dispute Resolution */}
        <div style={h2s}>10. Governing Law and Disputes</div>
        <p style={clauseStyle}>
          This Agreement shall be governed by and construed in accordance with the laws of India, including the Transfer of Property Act 1882 and the Indian Contract Act 1872.
          Any dispute arising out of or in connection with this Agreement shall first be resolved through mutual negotiation.
          If unresolved within 30 days, the dispute shall be subject to the jurisdiction of the courts in {bold(p?.city || 'the applicable jurisdiction')}.
        </p>

        {/* Custom Clauses */}
        {rental.agreement_custom_clauses && (
          <>
            <div style={h2s}>11. Special Conditions</div>
            {rental.agreement_custom_clauses.split('\n').filter(Boolean).map((c, i) => (
              <p key={i} style={clauseStyle}>{`11.${i + 1} ${c}`}</p>
            ))}
          </>
        )}

        {/* Signature Block */}
        <div style={{ marginTop: 40, borderTop: '2px solid #1a1a1a', paddingTop: 28 }}>
          <p style={{ fontSize: 13, color: '#555', marginBottom: 24, textAlign: 'center' }}>
            Both parties confirm they have read, understood, and agree to all terms of this Agreement.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            {/* Landlord signature */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#555', marginBottom: 12 }}>Landlord</div>
              {landlordSigTs
                ? <><div style={{ padding: '10px 14px', background: '#f0f8ef', border: '1px solid #b6d9b3', borderRadius: 8 }}><div style={{ fontFamily: '"Dancing Script", cursive, Georgia', fontSize: 22, color: '#1a5e17' }}>{lName}</div><div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>{landlordSigTs}</div><div style={{ fontSize: 10, color: '#888' }}>Digital signature · RentyBase</div></div></>
                : <div style={{ height: 70, border: '1px dashed #ccc', borderRadius: 8, display: 'grid', placeItems: 'center', color: '#aaa', fontSize: 13 }}>Pending</div>}
              <div style={{ marginTop: 10, fontSize: 13 }}><div>{bold(lName)}</div>{landlordProf?.pan_number && <div style={{ fontSize: 11, color: '#666' }}>PAN: {landlordProf.pan_number}</div>}</div>
            </div>
            {/* Tenant signature */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#555', marginBottom: 12 }}>Tenant</div>
              {tenantSigTs
                ? <><div style={{ padding: '10px 14px', background: '#f0f8ef', border: '1px solid #b6d9b3', borderRadius: 8 }}><div style={{ fontFamily: '"Dancing Script", cursive, Georgia', fontSize: 22, color: '#1a5e17' }}>{tName}</div><div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>{tenantSigTs}</div><div style={{ fontSize: 10, color: '#888' }}>Digital signature · RentyBase</div></div></>
                : <div style={{ height: 70, border: '1px dashed #ccc', borderRadius: 8, display: 'grid', placeItems: 'center', color: '#aaa', fontSize: 13 }}>Pending</div>}
              <div style={{ marginTop: 10, fontSize: 13 }}><div>{bold(tName)}</div>{tenantProf?.pan_number && <div style={{ fontSize: 11, color: '#666' }}>PAN: {tenantProf.pan_number}</div>}</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: '#aaa' }}>
          Generated by RentyBase · Agreement ID: {rental.id.slice(0, 8).toUpperCase()}
        </div>
      </div>
    )
  }

  // ── Landlord: agreements view ────────────────────────────────────────────
  function LandlordAgreements() {
    const rentals: Rental[] = landlordData?.rentals || []
    const [activeRental, setActiveRental] = useState<Rental | null>(null)

    const statusPill = (r: Rental) => {
      const s = r.agreement_status || 'draft'
      if (s === 'executed' || (r.agreement_signed_at && r.landlord_signed_at)) return { t: 'EXECUTED', bg: 'var(--rb-action-soft)', c: 'var(--rb-action)' }
      if (s === 'tenant_signed' || r.agreement_signed_at) return { t: 'TENANT SIGNED', bg: 'var(--rb-warning-soft)', c: 'var(--rb-warning)' }
      if (s === 'pending_signature') return { t: 'SENT', bg: 'var(--rb-accent-soft)', c: 'var(--rb-accent)' }
      return { t: 'DRAFT', bg: 'var(--rb-fill-2)', c: 'var(--rb-ink-3)' }
    }

    if (activeRental) {
      const pill = statusPill(activeRental)
      const tenantProf: Profile | null = activeRental.tenant || null
      const isExecuted = activeRental.agreement_signed_at && activeRental.landlord_signed_at
      const tenantSigned = !!activeRental.agreement_signed_at
      return (
        <>
          <div style={topStyle}>
            <div>
              <button onClick={() => setActiveRental(null)} style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 13, color: 'var(--rb-ink-3)', fontFamily: 'inherit', padding: 0, marginBottom: 8 }}>← All agreements</button>
              <div style={eyebrowStyle}>Landlord · Agreement</div>
              <h1 style={h1Style}>{activeRental.property?.name || 'Agreement'}</h1>
              <p style={subStyle}>{tenantProf?.full_name || 'Tenant'} · <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: pill.bg, color: pill.c }}>{pill.t}</span></p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
              {!isExecuted && <button onClick={() => { setSelectedRental(activeRental); setModal('custom-clauses') }} style={actBtnSm}>Edit clauses</button>}
              {!isExecuted && activeRental.agreement_status !== 'pending_signature' && !activeRental.agreement_signed_at && (
                <button onClick={async () => {
                  await sb.from('rentals').update({ agreement_status: 'pending_signature' }).eq('id', activeRental.id)
                  toast('Agreement sent to tenant for signature', 'success')
                  window.location.reload()
                }} style={actBtnPrimary}>Send to tenant →</button>
              )}
              {tenantSigned && !activeRental.landlord_signed_at && (
                <button onClick={() => { setSelectedRental(activeRental); setModal('landlord-sign') }} style={{ ...actBtnPrimary, background: 'var(--rb-success)' }}>✍ Countersign</button>
              )}
              <button onClick={() => window.print()} style={actBtnSm}>⬇ Print / PDF</button>
            </div>
          </div>
          <section style={{ ...cardStyle, padding: '0' }}>
            <div id="agreement-print-area" style={{ padding: '28px 24px' }}>
              <AgreementDocument rental={activeRental} landlordProf={profile} tenantProf={tenantProf} />
            </div>
          </section>
        </>
      )
    }

    return (
      <>
        <div style={topStyle}><div><div style={eyebrowStyle}>Landlord · Agreements</div><h1 style={h1Style}>Agreements.</h1><p style={subStyle}>{rentals.length} rental{rentals.length !== 1 ? 's' : ''}</p></div></div>
        <section style={cardStyle}>
          {rentals.length === 0 ? <div style={emptyStyle}><div style={{ fontSize: 32, marginBottom: 12 }}>📋</div><p>No rentals yet. Create a rental to generate an agreement.</p></div>
            : rentals.map((r: Rental) => {
                const pill = statusPill(r)
                const isExecuted = r.agreement_signed_at && r.landlord_signed_at
                const needsAction = r.agreement_signed_at && !r.landlord_signed_at
                return (
                  <div key={r.id} onClick={() => setActiveRental(r)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--rb-border-soft)', cursor: 'pointer' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: isExecuted ? 'var(--rb-action-soft)' : needsAction ? 'var(--rb-warning-soft)' : 'var(--rb-fill-2)', display: 'grid', placeItems: 'center', fontSize: 20, flexShrink: 0 }}>
                      {isExecuted ? '✅' : needsAction ? '✍' : '📋'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--rb-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.property?.name || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>{r.tenant?.full_name || 'No tenant yet'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {needsAction && <span style={{ fontSize: 12, color: 'var(--rb-warning)', fontWeight: 600 }}>Needs your signature</span>}
                      <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: pill.bg, color: pill.c, whiteSpace: 'nowrap' }}>{pill.t}</span>
                      <span style={{ fontSize: 18, color: 'var(--rb-ink-3)' }}>›</span>
                    </div>
                  </div>
                )
              })}
        </section>
      </>
    )
  }

  // ── Landlord: custom clauses modal ───────────────────────────────────────
  function CustomClausesModal() {
    const r = selectedRental || landlordData?.rentals?.[0]
    const [clauses, setClauses] = useState(r?.agreement_custom_clauses || '')
    const [saving, setSaving] = useState(false)
    if (!r) return null

    const EXAMPLES = [
      'Pets allowed with prior written approval from the Landlord.',
      'Parking space number [X] is included in the rent.',
      'Generator backup charges of ₹[X]/month to be paid separately.',
      'Tenant is responsible for pest control.',
      'Society maintenance charges are borne by the Landlord.',
    ]

    const handleSave = async () => {
      setSaving(true)
      try {
        const { error } = await sb.from('rentals').update({ agreement_custom_clauses: clauses || null }).eq('id', r.id)
        if (error) throw error
        toast('Custom clauses saved', 'success')
        setModal(null); window.location.reload()
      } catch (e: any) { console.error('[CustomClauses]', e); toast(e?.message || 'Failed to save', 'error'); setSaving(false) }
    }

    return (
      <Modal title="Special conditions" onClose={() => setModal(null)}>
        <p style={{ fontSize: 13, color: 'var(--rb-ink-3)', marginBottom: 14, lineHeight: 1.55 }}>Add custom clauses that apply to this rental. Each line becomes a numbered clause in the agreement.</p>
        <Field label="Custom clauses (one per line)">
          <textarea style={{ ...inputStyle, minHeight: 160, resize: 'vertical' as const }} value={clauses} onChange={e => setClauses(e.target.value)} placeholder="e.g. Pets allowed with prior written approval…" />
        </Field>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: 'var(--rb-ink-3)', marginBottom: 8 }}>Common examples (tap to add)</div>
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => setClauses((cur: string) => cur ? cur + '\n' + ex : ex)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', marginBottom: 5, borderRadius: 8, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: 'var(--rb-ink-2)' }}>+ {ex}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 14, borderTop: '1px solid var(--rb-border)' }}>
          <button onClick={() => setModal(null)} style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '10px 22px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>{saving ? 'Saving…' : 'Save clauses'}</button>
        </div>
      </Modal>
    )
  }

  // ── Landlord: countersign modal ──────────────────────────────────────────
  function LandlordSignModal() {
    const r = selectedRental
    const [confirmed, setConfirmed] = useState(false)
    const [saving, setSaving] = useState(false)
    if (!r) return null

    const handleSign = async () => {
      if (!confirmed) { toast('Confirm you have read the agreement', 'error'); return }
      setSaving(true)
      try {
        const { error } = await sb.from('rentals').update({
          landlord_signed_at: new Date().toISOString(),
          agreement_status: 'executed',
        }).eq('id', r.id)
        if (error) throw error
        toast('Agreement fully executed ✓', 'success')
        setModal(null); window.location.reload()
      } catch (e: any) { console.error('[LandlordSign]', e); toast(e?.message || 'Failed to sign', 'error'); setSaving(false) }
    }

    return (
      <Modal title="Countersign agreement" onClose={() => setModal(null)}>
        <div style={{ padding: '12px 16px', background: 'var(--rb-action-soft)', borderRadius: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rb-action)' }}>Tenant has signed ✓</div>
          <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>{r.tenant?.full_name} signed on {r.agreement_signed_at ? new Date(r.agreement_signed_at).toLocaleDateString('en-IN') : '—'}</div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--rb-ink-2)', lineHeight: 1.6, marginBottom: 16 }}>
          By countersigning, you confirm that you have reviewed the agreement, all terms are correct, and you authorise the tenancy for <strong>{r.tenant?.full_name || 'the tenant'}</strong> at <strong>{r.property?.name || 'the property'}</strong>.
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderTop: '1px solid var(--rb-border)', marginBottom: 20 }}>
          <button onClick={() => setConfirmed(c => !c)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${confirmed ? 'var(--rb-action)' : 'var(--rb-border)'}`, background: confirmed ? 'var(--rb-action)' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 14, marginTop: 1 }}>{confirmed ? '✓' : ''}</button>
          <label style={{ fontSize: 13, color: 'var(--rb-ink-2)', cursor: 'pointer', lineHeight: 1.55 }} onClick={() => setConfirmed(c => !c)}>I have read the full agreement and confirm all terms are accurate.</label>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => setModal(null)} style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500 }}>Cancel</button>
          <button onClick={handleSign} disabled={saving || !confirmed} style={{ padding: '8px 18px', borderRadius: 999, background: confirmed ? 'var(--rb-action)' : 'var(--rb-border)', color: '#fff', border: 0, cursor: confirmed ? 'pointer' : 'default', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'background .2s' }}>{saving ? 'Signing…' : '✍ Countersign'}</button>
        </div>
      </Modal>
    )
  }

  // ── Shared: realtime message thread ────────────────────────────────────
  function MessageThread({ rental, onBack }: { rental: Rental; onBack?: () => void }) {
    const [msgs, setMsgs] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const otherName = role === 'landlord' ? (rental.tenant?.full_name || 'Tenant') : (rental.landlord?.full_name || 'Landlord')

    useEffect(() => {
      sb.from('messages').select('*, sender:profiles!messages_sender_id_fkey(full_name)').eq('rental_id', rental.id).order('created_at', { ascending: true })
        .then(({ data }) => { setMsgs((data as Message[]) || []); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80) })
      const ch = sb.channel(`msg-${rental.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `rental_id=eq.${rental.id}` }, ({ new: m }: any) => {
          setMsgs(p => p.find(x => x.id === m.id) ? p : [...p, m as Message])
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
        }).subscribe()
      msgChannelRef.current = ch
      return () => { sb.removeChannel(ch) }
    }, [rental.id])

    const send = async () => {
      if (!input.trim() || sending) return
      const body = input.trim()
      setSending(true)
      setInput('')
      const optimisticId = `opt-${Date.now()}`
      const optimistic: Message = { id: optimisticId, rental_id: rental.id, sender_id: user.id, body, created_at: new Date().toISOString() }
      setMsgs(p => [...p, optimistic])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      const { data } = await sb.from('messages').insert({ rental_id: rental.id, sender_id: user.id, body }).select('*, sender:profiles!messages_sender_id_fkey(full_name)')
      if (data?.[0]) setMsgs(p => p.map(m => m.id === optimisticId ? data[0] as Message : m))
      setSending(false)
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)', minHeight: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--rb-border)' }}>
          {onBack && <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 16, color: 'var(--rb-ink-2)', flexShrink: 0 }}>←</button>}
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarBg, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{otherName.charAt(0).toUpperCase()}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--rb-ink)' }}>{otherName}</div>
            <div style={{ fontSize: 11, color: 'var(--rb-ink-3)', marginTop: 1 }}>{rental.property?.name || 'Rental'}</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
          {msgs.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--rb-ink-3)', fontSize: 14 }}>Start the conversation. Messages stay in-app.</div>}
          {msgs.map(m => {
            const isMine = m.sender_id === user?.id
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '75%', padding: '9px 14px', borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMine ? 'var(--rb-action)' : 'var(--rb-surface)', color: isMine ? '#fff' : 'var(--rb-ink)', fontSize: 14, lineHeight: 1.45, border: isMine ? 0 : '1px solid var(--rb-border-soft)' }}>
                  <div>{m.body}</div>
                  <div style={{ fontSize: 10, marginTop: 4, opacity: .6, textAlign: 'right' }}>{relDate(m.created_at)}</div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
        <div style={{ paddingTop: 12, display: 'flex', gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} placeholder="Type a message…" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={send} disabled={!input.trim() || sending} style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: input.trim() ? 'pointer' : 'default', fontFamily: 'inherit', fontWeight: 600, opacity: input.trim() ? 1 : .5 }}>{sending ? '…' : 'Send'}</button>
        </div>
      </div>
    )
  }

  function LandlordMessaging() {
    const rentals: Rental[] = (landlordData?.rentals || []).filter((r: Rental) => r.tenant_id)
    const [activeThread, setActiveThread] = useState<Rental | null>(messagingRental)
    if (activeThread) return (
      <>
        <div style={topStyle}><div><div style={eyebrowStyle}>Landlord · Messages</div><h1 style={h1Style}>Chat.</h1></div></div>
        <section style={cardStyle}><MessageThread rental={activeThread} onBack={() => setActiveThread(null)} /></section>
      </>
    )
    return (
      <>
        <div style={topStyle}><div><div style={eyebrowStyle}>Landlord · Messages</div><h1 style={h1Style}>Messages.</h1><p style={subStyle}>{rentals.length} active tenant{rentals.length !== 1 ? 's' : ''}</p></div></div>
        <section style={cardStyle}>
          {rentals.length === 0 ? <div style={emptyStyle}><div style={{ fontSize: 32, marginBottom: 12 }}>💬</div><p>No active tenants yet. Add a tenant to start messaging.</p></div>
            : rentals.map((r: Rental) => (
              <div key={r.id} onClick={() => setActiveThread(r)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--rb-border-soft)', cursor: 'pointer' }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#c9b388,#7a6042)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>{(r.tenant?.full_name || 'T').charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--rb-ink)' }}>{r.tenant?.full_name || 'Tenant'}</div>
                  <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>{r.property?.name || '—'}</div>
                </div>
                <span style={{ fontSize: 18, color: 'var(--rb-ink-3)' }}>›</span>
              </div>
            ))}
        </section>
      </>
    )
  }

  function TenantMessaging() {
    const rental: Rental | null = tenantData?.rental || null
    if (!rental) return <TenantEmpty />
    return (
      <>
        <div style={topStyle}><div><div style={eyebrowStyle}>Tenant · Messages</div><h1 style={h1Style}>Chat.</h1><p style={subStyle}>{rental.landlord?.full_name || 'Your landlord'}</p></div></div>
        <section style={cardStyle}><MessageThread rental={messagingRental || rental} /></section>
      </>
    )
  }

  // ── Deposit dispute modal ────────────────────────────────────────────────
  function DisputeTxModal() {
    const t = selectedDepositTx
    const [note, setNote] = useState(t?.tenant_dispute_note || '')
    const [saving, setSaving] = useState(false)
    if (!t) return null
    const alreadyDisputed = t.dispute_status === 'disputed'

    const handleSubmit = async () => {
      if (!note.trim()) { toast('Add a note explaining your dispute', 'error'); return }
      setSaving(true)
      try {
        const { error } = await sb.from('deposit_transactions').update({ tenant_dispute_note: note, dispute_status: 'disputed' }).eq('id', t.id)
        if (error) throw error
        toast('Dispute filed — your landlord will be notified', 'success')
        setModal(null)
        window.location.reload()
      } catch (e: any) { console.error('[Dispute]', e); toast(e?.message || 'Failed', 'error'); setSaving(false) }
    }

    return (
      <Modal title={alreadyDisputed ? 'Dispute filed' : 'Dispute deduction'} onClose={() => setModal(null)}>
        <div style={{ marginBottom: 18, padding: '12px 16px', background: 'var(--rb-danger-soft,rgba(239,68,68,.08))', borderRadius: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--rb-danger)', fontWeight: 600 }}>Deduction: {inr(t.amount)}</div>
          <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 3 }}>{t.note || t.description || '—'} · {relDate(t.created_at)}</div>
        </div>
        {alreadyDisputed
          ? <><div style={{ fontSize: 13, color: 'var(--rb-ink-2)', marginBottom: 12 }}>Your dispute note:</div><div style={{ padding: 12, background: 'var(--rb-surface)', borderRadius: 10, fontSize: 14, lineHeight: 1.55 }}>{t.tenant_dispute_note}</div><div style={{ marginTop: 14, fontSize: 12, color: 'var(--rb-ink-3)' }}>Your landlord can see this. Disputes are resolved through direct discussion.</div></>
          : <><Field label="Explain your dispute"><textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' as const }} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. The damage was pre-existing and documented in my move-in photos…" /></Field><p style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginBottom: 16 }}>Your note will be visible to your landlord. Disputes are resolved through discussion — this creates a written record.</p><button onClick={handleSubmit} disabled={saving || !note.trim()} style={{ width: '100%', padding: '11px 0', borderRadius: 999, background: 'var(--rb-danger,#EF4444)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>{saving ? 'Filing…' : 'File dispute'}</button></>
        }
      </Modal>
    )
  }

  // ── Apply escalation modal (landlord) ────────────────────────────────────
  function ApplyEscalationModal() {
    const rental: Rental | null = selectedRental
    const [saving, setSaving] = useState(false)
    if (!rental) return null
    const increment = Number(rental.rent_increment_percent || 5)
    const currentRent = Number(rental.monthly_rent)
    const newRent = Math.round(currentRent * (1 + increment / 100))
    const effectiveDate = new Date()
    effectiveDate.setDate(1)
    effectiveDate.setMonth(effectiveDate.getMonth() + 1)
    const effectiveDateStr = effectiveDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

    const handleApply = async () => {
      setSaving(true)
      try {
        const { error } = await sb.from('rentals').update({
          monthly_rent: newRent,
          escalation_applied_at: new Date().toISOString().split('T')[0],
        }).eq('id', rental.id)
        if (error) throw error
        if (rental.tenant_id) {
          try {
            await sb.from('notifications').insert({
              user_id: rental.tenant_id,
              title: 'Rent revised',
              body: `Your monthly rent has been revised from ${inr(currentRent)} to ${inr(newRent)}, effective ${effectiveDateStr}.`,
              type: 'info',
            })
          } catch { /* non-fatal */ }
        }
        toast('Escalation applied — tenant notified', 'success')
        setModal(null)
        window.location.reload()
      } catch (e: any) { console.error('[Escalation]', e); toast(e?.message || 'Failed', 'error'); setSaving(false) }
    }

    return (
      <Modal title="Apply rent escalation" onClose={() => setModal(null)}>
        <div style={{ marginBottom: 20, padding: '16px 18px', background: 'var(--rb-action-soft)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--rb-ink-3)' }}>Current rent</span>
            <span style={{ fontFamily: 'var(--rb-font-display)', fontSize: 22 }}>{inr(currentRent)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: 'var(--rb-ink-3)' }}>Annual increment</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--rb-action)' }}>+{increment}%</span>
          </div>
          <div style={{ borderTop: '1px dashed rgba(15,76,92,.2)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>New rent</span>
            <span style={{ fontFamily: 'var(--rb-font-display)', fontSize: 32, color: 'var(--rb-action)', letterSpacing: '-.025em' }}>{inr(newRent)}</span>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--rb-ink-3)', marginBottom: 20, lineHeight: 1.6 }}>
          This updates monthly rent to <strong>{inr(newRent)}</strong> effective from <strong>{effectiveDateStr}</strong>. The tenant will be notified in-app.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setModal(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Cancel</button>
          <button onClick={handleApply} disabled={saving} style={{ flex: 1, padding: '10px 0', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>{saving ? 'Applying…' : `Apply ${inr(newRent)} →`}</button>
        </div>
      </Modal>
    )
  }

  // ── Give notice modal (tenant) ───────────────────────────────────────────
  function GiveNoticeModal() {
    const rental: Rental | null = selectedRental || tenantData?.rental || null
    const [moveOutDate, setMoveOutDate] = useState('')
    const [saving, setSaving] = useState(false)
    if (!rental) return null
    const noticeDays = rental.notice_period_days ?? 30
    const minDate = new Date(); minDate.setDate(minDate.getDate() + noticeDays)
    const minDateStr = minDate.toISOString().split('T')[0]

    const handleSubmit = async () => {
      if (!moveOutDate) { toast('Select a move-out date', 'error'); return }
      setSaving(true)
      try {
        const { error } = await sb.from('rentals').update({ notice_given_at: new Date().toISOString(), move_out_date: moveOutDate }).eq('id', rental.id)
        if (error) throw error
        toast('Notice given — landlord will be informed', 'success')
        setModal(null)
        window.location.reload()
      } catch (e: any) { console.error('[GiveNotice]', e); toast(e?.message || 'Failed', 'error'); setSaving(false) }
    }

    return (
      <Modal title="Give notice" onClose={() => setModal(null)}>
        <div style={{ marginBottom: 18, padding: '12px 16px', background: 'var(--rb-warning-soft)', borderRadius: 10, fontSize: 13, color: 'var(--rb-warning)', lineHeight: 1.55 }}>
          Your lease requires <strong>{noticeDays} days notice</strong>. Your move-out date must be at least {noticeDays} days from today.
        </div>
        <Field label="Intended move-out date">
          <input style={inputStyle} type="date" value={moveOutDate} onChange={e => setMoveOutDate(e.target.value)} min={minDateStr} />
        </Field>
        <p style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginBottom: 16, lineHeight: 1.6 }}>This will notify your landlord and begin the move-out process. Your deposit refund timeline starts from the actual move-out date.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setModal(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !moveOutDate} style={{ flex: 1, padding: '10px 0', borderRadius: 999, background: 'var(--rb-danger,#EF4444)', color: '#fff', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>{saving ? 'Submitting…' : 'Give notice'}</button>
        </div>
      </Modal>
    )
  }

  function renderView() {
    if (role === 'landlord') {
      switch (activeView) {
        case 'props': return <LandlordProperties />
        case 'led': return <LandlordLedger />
        case 'hra': return <LandlordHRA />
        case 'rep': return <LandlordRepairs />
        case 'agree': return <LandlordAgreements />
        case 'msg': return <LandlordMessaging />
        case 'profile': return <ProfileView />
        default: return <LandlordHome />
      }
    } else if (role === 'tenant') {
      switch (activeView) {
        case 'pay': return <TenantPay />
        case 'hra': return <TenantHRA />
        case 'rep': return <TenantRepairs />
        case 'msg': return <TenantMessaging />
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
        @media print{
          /* Hide everything, then reveal only the agreement */
          body *{visibility:hidden!important}
          #agreement-print-area,#agreement-print-area *{visibility:visible!important}
          #agreement-print-area{
            position:absolute!important;
            top:0!important;left:0!important;
            width:100%!important;
            padding:32px!important;
            background:#fff!important;
            box-shadow:none!important;
            border:none!important;
          }
          body{background:#fff!important}
        }
        @media(max-width:767px){
          .d-shell{display:block!important}
          .d-side{display:none!important}
          .d-main{padding:72px 16px 96px!important;max-width:100%!important;background:var(--rb-fill)!important}
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
        <main className="d-main" style={{ padding: '32px 36px 60px', maxWidth: 1200, minWidth: 0, background: 'var(--rb-fill)' }}>
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
      {modal === 'dispute-tx' && <DisputeTxModal />}
      {modal === 'apply-escalation' && <ApplyEscalationModal />}
      {modal === 'give-notice' && <GiveNoticeModal />}
      {modal === 'custom-clauses' && <CustomClausesModal />}
      {modal === 'landlord-sign' && <LandlordSignModal />}

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
const h1Style: React.CSSProperties = { fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 400, letterSpacing: '-.025em', lineHeight: 1.05, color: 'var(--rb-ink)', marginTop: 4 }
const subStyle: React.CSSProperties = { color: 'var(--rb-ink-2)', marginTop: 6, fontSize: 14, lineHeight: 1.55 }
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }
const cardStyle: React.CSSProperties = { background: 'var(--rb-surface)', border: '1px solid var(--rb-border-soft)', borderRadius: 16, padding: 22, boxShadow: '0 1px 3px rgba(20,18,12,.06)' }
const cardH3Style: React.CSSProperties = { fontFamily: 'var(--rb-font-display)', fontSize: 22, fontWeight: 400, letterSpacing: '-.015em', lineHeight: 1.1 }
const emptyStyle: React.CSSProperties = { textAlign: 'center', padding: '40px 20px', color: 'var(--rb-ink-3)' }
const actBtnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const actBtnSm: React.CSSProperties = { ...actBtnPrimary, padding: '8px 16px', fontSize: 12 }
