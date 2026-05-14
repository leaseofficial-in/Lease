'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoLockup } from '@/components/brand'

// ── State machine ──────────────────────────────────────────────────────────
type PageState =
  | 'loading'          // fetching rental data
  | 'preview'          // valid invite — show details + CTA based on authState
  | 'expired'          // token exists but invite_expires_at is past
  | 'notfound'         // token never existed in the DB
  | 'taken'            // another user already accepted this invite
  | 'ended'            // rental / lease has ended or was cancelled
  | 'is-landlord'      // viewer is the property landlord
  | 'active-rental'    // viewer already has an active rental elsewhere
  | 'joined'           // just joined successfully
  | 'already'          // viewer is already the tenant of this exact rental
  | 'claimed'          // race: someone else claimed the spot between load and confirm
  | 'error'            // unexpected network / DB error

type AuthState = 'noauth' | 'norole' | 'ready'

// ── Icon atoms ─────────────────────────────────────────────────────────────
function IconCircle({ color, paths, size = 56 }: { color: string; paths: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
      <svg viewBox="0 0 24 24" width={size * 0.46} height={size * 0.46} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: paths }} />
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ textAlign: 'center', paddingTop: 20 }}>
      <div style={{ width: 32, height: 32, border: '3px solid rgba(15,76,92,.12)', borderTopColor: 'var(--rb-action)', borderRadius: '50%', animation: 'rbspin .7s linear infinite', margin: '0 auto 16px' }} />
      <style>{`@keyframes rbspin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ fontSize: 14, color: 'var(--rb-ink-3)' }}>Checking invite link…</p>
    </div>
  )
}

// ── Terminal screen (no CTA needed, just info) ─────────────────────────────
function Terminal({ iconColor, iconPaths, title, body, cta }: {
  iconColor: string
  iconPaths: string
  title: string
  body: string
  cta?: React.ReactNode
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <IconCircle color={iconColor} paths={iconPaths} />
      <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 30, fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.1 }}>{title}</h1>
      <p style={{ fontSize: 14, color: 'var(--rb-ink-3)', marginTop: 10, lineHeight: 1.65, maxWidth: 320, margin: '10px auto 0' }}>{body}</p>
      {cta && <div style={{ marginTop: 22 }}>{cta}</div>}
    </div>
  )
}

// ── Shared icon paths ──────────────────────────────────────────────────────
const CHECK   = `<polyline points="20 6 9 17 4 12"/>`
const LINK    = `<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>`
const WARN    = `<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`
const CLOCK   = `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`
const HOME    = `<path d="M3 12l2-2m0 0l7-7 7 7m-2 2v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7m5 8v-5a1 1 0 011-1h2a1 1 0 011 1v5"/>`
const USER    = `<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>`
const LOCK    = `<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>`

// ── Main page ──────────────────────────────────────────────────────────────
export default function JoinTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken]           = useState('')
  const [state, setState]           = useState<PageState>('loading')
  const [authState, setAuthState]   = useState<AuthState>('noauth')
  const [rental, setRental]         = useState<any>(null)
  const [existingProp, setExistingProp] = useState<string>('')  // for active-rental warning
  const [joining, setJoining]       = useState(false)
  const sb = createClient()

  useEffect(() => {
    params.then(p => { setToken(p.token); loadRental(p.token) })
  }, [])

  async function loadRental(tok: string) {
    try { sessionStorage.setItem('rb-invite-token', tok) } catch {}

    try {
      // Query WITHOUT expiry filter so we can distinguish expired vs notfound vs taken
      const { data } = await sb
        .from('rentals')
        .select('*, property:properties(*), landlord:profiles!rentals_landlord_id_fkey(full_name)')
        .eq('invite_token', tok)
        .maybeSingle()

      // 1. Token never existed
      if (!data) { setState('notfound'); return }

      // 2. Rental has ended
      if (data.status === 'ended') { setState('ended'); return }

      // 3. Invite link has expired
      const expiresAt = data.invite_expires_at ? new Date(data.invite_expires_at) : null
      if (!expiresAt || expiresAt < new Date()) { setState('expired'); return }

      // 4. Spot already taken by someone else (detected before session check,
      //    shown to unauthenticated users too so they don't waste time signing up)
      const { data: { session } } = await sb.auth.getSession()
      const uid = session?.user?.id

      if (data.tenant_id) {
        if (uid && data.tenant_id === uid) {
          // 5. Viewer is already the tenant
          setState('already')
          return
        }
        // 6. Taken by a different account
        setState('taken')
        return
      }

      // Rental is available — store it and show preview
      setRental(data)
      setState('preview')

      if (!session) { setAuthState('noauth'); return }

      // 7. Viewer is the landlord — can't join their own property
      if (data.landlord_id === uid) { setState('is-landlord'); return }

      const { data: prof } = await sb.from('profiles').select('role').eq('id', uid!).maybeSingle()

      // 8. No role yet — needs to complete signup first
      if (!prof?.role) { setAuthState('norole'); return }

      // 9. Tenant already has an active rental elsewhere
      if (prof.role === 'tenant') {
        const { data: existing } = await sb
          .from('rentals')
          .select('id, property:properties(name, city)')
          .eq('tenant_id', uid!)
          .neq('status', 'ended')
          .maybeSingle()
        if (existing) {
          const prop = (existing as any).property
          setExistingProp(prop?.name || prop?.city || 'another property')
          setState('active-rental')
          return
        }
      }

      setAuthState('ready')
    } catch {
      setState('error')
    }
  }

  async function handleJoin() {
    setJoining(true)
    try {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { window.location.href = `/signin?next=${encodeURIComponent(`/join/${token}`)}`; return }

      // Safety: re-check the rental is still available before claiming it
      const { data: fresh } = await sb
        .from('rentals')
        .select('id, tenant_id, status, invite_expires_at')
        .eq('id', rental.id)
        .maybeSingle()

      if (!fresh) { setState('notfound'); return }
      if (fresh.status === 'ended') { setState('ended'); return }
      const expiresAt = fresh.invite_expires_at ? new Date(fresh.invite_expires_at) : null
      if (!expiresAt || expiresAt < new Date()) { setState('expired'); return }
      if (fresh.tenant_id && fresh.tenant_id !== user.id) { setState('claimed'); return }
      if (fresh.tenant_id === user.id) {
        try { sessionStorage.removeItem('rb-invite-token') } catch {}
        setState('already')
        return
      }

      // Atomic update: only succeeds if tenant_id is still null (prevents race)
      const { data: updated } = await sb
        .from('rentals')
        .update({ tenant_id: user.id, status: 'active' })
        .eq('id', rental.id)
        .is('tenant_id', null)
        .select('id')

      if (!updated || updated.length === 0) {
        // Row wasn't updated — someone else claimed it between our check and update
        setState('claimed')
        return
      }

      try { sessionStorage.removeItem('rb-invite-token') } catch {}
      setState('joined')
    } catch {
      setState('error')
      setJoining(false)
    }
  }

  const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN')
  const signInUrl = `/signin?next=${encodeURIComponent(`/join/${token}`)}`
  const signUpUrl = `/signup?next=${encodeURIComponent(`/join/${token}`)}`

  const DashLink = ({ label = 'Go to dashboard →' }: { label?: string }) => (
    <a href="/dashboard" style={{ display: 'inline-flex', padding: '11px 22px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>{label}</a>
  )

  const BorderLink = ({ href, label }: { href: string; label: string }) => (
    <a href={href} style={{ display: 'inline-flex', padding: '9px 20px', borderRadius: 999, border: '1.5px solid var(--rb-border)', color: 'var(--rb-ink)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>{label}</a>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--rb-canvas)', padding: 24 }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', marginBottom: 40 }}>
          <LogoLockup size={28} fontSize={20} gap={10} />
        </a>

        {/* ── Loading ── */}
        {state === 'loading' && <Spinner />}

        {/* ── Valid invite preview ── */}
        {state === 'preview' && rental && (() => {
          const fields = [
            { l: 'Property',         v: rental.property?.name || rental.property?.address_line1 || '—' },
            { l: 'City',             v: rental.property?.city || '—' },
            { l: 'Monthly rent',     v: inr(rental.monthly_rent) },
            { l: 'Security deposit', v: inr(rental.security_deposit) },
            { l: 'Rent due',         v: `${rental.rent_due_day}th of every month` },
            { l: 'Landlord',         v: rental.landlord?.full_name || '—' },
          ]
          return (
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

              {/* Property details card */}
              <div style={{ marginTop: 28, background: 'var(--rb-surface)', border: '1px solid var(--rb-border)', borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--rb-ink-3)', marginBottom: 14 }}>
                  Property details
                </div>
                {fields.map(f => (
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
                    Free to join · No credit card needed · Link expires 72 hours after it was sent.
                  </p>
                </div>
              )}

              {/* CTA: signed in, no role */}
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

              {/* CTA: authenticated + role */}
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
          )
        })()}

        {/* ── Expired ── */}
        {state === 'expired' && (
          <Terminal
            iconColor="var(--rb-fill-2)"
            iconPaths={CLOCK}
            title="Link expired"
            body="This invite link has expired. Links are valid for 72 hours. Ask your landlord to generate a new one from their dashboard."
            cta={<BorderLink href="/signin" label="Sign in to your account" />}
          />
        )}

        {/* ── Token never existed ── */}
        {state === 'notfound' && (
          <Terminal
            iconColor="var(--rb-fill-2)"
            iconPaths={LINK}
            title="Invalid link"
            body="This invite link doesn't match any property on RentyBase. Make sure you copied the full link, or ask your landlord to resend it."
            cta={<BorderLink href="/signin" label="Sign in to your account" />}
          />
        )}

        {/* ── Spot already taken ── */}
        {state === 'taken' && (
          <Terminal
            iconColor="rgba(239,68,68,.1)"
            iconPaths={LOCK}
            title="Spot already filled"
            body="This unit has already been accepted by another tenant. If you think this is a mistake, contact your landlord — they can generate a new invite for a different unit."
            cta={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                <DashLink label="Go to your dashboard →" />
                <span style={{ fontSize: 12, color: 'var(--rb-ink-3)' }}>or ask your landlord for a new invite</span>
              </div>
            }
          />
        )}

        {/* ── Race condition: claimed while reviewing ── */}
        {state === 'claimed' && (
          <Terminal
            iconColor="rgba(239,68,68,.1)"
            iconPaths={LOCK}
            title="Just missed it"
            body="Someone else accepted this invite in the last few seconds. Contact your landlord for a new invite link."
            cta={<DashLink label="Go to your dashboard →" />}
          />
        )}

        {/* ── Rental has ended ── */}
        {state === 'ended' && (
          <Terminal
            iconColor="var(--rb-fill-2)"
            iconPaths={HOME}
            title="Rental ended"
            body="This rental listing has been closed by the landlord. The invite link is no longer active."
            cta={<BorderLink href="/dashboard" label="← Go to dashboard" />}
          />
        )}

        {/* ── Viewer is the landlord ── */}
        {state === 'is-landlord' && (
          <Terminal
            iconColor="var(--rb-accent-soft)"
            iconPaths={HOME}
            title="That's your property"
            body="You're the landlord of this rental. Share the invite link with your tenant — it's not meant for your own account."
            cta={<DashLink label="Go to your dashboard →" />}
          />
        )}

        {/* ── Tenant already in another active rental ── */}
        {state === 'active-rental' && (
          <Terminal
            iconColor="rgba(245,158,11,.12)"
            iconPaths={WARN}
            title="You're already in a rental"
            body={`Your account is currently linked to ${existingProp}. RentyBase allows one active rental per tenant. To join this new rental, ask your current landlord to end your existing lease first.`}
            cta={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                <DashLink label="View my current rental →" />
                <span style={{ fontSize: 12, color: 'var(--rb-ink-3)' }}>Contact your landlord to end your current lease</span>
              </div>
            }
          />
        )}

        {/* ── Already in this rental ── */}
        {state === 'already' && (
          <Terminal
            iconColor="var(--rb-action-soft)"
            iconPaths={CHECK}
            title="Already joined"
            body="You're already a tenant in this rental. Your dashboard has everything you need."
            cta={<DashLink />}
          />
        )}

        {/* ── Joined successfully ── */}
        {state === 'joined' && (
          <div style={{ textAlign: 'center' }}>
            <IconCircle color="var(--rb-action-soft)" paths={CHECK} size={72} />
            <style>{`@keyframes rbfadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <div style={{ animation: 'rbfadein .4s ease' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--rb-action)', marginBottom: 10 }}>Confirmed</div>
              <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 42, fontWeight: 400, letterSpacing: '-.025em', lineHeight: 1.05, color: 'var(--rb-ink)' }}>You&apos;re in!</h1>
              <p style={{ fontSize: 15, color: 'var(--rb-ink-2)', marginTop: 14, lineHeight: 1.6, maxWidth: 320, margin: '14px auto 0' }}>
                You&apos;ve joined the rental. Your ledger is live — pay rent, submit move-in photos, and raise repairs from your dashboard.
              </p>
              <a href="/dashboard" style={{ display: 'inline-flex', marginTop: 28, padding: '13px 28px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
                Open my dashboard →
              </a>
              <p style={{ marginTop: 16, fontSize: 12, color: 'var(--rb-ink-3)', lineHeight: 1.5 }}>
                First thing: submit your move-in photos. They protect your deposit.
              </p>
            </div>
          </div>
        )}

        {/* ── Generic error with retry ── */}
        {state === 'error' && (
          <Terminal
            iconColor="rgba(239,68,68,.1)"
            iconPaths={WARN}
            title="Something went wrong"
            body="We couldn't load the invite. This is usually a network issue. Please check your connection and try again."
            cta={
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setState('loading'); if (token) loadRental(token) }}
                  style={{ padding: '10px 20px', borderRadius: 999, border: '1.5px solid var(--rb-border)', color: 'var(--rb-ink)', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: 'transparent', fontFamily: 'inherit' }}
                >
                  Try again
                </button>
                <BorderLink href="/dashboard" label="← Dashboard" />
              </div>
            }
          />
        )}
      </div>
    </div>
  )
}
