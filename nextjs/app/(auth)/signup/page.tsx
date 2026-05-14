'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoLockup } from '@/components/brand'

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

export default function SignUpPage() {
  const [role, setRole] = useState('landlord')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const sb = createClient()

  const selectedRole = ROLES.find(r => r.id === role) || ROLES[0]

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.replace('/dashboard')
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

  return (
    <div className="sb-shell">
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
              Finally, a rental app that doesn't disappear after the lease ends.
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
              Tell us how you'll use RentyBase. Your role shapes your entire dashboard experience.
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
  )
}
