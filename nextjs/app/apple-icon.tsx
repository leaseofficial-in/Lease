import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// iOS applies its own squircle mask — no border-radius needed here
export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: 180, height: 180, display: 'flex', background: '#0E1413' }}>
      <svg viewBox="0 0 200 200" width={180} height={180} xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="200" height="200" fill="#0E1413" />
        <path d="M100 22 L176 88 V162 a14 14 0 0 1 -14 14 H38 a14 14 0 0 1 -14 -14 V88 Z" fill="#F6F4EE" />
        <path d="M62 178 V128 a38 38 0 0 1 76 0 V178 Z" fill="#0E1413" />
        <rect x="60" y="172" width="80" height="6" rx="1" fill="#C97A3A" />
        <circle cx="100" cy="46" r="3.2" fill="#C97A3A" />
      </svg>
    </div>,
    { width: 180, height: 180 }
  )
}
