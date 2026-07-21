import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingNav, MarketingFooter } from '@/components/marketing-shell'
import { FAQStructuredData, BreadcrumbStructuredData } from '@/components/structured-data'

const BASE = 'https://rentybase.com'
const URL = `${BASE}/pricing`

export const metadata: Metadata = {
  title: 'Pricing — Free for Landlords and Tenants',
  description:
    'RentyBase is free for both landlords and tenants. Rent ledger, HRA rent receipts, deposit tracking, move-in photo proof, and repair requests — every feature, no subscription and no credit card.',
  keywords: [
    'rentybase pricing',
    'free rental management app',
    'free property management software india',
    'free rent tracking app',
    'landlord app free',
  ],
  alternates: { canonical: URL },
  openGraph: {
    type: 'website',
    title: 'Pricing — Free for Landlords and Tenants | RentyBase',
    description:
      'Every feature is free for both sides of the tenancy. No subscription, no credit card, no per-feature paywall.',
    url: URL,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'RentyBase pricing — free' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RentyBase Pricing — Free for Landlords and Tenants',
    description: 'Every feature, both sides of the tenancy, no subscription.',
  },
}

/** Mirrors what the product pages already describe — kept in sync with /features and /compare. */
const INCLUDED = [
  { title: 'Shared rent ledger', desc: 'Landlord and tenant see the same payment record in real time, with UTR references on every entry.' },
  { title: 'HRA rent receipts', desc: 'Section 10(13A) receipts generated automatically when rent is marked paid, with landlord PAN included.' },
  { title: 'Security deposit ledger', desc: 'Deposit received, every deduction with a written reason, and the final refund — visible to both sides.' },
  { title: 'Move-in photo proof', desc: 'Timestamped, geotagged, tamper-proof room photos that neither party can alter after upload.' },
  { title: 'Repair requests', desc: 'Raise, track, and close maintenance issues with a full status history attached to the rental.' },
  { title: 'Tenant access', desc: 'Tenants get their own account and can download any month of receipts without asking the landlord.' },
]

const faqs = [
  {
    question: 'Is RentyBase really free?',
    answer:
      'Yes. Every feature — the rent ledger, HRA receipt generation, deposit tracking, move-in photo proof, and repair requests — is free for both landlords and tenants. There is no subscription and no credit card required to sign up.',
  },
  {
    question: 'Is there a paid or premium tier?',
    answer:
      'No. There is currently no paid plan and no feature reserved for one. Landlords and tenants get the same complete product.',
  },
  {
    question: 'Is it free for tenants as well as landlords?',
    answer:
      'Yes, and this is deliberate. A rent record only settles disputes if both sides can see it. Tenants create a free account, join their landlord\'s rental via an invite link, and can download receipts and view the deposit ledger independently.',
  },
  {
    question: 'Do I need a credit card to sign up?',
    answer:
      'No. Signing up requires a Google account and nothing else. No card is collected at any point.',
  },
  {
    question: 'Do I need an account to generate a rent receipt?',
    answer:
      'No. The HRA rent receipt generator works without an account and runs entirely in your browser. An account is only useful if you want receipts produced automatically each month from your logged rent payments, rather than filling the form in each time.',
  },
  {
    question: 'How many properties can I manage?',
    answer:
      'The dashboard is built for landlords managing multiple properties, with buildings, units, and per-rental ledgers. Add your properties and invite a tenant to each one.',
  },
]

/** Explicit Offer schema so the "free" price is machine-readable on the pricing URL itself. */
const offerSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'RentyBase',
  url: BASE,
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Property Management Software',
  operatingSystem: 'Web, Android, iOS',
  publisher: { '@id': `${BASE}/#org` },
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
    availability: 'https://schema.org/InStock',
    url: URL,
    description: 'Free for both landlords and tenants. No subscription, no credit card.',
  },
}

const NEXT_STEPS = [
  { href: '/features', label: 'See every feature', desc: 'What the ledger, receipts, deposit, and proof tools actually do.' },
  { href: '/compare', label: 'Compare the alternatives', desc: 'RentyBase against NoBroker Rent Manager and spreadsheets.' },
  { href: '/tools/hra-receipt-generator', label: 'Free rent receipt generator', desc: 'Generate a Section 10(13A) receipt now — no account needed.' },
  { href: '/for/landlords', label: 'For landlords', desc: 'Reminders, receipts, and one ledger across every property.' },
  { href: '/for/tenants', label: 'For tenants', desc: 'Proof of every payment and a deposit record you can see.' },
  { href: '/blog', label: 'Rental guides', desc: 'HRA, deposits, receipts, and Indian rental law explained.' },
]

export default function PricingPage() {
  return (
    <div className="lp-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerSchema) }}
      />
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: BASE },
          { name: 'Pricing', url: URL },
        ]}
      />
      <FAQStructuredData faqs={faqs} />

      <MarketingNav />

      {/* Hero */}
      <section
        style={{
          paddingTop: 130,
          paddingBottom: 72,
          background: 'var(--rb-canvas-2)',
          borderBottom: '1px solid var(--rb-border)',
        }}
      >
        <div className="container" style={{ maxWidth: 780, textAlign: 'center' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>PRICING</div>
          <h1
            style={{
              fontFamily: 'var(--rb-font-display)',
              fontSize: 'clamp(36px,6vw,58px)',
              fontWeight: 400,
              lineHeight: 1.04,
              letterSpacing: '-.03em',
              marginBottom: 20,
            }}
          >
            Free — and free for<br />
            <em style={{ fontStyle: 'italic', color: 'var(--rb-action)' }}>both sides.</em>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.65, color: 'var(--rb-ink-2)', maxWidth: 560, margin: '0 auto' }}>
            No subscription, no credit card, and nothing held back for a paid tier. A rent
            record is only worth having if the landlord and the tenant can both see it.
          </p>
        </div>
      </section>

      {/* The plan */}
      <section style={{ padding: '72px 0', background: 'var(--rb-canvas)' }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div
            style={{
              background: 'var(--rb-surface)',
              border: '1px solid var(--rb-border)',
              borderRadius: 22,
              padding: '40px 36px',
              boxShadow: 'var(--rb-shadow-md)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div
                style={{
                  fontFamily: 'var(--rb-font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  color: 'var(--rb-accent)',
                  marginBottom: 14,
                }}
              >
                Everything, for everyone
              </div>
              <div
                style={{
                  fontFamily: 'var(--rb-font-display)',
                  fontSize: 'clamp(48px,8vw,72px)',
                  lineHeight: 1,
                  letterSpacing: '-.03em',
                  marginBottom: 8,
                }}
              >
                ₹0
              </div>
              <p style={{ fontSize: 15, color: 'var(--rb-ink-3)' }}>
                per month, per landlord, per tenant, per property
              </p>
            </div>

            <ul
              style={{
                listStyle: 'none',
                margin: '0 0 36px',
                padding: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
                gap: 20,
              }}
            >
              {INCLUDED.map(f => (
                <li key={f.title} style={{ display: 'flex', gap: 12 }}>
                  <span aria-hidden="true" style={{ color: 'var(--rb-success)', fontWeight: 700, lineHeight: 1.5 }}>✓</span>
                  <span>
                    <strong style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: 'var(--rb-ink)', marginBottom: 3 }}>
                      {f.title}
                    </strong>
                    <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--rb-ink-3)' }}>{f.desc}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div style={{ textAlign: 'center' }}>
              <Link href="/signup" className="btn btn-primary" style={{ padding: '13px 30px', fontSize: 16 }}>
                Start free, no card needed
              </Link>
              <p style={{ fontSize: 13, color: 'var(--rb-muted)', marginTop: 14 }}>
                Or{' '}
                <Link href="/tools/hra-receipt-generator" style={{ color: 'var(--rb-action)' }}>
                  generate a rent receipt
                </Link>{' '}
                without signing up at all.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '72px 0', background: 'var(--rb-canvas-2)', borderTop: '1px solid var(--rb-border)' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>FAQ</div>
            <h2
              style={{
                fontFamily: 'var(--rb-font-display)',
                fontSize: 'clamp(26px,4vw,38px)',
                fontWeight: 400,
                letterSpacing: '-.025em',
              }}
            >
              Pricing questions
            </h2>
          </div>
          {faqs.map((f, i) => (
            <div key={f.question} style={{ padding: '26px 0', borderTop: i === 0 ? 'none' : '1px solid var(--rb-border)' }}>
              <h3 style={{ fontFamily: 'var(--rb-font-sans)', fontSize: 16, fontWeight: 600, marginBottom: 10, color: 'var(--rb-ink)' }}>
                {f.question}
              </h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.75, color: 'var(--rb-ink-2)' }}>{f.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Onward links */}
      <section style={{ padding: '72px 0', background: 'var(--rb-canvas)' }}>
        <div className="container" style={{ maxWidth: 960 }}>
          <div className="eyebrow" style={{ marginBottom: 20 }}>NEXT</div>
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
              gap: 16,
            }}
          >
            {NEXT_STEPS.map(s => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  style={{
                    display: 'block',
                    height: '100%',
                    background: 'var(--rb-surface)',
                    border: '1px solid var(--rb-border)',
                    borderRadius: 14,
                    padding: '20px 22px',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: 'var(--rb-ink)', marginBottom: 6 }}>
                    {s.label} →
                  </span>
                  <span style={{ display: 'block', fontSize: 13, lineHeight: 1.6, color: 'var(--rb-ink-3)' }}>
                    {s.desc}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
