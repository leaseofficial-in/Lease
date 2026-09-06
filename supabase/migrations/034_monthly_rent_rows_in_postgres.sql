-- Create each month's rent row in Postgres, in the tenant's timezone, and retire the
-- two Edge-Function cron jobs that did this (and much else) in IST.
--
-- What process-rent did, and why it has to go
-- -------------------------------------------
-- The `process-rent` Edge Function ran daily at 03:30 UTC and did three jobs:
--
--   1. created the current month's rent_payments row for each active rental;
--   2. flipped pending -> overdue and applied the late fee;
--   3. sent Expo push notifications.
--
-- Its header says "All date maths in IST", and it means it:
--
--   const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
--
-- Every tenant on Earth was judged by the Indian calendar. That is not a bug in a
-- product for India; it is a wall around one. It also collided with
-- mark_overdue_payments() (029/031), which decides "late" in each tenant's own
-- timezone: process-rent ran two and a half hours later and would flip a tenant in
-- Los Angeles to overdue while it was still their due date. The more correct job
-- lost, because it ran first.
--
-- Job 3 could never fire: it needs profiles.push_token, which the live app never
-- sets, and zero of 22 users have one. `rent-reminder-agent` is the same story.
-- Reminders now go by email from /api/cron/rent-reminders.
--
-- Job 1 is the only part still needed, and it is a two-line SQL statement.
--
-- Backfill, deliberately not done
-- -------------------------------
-- process-rent created only the current month, so any month it did not run is a
-- permanent hole. One rental has 11 missing months — it is the founder's own test
-- data, started before the job existed. This function also creates only the
-- current month. Retroactively inventing eleven "overdue" months with late fees on
-- anyone's ledger is not something a scheduled job should decide; if the owner
-- wants the gaps filled, that is a one-off with eyes on it.

-- == 1. Ensure this month's rent row exists, per tenant calendar ===============

create or replace function public.ensure_current_month_rent()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  insert into public.rent_payments (rental_id, tenant_id, amount, month, status)
  select
    r.id,
    r.tenant_id,
    r.monthly_rent,
    -- The first of the current month WHERE THE TENANT IS. For a tenant in Auckland
    -- the new month begins ~13 hours before it does in UTC; for one in Honolulu,
    -- ~10 hours after. Using the server's clock would create some tenants' rows a
    -- day early and others' a day late.
    date_trunc('month', (now() at time zone coalesce(nullif(p.timezone, ''), 'UTC')))::date,
    'pending'
  from public.rentals r
  left join public.profiles p on p.id = r.tenant_id
  where r.status = 'active'
    and r.tenant_id is not null
    -- Never before the lease began.
    and date_trunc('month', (now() at time zone coalesce(nullif(p.timezone, ''), 'UTC')))::date
        >= date_trunc('month', r.start_date)::date
  -- (rental_id, month) is UNIQUE, so this is idempotent: re-running, or the
  -- rental_activated trigger having already created the first month, is harmless.
  on conflict (rental_id, month) do nothing;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

comment on function public.ensure_current_month_rent() is
  'Creates the current month''s pending rent row for every active rental, using each tenant''s own timezone to decide what "current month" means. Always ''pending'': mark_overdue_payments() is the single place that decides lateness.';

-- Rows are created as 'pending' with no fee, always. mark_overdue_payments() runs
-- thirty minutes later and is the ONE place lateness and fees are decided. Having
-- two functions each compute "is it late yet" is how the IST/UTC disagreement
-- above happened in the first place.

-- == 2. Schedule it, ahead of the overdue pass =================================

do $$
begin
  if exists (select 1 from cron.job where jobname = 'ensure-current-month-rent') then
    perform cron.unschedule('ensure-current-month-rent');
  end if;
  perform cron.schedule(
    'ensure-current-month-rent',
    '30 0 * * *',
    $job$ select public.ensure_current_month_rent(); $job$
  );
exception when undefined_table or undefined_function then
  raise notice 'pg_cron unavailable — function installed but not scheduled';
end $$;

-- == 3. Retire the Edge Function jobs ==========================================
--
-- Unscheduled, not deleted. The functions themselves stay deployed and can be
-- re-scheduled from the dashboard in one click if this needs reverting. Nothing
-- they did is now undone by anything: row creation moved here, overdue marking is
-- already in mark_overdue_payments(), and the push code had no one to reach.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'process-rent-daily') then
    perform cron.unschedule('process-rent-daily');
  end if;
  if exists (select 1 from cron.job where jobname = 'rent-reminder-agent-daily') then
    perform cron.unschedule('rent-reminder-agent-daily');
  end if;
exception when undefined_table or undefined_function then
  raise notice 'pg_cron unavailable — nothing to unschedule';
end $$;

-- == Verification ==============================================================
--   select jobname, schedule from cron.job order by schedule;
--     -> ensure-current-month-rent 30 0, mark-overdue-payments 0 1, nothing at 30 3
--   select public.ensure_current_month_rent();   -- safe; idempotent
--   Every active rental with a tenant has a row for the current month.
