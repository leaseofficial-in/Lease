import type { Metadata } from 'next'
import { MarketingNav, MarketingFooter } from '@/components/marketing-shell'
import { FAQStructuredData, BreadcrumbStructuredData } from '@/components/structured-data'

export const metadata: Metadata = {
  title: 'Free Rental Management App for Landlords in India',
  description:
    'Free landlord app for India: collect rent via UPI, auto-generate Section 10(13A) HRA receipts, track security deposits, document move-in condition with sealed photos, and manage repairs. No subscription.',
  alternates: { canonical: 'https://rentybase.com/for/landlords' },
  openGraph: {
    title: 'Free Rental Management Dashboard for Indian Landlords — RentyBase',
    description:
      'One dashboard to manage all your rentals: rent collection, HRA receipts, deposit ledger, move-in proof, and repairs. Free forever for Indian landlords.',
    url: 'https://rentybase.com/for/landlords',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'RentyBase for Landlords' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Rental Management App for Indian Landlords — RentyBase',
    description: 'Collect rent, issue HRA receipts, track deposits and repairs. Free for Indian landlords.',
  },
}

const landlordFaqs = [
  {
    question: 'How do I invite a tenant to RentyBase?',
    answer:
      'Create a rental by adding your property details and rent amount. RentyBase generates a unique invite link valid for 72 hours. Share it with your tenant via WhatsApp or any messaging app. Your tenant signs in with Google and joins your rental in one tap — no app install required on web.',
  },
  {
    question: 'Can I manage multiple properties or rentals on RentyBase?',
    answer:
      'Yes. RentyBase supports multiple properties under a single landlord account. You can create buildings with multiple units, manage multiple active rentals simultaneously, and view a consolidated dashboard across all your properties.',
  },
  {
    question: 'Does RentyBase generate HRA receipts automatically?',
    answer:
      'Yes. The moment you log a rent payment (by UPI, NEFT, or cash), a Section 10(13A)-compliant HRA receipt is generated automatically — pre-filled with your tenant\'s name, your PAN, the property address, the rental period, and the amount. Your tenant can download it instantly as a PDF.',
  },
  {
    question: 'Is RentyBase free for landlords?',
    answer:
      'Yes, completely free. There is no monthly subscription, no per-property charge, and no premium tier. Every feature — rent ledger, HRA receipts, deposit tracking, move-in proof, and repair management — is included at no cost.',
  },
]

const features = [
  { icon: '🏠', title: 'Create rentals in 30 seconds', body: 'Add your property, set the rent amount and due date, and send an invite link. Your tenant joins in one tap — no paperwork upfront.' },
  { icon: '₹', title: 'Rent collection & ledger', body: 'Log rent payments as they arrive via UPI, NEFT, or cash. Every payment is timestamped and saved with the UTR number.' },
  { icon: '📄', title: 'Automatic HRA receipts', body: 'Section 10(13A)-valid receipts generate the moment a payment is recorded. PAN, period, rent amount — all pre-filled. Your tenant downloads them instantly.' },
  { icon: '📸', title: 'Move-in & move-out proof', body: 'Tenants upload room photos at move-in. Photos are timestamped, geotagged, and sealed — neither party can alter them. Disputes end here.' },
  { icon: '🔒', title: 'Security deposit ledger', body: 'Track deposit received, deductions (with reasons), and final refund in a shared ledger both sides can always see.' },
  { icon: '🔧', title: 'Repair request tracking', body: 'Tenants raise repair requests in-app. You respond, resolve, and close. A permanent log of every issue and fix.' },
]

const steps = [
  { n: '01', t: 'Add your property', d: 'Enter address, type, and monthly rent. Takes under a minute.' },
  { n: '02', t: 'Invite your tenant', d: 'Share a link. Tenant signs in with Google. No app install required.' },
  { n: '03', t: 'Collect rent', d: 'Log each payment. Receipts auto-generate. Ledger stays in sync.' },
  { n: '04', t: 'Close with proof', d: 'Move-out photos sealed alongside the full rental history.' },
]

export default function LandlordsPage() {
  return (
    <div className="lp-page">
      <BreadcrumbStructuredData items={[
        { name: 'Home', url: 'https://rentybase.com' },
        { name: 'For Landlords', url: 'https://rentybase.com/for/landlords' },
      ]} />
      <FAQStructuredData faqs={landlordFaqs} />
      <MarketingNav />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 80, background: 'linear-gradient(160deg,#0F4C5C 0%,#163A47 55%,#0E1413 100%)', color: '#F6F4EE' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(201,122,58,.9)', marginBottom: 18 }}>FOR LANDLORDS · INDIA</div>
          <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(36px,6vw,64px)', fontWeight: 400, lineHeight: 1.04, letterSpacing: '-.032em', marginBottom: 24, color: '#F6F4EE' }}>
            One dashboard for<br /><em style={{ fontStyle: 'italic', color: '#C97A3A' }}>every landlord</em> in India.
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: 'rgba(246,244,238,.75)', maxWidth: 580, marginBottom: 36 }}>
            Rent collection, HRA receipts, deposit ledger, move-in proof, and repair tracking. All in a single shared record. Free for landlords. Free for tenants. No monthly fee.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="/signup" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15 }}>Add your first property, free</a>
            <a href="/signin" style={{ padding: '12px 24px', fontSize: 15, fontWeight: 500, color: 'rgba(246,244,238,.8)', border: '1px solid rgba(246,244,238,.2)', borderRadius: 999, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Sign in</a>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section style={{ padding: '80px 0', background: 'var(--rb-canvas)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>EVERYTHING YOU NEED</div>
            <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 400, letterSpacing: '-.025em' }}>Built around how Indian rental works</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
            {features.map(f => (
              <div key={f.title} style={{ background: 'var(--rb-surface)', border: '1px solid var(--rb-border)', borderRadius: 18, padding: '28px 28px 32px' }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontFamily: 'var(--rb-font-sans)', fontSize: 17, fontWeight: 600, marginBottom: 10, color: 'var(--rb-ink)' }}>{f.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--rb-ink-2)' }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 0', background: 'var(--rb-canvas-2)', borderTop: '1px solid var(--rb-border)', borderBottom: '1px solid var(--rb-border)' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>HOW IT WORKS</div>
            <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(26px,4vw,38px)', fontWeight: 400, letterSpacing: '-.025em' }}>From listing to move-out in four steps</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {steps.map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 48, lineHeight: 1, color: 'var(--rb-accent)', opacity: .6, flexShrink: 0, width: 56 }}>{s.n}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 6, color: 'var(--rb-ink)' }}>{s.t}</div>
                  <div style={{ fontSize: 14, color: 'var(--rb-ink-2)', lineHeight: 1.6 }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 32px', textAlign: 'center', background: 'var(--rb-canvas)' }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>FREE FOR LANDLORDS</div>
        <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, letterSpacing: '-.025em', marginBottom: 16 }}>
          Create your first rental in 30 seconds.
        </h2>
        <p style={{ fontSize: 16, color: 'var(--rb-ink-2)', marginBottom: 32, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          No monthly fee. No credit card. Works on any device. Your tenant joins free too.
        </p>
        <a href="/signup" className="btn btn-primary" style={{ padding: '13px 28px', fontSize: 16 }}>Start free, no card needed</a>
      </section>

      <MarketingFooter />
    </div>
  )
}
