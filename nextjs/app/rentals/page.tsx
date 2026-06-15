import type { Metadata } from 'next'
import { MarketingNav, MarketingFooter } from '@/components/marketing-shell'
import { BreadcrumbStructuredData } from '@/components/structured-data'
import { getRegion } from '@/lib/i18n/regions'
import { formatCurrencyLocale } from '@/lib/i18n/formatters'
import { SEO_COUNTRIES, FEATURED_CITIES, getSeoCity, TOTAL_CITIES, TOTAL_COUNTRIES } from '@/data/locations'

const BASE = 'https://rentybase.com'

export const metadata: Metadata = {
  title: 'Rental Management Worldwide — Free for Landlords & Tenants',
  description: `Free rental management in ${TOTAL_CITIES}+ cities across ${TOTAL_COUNTRIES} countries. Track rent, generate receipts, and seal move-in proof — wherever your property is.`,
  alternates: { canonical: `${BASE}/rentals` },
  openGraph: {
    title: 'Rental Management Worldwide | RentyBase',
    description: `Free for landlords and tenants in ${TOTAL_CITIES}+ cities across ${TOTAL_COUNTRIES} countries.`,
    url: `${BASE}/rentals`,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'RentyBase — Worldwide' }],
  },
}

export default function RentalsIndexPage() {
  const featured = FEATURED_CITIES
    .map(f => getSeoCity(f.country, f.city))
    .filter((x): x is NonNullable<typeof x> => Boolean(x))

  return (
    <div className="lp-page">
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: BASE },
          { name: 'Worldwide', url: `${BASE}/rentals` },
        ]}
      />
      <MarketingNav />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 64, background: 'var(--rb-canvas-2)', borderBottom: '1px solid var(--rb-border)' }}>
        <div className="container" style={{ maxWidth: 820, textAlign: 'center' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>🌍 WORLDWIDE</div>
          <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(34px,6vw,56px)', fontWeight: 400, lineHeight: 1.05, letterSpacing: '-.03em', marginBottom: 20 }}>
            Rental management,<br /><em style={{ fontStyle: 'italic', color: 'var(--rb-action)' }}>wherever you rent.</em>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.65, color: 'var(--rb-ink-2)', maxWidth: 580, margin: '0 auto 32px' }}>
            Free for landlords and tenants in {TOTAL_CITIES}+ cities across {TOTAL_COUNTRIES} countries. Track rent, generate local rent receipts, and seal move-in proof — in your currency, with your local rules.
          </p>
          <a href="/signup" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15 }}>Start free — no card needed</a>
        </div>
      </section>

      {/* Featured cities */}
      <section style={{ padding: '64px 0', background: 'var(--rb-canvas)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>POPULAR CITIES</div>
            <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(24px,4vw,34px)', fontWeight: 400, letterSpacing: '-.025em' }}>
              Trusted from Mumbai to New York.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
            {featured.map(({ country, city }) => {
              const region = getRegion(country.code)
              return (
                <a
                  key={`${country.slug}-${city.slug}`}
                  href={`/rentals/${country.slug}/${city.slug}`}
                  style={{ textDecoration: 'none', background: 'var(--rb-surface)', border: '1px solid var(--rb-border)', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <span style={{ fontSize: 22 }}>{region.flag}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--rb-ink)' }}>{city.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--rb-ink-3)' }}>{formatCurrencyLocale(city.avgRent, region.currency, region.locale)}/mo</div>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      </section>

      {/* All countries */}
      <section style={{ padding: '40px 0 88px', background: 'var(--rb-canvas)' }}>
        <div className="container" style={{ maxWidth: 980 }}>
          {SEO_COUNTRIES.map(c => {
            const region = getRegion(c.code)
            return (
              <div key={c.slug} style={{ padding: '28px 0', borderTop: '1px solid var(--rb-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <a href={`/rentals/${c.slug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 26 }}>{region.flag}</span>
                    <span style={{ fontFamily: 'var(--rb-font-display)', fontSize: 22, color: 'var(--rb-ink)', letterSpacing: '-.01em' }}>{c.name}</span>
                  </a>
                  <a href={`/rentals/${c.slug}`} style={{ fontSize: 13, color: 'var(--rb-action)', fontWeight: 600, textDecoration: 'none' }}>
                    {c.cities.length} cities →
                  </a>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {c.cities.map(ci => (
                    <a
                      key={ci.slug}
                      href={`/rentals/${c.slug}/${ci.slug}`}
                      style={{ textDecoration: 'none', padding: '7px 14px', borderRadius: 999, border: '1px solid var(--rb-border)', background: 'var(--rb-surface)', fontSize: 13, color: 'var(--rb-ink-2)' }}
                    >
                      {ci.name}
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
