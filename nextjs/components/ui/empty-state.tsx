// ─── EmptyState ───────────────────────────────────────────────────────────────
//
// The dashboard renders fourteen "nothing here yet" blocks. Eight of them are the
// same markup verbatim: a centred wrapper, a 32px muted icon, one line of copy.
// The other six vary (an emoji instead of an icon, a CTA button, extra margin) and
// are left alone — this absorbs only the exact repeats, so migrating changes no
// pixels.
//
// The icon is passed as a node rather than a name so this stays independent of the
// dashboard's local <Icon> component and can be used from any surface.
//
// Empty states are where a new user decides whether the product has anything for
// them. Having them in one place means the copy and the call-to-action can be
// improved once, everywhere.

import type { CSSProperties, ReactNode } from 'react'

// Verbatim from the dashboard's `emptyStyle` and the inline icon wrapper.
const WRAPPER: CSSProperties = { textAlign: 'center', padding: '40px 20px', color: 'var(--rb-ink-3)' }
const ICON: CSSProperties = { marginBottom: 12, color: 'var(--rb-ink-3)' }

export interface EmptyStateProps {
  /** e.g. <Icon k="file" size={32} stroke={1.5} /> */
  icon?: ReactNode
  /** The one-line explanation. Rendered in a <p>. */
  children: ReactNode
  /** Optional call to action, rendered beneath the copy. */
  action?: ReactNode
  style?: CSSProperties
}

export function EmptyState({ icon, children, action, style }: EmptyStateProps) {
  return (
    <div style={{ ...WRAPPER, ...style }} role="status">
      {icon ? <div style={ICON}>{icon}</div> : null}
      <p>{children}</p>
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
  )
}
