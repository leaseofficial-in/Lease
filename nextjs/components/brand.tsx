export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      <rect width="40" height="40" rx="9" fill="#0E1413"/>
      <path d="M20 7 L34 19 V31 a3 3 0 0 1 -3 3 H9 a3 3 0 0 1 -3 -3 V19 Z" fill="#F6F4EE"/>
      <path d="M13 34 V25 a7 7 0 0 1 14 0 V34 Z" fill="#0E1413"/>
      <rect x="13" y="33" width="14" height="1.4" fill="#C97A3A"/>
      <circle cx="20" cy="11" r="0.9" fill="#C97A3A"/>
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
        fontFamily: 'var(--rb-font-sans)',
        fontWeight: 700,
        fontSize,
        letterSpacing: '-.022em',
        color: textColor,
        lineHeight: 1,
      }}>
        Renty<span style={{ color: '#C97A3A' }}>Base</span>
      </span>
    </span>
  )
}
