import type { Metadata } from 'next'
import { MarketingNav, MarketingFooter } from '@/components/marketing-shell'
import { BreadcrumbStructuredData } from '@/components/structured-data'
import { BLOG_POSTS } from '@/data/blog-posts'

export const metadata: Metadata = {
  title: 'Rental Guides for Indian Landlords & Tenants — HRA, Deposits & Law',
  description:
    'Expert guides on HRA exemption (Section 10(13A)), Section 80GG, security deposit deduction law, valid rent receipts for income tax, and dispute prevention. Written for Indian rental law.',
  alternates: { canonical: 'https://rentybase.com/blog' },
  openGraph: {
    title: 'Rental Guides for Indian Landlords & Tenants — HRA, Deposits & Law | RentyBase',
    description:
      'Practical guides on HRA exemption, security deposit law, rent receipts for income tax, and landlord-tenant rights in India.',
    url: 'https://rentybase.com/blog',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'RentyBase Blog' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rental Guides for India — HRA, Deposits & Tenant Rights | RentyBase',
    description: 'Practical guides on HRA, security deposits, rent receipts, and Indian rental law.',
  },
}

const posts = BLOG_POSTS.map(p => ({
  tag: p.tag.toUpperCase(),
  title: p.title,
  excerpt: p.excerpt,
  date: p.date,
  href: `/blog/${p.slug}`,
}))

export default function BlogPage() {
  return (
    <div className="lp-page">
      <BreadcrumbStructuredData items={[
        { name: 'Home', url: 'https://rentybase.com' },
        { name: 'Blog', url: 'https://rentybase.com/blog' },
      ]} />
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
                  <a href={p.href} style={{ color: 'inherit', textDecoration: 'none' }}>{p.title}</a>
                </h2>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--rb-ink-2)', marginBottom: 20 }}>{p.excerpt}</p>
                <a href={p.href} style={{ fontSize: 13, fontWeight: 600, color: 'var(--rb-action)', textDecoration: 'none' }}>Read more →</a>
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
