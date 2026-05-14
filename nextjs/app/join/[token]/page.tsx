'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoLockup } from '@/components/brand'

type AuthState = 'noauth' | 'norole' | 'ready'
type PageState = 'loading' | 'preview' | 'notfound' | 'joined' | 'already' | 'error'

function Spinner() {
  return (
    <div style={{ textAlign: 'center', paddingTop: 20 }}>
      <div style={{ width: 32, height: 32, border: '3px solid rgba(15,76,92,.12)', borderTopColor: 'var(--rb-action)', borderRadius: '50%', animation: 'rbspin .7s linear infinite', margin: '0 auto 16px' }} />
      <style>{`@keyframes rbspin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ fontSize: 14, color: 'var(--rb-ink-3)' }}>Checking invite link…</p>
    </div>
  )
}

export default function JoinTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState('')
  const [state, setState] = useState<PageState>('loading')
  const [authState, setAuthState] = useState<AuthState>('noauth')
  const [rental, setRental] = useState<any>(null)
  const [joining, setJoining] = useState(false)
  const sb = createClient()

  useEffect(() => {
    params.then(p => {
      setToken(p.token)
      loadRental(p.token)
    })
  }, [])

  async function loadRental(tok: string) {
    // Persist token so the post-auth flow can recover it even if ?next is dropped
    try { sessionStorage.setItem('rb-invite-token', tok) } catch {}

    try {
      // Load without a session — public invite token RLS policy allows this
      const { data } = await sb
        .from('rentals')
        .select('*, property:properties(*), landlord:profiles!rentals_landlord_id_fkey(full_name)')
        .eq('invite_token', tok)
        .gt('invite_expires_at', new Date().toISOString())
        .maybeSingle()

      if (!data) { setState('notfound'); return }
      setRental(data)
      setState('preview')

      // Determine CTA based on session / role
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { setAuthState('noauth'); return }
      if (data.tenant_id === session.user.id) { setState('already'); return }

      const { data: prof } = await sb
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()
      setAuthState(prof?.role ? 'ready' : 'norole')
    } catch {
      setState('error')
    }
  }

  async function handleJoin() {
    setJoining(true)
    try {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { window.location.href = `/signin?next=${encodeURIComponent(`/join/${token}`)}`; return }
      await sb.from('rentals').update({ tenant_id: user.id, status: 'active' }).eq('id', rental.id)
      try { sessionStorage.removeItem('rb-invite-token') } catch {}
      setState('joined')
    } catch {
      setState('error')
      setJoining(false)
    }
  }

  const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN')
  const signInUrl  = `/signin?next=${encodeURIComponent(`/join/${token}`)}`
  const signUpUrl  = `/signup?next=${encodeURIComponent(`/join/${token}`)}`

  const propertyFields = rental ? [
    { l: 'Property',        v: rental.property?.name || rental.property?.address_line1 || '—' },
    { l: 'City',            v: rental.property?.city || '—' },
    { l: 'Monthly rent',    v: inr(rental.monthly_rent) },
    { l: 'Security deposit',v: inr(rental.security_deposit) },
    { l: 'Rent due',        v: `${rental.rent_due_day}th of every month` },
    { l: 'Landlord',        v: rental.landlord?.full_name || '—' },
  ] : []

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--rb-canvas)', padding: 24 }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', marginBottom: 40 }}>
          <LogoLockup size={28} fontSize={20} gap={10} />
        </a>

        {/* ── Loading ── */}
        {state === 'loading' && <Spinner />}

        {/* ── Invite preview (all auth states) ── */}
        {state === 'preview' && rental && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--rb-accent)', marginBottom: 14 }}>
              You&apos;re invited
            </div>
            <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 40, fontWeight: 400, letterSpacing: '-.025em', lineHeight: 1.05, color: 'var(--rb-ink)' }}>
              Join this rental.
            </h1>
            <p style={{ color: 'var(--rb-ink-2)', fontSize: 15, lineHeight: 1.55, marginTop: 14 }}>
              {rental.landlord?.full_name || 'Your landlord'} has invited you to join their property on RentyBase.
            </p>

            {/* Property card */}
            <div style={{ marginTop: 28, background: 'var(--rb-surface)', border: '1px solid var(--rb-border)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--rb-ink-3)', marginBottom: 14 }}>
                Property details
              </div>
              {propertyFields.map(f => (
                <div key={f.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--rb-border-soft)' }}>
                  <span style={{ fontSize: 13, color: 'var(--rb-ink-3)' }}>{f.l}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{f.v}</span>
                </div>
              ))}
            </div>

            {/* CTA: not signed in */}
            {authState === 'noauth' && (
              <div style={{ marginTop: 24 }}>
                <a href={signUpUrl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: 15, borderRadius: 12, background: 'var(--rb-action)', color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, textDecoration: 'none', boxSizing: 'border-box' }}>
                  Create account to join →
                </a>
                <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13, color: 'var(--rb-ink-3)' }}>
                  Already on RentyBase?{' '}
                  <a href={signInUrl} style={{ color: 'var(--rb-action)', fontWeight: 600, textDecoration: 'none' }}>Sign in →</a>
                </div>
                <p style={{ marginTop: 16, fontSize: 12, color: 'var(--rb-ink-3)', lineHeight: 1.55, textAlign: 'center' }}>
                  Free to join · This link expires 72 hours after it was sent.
                </p>
              </div>
            )}

            {/* CTA: signed in, no role yet */}
            {authState === 'norole' && (
              <div style={{ marginTop: 24, background: 'var(--rb-accent-soft)', border: '1px solid rgba(201,122,58,.25)', borderRadius: 14, padding: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--rb-ink)', marginBottom: 6 }}>One last step</p>
                <p style={{ fontSize: 13, color: 'var(--rb-ink-2)', lineHeight: 1.55, marginBottom: 14 }}>
                  Complete your account setup to accept this invite.
                </p>
                <a href={signUpUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  Complete setup →
                </a>
              </div>
            )}

            {/* CTA: authenticated + has role */}
            {authState === 'ready' && (
              <>
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  style={{ marginTop: 24, width: '100%', padding: 15, borderRadius: 12, background: 'var(--rb-action)', color: '#fff', border: 0, fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: joining ? 'default' : 'pointer', opacity: joining ? 0.7 : 1, transition: 'opacity .2s' }}
                >
                  {joining ? 'Joining…' : 'Accept & join rental →'}
                </button>
                <p style={{ marginTop: 14, fontSize: 12, color: 'var(--rb-ink-3)', lineHeight: 1.55, textAlign: 'center' }}>
                  By joining you agree to the rental terms above. This link expires 72 hours after it was sent.
                </p>
              </>
            )}
          </div>
        )}

        {/* ── Already in this rental ── */}
        {state === 'already' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--rb-action-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--rb-action)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 32, fontWeight: 400 }}>Already joined</h1>
            <p style={{ fontSize: 14, color: 'var(--rb-ink-3)', marginTop: 10, lineHeight: 1.6 }}>You&apos;re already a tenant in this rental.</p>
            <a href="/dashboard" style={{ display: 'inline-flex', marginTop: 22, padding: '12px 24px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>Go to dashboard →</a>
          </div>
        )}

        {/* ── Joined successfully ── */}
        {state === 'joined' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--rb-action-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--rb-action)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 36, fontWeight: 400, letterSpacing: '-.02em' }}>You&apos;re in!</h1>
            <p style={{ fontSize: 15, color: 'var(--rb-ink-2)', marginTop: 12, lineHeight: 1.55 }}>You&apos;ve joined the rental. Your dashboard is ready.</p>
            <a href="/dashboard" style={{ display: 'inline-flex', marginTop: 24, padding: '12px 24px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Go to dashboard →</a>
          </div>
        )}

        {/* ── Expired / not found ── */}
        {state === 'notfound' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--rb-fill-2)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--rb-ink-3)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 32, fontWeight: 400 }}>Link expired</h1>
            <p style={{ fontSize: 14, color: 'var(--rb-ink-3)', marginTop: 8, lineHeight: 1.6 }}>This invite link is invalid or has expired. Ask your landlord to regenerate it.</p>
            <a href="/dashboard" style={{ display: 'inline-flex', marginTop: 22, padding: '9px 20px', borderRadius: 999, border: '1.5px solid var(--rb-border)', color: 'var(--rb-ink)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>← Go to dashboard</a>
          </div>
        )}

        {/* ── Error ── */}
        {state === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,.1)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--rb-danger)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 32, fontWeight: 400 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: 'var(--rb-ink-3)', marginTop: 8, lineHeight: 1.55 }}>Please try again or contact support.</p>
            <button onClick={() => { setState('loading'); loadRental(token) }} style={{ display: 'inline-flex', marginTop: 20, padding: '9px 20px', borderRadius: 999, border: '1.5px solid var(--rb-border)', color: 'var(--rb-ink)', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: 'transparent', fontFamily: 'inherit' }}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
