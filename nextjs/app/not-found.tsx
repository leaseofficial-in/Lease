import type { Metadata } from 'next'
import { MarketingNav, MarketingFooter } from '@/components/marketing-shell'

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'That page does not exist. Find rental guides, city pages, and the free RentyBase app instead.',
  // A soft-404 that gets indexed dilutes the site. Keep every 404 out of the index.
  robots: { index: false, follow: true },
}

/** Routes worth offering instead of a dead end — these are the site's real entry points. */
const SUGGESTIONS = [
  { href: '/', label: 'Home', desc: 'What RentyBase does, and who it is for.' },
  { href: '/blog', label: 'Rental guides', desc: 'HRA, deposits, receipts, and rental law.' },
  { href: '/rentals', label: 'Rentals by city', desc: 'Landlord and tenant guidance for your city.' },
  { href: '/tools', label: 'Free tools', desc: 'Rent receipts and calculators, no signup.' },
  { href: '/for/landlords', label: 'For landlords', desc: 'Collect rent, issue receipts, track deposits.' },
  { href: '/for/tenants', label: 'For tenants', desc: 'Proof of payment and deposit protection.' },
]

export default function NotFound() {
  return (
    <div className="lp-page">
      <MarketingNav />

      <section
        style={{
          paddingTop: 140,
          paddingBottom: 72,
          background: 'var(--rb-canvas-2)',
          borderBottom: '1px solid var(--rb-border)',
        }}
      >
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>ERROR 404</div>
          <h1
            style={{
              fontFamily: 'var(--rb-font-display)',
              fontSize: 'clamp(34px,5.5vw,52px)',
              fontWeight: 400,
              lineHeight: 1.06,
              letterSpacing: '-.03em',
              marginBottom: 18,
            }}
          >
            That page has<br />
            <em style={{ fontStyle: 'italic', color: 'var(--rb-action)' }}>moved out.</em>
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--rb-ink-2)', maxWidth: 520 }}>
            The link may be old, or the page may have been renamed. Here is where most people are headed.
          </p>
        </div>
      </section>

      <section style={{ padding: '64px 0 80px', background: 'var(--rb-canvas)' }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <nav aria-label="Suggested pages">
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
                gap: 16,
              }}
            >
              {SUGGESTIONS.map(s => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    style={{
                      display: 'block',
                      background: 'var(--rb-surface)',
                      border: '1px solid var(--rb-border)',
                      borderRadius: 14,
                      padding: '20px 22px',
                      textDecoration: 'none',
                      height: '100%',
                    }}
                  >
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--rb-ink)', marginBottom: 6 }}>
                      {s.label} →
                    </span>
                    <span style={{ display: 'block', fontSize: 13, lineHeight: 1.6, color: 'var(--rb-ink-3)' }}>
                      {s.desc}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
