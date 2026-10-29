// ─── Which side of the app someone sees ──────────────────────────────────────
//
// `profiles.role` is the view a person is in, not who they are (055). One
// account can own a flat and rent another. What someone actually is comes from
// their rows: a property or a rental they own makes them an owner, a rental they
// are the tenant on makes them a tenant.

export type ViewRole = 'landlord' | 'tenant'

/**
 * The database enum is landlord | tenant. Sign-up also offers "PG manager",
 * which is a landlord. Writing 'pg' failed silently and left the account with
 * no role at all.
 */
export function normalizeRole(r: string | null | undefined): ViewRole | null {
  if (r === 'landlord' || r === 'pg') return 'landlord'
  if (r === 'tenant') return 'tenant'
  return null
}

export interface RoleFacts {
  stored: string | null | undefined
  /** Properties or rentals this account owns. */
  owns: number
  /** Live rentals this account is the tenant on. */
  rents: number
}

/**
 * The view to open. A stored choice wins; with none, the data decides, and a
 * tenancy beats ownership (someone who just joined a rental came to see it).
 * Null means a brand-new account with nothing yet: ask what they want to do.
 */
export function resolveRole({ stored, owns, rents }: RoleFacts): ViewRole | null {
  const s = normalizeRole(stored)
  if (s) return s
  if (rents > 0) return 'tenant'
  if (owns > 0) return 'landlord'
  return null
}

/** The other view is worth offering in the header only when it has something in it. */
export function isDualRole({ owns, rents }: Pick<RoleFacts, 'owns' | 'rents'>): boolean {
  return owns > 0 && rents > 0
}
