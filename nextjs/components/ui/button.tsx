'use client'

// ─── Button ───────────────────────────────────────────────────────────────────
//
// The dashboard has 153 <button> elements. Thirty share two style objects
// (actBtnPrimary / actBtnSm), seven modal-submit buttons repeat one inline style
// verbatim, thirteen Cancel buttons repeat another, and the rest are one-offs.
// Rebuilding <Field> once fixed ~80 inputs' accessibility; the same argument
// applies here — a primitive is where the next cross-cutting fix lands once.
//
// The variant styles below are copied VERBATIM from the objects and inline styles
// they replace, so migrating a call site changes no pixels. Anything visual that
// wants to differ from these is a new variant, not a `style` override — the
// `style` prop is kept only so the migration can be incremental.

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'primary-sm' | 'submit' | 'cancel' | 'danger-outline'

const BASE: CSSProperties = {
  fontFamily: 'inherit',
  cursor: 'pointer',
  border: 0,
}

const VARIANTS: Record<ButtonVariant, CSSProperties> = {
  // was: actBtnPrimary
  primary: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '10px 20px', borderRadius: 999,
    background: 'var(--rb-action)', color: '#fff',
    fontSize: 13, fontWeight: 600,
  },
  // was: actBtnSm
  'primary-sm': {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 999,
    background: 'var(--rb-action)', color: '#fff',
    fontSize: 12, fontWeight: 600,
  },
  // was: the 7× modal submit
  submit: {
    padding: '10px 22px', borderRadius: 999,
    background: 'var(--rb-action)', color: '#fff',
    fontSize: 14, fontWeight: 600,
  },
  // was: the 13× modal Cancel
  cancel: {
    padding: '10px 20px', borderRadius: 999,
    border: '1px solid var(--rb-border)', background: 'transparent',
    fontSize: 14, fontWeight: 500,
  },
  // was: the sign-out / destructive outline
  'danger-outline': {
    padding: '7px 14px', borderRadius: 999,
    border: '1.5px solid var(--rb-danger)', background: 'transparent',
    color: 'var(--rb-danger)', fontSize: 12, fontWeight: 600,
  },
}

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: ButtonVariant
  /** Shown instead of children while `busy`; the button is also disabled. */
  busy?: boolean
  busyLabel?: ReactNode
  /** Escape hatch for the incremental migration only. */
  style?: CSSProperties
  children?: ReactNode
}

export function Button({
  variant = 'primary',
  busy = false,
  busyLabel = 'Saving…',
  disabled,
  style,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || busy
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={busy || undefined}
      style={{
        ...BASE,
        ...VARIANTS[variant],
        ...(isDisabled ? { cursor: 'default', opacity: 0.7 } : null),
        ...style,
      }}
      {...rest}
    >
      {busy ? busyLabel : children}
    </button>
  )
}
