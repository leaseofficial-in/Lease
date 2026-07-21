import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingNav, MarketingFooter } from '@/components/marketing-shell'
import { FAQStructuredData, BreadcrumbStructuredData } from '@/components/structured-data'
import { HraReceiptGenerator } from '@/components/tools/hra-receipt-generator'

const BASE = 'https://rentybase.com'
const URL = `${BASE}/tools/hra-receipt-generator`

export const metadata: Metadata = {
  title: 'Free HRA Rent Receipt Generator — Section 10(13A) Format',
  description:
    'Generate a valid HRA rent receipt free, with no signup. Fill in tenant and landlord details, PAN, rent amount and period, then download as PDF. Section 10(13A) format accepted by Indian employers.',
  keywords: [
    'rent receipt generator',
    'HRA rent receipt generator',
    'rent receipt format',
    'Section 10(13A) rent receipt',
    'rent receipt PDF download',
    'house rent receipt for income tax',
    'landlord PAN rent receipt',
  ],
  alternates: { canonical: URL },
  openGraph: {
    type: 'website',
    title: 'Free HRA Rent Receipt Generator — Section 10(13A) Format | RentyBase',
    description:
      'Fill in the details, download a valid HRA rent receipt as PDF. Free, no signup, runs entirely in your browser.',
    url: URL,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Free HRA rent receipt generator' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free HRA Rent Receipt Generator — Section 10(13A) | RentyBase',
    description: 'Generate and download a valid rent receipt in under a minute. Free, no signup.',
  },
}

const faqs = [
  {
    question: 'Is this rent receipt generator really free?',
    answer:
      'Yes. The generator runs entirely in your browser, requires no account, and has no limit on how many receipts you create. Nothing you type is uploaded or stored on a server. A free RentyBase account is only needed if you want receipts generated automatically each month.',
  },
  {
    question: 'Is a generated rent receipt valid for claiming HRA?',
    answer:
      "Yes, provided the details are accurate. Employers and the Income Tax Department care about the content of the receipt, not who typed it. A receipt must show the tenant's name, the landlord's name and PAN (mandatory when annual rent exceeds ₹1 lakh), the full property address, the period covered, the amount, and the payment method. This generator includes all of those fields. The landlord must sign it.",
  },
  {
    question: 'When is the landlord PAN mandatory on a rent receipt?',
    answer:
      'The landlord\'s PAN is mandatory when annual rent exceeds ₹1 lakh, which is roughly ₹8,333 per month. Below that threshold PAN is optional, though including it is still good practice. This tool tells you which side of the threshold you are on as soon as you enter the rent amount.',
  },
  {
    question: 'Do I need a revenue stamp on the rent receipt?',
    answer:
      'A revenue stamp is conventionally affixed when rent is paid in cash and the amount exceeds ₹5,000. For UPI, NEFT, IMPS, or cheque payments the bank record is itself evidence of payment, and most employers do not ask for a stamp. When in doubt, ask your employer what they require.',
  },
  {
    question: 'Can I generate receipts for all twelve months of a financial year?',
    answer:
      'You can generate each month one at a time by changing the month and downloading again — the rest of the form stays filled in. If you would rather not repeat that twelve times, a free RentyBase account generates every month automatically from your logged rent payments and keeps them downloadable all year.',
  },
  {
    question: 'What if my landlord refuses to sign the receipt?',
    answer:
      'Bring a printed, pre-filled receipt and ask only for a signature — landlords who resist "issuing" a receipt will often sign one you have prepared. Bank transfer records serve as supporting evidence. Our guide on claiming HRA when a landlord will not give receipts walks through every option, including which ones carry risk.',
  },
]

/** HowTo schema — this page describes a concrete, ordered task, which is what HowTo is for. */
const howTo = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to generate an HRA rent receipt',
  description:
    'Create a Section 10(13A) compliant house rent receipt for claiming HRA exemption in India.',
  totalTime: 'PT2M',
  estimatedCost: { '@type': 'MonetaryAmount', currency: 'INR', value: '0' },
  supply: [{ '@type': 'HowToSupply', name: "Landlord's PAN (if annual rent exceeds ₹1 lakh)" }],
  tool: [{ '@type': 'HowToTool', name: 'RentyBase HRA rent receipt generator' }],
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Enter tenant details',
      text: "Type the tenant's full name as it appears in payroll records. Add the tenant PAN only if the employer asks for it.",
      url: `${URL}#generator`,
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Enter landlord name and PAN',
      text: "Add the landlord's full name and PAN. PAN is mandatory when annual rent exceeds ₹1 lakh.",
      url: `${URL}#generator`,
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Add property, period and amount',
      text: 'Enter the complete rented address including pin code, choose the month and year, and enter the monthly rent. Add the UTR reference for digital payments.',
      url: `${URL}#generator`,
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: 'Download and get it signed',
      text: 'Choose Download PDF and select "Save as PDF" in the print dialog. Have the landlord sign the printed receipt before submitting it to your employer.',
      url: `${URL}#generator`,
    },
  ],
}

const softwareApp = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'HRA Rent Receipt Generator',
  url: URL,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript',
  description:
    'Free browser-based generator for Section 10(13A) compliant Indian house rent receipts. No signup, no data leaves the browser.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  publisher: { '@id': `${BASE}/#org` },
  isAccessibleForFree: true,
}

/** Every SEO page links onward — no orphans, and authority spreads through the cluster. */
const RELATED = [
  {
    href: '/blog/how-to-claim-hra-when-landlord-wont-give-rent-receipts',
    label: "When your landlord won't give receipts",
    desc: 'Four options ranked by risk, and the one that counts as tax fraud.',
  },
  {
    href: '/blog/how-to-collect-rent-india-landlord-guide',
    label: 'How to collect rent in India',
    desc: 'Payment methods, proof to keep, and receipt duties for landlords.',
  },
  {
    href: '/blog/can-landlord-deduct-security-deposit-wear-and-tear-india',
    label: 'Deposit deductions and wear and tear',
    desc: 'What a landlord may and may not charge you for at move-out.',
  },
  {
    href: '/for/tenants',
    label: 'RentyBase for tenants',
    desc: 'Proof of every payment, and a deposit record you both can see.',
  },
  {
    href: '/for/landlords',
    label: 'RentyBase for landlords',
    desc: 'Reminders, receipts, and a ledger across every property.',
  },
  { href: '/tools', label: 'All free tools', desc: 'Rent ledger, deposit tracker, and proof vault.' },
]

export default function HraReceiptGeneratorPage() {
  return (
    <div className="lp-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApp) }}
      />
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: BASE },
          { name: 'Free Tools', url: `${BASE}/tools` },
          { name: 'HRA Rent Receipt Generator', url: URL },
        ]}
      />
      <FAQStructuredData faqs={faqs} />

      <MarketingNav />

      {/* Breadcrumb */}
      <div style={{ paddingTop: 96, background: 'var(--rb-canvas-2)' }} className="no-print">
        <div className="container" style={{ maxWidth: 1100, fontSize: 13, color: 'var(--rb-muted)' }}>
          <Link href="/" style={{ color: 'var(--rb-muted)', textDecoration: 'none' }}>Home</Link>
          <span style={{ margin: '0 8px' }}>›</span>
          <Link href="/tools" style={{ color: 'var(--rb-muted)', textDecoration: 'none' }}>Free tools</Link>
          <span style={{ margin: '0 8px' }}>›</span>
          <span style={{ color: 'var(--rb-ink-2)' }}>HRA rent receipt generator</span>
        </div>
      </div>

      {/* Hero */}
      <section
        className="no-print"
        style={{ padding: '28px 0 48px', background: 'var(--rb-canvas-2)', borderBottom: '1px solid var(--rb-border)' }}
      >
        <div className="container" style={{ maxWidth: 1100 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>FREE TOOL · NO SIGNUP</div>
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
            HRA rent receipt<br />
            <em style={{ fontStyle: 'italic', color: 'var(--rb-action)' }}>generator.</em>
          </h1>
          <p style={{ fontSize: 17.5, lineHeight: 1.6, color: 'var(--rb-ink-2)', maxWidth: 580 }}>
            Fill in the details and download a Section 10(13A) rent receipt as a PDF. No account,
            no email, no watermark. Everything runs in your browser — nothing you type is sent
            anywhere.
          </p>
        </div>
      </section>

      {/* The tool */}
      <section id="generator" style={{ padding: '48px 0 72px', background: 'var(--rb-canvas)' }}>
        <div className="container" style={{ maxWidth: 1100 }}>
          <HraReceiptGenerator />
        </div>
      </section>

      {/* What makes a receipt valid */}
      <section
        className="no-print"
        style={{ padding: '72px 0', background: 'var(--rb-canvas-2)', borderTop: '1px solid var(--rb-border)' }}
      >
        <div className="container rb-article" style={{ maxWidth: 720 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>WHAT MAKES IT VALID</div>
          <h2 style={{ marginTop: 0 }}>What a rent receipt must contain</h2>
          <p>
            Employers and assessing officers judge a rent receipt on its contents, not on where it
            was produced. A receipt supporting an HRA exemption claim under Section 10(13A) of the
            Income Tax Act 1961 should carry all of the following:
          </p>
          <ul>
            <li>Tenant&apos;s full name, matching payroll records</li>
            <li>Landlord&apos;s full name</li>
            <li>Landlord&apos;s PAN, mandatory once annual rent crosses ₹1 lakh</li>
            <li>Complete address of the rented property, including pin code</li>
            <li>The month and year the receipt covers</li>
            <li>Rent amount in figures and in words</li>
            <li>Date and method of payment, with a UTR reference for digital transfers</li>
            <li>Landlord&apos;s signature</li>
          </ul>
          <p>
            The generator above produces every one of these fields. The single thing it cannot do
            is sign the receipt for you — print it and have the landlord sign before submission.
          </p>

          <h2>The ₹1 lakh PAN threshold</h2>
          <p>
            Once annual rent exceeds <strong>₹1,00,000</strong> — about ₹8,333 a month — the
            landlord&apos;s PAN becomes mandatory on the receipt. Without it, an employer is within
            their rights to reject the HRA claim, and the exemption can be disallowed on scrutiny.
            Enter a rent amount above and the tool will tell you which side of the threshold you
            are on.
          </p>
          <p>
            If your landlord refuses to share their PAN, read{' '}
            <Link href="/blog/how-to-claim-hra-when-landlord-wont-give-rent-receipts">
              how to claim HRA when your landlord won&apos;t give rent receipts
            </Link>{' '}
            — it covers Form 60 declarations and what actually holds up under scrutiny.
          </p>

          <h2>How the HRA exemption is calculated</h2>
          <p>The exemption is the smallest of these three figures:</p>
          <ol>
            <li>The actual HRA your employer pays you</li>
            <li>50% of basic salary in a metro city, or 40% elsewhere</li>
            <li>Rent actually paid, minus 10% of basic salary</li>
          </ol>
          <p>
            Receipts substantiate the third figure, which is usually the binding one. Keep the
            bank records for the same payments alongside them — together they are far harder to
            question than either alone.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="no-print" style={{ padding: '72px 0', background: 'var(--rb-canvas)' }}>
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
              Rent receipt questions
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

      {/* Related — keeps the cluster connected */}
      <section
        className="no-print"
        style={{ padding: '72px 0', background: 'var(--rb-canvas-2)', borderTop: '1px solid var(--rb-border)' }}
      >
        <div className="container" style={{ maxWidth: 960 }}>
          <div className="eyebrow" style={{ marginBottom: 20 }}>KEEP READING</div>
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
            {RELATED.map(r => (
              <li key={r.href}>
                <Link
                  href={r.href}
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
                    {r.label} →
                  </span>
                  <span style={{ display: 'block', fontSize: 13, lineHeight: 1.6, color: 'var(--rb-ink-3)' }}>
                    {r.desc}
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
