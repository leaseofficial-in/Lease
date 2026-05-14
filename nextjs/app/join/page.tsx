'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'

const M2Mark = ({ size = 26 }: { size?: number }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
    <rect width="40" height="40" rx="9" fill="#0E1413"/>
    <path d="M20 7 L34 19 V31 a3 3 0 0 1 -3 3 H9 a3 3 0 0 1 -3 -3 V19 Z" fill="#F6F4EE"/>
    <path d="M13 34 V25 a7 7 0 0 1 14 0 V34 Z" fill="#0E1413"/>
    <rect x="13" y="33" width="14" height="1.4" fill="#C97A3A"/>
    <circle cx="20" cy="11" r="0.9" fill="#C97A3A"/>
  </svg>
)

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <M2Mark size={24} />
          <span style={{ fontFamily: 'var(--rb-font-display)', fontSize: 18, letterSpacing: '-.01em' }}>
            Renty<em style={{ fontStyle: 'italic', color: 'var(--rb-accent)' }}>Base</em>
          </span>
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
            <b>Got a link instead?</b> Tap the link in your SMS or WhatsApp directly — it will open this app automatically.
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
