import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Stage } from '@/lib/admin/activation'

// ─── Admin building blocks ───────────────────────────────────────────────────
// Server-safe (no hooks). Colours come from the --rb-* tokens in globals.css so
// the admin reads as part of the same product.

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[28px] leading-tight text-[var(--rb-ink)]" style={{ fontFamily: 'var(--rb-font-display)' }}>{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--rb-ink-3)]">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function Card({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[var(--rb-radius-lg)] border border-[var(--rb-border)] bg-[var(--rb-surface)] shadow-[var(--rb-shadow-sm)] ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--rb-border-soft)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--rb-ink)]">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

type Tone = 'neutral' | 'action' | 'success' | 'warning' | 'danger' | 'accent'

const TONE: Record<Tone, string> = {
  neutral: 'bg-[var(--rb-fill)] text-[var(--rb-ink-2)] border-[var(--rb-border)]',
  action: 'bg-[var(--rb-action-soft)] text-[var(--rb-action)] border-transparent',
  success: 'bg-[var(--rb-success-soft)] text-[var(--rb-success)] border-transparent',
  warning: 'bg-[var(--rb-warning-soft)] text-[var(--rb-warning)] border-transparent',
  danger: 'bg-[var(--rb-danger-soft)] text-[var(--rb-danger)] border-transparent',
  accent: 'bg-[var(--rb-accent-soft)] text-[var(--rb-accent-hover)] border-transparent',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE[tone]}`}>
      {children}
    </span>
  )
}

export const STAGE_META: Record<Stage, { label: string; tone: Tone; hint: string }> = {
  activated: { label: 'Activated', tone: 'success', hint: 'Rent has been paid through the app' },
  almost_there: { label: 'Almost there', tone: 'action', hint: 'Has a rental, no paid rent yet' },
  new: { label: 'New', tone: 'accent', hint: 'Signed up in the last 3 days' },
  stuck: { label: 'Stuck', tone: 'warning', hint: 'No rental after 3+ days' },
  dormant: { label: 'Dormant', tone: 'neutral', hint: 'Activated but not seen in 30 days' },
  onboarding: { label: 'No role', tone: 'danger', hint: 'Signed in but never picked landlord or tenant' },
}

export function StageBadge({ stage }: { stage: Stage }) {
  const m = STAGE_META[stage]
  return <span title={m.hint}><Badge tone={m.tone}>{m.label}</Badge></span>
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? '—'
  const tone: Tone =
    ['paid', 'active', 'sent', 'succeeded', 'completed', 'signed', 'activated'].includes(s) ? 'success'
      : ['overdue', 'failed', 'rejected', 'dispute'].includes(s) ? 'danger'
        : ['pending', 'partial', 'pending_tenant', 'pending_proof', 'skipped', 'running'].includes(s) ? 'warning'
          : 'neutral'
  return <Badge tone={tone}>{s.replace(/_/g, ' ')}</Badge>
}

export function Stat({ label, value, hint, href, tone }: { label: string; value: ReactNode; hint?: ReactNode; href?: string; tone?: 'danger' | 'warning' }) {
  const color = tone === 'danger' ? 'text-[var(--rb-danger)]' : tone === 'warning' ? 'text-[var(--rb-warning)]' : 'text-[var(--rb-ink)]'
  const body = (
    <div className="h-full rounded-[var(--rb-radius-md)] border border-[var(--rb-border)] bg-[var(--rb-surface)] p-4 transition-colors hover:border-[var(--rb-border-strong)]">
      <div className="text-xs font-medium text-[var(--rb-ink-3)]">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-[var(--rb-ink-3)]">{hint}</div>}
    </div>
  )
  return href ? <Link href={href} className="block">{body}</Link> : body
}

export function Avatar({ name, url, size = 32 }: { name: string | null | undefined; url?: string | null; size?: number }) {
  const initials = (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} referrerPolicy="no-referrer" />
  }
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--rb-action-soft)] text-xs font-semibold text-[var(--rb-action)]" style={{ width: size, height: size }}>
      {initials}
    </span>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-[var(--rb-ink-3)]">{children}</p>
}

/** A definition row: label on the left, value on the right. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--rb-border-soft)] py-2 text-sm last:border-b-0">
      <span className="shrink-0 text-[var(--rb-ink-3)]">{label}</span>
      <span className="min-w-0 break-words text-right text-[var(--rb-ink)]">{children}</span>
    </div>
  )
}

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  align?: 'right'
  /** Hide on the phone card layout. */
  desktopOnly?: boolean
}

/**
 * A table on wide screens, a stack of cards on phones. Same columns for both, so
 * the two layouts cannot drift.
 */
export function DataTable<T>({ rows, columns, rowKey, empty = 'Nothing here.' }: { rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string; empty?: string }) {
  if (rows.length === 0) return <Empty>{empty}</Empty>
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--rb-border)] text-left text-xs text-[var(--rb-ink-3)]">
              {columns.map((c) => (
                <th key={c.key} className={`px-3 py-2 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} className="border-b border-[var(--rb-border-soft)] last:border-b-0 hover:bg-[var(--rb-canvas)]">
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2 align-middle ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>{c.cell(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} className="rounded-[var(--rb-radius-md)] border border-[var(--rb-border)] p-3">
            {columns.filter((c) => !c.desktopOnly).map((c, i) => (
              i === 0
                ? <div key={c.key} className="mb-2">{c.cell(r)}</div>
                : (
                  <div key={c.key} className="flex items-center justify-between gap-3 py-0.5 text-sm">
                    <span className="text-xs text-[var(--rb-ink-3)]">{c.header}</span>
                    <span className="min-w-0 text-right">{c.cell(r)}</span>
                  </div>
                )
            ))}
          </li>
        ))}
      </ul>
    </>
  )
}

/** Horizontal bars for small series, e.g. signups per week. No chart library. */
export function MiniBars({ data, label }: { data: { key: string; value: number; title: string }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <figure>
      <div className="flex h-28 items-end gap-1" role="img" aria-label={label}>
        {data.map((d) => (
          <div key={d.key} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.title}: ${d.value}`}>
            <div
              className="rounded-t-[4px] bg-[var(--rb-action)] opacity-80 transition-opacity group-hover:opacity-100"
              style={{ height: `${Math.max(d.value === 0 ? 0 : 4, (d.value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between text-[11px] text-[var(--rb-ink-3)]">
        <span>{data[0]?.title}</span>
        <span>{data[data.length - 1]?.title}</span>
      </figcaption>
    </figure>
  )
}
