'use client'

import { useState, useEffect } from 'react'
import { LogoMark } from './brand'

export function MarketingNav() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const nav = document.querySelector('.nav')
    const onS = () => nav?.classList.toggle('scrolled', window.scrollY > 4)
    onS()
    window.addEventListener('scroll', onS, { passive: true })
    return () => window.removeEventListener('scroll', onS)
  }, [])

  return (
    <nav className="nav">
      <div className="nav-inner">
        <a href="/" className="nav-logo" aria-label="RentyBase home">
          <span className="nav-mark" aria-hidden="true"><LogoMark size={30} /></span>
          <span className="nav-word">Renty<span className="ochre">Base</span></span>
        </a>
        <div className="nav-links">
          <a href="/features">Features</a>
          <a href="/for/landlords">Landlords</a>
          <a href="/for/tenants">Tenants</a>
          <a href="/compare">Compare</a>
          <a href="/blog">Blog</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/signin" style={{ fontSize: 14, fontWeight: 500, color: 'var(--rb-ink-3)' }}>Sign in</a>
          <a className="btn btn-primary" href="/signup" style={{ padding: '8px 16px' }}>Start free</a>
          <button
            className={'nav-hamburger' + (open ? ' open' : '')}
            aria-label="Menu"
            onClick={() => setOpen(o => !o)}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>
      <div className={'nav-drawer' + (open ? ' open' : '')} onClick={() => setOpen(false)}>
        <a href="/features">Features</a>
        <a href="/for/landlords">For landlords</a>
        <a href="/for/tenants">For tenants</a>
        <a href="/tools">Tools</a>
        <a href="/compare">Compare</a>
        <a href="/blog">Blog</a>
        <a href="/company">Company</a>
        <a href="/signin">Sign in</a>
        <a href="/signup">Start free →</a>
      </div>
    </nav>
  )
}

export function MarketingFooter() {
  return (
    <footer style={{ background: 'var(--rb-ink)', color: 'var(--rb-canvas)', padding: '56px 32px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '48px 64px', marginBottom: 48 }}>

          {/* Brand */}
          <div style={{ minWidth: 200 }}>
            <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 22, marginBottom: 10 }}>
              Renty<em style={{ fontStyle: 'italic', color: 'var(--rb-accent)' }}>Base</em>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(246,244,238,.5)', maxWidth: 220, lineHeight: 1.65, marginBottom: 16 }}>
              India&apos;s rental OS — free for landlords and tenants.
            </p>
            <a
              href="mailto:hello@rentybase.com"
              style={{ fontSize: 13, color: 'rgba(246,244,238,.55)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span style={{ opacity: 0.6 }}>✉</span> hello@rentybase.com
            </a>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: '40px 56px', flexWrap: 'wrap', flex: 1 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(246,244,238,.4)', marginBottom: 14 }}>Product</div>
              {[['Features', '/features'], ['For landlords', '/for/landlords'], ['For tenants', '/for/tenants'], ['Tools', '/tools'], ['Compare', '/compare']].map(([l, h]) => (
                <div key={h} style={{ marginBottom: 10 }}>
                  <a href={h} style={{ fontSize: 13, color: 'rgba(246,244,238,.65)', textDecoration: 'none' }}>{l}</a>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(246,244,238,.4)', marginBottom: 14 }}>Compare</div>
              {[['vs NoBroker', '/compare'], ['vs Manual tracking', '/compare'], ['All comparisons', '/compare']].map(([l, h]) => (
                <div key={l} style={{ marginBottom: 10 }}>
                  <a href={h} style={{ fontSize: 13, color: 'rgba(246,244,238,.65)', textDecoration: 'none' }}>{l}</a>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(246,244,238,.4)', marginBottom: 14 }}>Resources</div>
              {[['Blog', '/blog'], ['Sign in', '/signin'], ['Start free', '/signup']].map(([l, h]) => (
                <div key={h} style={{ marginBottom: 10 }}>
                  <a href={h} style={{ fontSize: 13, color: 'rgba(246,244,238,.65)', textDecoration: 'none' }}>{l}</a>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(246,244,238,.4)', marginBottom: 14 }}>Company</div>
              {[['About', '/company'], ['Contact', '/contact'], ['Privacy', '/privacy'], ['Terms', '/terms']].map(([l, h]) => (
                <div key={h} style={{ marginBottom: 10 }}>
                  <a href={h} style={{ fontSize: 13, color: 'rgba(246,244,238,.65)', textDecoration: 'none' }}>{l}</a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(246,244,238,.1)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'rgba(246,244,238,.35)' }}>© {new Date().getFullYear()} RentyBase · Built for India</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <a href="/privacy" style={{ fontSize: 12, color: 'rgba(246,244,238,.35)', textDecoration: 'none' }}>Privacy</a>
            <a href="/terms" style={{ fontSize: 12, color: 'rgba(246,244,238,.35)', textDecoration: 'none' }}>Terms</a>
            <span style={{ fontSize: 12, color: 'rgba(246,244,238,.35)' }}>Free · No credit card required</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
