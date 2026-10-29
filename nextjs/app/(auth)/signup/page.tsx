'use client'

import Link from 'next/link'

export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isNativeApp } from '@/lib/native'
import { track } from '@/lib/analytics/track'
import { getRegionFromCookie, browserTimezone } from '@/lib/region'
import { useDemo } from '@/lib/hooks/useDemo'
import { normalizeRole, type ViewRole } from '@/lib/rentals/role'
import { sendWelcomeEmail, welcomeName } from '@/lib/welcome'
import type { Session } from '@supabase/supabase-js'

import { LogoLockup } from '@/components/brand'

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
  const demo = useDemo()
  return (
    <div className="m-screen">
      <div className="a2-splash">
        {/* Hero: logo + wordmark lockup */}
        <LogoLockup size={72} fontSize={32} gap={16} />

        <h1 className="lede" style={{ marginTop: 28 }}>
          Sign up once.<br />
          <em>Carry your<br />record for life.</em>
        </h1>

        <div className="a2-receipt">
          <div className="rh">
            <span className="t">Receipt · Nov</span>
            <span className="n">RB·024·M11</span>
          </div>
          <div className="rr"><span className="k">Tenant</span><span className="v">{demo.india ? 'Aarav Mehta' : 'Sam Carter'}</span></div>
          <div className="rr"><span className="k">Property</span><span className="v">{demo.india ? '2BHK · Bandra W' : '2BR · Main St'}</span></div>
          <div className="rr"><span className="k">Period</span><span className="v">1–30 Nov &rsquo;25</span></div>
          <div className="rtot">
            <span className="l">PAID · {demo.india ? 'UPI 2.0' : demo.method.toUpperCase()}</span>
            <span className="v">{demo.m(62000)}</span>
          </div>
          <div className="rfoot">
            <span>{demo.india ? '10(13A) READY' : 'RECEIPT READY'}</span>
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

// ─── main component ───────────────────────────────────────────
// ─── Region seeding ───────────────────────────────────────────────────────────
// profiles.country_code defaults to 'IN' at the database level (003), and
// auth/callback only routes to /onboarding/country when the column is NULL — which
// it therefore never is. The effect was that every new user was silently recorded
// as Indian regardless of where they signed up from, and since the dashboard
// denominates money by the account's country, a landlord in Austin saw rupees.
//
// The IP-derived cookie is only a guess, but it is a far better one than "always
// India", and it is now correctable from the profile screen. Stamping it here
// rather than leaving the default is what makes the account's country mean
// something.
function detectedRegionFields() {
  const region = getRegionFromCookie()
  return {
    country_code: region.countryCode,
    currency_code: region.currency.code,
    locale: region.locale,
    timezone: browserTimezone(region.primaryTimezone),
  }
}


// ─── Finishing sign-up ────────────────────────────────────────────────────────
// There is no role screen any more. The mobile flow used to be Google, then
// "landlord or tenant?", then "about you", then a welcome card, then an empty
// dashboard -- and 6 of 26 accounts stopped at the role question. Now:
//   - desktop asks before Google (the role cards), and that choice is saved here
//   - an invite link means tenant; the join page sets it when they join
//   - anyone else lands on the dashboard's start screen, where the choice is the
//     first action itself ("I collect rent" opens the setup form)
// The name comes from Google and can be changed on the profile screen.

function destination(): string {
  const next = new URLSearchParams(window.location.search).get('next')
  if (next && next.startsWith('/')) return next
  try {
    const tok = sessionStorage.getItem('rb-invite-token')
    if (tok) return `/join/${tok}`
  } catch {}
  return '/dashboard'
}

async function finishSignup(sb: ReturnType<typeof createClient>, session: Session, path: string) {
  const { data: profile } = await sb.from('profiles').select('role, full_name').eq('id', session.user.id).maybeSingle()
  const dest = destination()
  if (profile?.role) { window.location.replace(dest); return }

  // 'pg' is offered on the cards but is a landlord in the database. Writing it
  // raw failed silently and left the account with no role at all.
  let chosen: ViewRole | null = null
  try {
    chosen = normalizeRole(sessionStorage.getItem('rb-signup-role'))
    sessionStorage.removeItem('rb-signup-role')
  } catch {}
  // An invite decides: they are joining as the tenant, whatever card was selected.
  if (dest.startsWith('/join/')) chosen = null

  const region = detectedRegionFields()
  const { error } = await sb.from('profiles').update(chosen ? { role: chosen, ...region } : region).eq('id', session.user.id)
  if (error) {
    // Never strand someone here over a save: the dashboard works out the role
    // from their data, or asks.
    console.error('[signup] profile update failed:', error.message)
  } else if (chosen) {
    track('signup_completed', { role: chosen, path })
    sendWelcomeEmail(session.access_token, welcomeName(profile?.full_name, session), chosen)
  }
  window.location.replace(dest)
}

type MobileStep = 'splash' | 'finishing'

export default function SignUpPage() {
  const [role, setRole] = useState('landlord')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mobileStep, setMobileStep] = useState<MobileStep>('splash')
  // Signed in already (back from Google): finishing sign-up, not choosing.
  const [finishing, setFinishing] = useState(false)
  const sb = createClient()

  const selectedRole = ROLES.find(r => r.id === role) || ROLES[0]

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setFinishing(true)
      setMobileStep('finishing')
      finishSignup(sb, session, 'oauth').catch(() => window.location.replace('/dashboard'))
    })
  }, [])

  // Native Android: Google's account picker inside the app, then finish here.
  // On the web the callback brings them back to this page, and the effect above
  // finishes instead.
  const signInWithGoogle = useCallback(async (path: string) => {
    if (isNativeApp()) {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')
      await GoogleAuth.initialize({
        clientId: '721315070243-hhqp60g6cvcis1kr1cg5j5n285n8karb.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: false,
      })
      const googleUser = await GoogleAuth.signIn()
      const { error: idTokenError } = await sb.auth.signInWithIdToken({
        provider: 'google',
        token: googleUser.authentication.idToken,
      })
      if (idTokenError) throw idTokenError
      const { data: { session } } = await sb.auth.getSession()
      if (session) {
        setFinishing(true)
        setMobileStep('finishing')
        await finishSignup(sb, session, path)
      }
      return
    }
    const nextParam = new URLSearchParams(window.location.search).get('next')
    const callbackUrl = nextParam
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextParam)}`
      : `${window.location.origin}/auth/callback`
    const { error: oauthError } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl },
    })
    if (oauthError) throw oauthError
  }, [sb])

  // Desktop: the selected card is remembered across the Google round trip.
  const handleGoogle = useCallback(async () => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      track('signup_started', { role })
      sessionStorage.setItem('rb-signup-role', role)
      await signInWithGoogle('desktop')
    } catch {
      setLoading(false)
      setError('Could not connect to Google. Check your connection and try again.')
    }
  }, [role, loading, signInWithGoogle])

  // Mobile: no role up front. The dashboard asks, as the first action.
  const handleMobileSplashGoogle = useCallback(async () => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      sessionStorage.removeItem('rb-signup-role')
      await signInWithGoogle('mobile')
    } catch {
      setLoading(false)
      setError('Could not connect to Google. Check your connection and try again.')
    }
  }, [loading, signInWithGoogle])

  return (
    <>
      {/* Mobile layout (< 768px) */}
      <div className="m-auth-only">
        {mobileStep === 'splash' && (
          <MA2Splash onGoogle={handleMobileSplashGoogle} loading={loading} error={error} />
        )}
        {mobileStep === 'finishing' && (
          <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
            <div>
              <span className="spinner" style={{ display: 'inline-block', width: 28, height: 28, borderColor: 'rgba(15,76,92,.15)', borderTopColor: 'var(--rb-action)' }} />
              <p style={{ marginTop: 16, fontSize: 14, color: 'var(--rb-ink-2)' }}>Setting up your account…</p>
            </div>
          </div>
        )}
      </div>

      {/* Desktop layout (≥ 768px) */}
      <div className="d-auth-only sb-shell">
        {/* Brand pane */}
        <div className="sb-pane">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <LogoLockup size={32} fontSize={20} gap={11} dark />
          </Link>

          <div style={{ marginTop: 60 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(246,244,238,.6)', marginBottom: 22 }}>The rental OS</p>
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
                {['Google OAuth', 'Supabase', 'Razorpay', 'Worldwide'].map(t => (
                  <span key={t} style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', padding: '5px 11px', borderRadius: 999, background: 'rgba(246,244,238,.06)', color: 'rgba(246,244,238,.8)', border: '1px solid rgba(246,244,238,.1)' }}>{t}</span>
                ))}
              </div>
              <blockquote style={{ fontFamily: 'var(--rb-font-display)', fontStyle: 'italic', fontSize: 16, lineHeight: 1.5, color: 'rgba(246,244,238,.8)', position: 'relative', paddingLeft: 18 }}>
                <span style={{ position: 'absolute', left: -4, top: -4, fontSize: 32, color: 'var(--rb-accent)', fontStyle: 'normal' }}>&ldquo;</span>
                Finally, a rental app that doesn&apos;t disappear after the lease ends.
                <cite style={{ display: 'block', marginTop: 8, fontStyle: 'normal', fontFamily: 'var(--rb-font-sans)', fontSize: 12, color: 'rgba(246,244,238,.5)', letterSpacing: '.04em' }}>· Early beta user, Bengaluru</cite>
              </blockquote>
            </div>
          </div>
        </div>

        {/* Form pane */}
        <div className="sb-form-pane">
          {/* Progress */}
          <div style={{ marginBottom: 48 }}>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: (loading || finishing) ? '80%' : '33%' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: 'var(--rb-ink-3)', fontFamily: 'var(--rb-font-mono)', letterSpacing: '.04em' }}>
              <span>{finishing ? 'Setting up your account…' : loading ? 'Connecting to Google…' : 'How will you use RentyBase?'}</span>
              <a href="/signin" style={{ color: 'var(--rb-ink-3)' }}>
                Already a member? <strong style={{ color: 'var(--rb-accent)', fontWeight: 700 }}>Sign in</strong>
              </a>
            </div>
          </div>

          <div style={{ flex: 1, maxWidth: 520, width: '100%', margin: '0 auto' }}>
            <div className="fade-up">
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--rb-accent)', marginBottom: 14 }}>Create account</p>
              <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(32px,3vw,44px)', fontWeight: 400, lineHeight: 1.05, letterSpacing: '-.025em', color: 'var(--rb-ink)' }}>What brings you here?</h2>
              <p style={{ color: 'var(--rb-ink-2)', fontSize: 15, lineHeight: 1.55, marginTop: 14, maxWidth: 420 }}>
                Pick what you&apos;ll do first. The same account can own and rent, so you can add the other side any time.
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
                disabled={loading || finishing}
                type="button"
              >
                {finishing ? (
                  <><span className="spinner" style={{ borderColor: 'rgba(14,20,19,.2)', borderTopColor: 'var(--rb-ink)' }} />Setting up your account…</>
                ) : loading ? (
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

              {!finishing && (
                <>
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
                </>
              )}

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
