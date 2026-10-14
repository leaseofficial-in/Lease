import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { MarketingNav, MarketingFooter } from '@/components/marketing-shell'
import { FAQStructuredData, BreadcrumbStructuredData } from '@/components/structured-data'
import { HraReceiptGenerator } from '@/components/tools/hra-receipt-generator'

// The country-neutral sibling of /tools/hra-receipt-generator. Same component;
// with no pinned country it formats in the visitor's currency (or the
// ?country= the tenant dashboard sends), with no PAN or Section 10(13A).

const BASE = 'https://rentybase.com'
const URL = `${BASE}/tools/rent-receipt-generator`

export const metadata: Metadata = {
  title: 'Free Rent Receipt Generator — Any Country, Any Currency',
  description:
    'Create a rent receipt in your own currency, free and with no signup. Enter tenant, landlord, property, amount and payment method, then download as PDF. Works in every country.',
  keywords: [
    'rent receipt generator',
    'free rent receipt template',
    'rent receipt PDF',
    'landlord rent receipt',
    'printable rent receipt',
  ],
  alternates: { canonical: URL },
  openGraph: {
    type: 'website',
    title: 'Free Rent Receipt Generator — Any Country | RentyBase',
    description: 'Fill in the details and download a rent receipt as PDF, in your own currency. Free, no signup.',
    url: URL,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Free rent receipt generator' }],
  },
}

const faqs = [
  {
    question: 'Is this rent receipt generator free?',
    answer:
      'Yes. It runs entirely in your browser, needs no account, and has no limit. Nothing you type is uploaded. A free RentyBase account is only needed if you want receipts produced automatically every month.',
  },
  {
    question: 'What should a rent receipt include?',
    answer:
      'The tenant and landlord names, the property address, the period the payment covers, the amount in figures and words, the date and method of payment, a reference for bank or card payments, and the landlord’s signature. The generator fills in all of these except the signature.',
  },
  {
    question: 'Which currency will the receipt use?',
    answer:
      'Your own. The receipt uses the currency of the country you are browsing from, which you can change in the region selector at the bottom of the page. Tenants opening it from their RentyBase dashboard get the currency of their rental automatically.',
  },
  {
    question: 'I rent in India. Is there an HRA version?',
    answer:
      'Yes. The HRA rent receipt generator adds the landlord’s PAN and the Section 10(13A) wording that Indian employers ask for.',
  },
]

export default function RentReceiptGeneratorPage() {
  return (
    <div className="lp-page">
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: BASE },
          { name: 'Free Tools', url: `${BASE}/tools` },
          { name: 'Rent Receipt Generator', url: URL },
        ]}
      />
      <FAQStructuredData faqs={faqs} />

      <MarketingNav />

      <div style={{ paddingTop: 96, background: 'var(--rb-canvas-2)' }} className="no-print">
        <div className="container" style={{ maxWidth: 1100, fontSize: 13, color: 'var(--rb-muted)' }}>
          <Link href="/" style={{ color: 'var(--rb-muted)', textDecoration: 'none' }}>Home</Link>
          <span style={{ margin: '0 8px' }}>›</span>
          <Link href="/tools" style={{ color: 'var(--rb-muted)', textDecoration: 'none' }}>Free tools</Link>
          <span style={{ margin: '0 8px' }}>›</span>
          <span style={{ color: 'var(--rb-ink-2)' }}>Rent receipt generator</span>
        </div>
      </div>

      <section
        className="no-print"
        style={{ padding: '28px 0 48px', background: 'var(--rb-canvas-2)', borderBottom: '1px solid var(--rb-border)' }}
      >
        <div className="container" style={{ maxWidth: 1100 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>FREE TOOL · NO SIGNUP · ANY COUNTRY</div>
          <h1
            style={{
              fontFamily: 'var(--rb-font-display)',
              fontSize: 'clamp(32px,5vw,50px)',
              fontWeight: 400,
              lineHeight: 1.06,
              letterSpacing: '-.03em',
              marginBottom: 18,
              maxWidth: 720,
            }}
          >
            Rent receipt<br />
            <em style={{ fontStyle: 'italic', color: 'var(--rb-action)' }}>generator.</em>
          </h1>
          <p style={{ fontSize: 17.5, lineHeight: 1.6, color: 'var(--rb-ink-2)', maxWidth: 580 }}>
            Fill in the details and download a rent receipt as a PDF, in your own currency. No
            account, no email, no watermark. Everything runs in your browser.
          </p>
        </div>
      </section>

      <section id="generator" style={{ padding: '48px 0 72px', background: 'var(--rb-canvas)' }}>
        <div className="container" style={{ maxWidth: 1100 }}>
          {/* useSearchParams inside needs a Suspense boundary to prerender. */}
          <Suspense fallback={<div style={{ minHeight: 420 }} />}>
            <HraReceiptGenerator />
          </Suspense>
        </div>
      </section>

      <section className="no-print" style={{ padding: '72px 0', background: 'var(--rb-canvas-2)', borderTop: '1px solid var(--rb-border)' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>FAQ</div>
          {faqs.map((f, i) => (
            <div key={f.question} style={{ padding: '26px 0', borderTop: i === 0 ? 'none' : '1px solid var(--rb-border)' }}>
              <h3 style={{ fontFamily: 'var(--rb-font-sans)', fontSize: 16, fontWeight: 600, marginBottom: 10, color: 'var(--rb-ink)' }}>
                {f.question}
              </h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.75, color: 'var(--rb-ink-2)' }}>
                {f.answer}
                {i === faqs.length - 1 && (
                  <> <Link href="/tools/hra-receipt-generator">Open the HRA receipt generator →</Link></>
                )}
              </p>
            </div>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
