'use client'

import { useEffect } from 'react'

/**
 * Last-resort boundary for errors thrown in the root layout itself. It replaces the
 * whole document, so it must render its own <html>/<body> and cannot rely on any
 * provider, font variable, or stylesheet from the layout that just failed — hence
 * the fully inline styling.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app/global-error]', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#F6F4EE',
          color: '#0E1413',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif',
        }}
      >
        <main style={{ maxWidth: 440, textAlign: 'center' }}>
          <h1 style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.15, margin: '0 0 14px' }}>
            RentyBase is temporarily unavailable
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: '#2A332F', margin: '0 0 26px' }}>
            Your data is safe. Please try again in a moment
            {error.digest ? `, quoting reference ${error.digest}` : ''}.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#0F4C5C',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              padding: '12px 26px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  )
}
