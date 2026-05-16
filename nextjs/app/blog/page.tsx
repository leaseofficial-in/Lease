import type { Metadata } from 'next'
import { MarketingNav, MarketingFooter } from '@/components/marketing-shell'

export const metadata: Metadata = {
  title: 'Blog — Rental Tips for Landlords & Tenants in India | RentyBase',
  description: 'Guides on HRA exemption, rent receipts, security deposit law, and rental management for Indian landlords and tenants.',
  alternates: { canonical: 'https://rentybase.com/blog' },
  openGraph: {
    title: 'Blog — Rental Tips for Landlords & Tenants in India | RentyBase',
    description: 'HRA exemption, deposit rules, rent receipts, and more — practical guides for Indian rentals.',
    url: 'https://rentybase.com/blog',
  },
}

const posts = [
  {
    tag: 'HRA · TAX',
    title: 'How to claim HRA exemption under Section 10(13A): A complete guide',
    excerpt: 'HRA exemption is one of the largest tax-saving tools available to salaried employees in India. Here\'s exactly what you need, what qualifies, and how to submit receipts to your employer.',
    date: 'May 2025',
    slug: '#',
  },
  {
    tag: 'DEPOSITS',
    title: 'Security deposit deductions: what\'s legal and what isn\'t in India',
    excerpt: 'Landlords can legally deduct for unpaid rent and documented damage beyond normal wear, but not for pre-existing issues or cosmetic wear. Here\'s the law and what documentation protects both sides.',
    date: 'April 2025',
    slug: '#',
  },
  {
    tag: 'RECEIPTS',
    title: 'What must a rent receipt include to be valid for income tax?',
    excerpt: 'A valid HRA rent receipt needs: tenant name, landlord name and PAN (if rent > ₹1 lakh/year), amount, period, and property address. Missing any field can invalidate your claim.',
    date: 'April 2025',
    slug: '#',
  },
  {
    tag: 'LANDLORDS',
    title: 'Move-in checklist for Indian landlords: what to document before a tenant moves in',
    excerpt: 'A proper move-in inspection protects you at move-out. Here\'s a room-by-room checklist. Why timestamped, geotagged photos are the only documentation that holds up in disputes.',
    date: 'March 2025',
    slug: '#',
  },
  {
    tag: 'TENANTS',
    title: 'Section 80GG: HRA deduction for tenants who don\'t get HRA from their employer',
    excerpt: 'If you pay rent but don\'t receive HRA from your employer (or are self-employed), Section 80GG lets you claim up to ₹5,000/month as a deduction. Here\'s how it works.',
    date: 'March 2025',
    slug: '#',
  },
  {
    tag: 'REPAIRS',
    title: 'Repair responsibility in India: what the landlord must fix, what the tenant must fix',
    excerpt: 'Indian tenancy law (and most Leave & License agreements) divides maintenance into structural (landlord) and minor/day-to-day (tenant). Here\'s what falls where, and how to document every repair.',
    date: 'February 2025',
    slug: '#',
  },
]

export default function BlogPage() {
  return (
    <div className="lp-page">
      <MarketingNav />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 72, background: 'var(--rb-canvas-2)', borderBottom: '1px solid var(--rb-border)' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>BLOG</div>
          <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(36px,6vw,54px)', fontWeight: 400, lineHeight: 1.06, letterSpacing: '-.03em', marginBottom: 20 }}>
            Rental guides for<br /><em style={{ fontStyle: 'italic', color: 'var(--rb-action)' }}>India.</em>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--rb-ink-2)', maxWidth: 520 }}>
            HRA exemption, deposit law, receipts, and dispute prevention. Practical guides written for Indian landlords and tenants.
          </p>
        </div>
      </section>

      {/* Posts */}
      <section style={{ padding: '72px 0', background: 'var(--rb-canvas)' }}>
        <div className="container" style={{ maxWidth: 960 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 28 }}>
            {posts.map(p => (
              <article key={p.title} style={{ background: 'var(--rb-surface)', border: '1px solid var(--rb-border)', borderRadius: 18, padding: '28px 28px 32px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--rb-action)' }}>{p.tag}</div>
                  <div style={{ fontSize: 12, color: 'var(--rb-muted)' }}>{p.date}</div>
                </div>
                <h2 style={{ fontFamily: 'var(--rb-font-sans)', fontSize: 17, fontWeight: 600, lineHeight: 1.4, marginBottom: 12, color: 'var(--rb-ink)', flex: 1 }}>
                  <a href={p.slug} style={{ color: 'inherit', textDecoration: 'none' }}>{p.title}</a>
                </h2>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--rb-ink-2)', marginBottom: 20 }}>{p.excerpt}</p>
                <a href={p.slug} style={{ fontSize: 13, fontWeight: 600, color: 'var(--rb-action)', textDecoration: 'none' }}>Read more →</a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter / CTA */}
      <section style={{ padding: '80px 32px', textAlign: 'center', background: 'var(--rb-canvas-2)', borderTop: '1px solid var(--rb-border)' }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>FREE APP</div>
        <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, letterSpacing: '-.025em', marginBottom: 16 }}>
          Put the knowledge to work.
        </h2>
        <p style={{ fontSize: 16, color: 'var(--rb-ink-2)', marginBottom: 32, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          RentyBase handles HRA receipts, deposit tracking, and move-in proof automatically. Free for both landlord and tenant.
        </p>
        <a href="/signup" className="btn btn-primary" style={{ padding: '13px 28px', fontSize: 16 }}>Start free, no card needed</a>
      </section>

      <MarketingFooter />
    </div>
  )
}
