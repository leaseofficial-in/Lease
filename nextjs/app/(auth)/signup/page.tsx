'use client'

export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoMark, LogoLockup } from '@/components/brand'

const WaxSeal = ({ size = 96 }: { size?: number }) => (
  <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden
       style={{ filter: 'drop-shadow(0 16px 32px rgba(201,122,58,.42))', transform: 'rotate(-6deg)' }}>
    <defs>
      <radialGradient id="waxFill" cx="38%" cy="32%" r="75%">
        <stop offset="0%" stopColor="#E29457"/>
        <stop offset="55%" stopColor="#C97A3A"/>
        <stop offset="100%" stopColor="#8E4C1B"/>
      </radialGradient>
      <radialGradient id="waxHi" cx="35%" cy="28%" r="35%">
        <stop offset="0%" stopColor="rgba(255,255,255,.45)"/>
        <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
      </radialGradient>
    </defs>
    <path d="M100 8 C140 8, 188 36, 192 86 C196 134, 168 184, 116 192 C68 199, 22 168, 10 124 C-2 76, 30 22, 78 12 C84 11, 92 8, 100 8 Z" fill="url(#waxFill)"/>
    <path d="M100 8 C140 8, 188 36, 192 86 C196 134, 168 184, 116 192 C68 199, 22 168, 10 124 C-2 76, 30 22, 78 12 C84 11, 92 8, 100 8 Z" fill="url(#waxHi)"/>
    <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(244,229,212,.5)" strokeWidth="1.4" strokeDasharray="2 3"/>
    <text x="100" y="44" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" letterSpacing="3.4" fill="#F4E5D4" fontWeight="700">RENTYBASE</text>
    <text x="100" y="58" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" letterSpacing="2" fill="rgba(244,229,212,.65)" fontWeight="700">• SEALED •</text>
    <path d="M68 102 l22 22 l44 -44" fill="none" stroke="#F6F4EE" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="100" y="170" textAnchor="middle" fontFamily="Instrument Serif, serif" fontSize="13" fill="#F4E5D4" fontStyle="italic">est. 2026</text>
  </svg>
)

// ─── desktop role data ────────────────────────────────────────
const ROLES = [
  {
    id: 'landlord',
    label: 'Landlord',
    desc: 'I own property and want to manage tenants, rent & deposits.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="1"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
    steps: [
      { num: '01', line: 'List your property' },
      { num: '02', line: 'Invite tenants by link' },
      { num: '03', line: 'Track rent & deposits' },
    ],
  },
  {
    id: 'tenant',
    label: 'Tenant',
    desc: 'I rent a home and want to pay rent, view agreements & raise repairs.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/><path d="M5 10v11h14V10"/>
      </svg>
    ),
    steps: [
      { num: '01', line: 'Join via invite link' },
      { num: '02', line: 'Pay rent with one tap' },
      { num: '03', line: 'Keep your rental record' },
    ],
  },
  {
    id: 'pg',
    label: 'PG Hostel',
    desc: 'I run a paying guest hostel and manage multiple rooms & occupants.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/><circle cx="12" cy="7" r="1"/>
      </svg>
    ),
    steps: [
      { num: '01', line: 'Set up your hostel' },
      { num: '02', line: 'Manage rooms & occupants' },
      { num: '03', line: 'Automate billing & receipts' },
    ],
  },
]

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.9a5.05 5.05 0 0 1-2.18 3.31v2.75h3.53c2.07-1.9 3.25-4.7 3.25-8.09z"/>
      <path fill="#34A853" d="M12 23c2.94 0 5.4-.98 7.2-2.64l-3.53-2.75c-.97.65-2.22 1.04-3.67 1.04-2.83 0-5.22-1.91-6.07-4.48H2.28v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC04" d="M5.93 14.17a6.6 6.6 0 0 1 0-4.34V6.99H2.28a11 11 0 0 0 0 10.02l3.65-2.84z"/>
      <path fill="#EA4335" d="M12 5.5c1.6 0 3.03.55 4.16 1.63l3.12-3.12A11 11 0 0 0 12 1 11 11 0 0 0 2.28 6.99l3.65 2.84C6.78 7.41 9.17 5.5 12 5.5z"/>
    </svg>
  )
}

// ─── mobile screen 1: splash (unified entry) ─────────────────
function MA2Splash({ onGoogle, loading, error }: { onGoogle: () => void; loading: boolean; error: string }) {
  return (
    <div className="m-screen">
      <div className="a2-splash">
        {/* Hero: real logo + wordmark */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 4 }}>
          <LogoMark size={72} />
          <LogoLockup size={36} fontSize={26} gap={12} />
        </div>

        <h1 className="lede" style={{ marginTop: 28 }}>
          Sign up once.<br />
          <em>Carry your<br />record for life.</em>
        </h1>

        <div className="a2-receipt">
          <div className="rh">
            <span className="t">Receipt · Nov</span>
            <span className="n">RB·024·M11</span>
          </div>
          <div className="rr"><span className="k">Tenant</span><span className="v">Aarav Mehta</span></div>
          <div className="rr"><span className="k">Property</span><span className="v">2BHK · Bandra W</span></div>
          <div className="rr"><span className="k">Period</span><span className="v">1–30 Nov '25</span></div>
          <div className="rtot">
            <span className="l">PAID · UPI 2.0</span>
            <span className="v">₹62,000</span>
          </div>
          <div className="rfoot">
            <span>10(13A) READY</span>
            <span className="stamp">SEALED</span>
          </div>
        </div>

        <div className="gate">
          <span className="lbl">CREATE YOUR FREE ACCOUNT</span>

          <button className="a2-google primary" type="button" onClick={onGoogle} disabled={loading}>
            <span className="glyph">
              {loading
                ? <span style={{ width: 22, height: 22, border: '2.5px solid rgba(14,20,19,.15)', borderTopColor: '#0E1413', borderRadius: '50%', display: 'block', animation: 'a2Spin 1s linear infinite' }} />
                : <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                    <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.9a5.05 5.05 0 0 1-2.18 3.31v2.75h3.53c2.07-1.9 3.25-4.7 3.25-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.94 0 5.4-.98 7.2-2.64l-3.53-2.75c-.97.65-2.22 1.04-3.67 1.04-2.83 0-5.22-1.91-6.07-4.48H2.28v2.84A11 11 0 0 0 12 23z"/>
                    <path fill="#FBBC04" d="M5.93 14.17a6.6 6.6 0 0 1 0-4.34V6.99H2.28a11 11 0 0 0 0 10.02l3.65-2.84z"/>
                    <path fill="#EA4335" d="M12 5.5c1.6 0 3.03.55 4.16 1.63l3.12-3.12A11 11 0 0 0 12 1 11 11 0 0 0 2.28 6.99l3.65 2.84C6.78 7.41 9.17 5.5 12 5.5z"/>
                  </svg>
              }
            </span>
            <span className="tx">
              <span className="t">{loading ? 'Connecting…' : 'Continue with Google'}</span>
              <span className="s">ONE TAP · NO PASSWORD</span>
            </span>
            <span className="arr">→</span>
          </button>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#991B1B', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="10" cy="10" r="8"/><path d="M10 6v4M10 14h.01" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <div className="a2-soon">
            <span className="lbl">COMING SOON</span>
            <button type="button" disabled><span className="g">📱</span>Phone OTP</button>
            <button type="button" disabled>
              <span className="g" style={{ background: '#FF6B35', color: '#fff', fontStyle: 'italic', fontSize: 11, display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: '50%' }}>आ</span>
              DigiLocker
            </button>
            <button type="button" disabled>
              <span className="g">
                <svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M16.84 12.71c-.03-2.93 2.39-4.34 2.5-4.41-1.36-2-3.49-2.27-4.24-2.3-1.81-.18-3.53 1.06-4.45 1.06-.93 0-2.34-1.04-3.85-1.01-1.98.03-3.81 1.15-4.83 2.92-2.06 3.58-.53 8.86 1.48 11.77.98 1.42 2.15 3.02 3.69 2.96 1.48-.06 2.04-.96 3.83-.96 1.78 0 2.29.96 3.86.93 1.6-.03 2.6-1.45 3.57-2.88 1.13-1.65 1.59-3.26 1.62-3.34-.04-.02-3.1-1.19-3.13-4.74M14.13 4.07c.81-.99 1.36-2.36 1.21-3.73-1.17.05-2.59.78-3.43 1.76-.75.87-1.41 2.27-1.23 3.6 1.31.1 2.64-.66 3.45-1.63"/></svg>
              </span>
              Apple
            </button>
          </div>

          <div className="gate-alt">
            <span>Already a member?</span>
            <a href="/signin">Sign in →</a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── mobile screen 2: role selection ─────────────────────────
function MA2Role({
  selectedRole, onSelect, onContinue, saving,
}: {
  selectedRole: string
  onSelect: (r: string) => void
  onContinue: () => void
  saving: boolean
}) {
  const roleLabel = selectedRole === 'landlord' ? 'landlord' : selectedRole === 'tenant' ? 'tenant' : 'PG manager'
  return (
    <div className="m-screen">
      <div className="a2-top">
        <div style={{ width: 36 }} />
        <div className="crumbs">
          <span className="on">WELCOME</span>
          <span className="sep">›</span>
          <span className="on">ROLE</span>
          <span className="sep">›</span>
          <span>DETAILS</span>
        </div>
        <div style={{ width: 36 }} />
      </div>

      <div className="a2-body">
        <div className="a2-h-block">
          <div className="a2-eyebrow">WELCOME · NEW ACCOUNT</div>
          <h2 className="a2-h">
            Which side of<br />
            the <em>lease</em>?
          </h2>
          <p className="a2-sub">
            Both sides see the same record — pick where you stand today.
          </p>
        </div>

        <div className="a2-roles">
          <button className={`a2-role${selectedRole === 'landlord' ? ' active' : ''}`} type="button" onClick={() => onSelect('landlord')}>
            <div className="ic">
              <svg viewBox="0 0 32 32" width="22" height="22">
                <path d="M6 14 L16 6 L26 14 V25 a2 2 0 0 1 -2 2 H8 a2 2 0 0 1 -2 -2 Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
                <rect x="13" y="18" width="6" height="9" fill="currentColor" opacity=".25"/>
                <rect x="13" y="18" width="6" height="9" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <div className="head">I&apos;m a landlord</div>
              <div className="desc">List property · collect rent · issue HRA receipts</div>
            </div>
            <div className="rad" />
          </button>

          <button className={`a2-role ochre${selectedRole === 'tenant' ? ' active' : ''}`} type="button" onClick={() => onSelect('tenant')}>
            <div className="ic">
              <svg viewBox="0 0 32 32" width="22" height="22">
                <circle cx="16" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="1.7"/>
                <path d="M6 27 a10 10 0 0 1 20 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="head">I&apos;m a tenant</div>
              <div className="desc">Pay rent · collect HRA · keep move-in proof</div>
            </div>
            <div className="rad" />
          </button>

          <button className={`a2-role${selectedRole === 'pg' ? ' active' : ''}`} type="button" onClick={() => onSelect('pg')}>
            <div className="ic">
              <svg viewBox="0 0 32 32" width="22" height="22">
                <rect x="4" y="9" width="24" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7"/>
                <path d="M4 14 h24" stroke="currentColor" strokeWidth="1.4"/>
                <circle cx="10" cy="19" r="1.6" fill="currentColor"/>
                <circle cx="16" cy="19" r="1.6" fill="currentColor"/>
                <circle cx="22" cy="19" r="1.6" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <div className="head">I run a PG / hostel</div>
              <div className="desc">Per-bed billing · auto-vacancy · floor-plan view</div>
            </div>
            <div className="rad" />
          </button>
        </div>

        <div className="a2-foot">
          <button className="a2-cta ochre" type="button" onClick={onContinue} disabled={saving}>
            {saving ? 'Saving…' : `Continue as ${roleLabel}`} <span className="arr">→</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── mobile screen 3: about you ─────────────────────────────
function MA2About({
  googleEmail, displayName, onNameChange, onSubmit, saving,
}: {
  googleEmail: string
  displayName: string
  onNameChange: (v: string) => void
  onSubmit: () => void
  saving: boolean
}) {
  return (
    <div className="m-screen">
      <div className="a2-top">
        <div style={{ width: 36 }} />
        <div className="crumbs">
          <span className="on">ROLE</span>
          <span className="sep">›</span>
          <span className="on">DETAILS</span>
        </div>
        <div style={{ width: 36 }} />
      </div>

      <div className="a2-body">
        <div className="a2-h-block">
          <div className="a2-eyebrow">NEARLY THERE</div>
          <h2 className="a2-h small">
            Two things and<br />
            you&apos;re <em>in.</em>
          </h2>
          <p className="a2-sub">
            Your email is already verified. Just confirm your name and you&apos;re done.
          </p>
        </div>

        <div className="a2-fields">
          <div className="a2-field">
            <span className="lbl">SIGNED IN AS</span>
            <div className="ctrl" style={{ background: 'var(--rb-action-soft)', borderColor: 'var(--rb-action-soft)' }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4285F4,#34A853)', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'var(--rb-font-display)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {(googleEmail[0] || 'G').toUpperCase()}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{googleEmail}</span>
                <span style={{ fontSize: 10.5, color: 'var(--rb-ink-3)', fontFamily: 'var(--rb-font-mono)', letterSpacing: '.1em', fontWeight: 700, marginTop: 1 }}>✓ VERIFIED VIA GOOGLE</span>
              </span>
            </div>
          </div>

          <div className="a2-field">
            <span className="lbl">YOUR NAME</span>
            <div className="ctrl">
              <input
                type="text"
                value={displayName}
                onChange={e => onNameChange(e.target.value)}
                placeholder="As it appears on your PAN"
                autoFocus
              />
              {displayName.length > 1 && <span className="right">✓</span>}
            </div>
          </div>
        </div>

        <div className="a2-note">
          <div className="ic">●</div>
          <div>
            <b>We never call, spam, or share.</b> Receipts go to your Google email. You can add a phone number later.
          </div>
        </div>

        <div className="a2-foot">
          <button className="a2-cta ochre" type="button" onClick={onSubmit} disabled={saving || displayName.trim().length < 2}>
            {saving ? 'Opening ledger…' : 'Open my ledger'} <span className="arr">→</span>
          </button>
          <div className="row" style={{ justifyContent: 'center' }}>
            <span style={{ color: 'var(--rb-ink-3)' }}>
              By continuing, you accept our <a href="/legal/terms" style={{ color: 'var(--rb-action)' }}>Terms</a> &amp; <a href="/legal/privacy" style={{ color: 'var(--rb-action)' }}>Privacy</a>.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── mobile screen 4: sealed (welcome) ───────────────────────
function MA2Sealed({ firstName, role }: { firstName: string; role: string }) {
  const isLandlord = role === 'landlord' || role === 'pg'
  const nextStep = isLandlord
    ? { action: 'Add your first property', detail: 'Takes about 2 minutes' }
    : { action: 'Submit move-in proof', detail: '12 geotagged photos · ~4 minutes' }
  const laterStep = isLandlord
    ? 'Invite your first tenant'
    : 'Set up UPI auto-pay'

  return (
    <div className="m-screen">
      <div className="a2-sealed">
        <div className="hat">
          <div>
            <LogoLockup size={22} fontSize={17} gap={9} />
          </div>
          <button className="skip" type="button" onClick={() => window.location.replace('/dashboard')}>
            Skip tour →
          </button>
        </div>

        <div className="core">
          <WaxSeal size={96} />
          <div className="stamp">SEALED · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}</div>
          <h1>Welcome,<br /><em>{firstName || 'there'}.</em></h1>
          <p className="lead">
            Your ledger is live. {isLandlord
              ? 'Add your first property to get started.'
              : 'Join your landlord\'s ledger to get started.'}
          </p>
        </div>

        <div className="a2-bond">
          <div className="who">
            <div className="role">{isLandlord ? 'LANDLORD' : 'TENANT'}</div>
            <div className="nm">{firstName || 'You'}</div>
          </div>
          <div className="link">
            <span>YOUR</span>
            <span className="line" />
            <span>LEDGER</span>
          </div>
          <div className="who right">
            <div className="role">{isLandlord ? 'TENANT' : 'LANDLORD'}</div>
            <div className="nm">Pending</div>
          </div>
        </div>

        <div className="a2-steps">
          <div className="step-row done">
            <div className="n">✓</div>
            <div className="tx">
              <div className="t">Account created</div>
              <div className="s">Verified via Google</div>
            </div>
            <div className="meta">DONE</div>
          </div>
          <div className="step-row next">
            <div className="n">02</div>
            <div className="tx">
              <div className="t">{nextStep.action}</div>
              <div className="s">{nextStep.detail}</div>
            </div>
            <div className="meta">NEXT</div>
          </div>
          <div className="step-row">
            <div className="n">03</div>
            <div className="tx">
              <div className="t">{laterStep}</div>
              <div className="s">From your dashboard</div>
            </div>
            <div className="meta">LATER</div>
          </div>
        </div>

        <div className="a2-foot">
          <button
            className="a2-cta ochre"
            type="button"
            onClick={() => window.location.replace('/dashboard')}
          >
            {isLandlord ? 'Add my property' : 'Go to my dashboard'} <span className="arr">→</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────
type MobileStep = 'splash' | 'role' | 'about' | 'sealed'

export default function SignUpPage() {
  const [role, setRole] = useState('landlord')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mobileStep, setMobileStep] = useState<MobileStep>('splash')
  const [saving, setSaving] = useState(false)
  const [googleEmail, setGoogleEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const sb = createClient()

  const selectedRole = ROLES.find(r => r.id === role) || ROLES[0]

  useEffect(() => {
    sb.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return

      // Check if role already exists in DB
      const { data: profile } = await sb.from('profiles').select('role, full_name').eq('id', session.user.id).single()

      if (profile?.role) {
        // Returning user with role — go to dashboard
        window.location.replace('/dashboard')
        return
      }

      // New user: no role yet — show mobile onboarding, desktop redirects to dashboard
      // (desktop flow: user already picked role before OAuth, sessionStorage handles it)
      setGoogleEmail(session.user.email || '')
      setDisplayName(profile?.full_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || '')
      setMobileStep('role')
    })
  }, [])

  const handleGoogle = useCallback(async () => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      sessionStorage.setItem('rb-signup-role', role)
      const { error: oauthError } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (oauthError) throw oauthError
    } catch {
      setLoading(false)
      setError('Could not connect to Google. Check your connection and try again.')
    }
  }, [role, loading, sb.auth])

  const handleRoleConfirm = useCallback(async () => {
    setSaving(true)
    try {
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { setMobileStep('splash'); return }
      await sb.from('profiles').update({ role }).eq('id', session.user.id)
      setMobileStep('about')
    } finally {
      setSaving(false)
    }
  }, [role, sb])

  const handleAboutSubmit = useCallback(async () => {
    if (displayName.trim().length < 2) return
    setSaving(true)
    try {
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { setMobileStep('splash'); return }
      await sb.from('profiles').update({ full_name: displayName.trim() }).eq('id', session.user.id)
      setMobileStep('sealed')
    } finally {
      setSaving(false)
    }
  }, [displayName, sb])

  const firstName = displayName.split(' ')[0] || ''

  return (
    <>
      {/* Mobile layout (< 768px) */}
      <div className="m-auth-only">
        {mobileStep === 'splash' && (
          <MA2Splash onGoogle={handleGoogle} loading={loading} error={error} />
        )}
        {mobileStep === 'role' && (
          <MA2Role
            selectedRole={role}
            onSelect={setRole}
            onContinue={handleRoleConfirm}
            saving={saving}
          />
        )}
        {mobileStep === 'about' && (
          <MA2About
            googleEmail={googleEmail}
            displayName={displayName}
            onNameChange={setDisplayName}
            onSubmit={handleAboutSubmit}
            saving={saving}
          />
        )}
        {mobileStep === 'sealed' && (
          <MA2Sealed firstName={firstName} role={role} />
        )}
      </div>

      {/* Desktop layout (≥ 768px) */}
      <div className="d-auth-only sb-shell">
        {/* Brand pane */}
        <div className="sb-pane">
          <a href="/" style={{ textDecoration: 'none' }}>
            <LogoLockup size={32} fontSize={20} gap={11} dark />
          </a>

          <div style={{ marginTop: 60 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(246,244,238,.6)', marginBottom: 22 }}>India's rental OS</p>
            <h1 style={{ fontFamily: 'var(--rb-font-display)', fontWeight: 400, fontSize: 'clamp(44px,4.6vw,76px)', lineHeight: 1.04, letterSpacing: '-.035em', color: '#F6F4EE' }}>
              Sign up once.<br />
              Carry your record<br />
              <em style={{ fontStyle: 'italic', color: 'var(--rb-accent)' }}>for life.</em>
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.65, color: 'rgba(246,244,238,.78)', maxWidth: 480, marginTop: 24 }}>
              Every rent receipt, deposit ledger, move-in photo and repair ticket — stored permanently under your name. Switch cities. Switch properties. Your record travels with you.
            </p>
            <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14, borderLeft: '1px solid rgba(201,122,58,.4)', paddingLeft: 20, maxWidth: 360 }}>
              {selectedRole.steps.map(s => (
                <div key={s.num} style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                  <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 11, color: 'var(--rb-accent)', letterSpacing: '.1em', minWidth: 20 }}>{s.num}</span>
                  <span style={{ fontFamily: 'var(--rb-font-display)', fontSize: 22, lineHeight: 1.2, color: '#F6F4EE', letterSpacing: '-.01em' }}>{s.line}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 30, marginTop: 60 }}>
            <div style={{ flex: 1, maxWidth: 360 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
                {['Google OAuth', 'Supabase', 'Razorpay', 'India-first'].map(t => (
                  <span key={t} style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', padding: '5px 11px', borderRadius: 999, background: 'rgba(246,244,238,.06)', color: 'rgba(246,244,238,.8)', border: '1px solid rgba(246,244,238,.1)' }}>{t}</span>
                ))}
              </div>
              <blockquote style={{ fontFamily: 'var(--rb-font-display)', fontStyle: 'italic', fontSize: 16, lineHeight: 1.5, color: 'rgba(246,244,238,.8)', position: 'relative', paddingLeft: 18 }}>
                <span style={{ position: 'absolute', left: -4, top: -4, fontSize: 32, color: 'var(--rb-accent)', fontStyle: 'normal' }}>"</span>
                Finally, a rental app that doesn&apos;t disappear after the lease ends.
                <cite style={{ display: 'block', marginTop: 8, fontStyle: 'normal', fontFamily: 'var(--rb-font-sans)', fontSize: 12, color: 'rgba(246,244,238,.5)', letterSpacing: '.04em' }}>— Early beta user, Bengaluru</cite>
              </blockquote>
            </div>
          </div>
        </div>

        {/* Form pane */}
        <div className="sb-form-pane">
          {/* Progress */}
          <div style={{ marginBottom: 48 }}>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: loading ? '80%' : '33%' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: 'var(--rb-ink-3)', fontFamily: 'var(--rb-font-mono)', letterSpacing: '.04em' }}>
              <span>{loading ? 'Connecting to Google…' : 'Step 1 · Choose your role'}</span>
              <a href="/signin" style={{ color: 'var(--rb-ink-3)' }}>
                Already a member? <strong style={{ color: 'var(--rb-accent)', fontWeight: 700 }}>Sign in</strong>
              </a>
            </div>
          </div>

          <div style={{ flex: 1, maxWidth: 520, width: '100%', margin: '0 auto' }}>
            <div className="fade-up">
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--rb-accent)', marginBottom: 14 }}>Create account</p>
              <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(32px,3vw,44px)', fontWeight: 400, lineHeight: 1.05, letterSpacing: '-.025em', color: 'var(--rb-ink)' }}>Choose your role.</h2>
              <p style={{ color: 'var(--rb-ink-2)', fontSize: 15, lineHeight: 1.55, marginTop: 14, maxWidth: 420 }}>
                Tell us how you&apos;ll use RentyBase. Your role shapes your entire dashboard experience.
              </p>

              {/* Role cards */}
              <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    className={`role-card${role === r.id ? ' active' : ''}`}
                    onClick={() => setRole(r.id)}
                    disabled={loading}
                    type="button"
                  >
                    <div className="role-icon">{r.icon}</div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 20, lineHeight: 1.1, letterSpacing: '-.015em' }}>{r.label}</div>
                      <div style={{ fontSize: 13, color: 'var(--rb-ink-3)', marginTop: 4 }}>{r.desc}</div>
                    </div>
                    <div className="role-radio" />
                  </button>
                ))}
              </div>

              <button
                className="google-btn"
                style={{ marginTop: 28 }}
                onClick={handleGoogle}
                disabled={loading}
                type="button"
              >
                {loading ? (
                  <><span className="spinner" style={{ borderColor: 'rgba(14,20,19,.2)', borderTopColor: 'var(--rb-ink)' }} />Connecting to Google…</>
                ) : (
                  <><GoogleIcon />Continue with Google</>
                )}
              </button>

              {error && (
                <div className="error-banner" style={{ marginTop: 16 }}>
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="10" cy="10" r="8"/><path d="M10 6v4M10 14h.01" strokeLinecap="round"/>
                  </svg>
                  {error}
                </div>
              )}

              <div style={{ margin: '24px 0 16px', textAlign: 'center', position: 'relative', color: 'var(--rb-ink-3)', fontSize: 12 }}>
                <span style={{ background: 'var(--rb-canvas)', padding: '0 14px', position: 'relative', zIndex: 1 }}>or continue with</span>
                <span style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'var(--rb-border)', zIndex: 0 }} />
              </div>

              <div className="soon-wrap">
                <div className="soon-inner">
                  {['Phone', 'Apple', 'DigiLocker'].map(m => (
                    <button key={m} className="soon-btn" tabIndex={-1} type="button">{m}</button>
                  ))}
                </div>
                <span className="soon-badge">Coming soon</span>
              </div>

              <p className="fineprint">
                By creating an account you agree to our{' '}
                <a href="/legal/terms">Terms of Service</a> and{' '}
                <a href="/legal/privacy">Privacy Policy</a>.
                Your data is stored securely and never sold.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
