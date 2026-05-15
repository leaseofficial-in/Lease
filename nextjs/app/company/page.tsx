import type { Metadata } from 'next'
import { MarketingNav, MarketingFooter } from '@/components/marketing-shell'

export const metadata: Metadata = {
  title: 'About RentyBase — India\'s Rental OS',
  description: 'RentyBase is building the shared record layer for Indian rentals — HRA receipts, rent ledgers, move-in proof, and deposit tracking. Free for landlords and tenants.',
  alternates: { canonical: 'https://rentybase.com/company' },
  openGraph: {
    title: 'About RentyBase — India\'s Rental OS',
    description: 'The story behind RentyBase and why we\'re making rental management free for every landlord and tenant in India.',
    url: 'https://rentybase.com/company',
  },
}

const values = [
  {
    title: 'Both sides matter',
    body: 'Every feature we build serves both landlord and tenant equally. A rent receipt that only the tenant can download isn\'t a feature — it\'s a tool. We build shared records, not one-sided tools.',
  },
  {
    title: 'Free is the only tier',
    body: 'HRA receipts, deposit tracking, move-in proof, repair logs — everything is free. We don\'t believe the infrastructure of a rental relationship should require a subscription.',
  },
  {
    title: 'Permanence over convenience',
    body: 'WhatsApp messages disappear. Spreadsheets get deleted. We build for permanence — tamper-proof photos, sealed records, and a ledger both sides can always access.',
  },
  {
    title: 'Built for India',
    body: 'INR currency. Section 10(13A) HRA compliance. UPI and NEFT payment logging. Leave & License agreements. We\'re not a global product adapted for India — we\'re built here from the start.',
  },
]

export default function CompanyPage() {
  return (
    <div className="lp-page">
      <MarketingNav />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 80, background: 'linear-gradient(160deg,#0F4C5C 0%,#163A47 55%,#0E1413 100%)', color: '#F6F4EE' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(201,122,58,.9)', marginBottom: 18 }}>COMPANY</div>
          <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(36px,6vw,60px)', fontWeight: 400, lineHeight: 1.04, letterSpacing: '-.032em', marginBottom: 24, color: '#F6F4EE' }}>
            The rental record<br /><em style={{ fontStyle: 'italic', color: '#C97A3A' }}>India was missing.</em>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.65, color: 'rgba(246,244,238,.75)', maxWidth: 580 }}>
            RentyBase gives every Indian landlord and tenant a single shared record for their rental — from the first payment to the final deposit settlement. Free.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section style={{ padding: '80px 0', background: 'var(--rb-canvas)' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="eyebrow" style={{ marginBottom: 20 }}>WHY WE EXIST</div>
          <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(26px,4vw,40px)', fontWeight: 400, lineHeight: 1.1, letterSpacing: '-.025em', marginBottom: 28 }}>
            Indian rentals run on WhatsApp screenshots and faith.
          </h2>
          <div style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--rb-ink-2)', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p>
              Most rental transactions in India happen with no shared record. A landlord sends a WhatsApp message confirming rent received. A tenant screenshots it. The deposit is tracked in a notebook. Move-in condition is undocumented. HRA receipts are generated manually in Word — or not at all.
            </p>
            <p>
              This creates predictable problems: disputes at move-out over damage that was pre-existing, confusion about deposit deductions, tenants unable to claim HRA exemption because receipts weren't issued on time, landlords with no legal documentation if a tenant stops paying.
            </p>
            <p>
              RentyBase is a shared record layer for the rental relationship. Everything that matters — payments, receipts, photos, deposits, repairs — lives in one place both sides can always access. We don't take sides. We give both sides a record they can trust.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: '80px 0', background: 'var(--rb-canvas-2)', borderTop: '1px solid var(--rb-border)', borderBottom: '1px solid var(--rb-border)' }}>
        <div className="container" style={{ maxWidth: 960 }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>WHAT WE BELIEVE</div>
            <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(26px,4vw,38px)', fontWeight: 400, letterSpacing: '-.025em' }}>The principles behind every decision</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
            {values.map(v => (
              <div key={v.title} style={{ background: 'var(--rb-surface)', border: '1px solid var(--rb-border)', borderRadius: 18, padding: '28px 28px 32px' }}>
                <h3 style={{ fontFamily: 'var(--rb-font-sans)', fontSize: 17, fontWeight: 600, marginBottom: 12, color: 'var(--rb-ink)' }}>{v.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--rb-ink-2)' }}>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section style={{ padding: '80px 0', background: 'var(--rb-canvas)' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 40 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 16 }}>CONTACT</div>
              <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(24px,4vw,34px)', fontWeight: 400, letterSpacing: '-.025em', marginBottom: 16 }}>
                Talk to us.
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--rb-ink-2)', marginBottom: 24 }}>
                For product questions, partnership enquiries, or anything else — we read every email.
              </p>
              <a
                href="mailto:hello@rentybase.com"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: 'var(--rb-action)', textDecoration: 'none' }}
              >
                <span>hello@rentybase.com</span>
                <span style={{ fontSize: 14 }}>→</span>
              </a>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 16 }}>GET STARTED</div>
              <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(24px,4vw,34px)', fontWeight: 400, letterSpacing: '-.025em', marginBottom: 16 }}>
                Your first rental is free.
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--rb-ink-2)', marginBottom: 24 }}>
                No card, no trial period, no tiers. Sign up and start — your tenant joins free too.
              </p>
              <a href="/signup" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15 }}>Start free →</a>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
