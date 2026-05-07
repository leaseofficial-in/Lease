-- Migration 015: Email system foundation
-- email_logs: dedup, rate limiting, delivery tracking, audit trail
-- email_notifications: per-user opt-in preferences on profiles

-- ─── email_logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_logs (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_email text        NOT NULL,
  email_type      text        NOT NULL,
  reference_id    text,       -- payment_id, repair_id, etc. for dedup
  subject         text,
  status          text        NOT NULL DEFAULT 'sent'
                              CHECK (status IN ('sent', 'failed', 'skipped')),
  resend_id       text,       -- Resend message ID for tracking
  error           text,
  skip_reason     text,       -- 'dedup' | 'rate_limited' | 'no_email' | 'opted_out'
  created_at      timestamptz DEFAULT now() NOT NULL
);

-- Dedup: find recent sends for same (recipient, type, reference)
CREATE INDEX IF NOT EXISTS idx_email_logs_dedup
  ON email_logs(recipient_id, email_type, reference_id, created_at DESC)
  WHERE status = 'sent';

-- Rate limit: count today's sends per recipient
CREATE INDEX IF NOT EXISTS idx_email_logs_daily
  ON email_logs(recipient_id, created_at DESC)
  WHERE status = 'sent';

-- ─── email_notifications preferences ─────────────────────────────────────────
-- critical: always sent (payments, auth, security)
-- important: transactional updates (repair requests, proof review)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_notifications jsonb
  NOT NULL DEFAULT '{"critical": true, "important": true}'::jsonb;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own email history (for notification settings page)
CREATE POLICY "email_logs_read_own" ON email_logs
  FOR SELECT USING (recipient_id = auth.uid());

-- Only service_role writes (all sends go through the Edge Function)
CREATE POLICY "email_logs_write_service" ON email_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
