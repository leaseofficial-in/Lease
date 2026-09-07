'use client'

// ─── Activation tracking ──────────────────────────────────────────────────────
//
// A deliberately small, fixed set of events answering one question: does a
// landlord get from signing up to a tenant accepting an invite, and where do they
// stop. The same list is enforced by a CHECK constraint in
// 027_product_events.sql, so an event name that is not in the union type below
// would be rejected by the database anyway — the type just moves the failure to
// compile time.
//
// This is not general-purpose analytics and should not grow into it. The reason
// the funnel is currently unanswerable is that the database records outcomes and
// never attempts: a `properties` row proves someone succeeded, and says nothing
// about the four landlords in seven who never created one. The `*_started` events
// are the whole point — everything else can be derived from the tables.
//
// Rules for anything added here:
//   - No PII, no free text, no URLs, no user agents. `props` carries small
//     structured facts only.
//   - Never block a user action on a track call, and never let one throw.
//   - If an event cannot be acted on, it should not exist.

import { createClient } from '@/lib/supabase/client'

export type ProductEvent =
  // acquisition
  | 'signup_started'
  | 'signup_completed'
  // landlord activation — the *_started pairs are what make drop-off visible
  | 'property_create_started'
  | 'property_created'
  | 'rental_create_started'
  | 'rental_created'
  | 'invite_sent'
  | 'invite_regenerated'
  // tenant activation
  | 'invite_opened'
  | 'invite_accepted'
  // recurring value — what retention actually depends on
  | 'payment_recorded'
  | 'payment_confirmed'
  | 'repair_raised'
  | 'agreement_signed'

// Every name above has at least one call site, and lib/analytics/track.test.ts
// fails if that stops being true. A declared event nobody fires is a funnel step
// the owner believes is measured and is not -- five of these were in that state
// until the retention half was wired up.

type Props = Record<string, string | number | boolean | null>

/**
 * Record an activation event. Fire-and-forget by design.
 *
 * Never awaited by callers, never throws, and never surfaces an error to the user:
 * a failed analytics write must not disturb the action it was measuring. The row
 * is attributed to the signed-in user when there is one and left anonymous when
 * there is not — the invite screen is opened by people who have no account yet,
 * and that visit is exactly the one worth counting.
 */
export function track(event: ProductEvent, props: Props = {}): void {
  if (typeof window === 'undefined') return

  void (async () => {
    try {
      const sb = createClient()
      // RLS requires user_id to be either null or the caller's own id, so this is
      // read from the session rather than accepted from anywhere else.
      const { data } = await sb.auth.getSession()
      const userId = data.session?.user?.id ?? null

      await sb.from('product_events').insert({ event, props, user_id: userId })
    } catch {
      // Intentionally silent. Analytics is never worth a visible failure, and the
      // client_errors table exists for things that genuinely need attention.
    }
  })()
}
