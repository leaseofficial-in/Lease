import type { Metadata } from 'next'
import { MarketingNav, MarketingFooter } from '@/components/marketing-shell'

export const metadata: Metadata = {
  title: 'RentyBase vs NoBroker Rent Manager — Compare Rental Apps India',
  description: 'How does RentyBase compare to NoBroker, manual spreadsheets, and WhatsApp-based tracking? See the full comparison of features, pricing, and HRA receipt support.',
  alternates: { canonical: 'https://rentybase.com/compare' },
  openGraph: {
    title: 'RentyBase vs NoBroker Rent Manager — Compare Rental Apps India',
    description: 'RentyBase vs NoBroker vs spreadsheets: feature-by-feature comparison for Indian landlords and tenants.',
    url: 'https://rentybase.com/compare',
  },
}

const rows = [
  { feature: 'Price', rb: 'Free forever', nobroker: '₹249–999/month', manual: 'Free' },
  { feature: 'HRA rent receipts (Section 10(13A))', rb: '✓ Auto-generated', nobroker: 'Paid plans only', manual: '✗ Manual Word/PDF' },
  { feature: 'Shared ledger (landlord + tenant)', rb: '✓ Real-time', nobroker: '✗ Landlord only', manual: '✗ Not shared' },
  { feature: 'UTR / payment reference', rb: '✓ Per payment', nobroker: 'Partial', manual: '✗ Manual entry' },
  { feature: 'Move-in photo proof (tamper-proof)', rb: '✓ Sealed & geotagged', nobroker: '✗', manual: '✗' },
  { feature: 'Security deposit ledger', rb: '✓ With deduction reasons', nobroker: 'Basic', manual: '✗ Spreadsheet' },
  { feature: 'Repair request tracking', rb: '✓ Full status history', nobroker: '✗', manual: '✗' },
  { feature: 'Tenant app access', rb: '✓ Free', nobroker: 'Limited', manual: '✗' },
  { feature: 'Yearly HRA PDF bundle', rb: '✓ One click', nobroker: 'Paid only', manual: '✗ Manual compile' },
  { feature: 'Works on web + mobile', rb: '✓', nobroker: 'App only', manual: '✓ (Excel)' },
]

const alternatives = [
  {
    title: 'RentyBase vs NoBroker Rent Manager',
    body: 'NoBroker\'s rent manager charges ₹249–999/month and locks HRA receipts behind paid plans. RentyBase generates Section 10(13A)-valid receipts automatically, free for every payment and gives both landlord and tenant real-time access to the same ledger.',
  },
  {
    title: 'RentyBase vs Manual Tracking (Excel / WhatsApp)',
    body: 'Spreadsheets have no tenant access, no automatic receipt generation, and no move-in proof. WhatsApp messages disappear, can be edited, and have no legal standing. RentyBase gives you a permanent, tamper-proof record that both sides can access.',
  },
  {
    title: 'RentyBase vs Housing / MagicBricks rent tools',
    body: 'Portal rent tools are designed for listing, not ongoing management. They don\'t track payments, generate HRA receipts, or handle move-in/move-out proof. RentyBase is purpose-built for the full rental lifecycle. From day one to the final deposit settlement.',
  },
]

export default function ComparePage() {
  return (
    <div className="lp-page">
      <MarketingNav />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 80, background: 'var(--rb-canvas-2)', borderBottom: '1px solid var(--rb-border)' }}>
        <div className="container" style={{ maxWidth: 800, textAlign: 'center' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>COMPARE</div>
          <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(36px,6vw,56px)', fontWeight: 400, lineHeight: 1.06, letterSpacing: '-.03em', marginBottom: 20 }}>
            RentyBase vs everything<br /><em style={{ fontStyle: 'italic', color: 'var(--rb-action)' }}>else.</em>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.65, color: 'var(--rb-ink-2)', maxWidth: 560, margin: '0 auto 36px' }}>
            How does RentyBase stack up against NoBroker, manual spreadsheets, and WhatsApp tracking? Here's the full picture.
          </p>
        </div>
      </section>

      {/* Comparison table */}
      <section style={{ padding: '72px 0', background: 'var(--rb-canvas)' }}>
        <div className="container" style={{ maxWidth: 960 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '14px 16px', fontWeight: 600, fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--rb-ink-3)', borderBottom: '2px solid var(--rb-border)', minWidth: 200 }}>Feature</th>
                  <th style={{ textAlign: 'center', padding: '14px 20px', fontWeight: 700, color: 'var(--rb-action)', borderBottom: '2px solid var(--rb-action)', background: 'var(--rb-action-soft)', borderRadius: '4px 4px 0 0', minWidth: 160 }}>RentyBase</th>
                  <th style={{ textAlign: 'center', padding: '14px 20px', fontWeight: 600, color: 'var(--rb-ink-3)', borderBottom: '2px solid var(--rb-border)', minWidth: 140 }}>NoBroker</th>
                  <th style={{ textAlign: 'center', padding: '14px 20px', fontWeight: 600, color: 'var(--rb-ink-3)', borderBottom: '2px solid var(--rb-border)', minWidth: 140 }}>Manual / WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.feature} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--rb-fill)' }}>
                    <td style={{ padding: '14px 16px', color: 'var(--rb-ink)', fontWeight: 500, borderBottom: '1px solid var(--rb-border-soft)' }}>{r.feature}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: 'var(--rb-action)', fontWeight: 600, borderBottom: '1px solid var(--rb-border-soft)', background: 'rgba(221,232,235,.3)' }}>{r.rb}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: 'var(--rb-ink-2)', borderBottom: '1px solid var(--rb-border-soft)' }}>{r.nobroker}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: 'var(--rb-ink-2)', borderBottom: '1px solid var(--rb-border-soft)' }}>{r.manual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: 'var(--rb-muted)', marginTop: 16, textAlign: 'center' }}>Comparison based on publicly available information. NoBroker pricing as of 2025.</p>
        </div>
      </section>

      {/* Detailed comparisons */}
      <section style={{ padding: '72px 0', background: 'var(--rb-canvas-2)', borderTop: '1px solid var(--rb-border)' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>IN DETAIL</div>
            <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(26px,4vw,38px)', fontWeight: 400, letterSpacing: '-.025em' }}>Why renters switch to RentyBase</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {alternatives.map(a => (
              <div key={a.title} style={{ background: 'var(--rb-surface)', border: '1px solid var(--rb-border)', borderRadius: 18, padding: '32px' }}>
                <h3 style={{ fontFamily: 'var(--rb-font-sans)', fontSize: 18, fontWeight: 600, marginBottom: 14, color: 'var(--rb-ink)' }}>{a.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--rb-ink-2)' }}>{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 32px', textAlign: 'center', background: 'linear-gradient(160deg,#0F4C5C 0%,#0E1413 100%)', color: '#F6F4EE' }}>
        <div className="eyebrow" style={{ marginBottom: 16, color: 'rgba(201,122,58,.9)' }}>FREE · FOREVER</div>
        <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, letterSpacing: '-.025em', marginBottom: 16 }}>
          Switch takes under a minute.
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(246,244,238,.7)', marginBottom: 32, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          No migration. No credit card. Your tenant joins free. Start with one rental and add more any time.
        </p>
        <a href="/signup" className="btn btn-primary" style={{ padding: '13px 28px', fontSize: 16 }}>Start free, no card needed</a>
      </section>

      <MarketingFooter />
    </div>
  )
}
