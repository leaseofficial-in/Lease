import type { Metadata } from 'next'
import { MarketingNav, MarketingFooter } from '@/components/marketing-shell'
import { ContactForm } from './ContactForm'

export const metadata: Metadata = {
  title: 'Contact — RentyBase',
  description: 'Get in touch with the RentyBase team. We answer product questions, HRA receipt help, partnership enquiries, and more. Typical response: 1–2 business days.',
  alternates: { canonical: 'https://rentybase.com/contact' },
  openGraph: {
    title: 'Contact RentyBase',
    description: 'Questions about rent receipts, deposits, or your account? We read every message.',
    url: 'https://rentybase.com/contact',
  },
}

export default function ContactPage() {
  return (
    <div className="lp-page">
      <MarketingNav />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 64, background: 'var(--rb-canvas-2)', borderBottom: '1px solid var(--rb-border)' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>CONTACT</div>
          <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(36px,5vw,52px)', fontWeight: 400, lineHeight: 1.06, letterSpacing: '-.03em', marginBottom: 18 }}>
            Talk to us.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--rb-ink-2)', maxWidth: 520 }}>
            We read every message. Typical response time is 1–2 business days.
          </p>
        </div>
      </section>

      {/* Main content */}
      <section style={{ padding: '72px 0 96px', background: 'var(--rb-canvas)' }}>
        <div className="container" style={{ maxWidth: 960, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '48px 80px', alignItems: 'start' }}>

          {/* Form */}
          <ContactForm />

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingTop: 8 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--rb-ink-3)', marginBottom: 16 }}>EMAIL US DIRECTLY</div>
              <a href="mailto:hello@rentybase.com" style={{ fontSize: 18, fontWeight: 600, color: 'var(--rb-action)', textDecoration: 'none' }}>
                hello@rentybase.com
              </a>
              <p style={{ fontSize: 14, color: 'var(--rb-ink-3)', marginTop: 8, lineHeight: 1.6 }}>We aim to respond within 1–2 business days.</p>
            </div>

            <div style={{ height: 1, background: 'var(--rb-border)' }} />

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--rb-ink-3)', marginBottom: 16 }}>QUICK ANSWERS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { q: 'Is RentyBase free?', a: 'Yes. All features, forever free.', href: '/features' },
                  { q: 'How do HRA receipts work?', a: 'Auto-generated, Section 10(13A) valid.', href: '/tools' },
                  { q: 'For landlords vs tenants?', a: 'Both get full access, both are free.', href: '/for/landlords' },
                ].map(item => (
                  <a key={item.q} href={item.href} style={{ textDecoration: 'none' }}>
                    <div style={{ background: 'var(--rb-surface)', border: '1px solid var(--rb-border)', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--rb-ink)', marginBottom: 4 }}>{item.q}</div>
                      <div style={{ fontSize: 13, color: 'var(--rb-ink-3)' }}>{item.a}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--rb-border)' }} />

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--rb-ink-3)', marginBottom: 12 }}>RESPONSE TIMES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Account / billing', '< 4 hours'],
                  ['Product questions', '1–2 business days'],
                  ['Partnership enquiries', '2–3 business days'],
                  ['Press / media', '1–2 business days'],
                ].map(([type, time]) => (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--rb-ink-2)' }}>{type}</span>
                    <span style={{ color: 'var(--rb-ink-3)', fontFamily: 'var(--rb-font-mono)', fontSize: 12 }}>{time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
