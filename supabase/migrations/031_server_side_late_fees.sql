-- Move late-fee application off the tenant's browser and onto the server.
--
-- The fee was applied by a useEffect in the tenant's own dashboard: when it saw an
-- overdue payment with no fee, it computed one and PATCHed it in. Three problems,
-- all of them consequences of the same mistake — the party who owes the money was
-- the party deciding whether to record it.
--
--   1. A tenant who never opens the app is never charged. The fee depends on the
--      debtor visiting a page.
--   2. A tenant can zero it. 030 restricted `status`, but nothing stopped a PATCH
--      setting late_fee back to 0 on their own payment row.
--   3. It duplicated the calculation in TypeScript, where `late_fee_percent || 5`
--      turned a deliberately waived 0 into 5% — the bug found while extracting
--      lib/rentals/terms.ts. SQL's coalesce does not have that failure mode: 0
--      stays 0 and only NULL falls back.
--
-- Folding it into mark_overdue_payments() makes the fee a property of the ledger
-- rather than of whether someone opened a tab.

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
      -- Due date in the tenant's local calendar, and "today" where they actually
      -- are. See 029: comparing against a UTC server date marked tenants late on
      -- the wrong day.
      (date_trunc('month', rp.month::date) + ((r.rent_due_day - 1) || ' days')::interval)::date as due_on,
      (now() at time zone coalesce(nullif(p.timezone, ''), 'UTC'))::date as local_today,
      -- coalesce, not `or 5`: a stored 0 is a landlord who waived the fee and must
      -- stay 0. Only a NULL falls back to the 5% default.
      round(rp.amount * (coalesce(r.late_fee_percent, 5) / 100.0)) as fee
    from rent_payments rp
    join rentals r on r.id = rp.rental_id
    left join profiles p on p.id = rp.tenant_id
    where rp.status = 'pending'
      and r.status = 'active'
  )
  update rent_payments rp
  set status     = 'overdue',
      -- Only ever set a fee that is not already there; never overwrite one a
      -- landlord has adjusted by hand, and never charge when the rate is zero.
      late_fee   = case
                     when rp.late_fee is not null then rp.late_fee
                     when due.fee > 0             then due.fee
                     else rp.late_fee
                   end,
      updated_at = now()
  from due
  where due.id = rp.id
    and due.due_on < due.local_today;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

comment on function public.mark_overdue_payments() is
  'Marks pending rent overdue in each tenant''s local calendar and applies the late fee. Both were previously decided client-side by the tenant; neither should depend on the debtor opening the app.';

-- == Keep the tenant out of the fee column ====================================
--
-- 030 stopped a tenant writing status='paid'. late_fee needs the same treatment,
-- and for the same reason: it is the landlord's charge, not the tenant's to set.
-- A trigger rather than a policy, because RLS cannot scope to a column.

create or replace function public.enforce_tenant_payment_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_landlord boolean;
begin
  -- No JWT: the cron job, a migration, service_role. Not a tenant.
  if uid is null then return new; end if;

  select exists (
    select 1 from public.rentals r
    where r.id = new.rental_id and r.landlord_id = uid
  ) into is_landlord;

  if is_landlord then return new; end if;
  if uid is distinct from old.tenant_id then return new; end if;

  if new.late_fee is distinct from old.late_fee then
    raise exception 'The late fee is set by the landlord and applied automatically; a tenant cannot change it.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists rent_payments_tenant_scope on public.rent_payments;
create trigger rent_payments_tenant_scope
  before update on public.rent_payments
  for each row execute function public.enforce_tenant_payment_scope();

-- == Verification ==============================================================
--   select public.mark_overdue_payments();  -- safe to run; returns rows affected
--   As a tenant: PATCH your own payment's late_fee -> rejected.
--   As a landlord: adjusting a fee on your own rental -> still allowed.
--   A rental with late_fee_percent = 0 -> no fee applied, ever.
