import type { Metadata } from 'next'
import { MarketingNav, MarketingFooter } from '@/components/marketing-shell'
import { FAQStructuredData, BreadcrumbStructuredData } from '@/components/structured-data'

export const metadata: Metadata = {
  title: 'Free Rent Payment & HRA Receipt App for Tenants in India',
  description:
    'Track rent payments, download Section 10(13A) HRA receipts for tax exemption, protect your security deposit, raise repair requests, and keep tamper-proof move-in photos. Free for Indian tenants.',
  alternates: { canonical: 'https://rentybase.com/for/tenants' },
  openGraph: {
    title: 'Free HRA Receipt & Rent Tracking App for Indian Tenants — RentyBase',
    description:
      'Download HRA receipts for income tax, track payment history, protect your deposit, and keep move-in proof. Free for tenants across India.',
    url: 'https://rentybase.com/for/tenants',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'RentyBase for Tenants' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free HRA Receipt App for Indian Tenants — RentyBase',
    description: 'HRA receipts, rent history, deposit protection, repair tracking. Free for tenants.',
  },
}

const tenantFaqs = [
  {
    question: 'How do I download my rent receipts for HRA exemption?',
    answer:
      'Once your landlord logs your rent payment in RentyBase, a Section 10(13A)-compliant HRA receipt is automatically generated and available for download. Go to your dashboard, open the payment, and download as PDF. You can also download a full-year bundle for employer submission at year-end.',
  },
  {
    question: 'What is Section 10(13A) and how does RentyBase help with HRA?',
    answer:
      'Section 10(13A) of the Income Tax Act allows salaried employees who receive House Rent Allowance (HRA) from their employer to claim a portion of it as tax-exempt. To claim this exemption, you need valid rent receipts with the landlord\'s name, PAN (if annual rent exceeds ₹1 lakh), your name, rental period, amount, and property address. RentyBase generates these receipts automatically with all required fields.',
  },
  {
    question: 'Can I claim rent deduction under Section 80GG if my employer doesn\'t give HRA?',
    answer:
      'Yes. Section 80GG lets you claim up to ₹5,000 per month as a deduction if you pay rent but do not receive HRA from your employer (or are self-employed). You still need valid rent receipts for this claim. RentyBase generates the same Section 10(13A)-standard receipts that work for both HRA exemption and Section 80GG claims.',
  },
  {
    question: 'How does RentyBase protect my security deposit?',
    answer:
      'RentyBase maintains a shared deposit ledger that both you and your landlord can see in real time. Every deduction must be logged with a mandatory written reason and amount. You receive a notification for each entry. The final settlement breakdown is permanently recorded. Because both parties see the same ledger, opaque or undisclosed deductions are impossible.',
  },
]

const features = [
  { icon: '💳', title: 'Pay rent & log payments', body: 'Pay via UPI or record any payment with a UTR number. Every payment lands in a shared ledger your landlord also sees.' },
  { icon: '📄', title: 'HRA receipts on demand', body: 'Download Section 10(13A)-compliant rent receipts any time — monthly or for the whole year. Valid for income tax under Section 80GG and HRA exemption.' },
  { icon: '📊', title: 'Full rent history', body: 'Every payment you\'ve ever made is saved with date, amount, method, and UTR. No more chasing WhatsApp screenshots for proof.' },
  { icon: '🔒', title: 'Deposit protection', body: 'Track your security deposit, see every deduction with reasons, and view the final settlement — all on the same record as your landlord.' },
  { icon: '🔧', title: 'Raise repair requests', body: 'Submit repair issues directly in-app. Your landlord gets notified, responds, and closes the ticket. A permanent log protects you both.' },
  { icon: '📸', title: 'Move-in photo proof', body: 'Upload room photos at move-in. They\'re timestamped, geotagged, and sealed. You have the same access to them as your landlord — forever.' },
]

export default function TenantsPage() {
  return (
    <div className="lp-page">
      <BreadcrumbStructuredData items={[
        { name: 'Home', url: 'https://rentybase.com' },
        { name: 'For Tenants', url: 'https://rentybase.com/for/tenants' },
      ]} />
      <FAQStructuredData faqs={tenantFaqs} />
      <MarketingNav />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 80, background: 'var(--rb-canvas-2)', borderBottom: '1px solid var(--rb-border)' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--rb-action)', marginBottom: 18 }}>FOR TENANTS · INDIA</div>
          <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(36px,6vw,60px)', fontWeight: 400, lineHeight: 1.06, letterSpacing: '-.03em', marginBottom: 24, color: 'var(--rb-ink)' }}>
            Rent smarter.<br />Get the receipts.<br /><em style={{ fontStyle: 'italic', color: 'var(--rb-action)' }}>Keep the proof.</em>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--rb-ink-2)', maxWidth: 540, marginBottom: 36 }}>
            HRA receipts, rent history, deposit tracking, and move-in proof. All in one place. Shared with your landlord. Owned by you. Free.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="/signup" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15 }}>Join your rental, free</a>
            <a href="/signin" style={{ padding: '12px 24px', fontSize: 15, fontWeight: 500, color: 'var(--rb-ink-3)', border: '1px solid var(--rb-border)', borderRadius: 999, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Sign in</a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 0', background: 'var(--rb-canvas)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>WHAT YOU GET</div>
            <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 400, letterSpacing: '-.025em' }}>
              Every tenant right, <em style={{ fontStyle: 'italic', color: 'var(--rb-action)' }}>documented.</em>
            </h2>
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

      {/* HRA detail */}
      <section style={{ padding: '80px 0', background: 'linear-gradient(160deg,#0F4C5C 0%,#0E1413 100%)', color: '#F6F4EE' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(201,122,58,.9)', marginBottom: 16 }}>HRA RECEIPTS</div>
          <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 400, lineHeight: 1.06, letterSpacing: '-.025em', marginBottom: 20 }}>
            Save tax every year. Receipts are always ready.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: 'rgba(246,244,238,.75)', marginBottom: 36 }}>
            RentyBase generates a Section 10(13A)-compliant HRA receipt the moment your landlord logs your payment. Your name, landlord PAN, rent amount, rental period, and address. Pre-filled every month. Download as PDF. Submit to your employer for HRA exemption. No requests, no waiting.
          </p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[['Section 10(13A)', 'Legally valid'], ['Landlord PAN', 'Auto-filled'], ['PDF download', 'Instant'], ['Yearly bundle', 'One click']].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: 'rgba(201,122,58,.8)', textTransform: 'uppercase' }}>{k}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#F6F4EE', marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 32px', textAlign: 'center', background: 'var(--rb-canvas)' }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>FREE FOR TENANTS</div>
        <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, letterSpacing: '-.025em', marginBottom: 16 }}>
          Join your rental in one tap.
        </h2>
        <p style={{ fontSize: 16, color: 'var(--rb-ink-2)', marginBottom: 32, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          Ask your landlord for an invite link, or sign in if they&apos;ve already added you. No install required on web.
        </p>
        <a href="/signup" className="btn btn-primary" style={{ padding: '13px 28px', fontSize: 16 }}>Get started free</a>
      </section>

      <MarketingFooter />
    </div>
  )
}
