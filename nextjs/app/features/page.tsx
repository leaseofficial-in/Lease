import type { Metadata } from 'next'
import { MarketingNav, MarketingFooter } from '@/components/marketing-shell'
import { FAQStructuredData, BreadcrumbStructuredData } from '@/components/structured-data'

export const metadata: Metadata = {
  title: 'Features — HRA Receipts, Rent Ledger, Move-in Proof & More',
  description:
    'Every tool Indian landlords and tenants need: auto-generated Section 10(13A) HRA receipts, shared rent ledger with UTR tracking, tamper-proof move-in photos, security deposit breakdown, and repair management. Free.',
  alternates: { canonical: 'https://rentybase.com/features' },
  openGraph: {
    title: 'RentyBase Features — HRA Receipts, Shared Ledger, Move-in Proof',
    description:
      'Full rental lifecycle management in one shared record. Rent collection, HRA receipts, deposit tracking, move-in proof, and repairs. Free for both sides.',
    url: 'https://rentybase.com/features',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'RentyBase Features' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RentyBase Features — Complete Rental Management for India',
    description: 'HRA receipts, rent ledger, move-in proof, deposit tracking — all free.',
  },
}

const faqs = [
  {
    question: 'What documents does a valid HRA rent receipt need for income tax?',
    answer:
      'A valid HRA rent receipt under Section 10(13A) must include: the tenant\'s name and address, the landlord\'s name and PAN (mandatory if annual rent exceeds ₹1 lakh), the rental amount paid, the payment period (month and year), the property address, and the date of payment. RentyBase auto-fills all of these from your rental profile.',
  },
  {
    question: 'Is RentyBase free for both landlords and tenants?',
    answer:
      'Yes. RentyBase is fully free for both landlords and tenants. There are no subscription tiers, no paywalls, and no "premium" features. Every feature — HRA receipts, rent ledger, deposit tracking, move-in proof, and repairs — is included at no cost.',
  },
  {
    question: 'How does move-in photo proof work on RentyBase?',
    answer:
      'At move-in, the tenant uploads photos of each room through the app. Each photo is automatically timestamped and geotagged at the moment of upload. The photos are then cryptographically sealed — neither the landlord nor the tenant can alter or delete them. Both parties have permanent identical access. At move-out, the original move-in state is irrefutable.',
  },
  {
    question: 'Can RentyBase generate rent receipts for an entire financial year?',
    answer:
      'Yes. RentyBase generates a receipt automatically the moment each payment is logged. You can download individual monthly receipts or a complete financial year bundle as a single PDF — useful for HRA submission to employers at year-end.',
  },
  {
    question: 'How does the security deposit ledger protect tenants?',
    answer:
      'The security deposit ledger shows every transaction: deposit received, deductions (each with a mandatory written reason and amount), and the final refund. Tenants can see the exact breakdown in real time. Deductions cannot be added without appearing in the shared ledger, making opaque or unjustified deductions impossible.',
  },
]

const sections = [
  {
    tag: 'RENT COLLECTION',
    title: 'A ledger both sides trust',
    body: 'Every payment (UPI, NEFT, cash) is logged with date, amount, method, and UTR number. Landlord and tenant see the same record. No disputes about what was paid and when.',
    points: ['Supports UPI, NEFT, IMPS, cash', 'UTR number attached to every entry', 'Shared in real time with tenant', 'Overdue alerts on the due date'],
  },
  {
    tag: 'HRA RECEIPTS',
    title: 'Section 10(13A)-valid receipts, zero effort',
    body: 'The moment a payment is logged, a legally valid HRA receipt is generated. Your tenant downloads it as a PDF, monthly or bundled for the full financial year. No WhatsApp forwards, no manual paperwork.',
    points: ['Pre-filled: name, PAN, address, period', 'Valid under Income Tax Section 10(13A)', 'PDF download, always available', 'Full-year receipt bundle in one click'],
  },
  {
    tag: 'MOVE-IN PROOF',
    title: 'Photos that can never be disputed',
    body: 'At move-in, the tenant uploads photos room by room. Every photo gets a timestamp, a geotag, and a cryptographic seal. Neither side can alter them. At move-out, both sides have identical access to the original record.',
    points: ['Timestamped & geotagged at upload', 'Sealed, no edits possible', 'Shared access: landlord and tenant', 'Permanent retention'],
  },
  {
    tag: 'DEPOSIT MANAGEMENT',
    title: 'Every rupee of deposit, accounted for',
    body: 'Track the full security deposit lifecycle: received, held, deductions (with written reasons), and final refund. Both parties sign off digitally. No "I didn\'t know about that deduction" moments.',
    points: ['Deposit received & held log', 'Deductions with mandatory reasons', 'Tenant acknowledgment on each entry', 'Final settlement with breakdown'],
  },
  {
    tag: 'REPAIR TRACKING',
    title: 'Maintenance, documented from request to close',
    body: 'Tenants raise repair requests with photos and descriptions. Landlords respond, update status, and close with notes. A permanent log that protects both sides. Especially useful at move-out.',
    points: ['Tenant raises with photos', 'Landlord acknowledges and closes', 'Full status history preserved', 'Searchable by property and date'],
  },
  {
    tag: 'AGREEMENTS',
    title: 'Your Leave & License, accessible always',
    body: 'Upload or draft your rental agreement. Both landlord and tenant have permanent access on any device, any time. No digging through email threads when a dispute arises.',
    points: ['Upload existing PDF', 'Both parties access anytime', 'Linked to rental record', 'Coming: digital signing'],
  },
]

export default function FeaturesPage() {
  return (
    <div className="lp-page">
      <BreadcrumbStructuredData items={[
        { name: 'Home', url: 'https://rentybase.com' },
        { name: 'Features', url: 'https://rentybase.com/features' },
      ]} />
      <FAQStructuredData faqs={faqs} />
      <MarketingNav />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 72, background: 'var(--rb-canvas-2)', borderBottom: '1px solid var(--rb-border)' }}>
        <div className="container" style={{ maxWidth: 760, textAlign: 'center' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>FEATURES</div>
          <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(36px,6vw,58px)', fontWeight: 400, lineHeight: 1.04, letterSpacing: '-.03em', marginBottom: 20 }}>
            Everything in one<br /><em style={{ fontStyle: 'italic', color: 'var(--rb-action)' }}>rental record.</em>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.65, color: 'var(--rb-ink-2)', maxWidth: 560, margin: '0 auto 36px' }}>
            RentyBase covers the full rental lifecycle. From the day a property is listed to the day the deposit is returned. One shared record. Both sides. Free.
          </p>
          <a href="/signup" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15 }}>Start free, no card needed</a>
        </div>
      </section>

      {/* Feature sections */}
      {sections.map((s, i) => (
        <section key={s.tag} style={{ padding: '72px 0', background: i % 2 === 0 ? 'var(--rb-canvas)' : 'var(--rb-canvas-2)', borderBottom: '1px solid var(--rb-border)' }}>
          <div className="container" style={{ maxWidth: 960, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '40px 64px', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--rb-action)', marginBottom: 14 }}>{s.tag}</div>
              <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(26px,3.5vw,38px)', fontWeight: 400, lineHeight: 1.08, letterSpacing: '-.025em', marginBottom: 16 }}>{s.title}</h2>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--rb-ink-2)', marginBottom: 28 }}>{s.body}</p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {s.points.map(pt => (
                  <li key={pt} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: 'var(--rb-ink-2)' }}>
                    <span style={{ color: 'var(--rb-success)', flexShrink: 0, marginTop: 2 }}>✓</span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ background: 'var(--rb-surface)', border: '1px solid var(--rb-border)', borderRadius: 20, padding: '32px', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 48, color: 'var(--rb-action)', opacity: .15, lineHeight: 1 }}>RB</div>
                <div style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--rb-muted)', marginTop: 12 }}>{s.tag}</div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* FAQ — visible section, also powers FAQPage schema */}
      <section style={{ padding: '72px 0', background: 'var(--rb-canvas-2)', borderBottom: '1px solid var(--rb-border)' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="eyebrow" style={{ marginBottom: 16, textAlign: 'center' }}>FAQ</div>
          <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(26px,3.5vw,38px)', fontWeight: 400, letterSpacing: '-.025em', textAlign: 'center', marginBottom: 48 }}>
            Common questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {faqs.map(faq => (
              <details key={faq.question} style={{ borderBottom: '1px solid var(--rb-border)', padding: '20px 0' }}>
                <summary style={{ fontSize: 16, fontWeight: 600, cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, color: 'var(--rb-ink)' }}>
                  {faq.question}
                  <span style={{ flexShrink: 0, fontSize: 20, color: 'var(--rb-ink-3)', fontWeight: 300 }}>+</span>
                </summary>
                <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--rb-ink-2)', marginTop: 14, paddingRight: 32 }}>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 32px', textAlign: 'center', background: 'linear-gradient(160deg,#0F4C5C 0%,#0E1413 100%)', color: '#F6F4EE' }}>
        <div className="eyebrow" style={{ marginBottom: 16, color: 'rgba(201,122,58,.9)' }}>FREE · FOREVER</div>
        <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, letterSpacing: '-.025em', marginBottom: 16 }}>
          All features. No subscription.
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(246,244,238,.7)', marginBottom: 32, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          Every feature above is included free for landlords and tenants. No tiers, no paywalls.
        </p>
        <a href="/signup" className="btn btn-primary" style={{ padding: '13px 28px', fontSize: 16 }}>Create your first rental</a>
      </section>

      <MarketingFooter />
    </div>
  )
}
