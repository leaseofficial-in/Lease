'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoLockup } from '@/components/brand'

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState('')
  const [state, setState] = useState<'loading' | 'found' | 'notfound' | 'joined' | 'error'>('loading')
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
    try {
      const { data: { session } } = await sb.auth.getSession()
      if (!session) {
        sessionStorage.setItem('rb-invite-token', tok)
        window.location.href = `/signin?next=/join/${tok}`
        return
      }
      const { data } = await sb.from('rentals')
        .select('*, property:properties(*), landlord:profiles!rentals_landlord_id_fkey(full_name)')
        .eq('invite_token', tok)
        .gt('invite_expires_at', new Date().toISOString())
        .maybeSingle()
      if (data) { setRental(data); setState('found') } else { setState('notfound') }
    } catch { setState('error') }
  }

  async function handleJoin() {
    setJoining(true)
    try {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { window.location.href = '/signin'; return }
      await sb.from('rentals').update({ tenant_id: user.id, status: 'active' }).eq('id', rental.id)
      setState('joined')
    } catch { setState('error'); setJoining(false) }
  }

  const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN')

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--rb-canvas)', padding: 24 }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', marginBottom: 40 }}>
          <LogoLockup size={28} fontSize={20} gap={10} />
        </a>

        {state === 'loading' && (
          <div style={{ textAlign: 'center', color: 'var(--rb-ink-3)' }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(15,76,92,.12)', borderTopColor: 'var(--rb-action)', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 16px' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ fontSize: 14 }}>Checking invite link…</p>
          </div>
        )}

        {state === 'found' && rental && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--rb-accent)', marginBottom: 14 }}>You're invited</div>
            <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 40, fontWeight: 400, letterSpacing: '-.025em', lineHeight: 1.05, color: 'var(--rb-ink)' }}>Join this rental.</h1>
            <p style={{ color: 'var(--rb-ink-2)', fontSize: 15, lineHeight: 1.55, marginTop: 14 }}>{rental.landlord?.full_name || 'Your landlord'} has invited you to join their property on RentyBase.</p>

            <div style={{ marginTop: 28, background: 'var(--rb-surface)', border: '1px solid var(--rb-border)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--rb-ink-3)', marginBottom: 14 }}>Property details</div>
              {[
                { l: 'Property', v: rental.property?.name || rental.property?.address_line1 || 'Property' },
                { l: 'City', v: rental.property?.city || '—' },
                { l: 'Monthly rent', v: inr(rental.monthly_rent) },
                { l: 'Security deposit', v: inr(rental.security_deposit) },
                { l: 'Rent due', v: `${rental.rent_due_day}th of every month` },
                { l: 'Landlord', v: rental.landlord?.full_name || '—' },
              ].map(f => (
                <div key={f.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--rb-border-soft)' }}>
                  <span style={{ fontSize: 13, color: 'var(--rb-ink-3)' }}>{f.l}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{f.v}</span>
                </div>
              ))}
            </div>

            <button onClick={handleJoin} disabled={joining} style={{ marginTop: 20, width: '100%', padding: 14, borderRadius: 12, background: 'var(--rb-action)', color: '#fff', border: 0, fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              {joining ? 'Joining…' : 'Accept & join rental →'}
            </button>
            <p style={{ marginTop: 14, fontSize: 12, color: 'var(--rb-ink-3)', lineHeight: 1.55, textAlign: 'center' }}>By joining, you agree to the rental terms above. This link expires after 72 hours.</p>
          </div>
        )}

        {state === 'joined' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 36, fontWeight: 400, letterSpacing: '-.02em' }}>You're in!</h1>
            <p style={{ fontSize: 15, color: 'var(--rb-ink-2)', marginTop: 12, lineHeight: 1.55 }}>You've joined the rental. Your dashboard is ready.</p>
            <a href="/dashboard" style={{ display: 'inline-flex', marginTop: 24, padding: '12px 24px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Go to dashboard →</a>
          </div>
        )}

        {state === 'notfound' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
            <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 32, fontWeight: 400 }}>Link expired</h1>
            <p style={{ fontSize: 14, color: 'var(--rb-ink-3)', marginTop: 8, lineHeight: 1.6 }}>This invite link is invalid or has expired. Ask your landlord to regenerate it.</p>
            <a href="/dashboard" style={{ display: 'inline-flex', marginTop: 20, padding: '9px 18px', borderRadius: 999, border: '1px solid var(--rb-border)', color: 'var(--rb-ink)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>← Go to dashboard</a>
          </div>
        )}

        {state === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠</div>
            <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 32, fontWeight: 400 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: 'var(--rb-ink-3)', marginTop: 8 }}>Please try again or contact support.</p>
          </div>
        )}
      </div>
    </div>
  )
}
