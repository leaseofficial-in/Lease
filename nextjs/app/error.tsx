'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/analytics/report-error'

/**
 * Route-level error boundary. Without this, an uncaught render error anywhere in the
 * app tree shows Next's default error screen — unbranded, and with no recovery path
 * short of a manual reload.
 *
 * `reset()` re-renders the segment, which is enough to recover from transient
 * failures (a Supabase blip, a failed fetch during render).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Vercel captures this in runtime logs, which nobody watches. reportError also
    // records it to client_errors so it is queryable after the fact.
    console.error('[app/error]', error)
    reportError(error, 'app/error')
  }, [error])

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--rb-canvas, #F6F4EE)',
      }}
    >
      <div style={{ maxWidth: 460, textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'var(--rb-font-mono, monospace)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: 'var(--rb-action, #0F4C5C)',
            marginBottom: 14,
          }}
        >
          Something broke
        </p>
        <h1
          style={{
            fontFamily: 'var(--rb-font-display, Georgia, serif)',
            fontSize: 34,
            fontWeight: 400,
            lineHeight: 1.12,
            letterSpacing: '-.025em',
            marginBottom: 14,
            color: 'var(--rb-ink, #0E1413)',
          }}
        >
          We hit an unexpected error.
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--rb-ink-2, #2A332F)', marginBottom: 26 }}>
          Your data is safe. Try again — if this keeps happening, email{' '}
          <a href="mailto:hello@rentybase.com" style={{ color: 'var(--rb-action, #0F4C5C)' }}>
            hello@rentybase.com
          </a>
          {error.digest ? ` and quote reference ${error.digest}.` : '.'}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={reset}
            style={{
              background: 'var(--rb-action, #0F4C5C)',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              padding: '12px 26px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              background: 'transparent',
              color: 'var(--rb-ink-2, #2A332F)',
              border: '1px solid var(--rb-border, #DDD8CC)',
              borderRadius: 999,
              padding: '12px 26px',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Go home
          </a>
        </div>
      </div>
    </main>
  )
}
