import type { AdminUser } from './types'

// ─── Where each user is on the way to getting value ──────────────────────────
//
// Derived from the tables, not from product_events. Events only exist since 027;
// a landlord who created a property before then has no `property_created` event
// but does have a property row. Counting rows means every historical user lands
// in the right place.
//
// Landlord path:  signed up → property → rental → tenant attached → rent paid
// Tenant path:    signed up → joined a rental → rent paid

export type Step = 'signed_up' | 'property' | 'rental' | 'tenant' | 'paid'

export type Stage = 'onboarding' | 'new' | 'stuck' | 'almost_there' | 'activated' | 'dormant'

export const DAY_MS = 86_400_000
/** A fresh signup is not "stuck" yet. */
export const NEW_GRACE_DAYS = 3
/** Activated but not seen for this long. */
export const DORMANT_DAYS = 30

export function landlordStep(u: Pick<AdminUser, 'properties' | 'rentals' | 'rentals_with_tenant' | 'landlord_paid_payments'>): Step {
  if (u.landlord_paid_payments > 0) return 'paid'
  if (u.rentals_with_tenant > 0) return 'tenant'
  if (u.rentals > 0) return 'rental'
  if (u.properties > 0) return 'property'
  return 'signed_up'
}

export function tenantStep(u: Pick<AdminUser, 'tenancies' | 'tenant_paid_payments'>): Step {
  if (u.tenant_paid_payments > 0) return 'paid'
  if (u.tenancies > 0) return 'tenant'
  return 'signed_up'
}

export function stepFor(u: AdminUser): Step {
  return u.role === 'tenant' ? tenantStep(u) : landlordStep(u)
}

export function activationStage(u: AdminUser, now: Date = new Date()): Stage {
  if (!u.role) return 'onboarding'

  const step = stepFor(u)
  const lastSeen = u.last_active_at ?? u.last_sign_in_at ?? u.created_at
  const idleDays = (now.getTime() - new Date(lastSeen).getTime()) / DAY_MS

  if (step === 'paid') return idleDays > DORMANT_DAYS ? 'dormant' : 'activated'
  if (step === 'tenant' || step === 'rental') return 'almost_there'

  const ageDays = (now.getTime() - new Date(u.created_at).getTime()) / DAY_MS
  return ageDays <= NEW_GRACE_DAYS ? 'new' : 'stuck'
}

export const STAGE_ORDER: Stage[] = ['activated', 'almost_there', 'new', 'stuck', 'dormant', 'onboarding']

export const LANDLORD_FUNNEL: { step: Step; label: string }[] = [
  { step: 'signed_up', label: 'Signed up' },
  { step: 'property', label: 'Added a property' },
  { step: 'rental', label: 'Created a rental' },
  { step: 'tenant', label: 'Tenant attached' },
  { step: 'paid', label: 'Rent paid' },
]

export const TENANT_FUNNEL: { step: Step; label: string }[] = [
  { step: 'signed_up', label: 'Signed up' },
  { step: 'tenant', label: 'Joined a rental' },
  { step: 'paid', label: 'Rent paid' },
]

const RANK: Record<Step, number> = { signed_up: 0, property: 1, rental: 2, tenant: 3, paid: 4 }

/** How many users reached each step or beyond. */
export function funnel(users: AdminUser[], steps: { step: Step; label: string }[]) {
  const reached = users.map(stepFor)
  return steps.map(({ step, label }) => ({
    step,
    label,
    count: reached.filter((r) => RANK[r] >= RANK[step]).length,
  }))
}
