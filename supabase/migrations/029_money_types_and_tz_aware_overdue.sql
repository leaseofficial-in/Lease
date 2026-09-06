-- Two correctness fixes for a product that runs outside one timezone and one
-- currency: money columns that cannot hold subunits, and an overdue job that
-- decides "late" using the server's calendar rather than the tenant's.

-- == 1. maintenance_charges cannot represent cents ============================
--
-- Every other money column in the schema is numeric(12,2). This one is `integer`,
-- which is survivable while the only currency is the rupee and society
-- maintenance is quoted in whole numbers — and wrong everywhere else. A landlord
-- in the US entering $85.50, or in the UK entering £42.75, silently loses the
-- fractional part.
--
-- Widening integer -> numeric(12,2) is lossless: every existing value is a whole
-- number and stays exactly equal. Postgres rewrites the column, which is fine at
-- 52 rows and is the reason to do it now rather than later.

alter table public.rentals
  alter column maintenance_charges type numeric(12,2)
  using maintenance_charges::numeric(12,2);

-- repair_requests.cost and rentals.rent_increment_percent were declared as bare
-- `numeric` with no precision or scale. Unbounded numeric accepts arbitrary
-- precision, so two amounts that display identically can compare unequal. Pin
-- them to the same shape as the rest of the schema — a percentage needs 5,2
-- (up to 999.99), a cost needs the same 12,2 as every other amount.

alter table public.repair_requests
  alter column cost type numeric(12,2)
  using cost::numeric(12,2);

alter table public.rentals
  alter column rent_increment_percent type numeric(5,2)
  using rent_increment_percent::numeric(5,2);

comment on column public.rentals.maintenance_charges is
  'Monthly maintenance/society/HOA charge, in the property''s currency. numeric(12,2) like every other money column — it was integer, which lost subunits outside India.';

-- == 2. Overdue marking used the server's date ================================
--
-- 007_cron_overdue_payments.sql runs at 01:00 UTC and compares the due date
-- against `current_date`, which on a Supabase instance is UTC. So "is this rent
-- late?" is answered in the server's calendar rather than the tenant's:
--
--   A tenant in Auckland (UTC+13) is marked overdue while it is still the due
--   date where they live — they get a late notice for rent that is not yet late.
--   A tenant in Honolulu (UTC-10) gets a day of grace nobody granted them.
--
-- Both are wrong, and the first is the one that damages trust: an incorrect late
-- fee on a ledger the product asks both parties to treat as a record.
--
-- profiles.timezone exists (003, applied earlier today) and now finally holds a
-- real value per user, so the comparison can be made in the tenant's own local
-- date. Falls back to the rental's property country default, then UTC.

create or replace function public.mark_overdue_payments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  with due as (
    select
      rp.id,
      -- The due date in the tenant's local calendar.
      (date_trunc('month', rp.month::date) + ((r.rent_due_day - 1) || ' days')::interval)::date as due_on,
      -- "Today" where the tenant actually is. coalesce guards a profile with no
      -- timezone (pre-003 rows) and an invalid IANA name, either of which would
      -- otherwise raise inside the job and abort the whole run.
      (now() at time zone coalesce(
        nullif(p.timezone, ''),
        'UTC'
      ))::date as local_today
    from rent_payments rp
    join rentals r on r.id = rp.rental_id
    left join profiles p on p.id = rp.tenant_id
    where rp.status = 'pending'
      and r.status = 'active'
  )
  update rent_payments rp
  set status = 'overdue',
      updated_at = now()
  from due
  where due.id = rp.id
    and due.due_on < due.local_today;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

comment on function public.mark_overdue_payments() is
  'Marks pending rent overdue using each tenant''s local calendar date, not the server''s. Replaces the inline UTC current_date comparison in 007.';

-- Repoint the existing schedule at the function. Unschedule first so re-running
-- this migration does not create a second job doing the same work.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'mark-overdue-payments') then
    perform cron.unschedule('mark-overdue-payments');
  end if;
  perform cron.schedule(
    'mark-overdue-payments',
    '0 1 * * *',
    $job$ select public.mark_overdue_payments(); $job$
  );
exception
  when undefined_table or undefined_function then
    -- pg_cron not present in this environment; the function is still installed
    -- and can be called directly.
    raise notice 'pg_cron unavailable — mark_overdue_payments() installed but not scheduled';
end
$$;

-- == Verification ==============================================================
--   select column_name, data_type, numeric_scale from information_schema.columns
--    where table_name='rentals' and column_name in
--          ('maintenance_charges','rent_increment_percent');
--   select public.mark_overdue_payments();   -- returns rows affected, safe to run
--   select jobname, schedule, command from cron.job;
