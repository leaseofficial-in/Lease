'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LogoMark } from './brand'
import { REGIONS, COUNTRY_PICKER_ORDER, type CountryCode } from '@/lib/i18n/regions'
import { setRegionCookie } from '@/lib/region'
import { useRegion } from '@/lib/hooks/useRegion'

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
        <Link href="/" className="nav-logo" aria-label="RentyBase home">
          <span className="nav-mark" aria-hidden="true"><LogoMark size={30} /></span>
          <span className="nav-word">Renty<span className="ochre">Base</span></span>
        </Link>
        <div className="nav-links">
          <Link href="/features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/for/landlords">Landlords</Link>
          <Link href="/for/tenants">Tenants</Link>
          <Link href="/rentals">Cities</Link>
          <Link href="/blog">Blog</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/signin" style={{ fontSize: 14, fontWeight: 500, color: 'var(--rb-ink-3)' }}>Sign in</Link>
          <Link className="btn btn-primary" href="/signup" style={{ padding: '8px 16px' }}>Start free</Link>
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
        <Link href="/features">Features</Link>
        <Link href="/for/landlords">For landlords</Link>
        <Link href="/for/tenants">For tenants</Link>
        <Link href="/rentals">Cities</Link>
        <Link href="/tools">Tools</Link>
        <Link href="/compare">Compare</Link>
        <Link href="/blog">Blog</Link>
        <Link href="/company">Company</Link>
        <Link href="/signin">Sign in</Link>
        <Link href="/signup">Start free →</Link>
      </div>
    </nav>
  )
}

function FooterRegionSelector() {
  // Read through the store hook: correct on first client render, no effect.
  const code = useRegion().countryCode

  return (
    <div style={{ marginTop: 18 }}>
      <label htmlFor="rb-footer-region" style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(246,244,238,.4)', marginBottom: 8 }}>
        Region
      </label>
      <select
        id="rb-footer-region"
        aria-label="Choose your region"
        value={code}
        onChange={(e) => {
          const v = e.target.value as CountryCode
          setRegionCookie(v)
          // Marketing pages are statically rendered per region; a reload is the
          // honest way to re-render them for the new one.
          window.location.reload()
        }}
        style={{
          background: 'rgba(246,244,238,.06)',
          color: 'var(--rb-canvas)',
          border: '1px solid rgba(246,244,238,.16)',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 13,
          fontFamily: 'inherit',
          cursor: 'pointer',
          maxWidth: 220,
        }}
      >
        {COUNTRY_PICKER_ORDER.map((c) => (
          <option key={c} value={c} style={{ color: '#0E1413' }}>
            {REGIONS[c].flag} {REGIONS[c].name} ({REGIONS[c].currency.code})
          </option>
        ))}
      </select>
    </div>
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
              The rental OS for landlords and tenants — free, worldwide.
            </p>
            <a
              href="mailto:hello@rentybase.com"
              style={{ fontSize: 13, color: 'rgba(246,244,238,.55)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span style={{ opacity: 0.6 }}>✉</span> hello@rentybase.com
            </a>
            <FooterRegionSelector />
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: '40px 56px', flexWrap: 'wrap', flex: 1 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(246,244,238,.4)', marginBottom: 14 }}>Product</div>
              {[['Features', '/features'], ['Pricing', '/pricing'], ['For landlords', '/for/landlords'], ['For tenants', '/for/tenants'], ['Tools', '/tools'], ['Compare', '/compare']].map(([l, h]) => (
                <div key={h} style={{ marginBottom: 10 }}>
                  <Link href={h} style={{ fontSize: 13, color: 'rgba(246,244,238,.65)', textDecoration: 'none' }}>{l}</Link>
                </div>
              ))}
            </div>
            <div>
              {/* Was three labels all pointing at /compare — no crawl or user value.
                  Now distinct destinations across the free-tools and guides cluster. */}
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(246,244,238,.4)', marginBottom: 14 }}>Free tools</div>
              {[
                ['Rent receipt generator', '/tools/hra-receipt-generator'],
                ['All free tools', '/tools'],
                ['vs NoBroker & spreadsheets', '/compare'],
              ].map(([l, h]) => (
                <div key={h} style={{ marginBottom: 10 }}>
                  <Link href={h} style={{ fontSize: 13, color: 'rgba(246,244,238,.65)', textDecoration: 'none' }}>{l}</Link>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(246,244,238,.4)', marginBottom: 14 }}>Resources</div>
              {[['Blog', '/blog'], ['Sign in', '/signin'], ['Start free', '/signup']].map(([l, h]) => (
                <div key={h} style={{ marginBottom: 10 }}>
                  <Link href={h} style={{ fontSize: 13, color: 'rgba(246,244,238,.65)', textDecoration: 'none' }}>{l}</Link>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(246,244,238,.4)', marginBottom: 14 }}>Company</div>
              {[['About', '/company'], ['Contact', '/contact'], ['Privacy', '/privacy'], ['Terms', '/terms']].map(([l, h]) => (
                <div key={h} style={{ marginBottom: 10 }}>
                  <Link href={h} style={{ fontSize: 13, color: 'rgba(246,244,238,.65)', textDecoration: 'none' }}>{l}</Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(246,244,238,.1)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'rgba(246,244,238,.35)' }}>© {new Date().getFullYear()} RentyBase · Worldwide</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link href="/privacy" style={{ fontSize: 12, color: 'rgba(246,244,238,.35)', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/terms" style={{ fontSize: 12, color: 'rgba(246,244,238,.35)', textDecoration: 'none' }}>Terms</Link>
            <span style={{ fontSize: 12, color: 'rgba(246,244,238,.35)' }}>Free · No credit card required</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
