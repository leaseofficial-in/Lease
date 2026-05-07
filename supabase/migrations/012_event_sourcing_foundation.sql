-- Migration 012: Event Sourcing Foundation
-- Every AI feature in RentyBase depends on this append-only event log.
-- rental_events: immutable record of everything that happens in a rental
-- agent_runs: audit trail of every AI/automated action taken
-- agent_approvals: human-in-the-loop gates for high-stakes agent actions

-- ============================================================
-- rental_events: append-only event log
-- ============================================================
CREATE TABLE IF NOT EXISTS rental_events (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  rental_id       uuid        NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  actor_type      text        NOT NULL CHECK (actor_type IN ('landlord', 'tenant', 'agent', 'system')),
  actor_id        uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  event_type      text        NOT NULL,
  payload         jsonb       NOT NULL DEFAULT '{}',
  idempotency_key text        UNIQUE,
  created_at      timestamptz DEFAULT now() NOT NULL
);

-- Index for the most common query pattern: all events for a rental, newest first
CREATE INDEX IF NOT EXISTS idx_rental_events_rental_id
  ON rental_events(rental_id, created_at DESC);

-- Index for agent triggers: find unprocessed events of a specific type
CREATE INDEX IF NOT EXISTS idx_rental_events_event_type
  ON rental_events(event_type, created_at DESC);

-- Index for actor queries: what has a specific user done?
CREATE INDEX IF NOT EXISTS idx_rental_events_actor_id
  ON rental_events(actor_id, created_at DESC)
  WHERE actor_id IS NOT NULL;

-- ============================================================
-- agent_runs: every automated or AI action is logged here
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_runs (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_type     text        NOT NULL,
  trigger_event  text,
  trigger_id     uuid,
  input          jsonb       NOT NULL DEFAULT '{}',
  output         jsonb,
  status         text        NOT NULL DEFAULT 'running'
                             CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  error          text,
  tokens_used    integer,
  cost_usd       numeric(10, 6),
  created_at     timestamptz DEFAULT now() NOT NULL,
  completed_at   timestamptz
);

-- Index for dashboard: recent runs by agent type
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_type
  ON agent_runs(agent_type, created_at DESC);

-- Index for finding active runs (prevents duplicate agent triggers)
CREATE INDEX IF NOT EXISTS idx_agent_runs_status
  ON agent_runs(status, created_at DESC)
  WHERE status = 'running';

-- ============================================================
-- agent_approvals: human approval gates for high-stakes actions
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_approvals (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_run_id    uuid        REFERENCES agent_runs(id) ON DELETE SET NULL,
  rental_id       uuid        REFERENCES rentals(id) ON DELETE CASCADE,
  approver_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type     text        NOT NULL,
  action_payload  jsonb       NOT NULL DEFAULT '{}',
  confidence      numeric(4, 3) CHECK (confidence BETWEEN 0 AND 1),
  reasoning       text,
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  decided_at      timestamptz,
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '48 hours',
  created_at      timestamptz DEFAULT now() NOT NULL
);

-- Index for landlord's pending approvals (the main query for the approval inbox)
CREATE INDEX IF NOT EXISTS idx_agent_approvals_approver_pending
  ON agent_approvals(approver_id, status, created_at DESC)
  WHERE status = 'pending';

-- Index for expiry cron job
CREATE INDEX IF NOT EXISTS idx_agent_approvals_expires
  ON agent_approvals(expires_at)
  WHERE status = 'pending';

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE rental_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_approvals ENABLE ROW LEVEL SECURITY;

-- rental_events: landlord and tenant of a rental can read its events
CREATE POLICY "rental_events_read" ON rental_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rentals r
      WHERE r.id = rental_events.rental_id
        AND (r.landlord_id = auth.uid() OR r.tenant_id = auth.uid())
    )
  );

-- rental_events: only server/service role can insert (enforced via Edge Functions)
-- Direct client inserts are blocked to keep the log tamper-resistant
CREATE POLICY "rental_events_insert_service" ON rental_events
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- agent_runs: landlords can see runs related to their rentals
CREATE POLICY "agent_runs_read" ON agent_runs
  FOR SELECT USING (
    -- trigger_id references a rental_id in most cases
    trigger_id IS NULL OR EXISTS (
      SELECT 1 FROM rentals r
      WHERE r.id = agent_runs.trigger_id
        AND r.landlord_id = auth.uid()
    )
  );

-- agent_approvals: approver can read and update their own approvals
CREATE POLICY "agent_approvals_read" ON agent_approvals
  FOR SELECT USING (approver_id = auth.uid());

CREATE POLICY "agent_approvals_update" ON agent_approvals
  FOR UPDATE USING (approver_id = auth.uid())
  WITH CHECK (
    approver_id = auth.uid()
    AND status = 'pending'
    AND expires_at > now()
  );

-- ============================================================
-- Auto-expire stale pending approvals (cron will call this or use pg_cron)
-- ============================================================
CREATE OR REPLACE FUNCTION expire_stale_approvals()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE agent_approvals
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at <= now();
$$;

-- ============================================================
-- Convenience view: activity feed per rental (for the UI timeline)
-- ============================================================
CREATE OR REPLACE VIEW rental_activity_feed AS
SELECT
  re.id,
  re.rental_id,
  re.actor_type,
  re.actor_id,
  p.full_name   AS actor_name,
  re.event_type,
  re.payload,
  re.created_at
FROM rental_events re
LEFT JOIN profiles p ON p.id = re.actor_id
ORDER BY re.created_at DESC;
