'use client'

export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoLockup } from '@/components/brand'

// Reliable native detection: @JavascriptInterface injected in MainActivity
// before any JS runs, unlike Capacitor bridge which may lag on remote server.url.
function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  return typeof (window as any).__RentyBase !== 'undefined'
}

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

function Seal() {
  return (
    <div style={{ transform: 'rotate(-8deg)', opacity: 0.8 }}>
      <svg viewBox="0 0 200 200" width="160" height="160" style={{ filter: 'drop-shadow(0 4px 16px rgba(201,122,58,.2))' }}>
        <circle cx="100" cy="100" r="92" fill="none" stroke="#C97A3A" strokeWidth="2.4"/>
        <circle cx="100" cy="100" r="80" fill="none" stroke="#C97A3A" strokeWidth="1.2" strokeDasharray="2 4"/>
        <text x="100" y="86" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="10" letterSpacing="3" fill="#C97A3A" fontWeight="700">SEALED FOR INDIA</text>
        <path d="M70 110 l18 18 l42 -42" fill="none" stroke="#C97A3A" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
        <text x="100" y="160" textAnchor="middle" fontFamily="Instrument Serif,serif" fontSize="14" fill="#C97A3A">RentyBase · est. 2026</text>
      </svg>
    </div>
  )
}

function MobileSplash({ onGoogle, loading, error }: { onGoogle: () => void; loading: boolean; error: string }) {
  return (
    <div className="m-screen">
      <div className="a2-splash">
        {/* Hero: logo + wordmark lockup */}
        <LogoLockup size={72} fontSize={32} gap={16} />

        <h1 className="lede" style={{ marginTop: 28 }}>
          The rent record,<br />
          <em>kept by both<br />of you.</em>
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
          <span className="lbl">SIGN IN OR CREATE ACCOUNT</span>

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
            <span>Have an invite code?</span>
            <a href="/join">Enter it →</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const sb = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'auth_failed') {
      const reason = params.get('reason') || 'unknown'
      setError(`Sign-in failed (${reason}). Try again or contact support.`)
    }
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.replace('/dashboard')
    })

    // Native deep link handler — only wired when running inside the Android app.
    // The __RentyBase Java bridge is injected by MainActivity before any JS runs.
    if (!isNativeApp()) return
    let removeListener: (() => void) | undefined
    ;(async () => {
      const { createNativeClient } = await import('@/lib/supabase/client')
      const nativeSb = await createNativeClient()
      const { App } = await import('@capacitor/app')
      const { Browser } = await import('@capacitor/browser')
      const handle = await App.addListener('appUrlOpen', async ({ url }) => {
        if (!url.startsWith('rentybase://')) return
        await Browser.close()
        const code = new URL(url).searchParams.get('code')
        if (code) {
          const { error: err } = await nativeSb.auth.exchangeCodeForSession(code)
          if (err) { setLoading(false); setError(`Sign-in failed: ${err.message}`) }
          else window.location.replace('/dashboard')
        } else {
          setLoading(false)
          setError('Sign-in was cancelled. Please try again.')
        }
      })
      removeListener = () => handle.remove()
    })()
    return () => removeListener?.()
  }, [])

  const handleGoogle = useCallback(async () => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      if (isNativeApp()) {
        // Native: open OAuth in Capacitor Browser (Chrome Custom Tab),
        // return via rentybase:// deep link. Uses persistent Preferences storage
        // so the PKCE verifier survives the WebView → Chrome → app round-trip.
        const { createNativeClient } = await import('@/lib/supabase/client')
        const nativeSb = await createNativeClient()
        const { data, error: oauthError } = await nativeSb.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: 'rentybase://auth/callback', skipBrowserRedirect: true },
        })
        if (oauthError) throw oauthError
        if (data?.url) {
          const { Browser } = await import('@capacitor/browser')
          await Browser.open({ url: data.url, windowName: '_self' })
        }
      } else {
        const nextParam = new URLSearchParams(window.location.search).get('next')
        const callbackUrl = nextParam
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextParam)}`
          : `${window.location.origin}/auth/callback`
        const { error: oauthError } = await sb.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: callbackUrl },
        })
        if (oauthError) throw oauthError
      }
    } catch {
      setLoading(false)
      setError('Could not connect to Google. Check your connection and try again.')
    }
  }, [loading, sb.auth])

  return (
    <>
      {/* Mobile layout (< 768px) */}
      <div className="m-auth-only">
        <MobileSplash onGoogle={handleGoogle} loading={loading} error={error} />
      </div>

      {/* Desktop layout (≥ 768px) */}
      <div className="d-auth-only sb-shell">
        {/* Brand pane */}
        <div className="sb-pane">
          <a href="/" style={{ textDecoration: 'none' }}>
            <LogoLockup size={32} fontSize={20} gap={11} dark />
          </a>

          <div style={{ marginTop: 60 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(246,244,238,.6)', marginBottom: 22 }}>Welcome back</p>
            <h1 style={{ fontFamily: 'var(--rb-font-display)', fontWeight: 400, fontSize: 'clamp(44px,4.6vw,76px)', lineHeight: 1.04, letterSpacing: '-.035em', color: '#F6F4EE' }}>
              Your record,<br />
              still <em style={{ fontStyle: 'italic', color: 'var(--rb-accent)' }}>here.</em>
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.65, color: 'rgba(246,244,238,.78)', maxWidth: 480, marginTop: 24 }}>
              Every receipt, every photo, every signature. Exactly where you left it. Nothing expires. Nothing disappears.
            </p>
            <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14, borderLeft: '1px solid rgba(201,122,58,.4)', paddingLeft: 20, maxWidth: 360 }}>
              {['Same Google account', 'One click', 'Right where you left off'].map((line, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                  <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 11, color: 'var(--rb-accent)', letterSpacing: '.1em', minWidth: 20 }}>→</span>
                  <span style={{ fontFamily: 'var(--rb-font-display)', fontSize: 22, lineHeight: 1.2, color: '#F6F4EE', letterSpacing: '-.01em' }}>{line}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 30, marginTop: 60 }}>
            <div style={{ flex: 1, maxWidth: 360 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
                {['No password to forget', 'Google OAuth', 'Secure'].map(t => (
                  <span key={t} style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', padding: '5px 11px', borderRadius: 999, background: 'rgba(246,244,238,.06)', color: 'rgba(246,244,238,.8)', border: '1px solid rgba(246,244,238,.1)' }}>{t}</span>
                ))}
              </div>
              <blockquote style={{ fontFamily: 'var(--rb-font-display)', fontStyle: 'italic', fontSize: 16, lineHeight: 1.5, color: 'rgba(246,244,238,.8)', position: 'relative', paddingLeft: 18 }}>
                <span style={{ position: 'absolute', left: -4, top: -4, fontSize: 32, color: 'var(--rb-accent)', fontStyle: 'normal' }}>"</span>
                I moved three times and every receipt was still there. Incredible.
                <cite style={{ display: 'block', marginTop: 8, fontStyle: 'normal', fontFamily: 'var(--rb-font-sans)', fontSize: 12, color: 'rgba(246,244,238,.5)', letterSpacing: '.04em' }}>· Tenant, Hyderabad</cite>
              </blockquote>
            </div>
            <Seal />
          </div>
        </div>

        {/* Form pane */}
        <div className="sb-form-pane">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 56, paddingBottom: 16, borderBottom: '1px solid var(--rb-border)' }}>
            <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 12, letterSpacing: '.06em', color: 'var(--rb-ink-3)' }}>rentybase.com</span>
            <a href="/signup" style={{ fontSize: 13, color: 'var(--rb-ink-3)', transition: 'color .2s' }}>
              New here? <strong style={{ color: 'var(--rb-accent)', fontWeight: 700 }}>Create account</strong>
            </a>
          </div>

          <div style={{ flex: 1, maxWidth: 520, width: '100%', margin: '0 auto' }}>
            <div className="fade-up">
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--rb-accent)', marginBottom: 14 }}>Sign in</p>
              <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(32px,3vw,44px)', fontWeight: 400, lineHeight: 1.05, letterSpacing: '-.025em', color: 'var(--rb-ink)' }}>Welcome back.</h2>
              <p style={{ color: 'var(--rb-ink-2)', fontSize: 15, lineHeight: 1.55, marginTop: 14, maxWidth: 420 }}>
                Use the same Google account you signed up with. Everything will be right where you left it.
              </p>

              <button
                className="google-btn"
                style={{ marginTop: 36 }}
                onClick={handleGoogle}
                disabled={loading}
                type="button"
              >
                {loading ? (
                  <><span className="spinner spinner-white" style={{ borderColor: 'rgba(14,20,19,.2)', borderTopColor: 'var(--rb-ink)' }} />Connecting to Google…</>
                ) : (
                  <><GoogleIcon />Sign in with Google</>
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

              <div style={{ margin: '28px 0 16px', textAlign: 'center', position: 'relative', color: 'var(--rb-ink-3)', fontSize: 12 }}>
                <span style={{ background: 'var(--rb-canvas)', padding: '0 14px', position: 'relative', zIndex: 1 }}>or sign in with</span>
                <span style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'var(--rb-border)', zIndex: 0 }} />
              </div>

              <div className="soon-wrap">
                <div className="soon-inner" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                  {['Phone', 'Apple', 'DigiLocker'].map(m => (
                    <button key={m} className="soon-btn" tabIndex={-1} type="button">{m}</button>
                  ))}
                </div>
                <span className="soon-badge">Coming soon</span>
              </div>

              <p className="fineprint">
                New to RentyBase?{' '}
                <a href="/signup"><strong style={{ color: 'var(--rb-accent)' }}>Create a free account</strong></a>.
                {' '}Having trouble?{' '}
                <a href="mailto:support@rentybase.com">Contact support</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
