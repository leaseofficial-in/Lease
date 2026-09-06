-- Fix: `rental_activity_feed` bypasses RLS and is readable by anyone.
--
-- The problem
-- -----------
-- 012_event_sourcing_foundation.sql creates rental_activity_feed as a plain view
-- owned by postgres. A Postgres view without `security_invoker` executes with the
-- privileges of its OWNER, not its caller, so RLS on the underlying tables is not
-- applied. Supabase's default grants then hand SELECT on it to `anon`.
--
-- rental_events itself is correctly protected:
--
--   create policy rental_events_read on rental_events for select using (
--     exists (select 1 from rentals r
--             where r.id = rental_events.rental_id
--               and (r.landlord_id = auth.uid() or r.tenant_id = auth.uid())));
--
-- The view walks straight past that, and joins profiles on top, so it also
-- discloses the actor's full name.
--
-- CONFIRMED LIVE: an unauthenticated GET of /rest/v1/rental_activity_feed returned
-- a real row — rental_id, actor_type, actor_name, event_type, and a payload holding
-- the payment amount, method and payment_id.
--
-- Only one event row existed at the time of the audit, so little has leaked in
-- practice. That is timing, not safety: every rent payment, deposit movement and
-- lease event written from here on would be world-readable.

-- == 1. Make the view respect the caller's RLS ==================================
--
-- With security_invoker on, the view is evaluated as the querying role, so
-- rental_events_read applies and each caller sees only rentals they are a party to.
-- The profiles join is likewise subject to the profiles policies, which already
-- allow landlord and tenant to see each other's names within a shared rental.
--
-- This changes no rows for legitimate users: a landlord or tenant querying their
-- own rental sees exactly what they saw before. It changes everything for a
-- stranger, who now sees nothing.

alter view public.rental_activity_feed set (security_invoker = on);

comment on view public.rental_activity_feed is
  'Rental event feed with actor names resolved. security_invoker is ON so the caller''s RLS on rental_events applies — without it this view exposed every rental event to anon.';

-- == 2. Remove write grants that should never have existed =====================
--
-- Supabase's default privileges grant the full set to anon and authenticated. On a
-- table that is harmless because RLS gates it; on a view it is not.
--
-- These writes currently fail with "views that do not select from a single table
-- or view are not automatically updatable" — the LEFT JOIN is the only thing
-- stopping them. That is an accident of the view's shape, not a control: simplify
-- the view one day and the writes silently become live. Revoke them explicitly.
--
-- Reads stay granted; they are now correctly filtered by section 1.

revoke insert, update, delete, truncate, references, trigger
  on public.rental_activity_feed from anon, authenticated;

-- == Verification ==============================================================
--   1. Anonymous:  GET /rest/v1/rental_activity_feed  ->  []
--   2. As a landlord or tenant on a rental with events -> their own rows, unchanged.
--   3. Anonymous POST/DELETE against the view -> 401/403 rather than 500.
