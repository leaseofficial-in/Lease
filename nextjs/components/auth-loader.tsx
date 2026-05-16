'use client'

import { useState, useEffect } from 'react'
import { LogoMark } from './brand'

export function AuthLoader() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (href === '/signin' || href === '/signup') {
        setVisible(true)
      }
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0E1413',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 20,
      animation: 'rb-auth-in 0.18s ease both',
    }}>
      <div style={{ animation: 'rb-auth-pulse 1.6s ease-in-out infinite' }}>
        <LogoMark size={64} />
      </div>
      <div style={{
        fontFamily: 'var(--font-instrument-serif), Georgia, serif',
        fontSize: 22,
        fontWeight: 400,
        letterSpacing: '-.02em',
        color: '#F6F4EE',
      }}>
        Renty<em style={{ fontStyle: 'italic', color: '#C97A3A' }}>Base</em>
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 4 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'rgba(201,122,58,0.7)',
            animation: `rb-auth-dot 1.1s ease ${i * 0.18}s infinite`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes rb-auth-in {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        @keyframes rb-auth-pulse {
          0%, 100% { transform: scale(1);   opacity: 0.9 }
          50%       { transform: scale(1.04); opacity: 1   }
        }
        @keyframes rb-auth-dot {
          0%, 100% { opacity: 0.25; transform: translateY(0) }
          50%       { opacity: 1;   transform: translateY(-3px) }
        }
      `}</style>
    </div>
  )
}
