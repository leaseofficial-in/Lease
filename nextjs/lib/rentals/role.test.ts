import { describe, it, expect } from 'vitest'
import { isDualRole, normalizeRole, resolveRole } from './role'

describe('normalizeRole', () => {
  it('maps the PG manager choice to landlord, which the enum accepts', () => {
    expect(normalizeRole('pg')).toBe('landlord')
    expect(normalizeRole('landlord')).toBe('landlord')
    expect(normalizeRole('tenant')).toBe('tenant')
  })

  it('rejects anything else', () => {
    expect(normalizeRole(null)).toBeNull()
    expect(normalizeRole('')).toBeNull()
    expect(normalizeRole('admin')).toBeNull()
  })
})

describe('resolveRole', () => {
  it('keeps a stored view even when the data points elsewhere', () => {
    expect(resolveRole({ stored: 'landlord', owns: 0, rents: 2 })).toBe('landlord')
  })

  it('opens the tenant view for someone with no role who has joined a rental', () => {
    // 3 of the 6 accounts stuck at "choose your role" were in this state.
    expect(resolveRole({ stored: null, owns: 0, rents: 1 })).toBe('tenant')
  })

  it('prefers the tenancy when an unset account has both', () => {
    expect(resolveRole({ stored: null, owns: 3, rents: 1 })).toBe('tenant')
  })

  it('opens the owner view for an unset account that owns something', () => {
    expect(resolveRole({ stored: null, owns: 1, rents: 0 })).toBe('landlord')
  })

  it('returns null for a brand-new account so it can be asked what it wants to do', () => {
    expect(resolveRole({ stored: undefined, owns: 0, rents: 0 })).toBeNull()
  })
})

describe('isDualRole', () => {
  it('is true only when both sides have something in them', () => {
    expect(isDualRole({ owns: 1, rents: 1 })).toBe(true)
    expect(isDualRole({ owns: 1, rents: 0 })).toBe(false)
    expect(isDualRole({ owns: 0, rents: 1 })).toBe(false)
  })
})
