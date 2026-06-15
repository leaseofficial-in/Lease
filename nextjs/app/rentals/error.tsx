'use client'

export default function RentalsError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--rb-canvas)', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <h1 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 30, fontWeight: 400, letterSpacing: '-.02em', color: 'var(--rb-ink)', marginBottom: 12 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, color: 'var(--rb-ink-3)', lineHeight: 1.65, marginBottom: 24 }}>
          We couldn&apos;t load this page. Please try again, or head back to browse rentals worldwide.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            style={{ padding: '10px 22px', borderRadius: 999, background: 'var(--rb-action)', color: '#fff', border: 0, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Try again
          </button>
          <a
            href="/rentals"
            style={{ padding: '10px 22px', borderRadius: 999, border: '1.5px solid var(--rb-border)', color: 'var(--rb-ink)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
          >
            ← All cities
          </a>
        </div>
      </div>
    </div>
  )
}
