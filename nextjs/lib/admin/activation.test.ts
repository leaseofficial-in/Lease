import { describe, it, expect } from 'vitest'
import { activationStage, funnel, landlordStep, LANDLORD_FUNNEL, stepFor } from './activation'
import type { AdminUser } from './types'

const NOW = new Date('2026-10-28T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

function user(over: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'u', full_name: 'X', email: null, phone: null, role: 'landlord', country_code: 'IN', avatar_url: null,
    created_at: daysAgo(10), last_sign_in_at: daysAgo(1), last_active_at: daysAgo(1), provider: 'google',
    properties: 0, rentals: 0, active_rentals: 0, rentals_with_tenant: 0, landlord_paid_payments: 0,
    tenancies: 0, tenant_paid_payments: 0, is_admin: false,
    ...over,
  }
}

describe('landlordStep', () => {
  it('takes the furthest step reached, even if an earlier count is zero', () => {
    // A property can be archived (not counted) while its rental still has payments.
    expect(landlordStep({ properties: 0, rentals: 1, rentals_with_tenant: 1, landlord_paid_payments: 2 })).toBe('paid')
    expect(landlordStep({ properties: 2, rentals: 1, rentals_with_tenant: 0, landlord_paid_payments: 0 })).toBe('rental')
  })
})

describe('activationStage', () => {
  it('is onboarding when no role was picked', () => {
    expect(activationStage(user({ role: null }), NOW)).toBe('onboarding')
  })

  it('gives fresh signups a grace period before calling them stuck', () => {
    expect(activationStage(user({ created_at: daysAgo(1) }), NOW)).toBe('new')
    expect(activationStage(user({ created_at: daysAgo(5) }), NOW)).toBe('stuck')
    expect(activationStage(user({ created_at: daysAgo(5), properties: 1 }), NOW)).toBe('stuck')
  })

  it('is almost there once a rental exists', () => {
    expect(activationStage(user({ properties: 1, rentals: 1 }), NOW)).toBe('almost_there')
  })

  it('is activated after rent is paid, and dormant when not seen for a month', () => {
    const paid = { properties: 1, rentals: 1, rentals_with_tenant: 1, landlord_paid_payments: 1 }
    expect(activationStage(user(paid), NOW)).toBe('activated')
    expect(activationStage(user({ ...paid, last_active_at: daysAgo(45), last_sign_in_at: daysAgo(45) }), NOW)).toBe('dormant')
  })

  it('uses the tenant path for tenants', () => {
    expect(activationStage(user({ role: 'tenant', tenancies: 1 }), NOW)).toBe('almost_there')
    expect(activationStage(user({ role: 'tenant', tenancies: 1, tenant_paid_payments: 1 }), NOW)).toBe('activated')
    expect(stepFor(user({ role: 'tenant', properties: 3 }))).toBe('signed_up')
  })
})

describe('funnel', () => {
  it('counts users at or beyond each step', () => {
    const users = [
      user(),
      user({ properties: 1 }),
      user({ properties: 1, rentals: 1, rentals_with_tenant: 1 }),
      user({ properties: 1, rentals: 1, rentals_with_tenant: 1, landlord_paid_payments: 3 }),
    ]
    expect(funnel(users, LANDLORD_FUNNEL).map((s) => s.count)).toEqual([4, 3, 2, 2, 1])
  })
})
