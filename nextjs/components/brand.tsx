export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="200" height="200" rx="40" fill="#0E1413" />
      <path d="M100 22 L176 88 V162 a14 14 0 0 1 -14 14 H38 a14 14 0 0 1 -14 -14 V88 Z" fill="#F6F4EE" />
      <path d="M62 178 V128 a38 38 0 0 1 76 0 V178 Z" fill="#0E1413" />
      <text x="100" y="170" textAnchor="middle" fontFamily="Bricolage Grotesque, system-ui, sans-serif" fontSize="46" fontWeight="800" letterSpacing="-3" fill="#F6F4EE">RB</text>
      <rect x="60" y="172" width="80" height="6" rx="1" fill="#C97A3A" />
      <circle cx="100" cy="46" r="3.2" fill="#C97A3A" />
    </svg>
  )
}

interface LogoLockupProps {
  size?: number
  fontSize?: number
  dark?: boolean
  gap?: number
}

export function LogoLockup({ size = 32, fontSize = 20, dark = false, gap = 10 }: LogoLockupProps) {
  const textColor = dark ? '#F6F4EE' : '#0E1413'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap, textDecoration: 'none' }}>
      <LogoMark size={size} />
      <span style={{
        fontFamily: "'Bricolage Grotesque', var(--rb-font-display), system-ui, sans-serif",
        fontWeight: 800,
        fontSize,
        letterSpacing: '-.03em',
        color: textColor,
        lineHeight: 1,
      }}>
        Renty<span style={{ color: '#C97A3A' }}>Base</span>
      </span>
    </span>
  )
}
