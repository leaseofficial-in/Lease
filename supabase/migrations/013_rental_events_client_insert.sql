-- Migration 013: Allow authenticated users to insert their own rental events
-- The service_role-only policy is too restrictive for client-side instrumentation.
-- We allow authenticated users to insert events for rentals they belong to,
-- provided they are the actor (actor_id = auth.uid()).

DROP POLICY IF EXISTS "rental_events_insert_service" ON rental_events;

CREATE POLICY "rental_events_insert_own" ON rental_events
  FOR INSERT WITH CHECK (
    -- Only write events as yourself
    (actor_id = auth.uid() OR actor_type IN ('system', 'agent'))
    AND
    -- Only for rentals you belong to
    EXISTS (
      SELECT 1 FROM rentals r
      WHERE r.id = rental_events.rental_id
        AND (r.landlord_id = auth.uid() OR r.tenant_id = auth.uid())
    )
  );

-- Service role can still insert anything (for agents / Edge Functions)
CREATE POLICY "rental_events_insert_service" ON rental_events
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
