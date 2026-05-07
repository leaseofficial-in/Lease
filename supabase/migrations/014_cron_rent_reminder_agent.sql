-- Migration 014: Schedule the rent-reminder-agent Edge Function via pg_cron
-- Runs daily at 9:00 AM IST (3:30 AM UTC).
-- Uses pg_net to make an HTTP POST to the Edge Function endpoint.
-- The anon key is used as the Bearer token; the function uses service_role internally.

-- Enable pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove the old schedule if re-running this migration
SELECT cron.unschedule('rent-reminder-agent-daily')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'rent-reminder-agent-daily'
  );

-- Schedule: 9:00 AM IST = 03:30 UTC
SELECT cron.schedule(
  'rent-reminder-agent-daily',
  '30 3 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tuojgwrzfecyeiccdrlj.supabase.co/functions/v1/rent-reminder-agent',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer sb_publishable_jKQSCW7n3hwESw6YHKrZWQ_r3fk62WF'
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
