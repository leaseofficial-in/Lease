import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = "RentyBase — India's Rental OS"

export default function OGImage() {
  return new ImageResponse(
    <div style={{ width: 1200, height: 630, background: '#0E1413', display: 'flex', fontFamily: 'system-ui, sans-serif' }}>

      {/* Left orange accent bar */}
      <div style={{ width: 10, height: '100%', background: '#C97A3A', flexShrink: 0 }} />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 80px' }}>

        {/* Logo mark + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 52 }}>
          <svg viewBox="0 0 200 200" width={72} height={72} xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="200" height="200" rx="40" fill="#1A2624" />
            <path d="M100 22 L176 88 V162 a14 14 0 0 1 -14 14 H38 a14 14 0 0 1 -14 -14 V88 Z" fill="#F6F4EE" />
            <path d="M62 178 V128 a38 38 0 0 1 76 0 V178 Z" fill="#0E1413" />
            <rect x="60" y="172" width="80" height="6" rx="1" fill="#C97A3A" />
            <circle cx="100" cy="46" r="3.2" fill="#C97A3A" />
          </svg>
          <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.03em', color: '#F6F4EE' }}>
            Renty<span style={{ color: '#C97A3A' }}>Base</span>
          </span>
        </div>

        {/* Headline */}
        <div style={{ color: '#F6F4EE', fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.035em', marginBottom: 28 }}>
          India's<br />Rental OS.
        </div>

        {/* Subtitle */}
        <div style={{ color: 'rgba(246,244,238,0.55)', fontSize: 24, lineHeight: 1.5, marginBottom: 48 }}>
          Rent · Repairs · Agreements · Deposits · HRA
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['For Landlords', 'For Tenants', 'HRA Receipts', 'Repair Tracking', 'E-Agreements'].map(label => (
            <div key={label} style={{
              padding: '8px 18px',
              borderRadius: 999,
              background: 'rgba(246,244,238,0.07)',
              border: '1px solid rgba(246,244,238,0.14)',
              color: 'rgba(246,244,238,0.7)',
              fontSize: 15,
              fontWeight: 500,
            }}>{label}</div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width: 320, background: '#111D1B', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: 0, padding: '40px 28px' }}>
        {[
          { emoji: '🏠', label: 'Properties' },
          { emoji: '💳', label: 'Payments' },
          { emoji: '🛠', label: 'Repairs' },
          { emoji: '📋', label: 'Agreements' },
          { emoji: '💬', label: 'Messages' },
        ].map(item => (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px',
            borderRadius: 12,
            margin: '5px 0',
            background: 'rgba(246,244,238,0.04)',
            border: '1px solid rgba(246,244,238,0.07)',
          }}>
            <span style={{ fontSize: 22 }}>{item.emoji}</span>
            <span style={{ color: 'rgba(246,244,238,0.65)', fontSize: 16, fontWeight: 500 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>,
    { width: 1200, height: 630 }
  )
}
