'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { LogoLockup } from '@/components/brand'

export default function JoinPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length < 4) {
      setError('Please enter your invite code.')
      return
    }
    window.location.href = `/join/${trimmed}`
  }

  return (
    <div className="m-screen">
      <div className="a2-top">
        <button className="back" type="button" onClick={() => window.history.back()}>←</button>
        <div className="crumbs"><span className="on">INVITE</span></div>
        <div style={{ width: 36 }} />
      </div>

      <div className="a2-body">
        <div style={{ marginBottom: 4 }}>
          <LogoLockup size={24} fontSize={18} gap={10} />
        </div>

        <div className="a2-h-block">
          <div className="a2-eyebrow">JOIN A LEDGER</div>
          <h2 className="a2-h">
            Enter the<br />
            <em>invite code.</em>
          </h2>
          <p className="a2-sub">
            The code your landlord shared with you. It looks like <strong>RB7XYZ</strong> or a longer link.
          </p>
        </div>

        <div className="a2-field">
          <span className="lbl">INVITE CODE</span>
          <div className="ctrl">
            <input
              type="text"
              value={code}
              onChange={e => { setCode(e.target.value); setError('') }}
              placeholder="e.g. RB7XYZ"
              style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 20, letterSpacing: '.08em', textTransform: 'uppercase' }}
              autoFocus
              autoComplete="off"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          {error && (
            <span style={{ fontFamily: 'var(--rb-font-sans)', fontSize: 12, color: 'var(--rb-danger)', marginTop: 4 }}>{error}</span>
          )}
        </div>

        <div className="a2-note">
          <div className="ic">⌁</div>
          <div>
            <b>Got a link instead?</b> Tap the link in your SMS or WhatsApp directly. It will open this app automatically.
          </div>
        </div>

        <div className="a2-foot">
          <button className="a2-cta" type="button" onClick={handleSubmit} disabled={code.trim().length < 4}>
            Join ledger <span className="arr">→</span>
          </button>
          <div className="row" style={{ justifyContent: 'center' }}>
            <a href="/signup" style={{ color: 'var(--rb-ink-3)' }}>
              Don&apos;t have an invite? <strong style={{ color: 'var(--rb-action)' }}>Create account instead</strong>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
