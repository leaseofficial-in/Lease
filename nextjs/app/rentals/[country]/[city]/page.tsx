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
import { getSeoCity, getNearbyCities, getAllCityParams, type SeoCountry, type SeoCity } from '@/data/locations'

const BASE = 'https://rentybase.com'

export const dynamicParams = false

// Generate every country/city combination from the leaf segment (bottom-up).
export function generateStaticParams() {
  return getAllCityParams()
}

/** Five unique, city-specific FAQs assembled from the dataset. */
function cityFaqs(country: SeoCountry, city: SeoCity, rent: string) {
  return [
    {
      question: `What is the average rent in ${city.name}?`,
      answer: `The typical monthly rent in ${city.name}, ${city.region} is around ${rent}. RentyBase lets ${city.name} landlords and tenants log every rent payment, generate a receipt, and share one ledger — free.`,
    },
    {
      question: `Which areas of ${city.name} does RentyBase work in?`,
      answer: `RentyBase works for any rental in ${city.name}, including popular areas like ${city.neighborhoods.join(', ')}. Add your property, invite your tenant, and start tracking rent in minutes.`,
    },
    {
      question: `How are security deposits handled for ${city.name} rentals?`,
      answer: `${country.depositNote} RentyBase records the deposit, every deduction with a reason and photo, and the final refund so both sides have one clear record.`,
    },
    {
      question: `Do I need a ${country.agreementType} to rent in ${city.region}?`,
      answer: `${country.legalNote} RentyBase keeps your agreement, rent ledger, and move-in proof together for the whole tenancy.`,
    },
    {
      question: `Is RentyBase free for ${city.name} landlords and tenants?`,
      answer: `Yes. Rent tracking, receipts, deposit records, move-in photos, and repair requests are all free for both landlords and tenants in ${city.name} — no subscription, no card.`,
    },
  ]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string; city: string }>
}): Promise<Metadata> {
  const { country, city } = await params
  const found = getSeoCity(country, city)
  if (!found) return {}
  const region = getRegion(found.country.code)
  const rent = formatCurrencyLocale(found.city.avgRent, region.currency, region.locale)
  const url = `${BASE}/rentals/${found.country.slug}/${found.city.slug}`
  const description = `Free rental management for ${found.city.name} landlords & tenants. Average rent ${rent}/mo. Track rent, generate receipts, and seal move-in proof — no card needed.`
  return {
    title: `Free Rental Management for ${found.city.name} Landlords`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `Free Rental Management for ${found.city.name} Landlords | RentyBase`,
      description,
      url,
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: `RentyBase — ${found.city.name}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Rental Management for ${found.city.name} Landlords | RentyBase`,
      description,
    },
  }
}

export default async function CityRentalsPage({
  params,
}: {
  params: Promise<{ country: string; city: string }>
}) {
  const { country, city } = await params
  const found = getSeoCity(country, city)
  if (!found) notFound()

  const { country: c, city: ci } = found
  const region = getRegion(c.code)
  const fmt = (n: number) => formatCurrencyLocale(n, region.currency, region.locale)
  const rent = fmt(ci.avgRent)
  const url = `${BASE}/rentals/${c.slug}/${ci.slug}`
  const nearby = getNearbyCities(c.slug, ci.slug, 5)
  const faqs = cityFaqs(c, ci, rent)

  return (
    <div className="lp-page">
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: BASE },
          { name: 'Worldwide', url: `${BASE}/rentals` },
          { name: c.name, url: `${BASE}/rentals/${c.slug}` },
          { name: ci.name, url },
        ]}
      />
      <FAQStructuredData faqs={faqs} />
      <SoftwareAppStructuredData
        url={url}
        areaServed={`${ci.name}, ${c.name}`}
        description={`Free rental management for landlords and tenants in ${ci.name}, ${c.name}.`}
        priceCurrency={region.currency.code}
      />
      <MarketingNav />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 64, background: 'var(--rb-canvas-2)', borderBottom: '1px solid var(--rb-border)' }}>
        <div className="container" style={{ maxWidth: 820, textAlign: 'center' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 16, marginRight: 8 }}>{region.flag}</span>{ci.region.toUpperCase()} · {c.name.toUpperCase()}
          </div>
          <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(32px,6vw,54px)', fontWeight: 400, lineHeight: 1.05, letterSpacing: '-.03em', marginBottom: 18 }}>
            Rental management for<br /><em style={{ fontStyle: 'italic', color: 'var(--rb-action)' }}>{ci.name} landlords.</em>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.65, color: 'var(--rb-ink-2)', maxWidth: 580, margin: '0 auto 22px' }}>
            Track rent, generate receipts, and seal move-in proof. Free for {ci.name} landlords and tenants.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999, background: 'var(--rb-surface)', border: '1px solid var(--rb-border)', marginBottom: 30 }}>
            <span style={{ fontSize: 13, color: 'var(--rb-ink-3)' }}>Average {ci.name} rent</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--rb-action)' }}>{rent}/month</span>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/signup" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15 }}>Start free — no card needed</a>
            <a href={`/rentals/${c.slug}`} className="btn btn-ghost" style={{ padding: '12px 24px', fontSize: 15 }}>All {c.name} cities</a>
          </div>
        </div>
      </section>

      {/* Local flavor */}
      <section style={{ padding: '72px 0', background: 'var(--rb-canvas)' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>RENTING IN {ci.name.toUpperCase()}</div>
          <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(24px,4vw,34px)', fontWeight: 400, letterSpacing: '-.025em', marginBottom: 18, lineHeight: 1.1 }}>
            Built for {ci.name}, from {ci.neighborhoods[0]} to {ci.neighborhoods[ci.neighborhoods.length - 1]}.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--rb-ink-2)', marginBottom: 16 }}>
            Whether your property is in {ci.neighborhoods.slice(0, 3).join(', ')} or anywhere else across {ci.name}, RentyBase keeps one shared rent record between landlord and tenant. Average rent in {ci.name} runs around {rent} a month.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--rb-ink-3)' }}>
            {c.taxNote}
          </p>
        </div>
      </section>

      {/* Feature highlights (country-filtered) */}
      <section style={{ padding: '64px 0', background: 'var(--rb-canvas-2)', borderTop: '1px solid var(--rb-border)', borderBottom: '1px solid var(--rb-border)' }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(22px,3.5vw,32px)', fontWeight: 400, letterSpacing: '-.025em', marginBottom: 32, textAlign: 'center' }}>
            What {ci.name} landlords &amp; tenants get.
          </h2>
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

      {/* FAQ */}
      <section style={{ padding: '80px 0', background: 'var(--rb-canvas)' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>FAQ</div>
            <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(26px,4vw,36px)', fontWeight: 400, letterSpacing: '-.025em' }}>
              {ci.name} rental questions
            </h2>
          </div>
          {faqs.map((f, i) => (
            <div key={f.question} style={{ padding: '26px 0', borderTop: i === 0 ? 'none' : '1px solid var(--rb-border)' }}>
              <h3 style={{ fontFamily: 'var(--rb-font-sans)', fontSize: 16, fontWeight: 600, marginBottom: 10, color: 'var(--rb-ink)' }}>{f.question}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--rb-ink-2)' }}>{f.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Nearby cities */}
      {nearby.length > 0 && (
        <section style={{ padding: '64px 0', background: 'var(--rb-canvas-2)', borderTop: '1px solid var(--rb-border)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>MORE IN {c.name.toUpperCase()}</div>
              <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(22px,3.5vw,30px)', fontWeight: 400, letterSpacing: '-.025em' }}>
                Other {c.name} cities
              </h2>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              {nearby.map(n => (
                <a
                  key={n.slug}
                  href={`/rentals/${c.slug}/${n.slug}`}
                  style={{ textDecoration: 'none', padding: '10px 18px', borderRadius: 999, border: '1.5px solid var(--rb-border)', background: 'var(--rb-surface)', fontSize: 14, fontWeight: 600, color: 'var(--rb-ink)' }}
                >
                  {n.name} <span style={{ color: 'var(--rb-ink-3)', fontWeight: 400 }}>· {fmt(n.avgRent)}/mo</span>
                </a>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 28 }}>
              <a href={`/rentals/${c.slug}`} style={{ fontSize: 13, color: 'var(--rb-action)', fontWeight: 600, textDecoration: 'none' }}>
                See all {c.cities.length} {c.name} cities →
              </a>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section style={{ padding: '80px 32px', textAlign: 'center', background: 'var(--rb-canvas)' }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>FREE · NO CARD NEEDED</div>
        <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 400, letterSpacing: '-.025em', marginBottom: 16 }}>
          Manage your {ci.name} rental, free.
        </h2>
        <p style={{ fontSize: 16, color: 'var(--rb-ink-2)', marginBottom: 32, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          One shared ledger for landlord and tenant. Receipts included, move-in proof sealed.
        </p>
        <a href="/signup" className="btn btn-primary" style={{ padding: '13px 28px', fontSize: 16 }}>Start free</a>
      </section>

      <MarketingFooter />
    </div>
  )
}
