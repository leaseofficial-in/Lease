// Presentational pieces shared by every /blog/<slug> article page.
// Prose styling is scoped via the .rb-article class defined in globals.css.

import Link from 'next/link'
import type { ReactNode } from 'react'
import type { BlogPost } from '@/data/blog-posts'

export function ArticleBreadcrumb({ current }: { current: string }) {
  return (
    <div style={{ paddingTop: 96, background: 'var(--rb-canvas-2)' }}>
      <div className="container" style={{ maxWidth: 1080, fontSize: 13, color: 'var(--rb-muted)' }}>
        <Link href="/" style={{ color: 'var(--rb-muted)', textDecoration: 'none' }}>Home</Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <Link href="/blog" style={{ color: 'var(--rb-muted)', textDecoration: 'none' }}>Blog</Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <span style={{ color: 'var(--rb-ink-2)' }}>{current}</span>
      </div>
    </div>
  )
}

export function ArticleHero({ post }: { post: BlogPost }) {
  return (
    <section style={{ padding: '28px 0 56px', background: 'var(--rb-canvas-2)', borderBottom: '1px solid var(--rb-border)' }}>
      <div className="container" style={{ maxWidth: 1080 }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--rb-action-soft)', color: 'var(--rb-action)',
            fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
            padding: '4px 11px', borderRadius: 99, marginBottom: 18,
          }}
        >
          {post.tagEmoji} {post.tag}
        </span>
        <h1
          style={{
            fontFamily: 'var(--rb-font-display)', fontSize: 'clamp(28px,4.4vw,44px)', fontWeight: 400,
            lineHeight: 1.13, letterSpacing: '-.025em', marginBottom: 18, maxWidth: 760,
          }}
        >
          {post.title}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 13, color: 'var(--rb-muted)' }}>
          <span>By RentyBase</span>
          <Dot />
          <span>{post.date}</span>
          <Dot />
          <span>{post.readTime}</span>
        </div>
      </div>
    </section>
  )
}

function Dot() {
  return <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--rb-border-strong)' }} />
}

export function ArticleLayout({ post, children }: { post: BlogPost; children: ReactNode }) {
  return (
    <section style={{ padding: '56px 0 72px', background: 'var(--rb-canvas)' }}>
      <div className="container rb-article-layout" style={{ maxWidth: 1080 }}>
        <div className="rb-article">{children}</div>
        <ArticleSidebar post={post} />
      </div>
    </section>
  )
}

function ArticleSidebar({ post }: { post: BlogPost }) {
  return (
    <aside className="rb-article-sidebar">
      <div style={cardStyle}>
        <h4 style={cardHeadStyle}>In this article</h4>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9, margin: 0, padding: 0 }}>
          {post.toc.map(t => (
            <li key={t} style={{ fontSize: 13, color: 'var(--rb-ink-3)', lineHeight: 1.45 }}>{t}</li>
          ))}
        </ul>
      </div>

      <div style={{ ...cardStyle, background: 'var(--rb-action)', border: 'none', color: '#fff' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Free for landlords and tenants</div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', marginBottom: 16, lineHeight: 1.6 }}>
          Automatic reminders, tax-compliant receipts, deposit tracking, and move-in photo proof. Set up in 5 minutes.
        </p>
        <a
          href="/signup"
          style={{
            display: 'block', textAlign: 'center', background: '#fff', color: 'var(--rb-action)',
            fontSize: 13, fontWeight: 600, padding: '10px 16px', borderRadius: 10, textDecoration: 'none',
          }}
        >
          Get started free
        </a>
      </div>

      <div style={cardStyle}>
        <h4 style={cardHeadStyle}>Related</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {post.related.map(r => (
            <a key={r.href} href={r.href} style={{ fontSize: 13, color: 'var(--rb-ink-2)', lineHeight: 1.5, textDecoration: 'none' }}>
              {r.label} →
            </a>
          ))}
        </div>
      </div>
    </aside>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--rb-surface)',
  border: '1px solid var(--rb-border)',
  borderRadius: 16,
  padding: 24,
  marginBottom: 20,
}

const cardHeadStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 14,
  color: 'var(--rb-ink)',
}

/** Highlighted aside inside article prose. */
export function Callout({
  tone = 'tip',
  title,
  children,
}: {
  tone?: 'tip' | 'warn' | 'danger' | 'success'
  title: string
  children: ReactNode
}) {
  const tones = {
    tip: { bg: 'var(--rb-action-soft)', bar: 'var(--rb-action)', label: 'var(--rb-action)' },
    warn: { bg: 'var(--rb-warning-soft)', bar: 'var(--rb-warning)', label: 'var(--rb-warning)' },
    danger: { bg: 'var(--rb-danger-soft)', bar: 'var(--rb-danger)', label: 'var(--rb-danger)' },
    success: { bg: 'var(--rb-success-soft)', bar: 'var(--rb-success)', label: 'var(--rb-success)' },
  }[tone]

  return (
    <div style={{ background: tones.bg, borderLeft: `4px solid ${tones.bar}`, borderRadius: 12, padding: '20px 24px', margin: '26px 0' }}>
      <strong style={{ display: 'block', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, color: tones.label }}>
        {title}
      </strong>
      <div style={{ fontSize: 14, color: 'var(--rb-ink-2)', lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

/** Responsive grid of small bordered cards (payment methods, etc.). */
export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, margin: '22px 0' }}>
      {children}
    </div>
  )
}

export function MiniCard({ title, badge, children }: { title: string; badge?: string; children: ReactNode }) {
  return (
    <div style={{ background: 'var(--rb-surface)', border: '1px solid var(--rb-border)', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--rb-ink)' }}>{title}</h4>
        {badge && (
          <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--rb-success-soft)', color: 'var(--rb-success)', padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>
            {badge}
          </span>
        )}
      </div>
      <p style={{ fontSize: 13, color: 'var(--rb-ink-3)', lineHeight: 1.6, margin: 0 }}>{children}</p>
    </div>
  )
}

/** Two-column allowed/not-allowed comparison. */
export function CompareColumns({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, margin: '24px 0' }}>
      {children}
    </div>
  )
}

export function CompareColumn({ tone, heading, items }: { tone: 'good' | 'bad'; heading: string; items: string[] }) {
  const good = tone === 'good'
  return (
    <div style={{ background: 'var(--rb-surface)', border: '1px solid var(--rb-border)', borderRadius: 12, overflow: 'hidden' }}>
      <div
        style={{
          background: good ? 'var(--rb-success-soft)' : 'var(--rb-danger-soft)',
          color: good ? 'var(--rb-success)' : 'var(--rb-danger)',
          fontSize: 13, fontWeight: 700, padding: '12px 18px',
        }}
      >
        {good ? '✓' : '✗'} {heading}
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {items.map(i => (
          <li key={i} style={{ fontSize: 13.5, color: 'var(--rb-ink-2)', lineHeight: 1.55 }}>{i}</li>
        ))}
      </ul>
    </div>
  )
}

/** Checkmark list in a tinted box. */
export function ChecklistBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ background: 'var(--rb-fill)', border: '1px solid var(--rb-border)', borderRadius: 14, padding: '22px 24px', margin: '24px 0' }}>
      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--rb-ink)' }}>{title}</h4>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(i => (
          <li key={i} style={{ fontSize: 14, color: 'var(--rb-ink-2)', lineHeight: 1.6, display: 'flex', gap: 10 }}>
            <span style={{ color: 'var(--rb-success)', fontWeight: 700 }}>✓</span>
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** In-body call to action. */
export function InlineCTA({ heading, body, href, label }: { heading: string; body: string; href: string; label: string }) {
  return (
    <div style={{ textAlign: 'center', marginTop: 44, padding: 32, background: 'var(--rb-fill)', border: '1px solid var(--rb-border)', borderRadius: 16 }}>
      <h3 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 22, fontWeight: 400, marginBottom: 10 }}>{heading}</h3>
      <p style={{ fontSize: 14, color: 'var(--rb-ink-3)', marginBottom: 20, lineHeight: 1.6 }}>{body}</p>
      <a href={href} className="btn btn-primary" style={{ padding: '12px 26px', fontSize: 15 }}>{label}</a>
    </div>
  )
}

/** Rendered FAQ block — mirrors the FAQPage JSON-LD so the answers are actually on the page. */
export function ArticleFAQ({ faqs }: { faqs: BlogPost['faqs'] }) {
  return (
    <>
      <h2>Frequently asked questions</h2>
      {faqs.map(f => (
        <div key={f.question} style={{ marginBottom: 22 }}>
          <h3>{f.question}</h3>
          <p>{f.answer}</p>
        </div>
      ))}
    </>
  )
}
