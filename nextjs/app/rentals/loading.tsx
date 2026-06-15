export default function RentalsLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--rb-canvas)' }}>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 34,
            height: 34,
            border: '3px solid rgba(15,76,92,.12)',
            borderTopColor: 'var(--rb-action)',
            borderRadius: '50%',
            animation: 'rbspin .7s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <style>{`@keyframes rbspin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ fontSize: 14, color: 'var(--rb-ink-3)' }}>Loading…</p>
      </div>
    </div>
  )
}
