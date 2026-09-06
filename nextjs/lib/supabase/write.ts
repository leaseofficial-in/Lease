import type { PostgrestError } from '@supabase/supabase-js'

// ─── Writes that must have happened ───────────────────────────────────────────
//
// supabase-js returns `error: null` for an UPDATE or DELETE that matched zero rows.
// Under row-level security that is the normal shape of a *denied* write: PostgREST
// filters the rows the caller may touch, finds none, and reports success on an
// empty set. So every `if (error) throw error` in this codebase reported success
// while nothing happened.
//
// That is how the landlord's "Reject payment" button stayed broken: there was no
// landlord UPDATE policy on rent_payments, the PATCH affected zero rows, and the UI
// showed a green toast. It is also how any future policy mistake would hide.
//
// The fix is to ask for the affected rows back (`.select('id')`) and treat an empty
// result as the failure it is. This helper is that check, with a message a person
// can act on rather than a silent no-op.

export interface WriteResult<T = { id: string }> {
  data: T[] | null
  error: PostgrestError | null
}

/**
 * Throw unless the write affected at least one row.
 *
 * Usage:
 *   assertAffected(
 *     await sb.from('rentals').update({ ... }).eq('id', id).select('id'),
 *     'rental',
 *   )
 *
 * `what` is a noun for the message: "rental", "repair request", "profile".
 */
export function assertAffected<T = { id: string }>(result: WriteResult<T>, what: string): T[] {
  if (result.error) throw result.error
  if (!result.data || result.data.length === 0) {
    throw new Error(
      `The ${what} could not be saved. It may have been changed or removed by someone else — refresh and try again.`,
    )
  }
  return result.data
}
