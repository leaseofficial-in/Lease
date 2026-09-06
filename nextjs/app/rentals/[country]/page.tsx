import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MarketingNav, MarketingFooter } from '@/components/marketing-shell'
import {
  FAQStructuredData,
  BreadcrumbStructuredData,
  SoftwareAppStructuredData,
} from '@/components/structured-data'
import { getRegion } from '@/lib/i18n/regions'
import { formatCurrencyLocale } from '@/lib/i18n/formatters'
import { getSeoCountry, getAllCountryParams } from '@/data/locations'

const BASE = 'https://rentybase.com'

// Pre-build every country page at deploy time; 404 anything not in the dataset.
export const dynamicParams = false

export function generateStaticParams() {
  return getAllCountryParams()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>
}): Promise<Metadata> {
  const { country } = await params
  const c = getSeoCountry(country)
  if (!c) return {}
  const url = `${BASE}/rentals/${c.slug}`
  return {
    title: `Free Rental Management for ${c.name} Landlords`,
    description: c.valueProp,
    keywords: c.metaKeywords,
    alternates: { canonical: url },
    openGraph: {
      title: `Free Rental Management for ${c.name} Landlords | RentyBase`,
      description: c.valueProp,
      url,
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: `RentyBase — ${c.name}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Free Rental Management for ${c.name} Landlords | RentyBase`,
      description: c.valueProp,
    },
  }
}

export default async function CountryRentalsPage({
  params,
}: {
  params: Promise<{ country: string }>
}) {
  const { country } = await params
  const c = getSeoCountry(country)
  if (!c) notFound()

  const region = getRegion(c.code)
  const fmt = (n: number) => formatCurrencyLocale(n, region.currency, region.locale)
  const avgRent = Math.round(
    c.cities.reduce((sum, ci) => sum + ci.avgRent, 0) / c.cities.length,
  )
  const url = `${BASE}/rentals/${c.slug}`

  const stats: [string, string][] = [
    ['Cities covered', String(c.cities.length)],
    ['Avg. monthly rent', fmt(avgRent)],
    ['Agreement', c.agreementType],
    ['Price', 'Free'],
  ]

  return (
    <div className="lp-page">
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: BASE },
          { name: 'Worldwide', url: `${BASE}/rentals` },
          { name: c.name, url },
        ]}
      />
      <FAQStructuredData faqs={c.faqs} />
      <SoftwareAppStructuredData
        url={url}
        areaServed={c.name}
        description={c.valueProp}
        priceCurrency={region.currency.code}
      />
      <MarketingNav />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 72, background: 'var(--rb-canvas-2)', borderBottom: '1px solid var(--rb-border)' }}>
        <div className="container" style={{ maxWidth: 820, textAlign: 'center' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 18, marginRight: 8 }}>{region.flag}</span>{c.name.toUpperCase()}
          </div>
          <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(34px,6vw,56px)', fontWeight: 400, lineHeight: 1.05, letterSpacing: '-.03em', marginBottom: 20 }}>
            Free rental management for<br /><em style={{ fontStyle: 'italic', color: 'var(--rb-action)' }}>{c.name} landlords &amp; tenants.</em>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.65, color: 'var(--rb-ink-2)', maxWidth: 600, margin: '0 auto 32px' }}>
            {c.valueProp}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/signup" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15 }}>Start free — no card needed</a>
            <a href="#cities" className="btn btn-ghost" style={{ padding: '12px 24px', fontSize: 15 }}>Browse {c.name} cities</a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '40px 0', background: 'var(--rb-canvas)', borderBottom: '1px solid var(--rb-border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 24 }}>
            {stats.map(([l, v]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(22px,3vw,30px)', color: 'var(--rb-ink)', letterSpacing: '-.02em' }}>{v}</div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--rb-ink-3)', marginTop: 6 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features (country-filtered) */}
      <section style={{ padding: '80px 0', background: 'var(--rb-canvas)' }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>BUILT FOR {c.name.toUpperCase()}</div>
            <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(26px,4vw,38px)', fontWeight: 400, letterSpacing: '-.025em' }}>
              Everything a {c.name} rental needs.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            {c.features.map(f => (
              <div key={f} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--rb-surface)', border: '1px solid var(--rb-border)', borderRadius: 14, padding: '18px 20px' }}>
                <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--rb-action-soft, rgba(26,86,255,.08))', display: 'grid', placeItems: 'center', marginTop: 1 }}>
                  <svg viewBox="0 0 12 10" width="11" height="9" fill="none"><path d="M1 5l3 3 7-7" stroke="var(--rb-action)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <span style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--rb-ink)', fontWeight: 500 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance / legal note */}
      <section style={{ padding: '72px 0', background: 'linear-gradient(160deg,#0F4C5C 0%,#0E1413 100%)', color: '#F6F4EE' }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(201,122,58,.9)', marginBottom: 16 }}>
            {c.name} rental rules
          </div>
          <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(24px,4vw,36px)', fontWeight: 400, lineHeight: 1.1, letterSpacing: '-.025em', marginBottom: 28 }}>
            Local by design, not an afterthought.
          </h2>
          <div style={{ display: 'grid', gap: 20 }}>
            {([
              ['Tenancy law', c.legalNote],
              ['Tax & receipts', c.taxNote],
              ['Deposits', c.depositNote],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} style={{ borderTop: '1px solid rgba(246,244,238,.15)', paddingTop: 18 }}>
                <div style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: 'rgba(201,122,58,.85)', textTransform: 'uppercase', marginBottom: 8 }}>{k}</div>
                <p style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(246,244,238,.8)' }}>{v}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(246,244,238,.45)', marginTop: 28, lineHeight: 1.6 }}>
            General information only, not legal or tax advice. Rules vary by region and change over time — confirm with the relevant authority.
          </p>
        </div>
      </section>

      {/* City grid */}
      <section id="cities" style={{ padding: '80px 0', background: 'var(--rb-canvas)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>{c.cities.length} CITIES</div>
            <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(26px,4vw,38px)', fontWeight: 400, letterSpacing: '-.025em' }}>
              RentyBase in {c.name}, city by city.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
            {c.cities.map(ci => (
              <a
                key={ci.slug}
                href={`/rentals/${c.slug}/${ci.slug}`}
                style={{ textDecoration: 'none', background: 'var(--rb-surface)', border: '1px solid var(--rb-border)', borderRadius: 16, padding: '22px 24px', display: 'block' }}
              >
                <div style={{ fontFamily: 'var(--rb-font-sans)', fontSize: 18, fontWeight: 600, color: 'var(--rb-ink)' }}>{ci.name}</div>
                <div style={{ fontSize: 12, color: 'var(--rb-ink-3)', marginTop: 2 }}>{ci.region}</div>
                <div style={{ fontSize: 13, color: 'var(--rb-ink-2)', marginTop: 14 }}>
                  Avg rent <span style={{ fontWeight: 600, color: 'var(--rb-action)' }}>{fmt(ci.avgRent)}</span>/mo
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '80px 0', background: 'var(--rb-canvas-2)', borderTop: '1px solid var(--rb-border)' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>FAQ</div>
            <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(26px,4vw,36px)', fontWeight: 400, letterSpacing: '-.025em' }}>
              {c.name} rental questions
            </h2>
          </div>
          {c.faqs.map((f, i) => (
            <div key={f.question} style={{ padding: '26px 0', borderTop: i === 0 ? 'none' : '1px solid var(--rb-border)' }}>
              <h3 style={{ fontFamily: 'var(--rb-font-sans)', fontSize: 16, fontWeight: 600, marginBottom: 10, color: 'var(--rb-ink)' }}>{f.question}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--rb-ink-2)' }}>{f.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 32px', textAlign: 'center', background: 'var(--rb-canvas)' }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>FREE · NO CARD NEEDED</div>
        <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, letterSpacing: '-.025em', marginBottom: 16 }}>
          Start managing your {c.name} rental today.
        </h2>
        <p style={{ fontSize: 16, color: 'var(--rb-ink-2)', marginBottom: 32, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          Free for both landlords and tenants. One shared ledger, receipts included, move-in proof sealed.
        </p>
        <a href="/signup" className="btn btn-primary" style={{ padding: '13px 28px', fontSize: 16 }}>Start free</a>
        <div style={{ marginTop: 28 }}>
          <Link href="/rentals" style={{ fontSize: 13, color: 'var(--rb-ink-3)', textDecoration: 'none' }}>← All countries &amp; cities</Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
