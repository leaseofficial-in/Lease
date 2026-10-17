-- Let a landlord track rent for a tenant who is not on RentyBase.
--
-- Why
-- ---
-- Until now the product did nothing for a landlord until their tenant signed up:
-- rent rows were only created for rentals with a tenant_id, and only a tenant
-- could submit a payment for the landlord to confirm. Production on 2026-10-16:
-- 10 landlords signed up since July, 4 created a rental and an invite, and not one
-- tenant joined. Every rental with a joined tenant belongs to the founder's own
-- accounts. The landlord's value was gated on a second person's signup.
--
-- After this migration a rental can carry the tenant's name and phone instead of
-- an account. The landlord records rent as received, and every rent row has an
-- unguessable share link (see get_shared_rent) that works as a reminder before it
-- is paid and a receipt after, with no account on the tenant's side. If the
-- tenant joins later through the invite, the history becomes theirs.
--
-- A "managed" rental is: status = 'active', tenant_id is null, tenant_name set.

-- == 1. The tenant, as the landlord knows them =================================

alter table public.rentals add column if not exists tenant_name  text;
alter table public.rentals add column if not exists tenant_phone text;

alter table public.rentals drop constraint if exists rentals_tenant_name_len;
alter table public.rentals add constraint rentals_tenant_name_len
  check (tenant_name is null or char_length(btrim(tenant_name)) between 1 and 120);

-- Digits with an optional leading +. WhatsApp's wa.me wants digits only, and the
-- client normalises before writing; this stops anything else getting stored.
alter table public.rentals drop constraint if exists rentals_tenant_phone_format;
alter table public.rentals add constraint rentals_tenant_phone_format
  check (tenant_phone is null or tenant_phone ~ '^\+?[0-9]{6,15}$');

comment on column public.rentals.tenant_name is
  'Tenant name entered by the landlord, for a tenant tracked without an account. Display prefers the tenant''s profile once they join.';
comment on column public.rentals.tenant_phone is
  'Tenant phone entered by the landlord (digits, optional +), used for WhatsApp reminders and receipts.';

-- == 2. A rent row may exist before the tenant has an account ==================

alter table public.rent_payments alter column tenant_id drop not null;

-- The share link. 16 random bytes, the same strength as invite_token. Adding it
-- with a default backfills every existing row.
alter table public.rent_payments
  add column if not exists share_token text not null default encode(gen_random_bytes(16), 'hex');
create unique index if not exists rent_payments_share_token_key on public.rent_payments (share_token);

-- == 3. Who decides "paid" =====================================================
--
-- For a tenant with an account, unchanged: the tenant submits, the landlord
-- confirms. For a managed rental there is no one to submit, and the landlord
-- saying "I received it" is the strongest evidence there is, so the landlord may
-- move a row straight to paid and say how it was paid. A paid row is still final.
--
-- Also new: tenant_id may move from null to the rental's own tenant, which is
-- what claim_rental_invite does to hand the history over. Any other change to it
-- is still refused.

create or replace function public.enforce_payment_transitions()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  is_landlord boolean;
  managed boolean := old.tenant_id is null;
begin
  -- No JWT: the cron jobs, a migration, service_role. Not a party.
  if uid is null then return new; end if;

  if new.tenant_id is distinct from old.tenant_id
     and not (old.tenant_id is null
              and new.tenant_id = (select r.tenant_id from public.rentals r where r.id = old.rental_id)) then
    raise exception 'A payment cannot be moved to another rental, month or tenant.'
      using errcode = 'check_violation';
  end if;

  if new.rental_id is distinct from old.rental_id
     or new.month is distinct from old.month
     or new.created_at is distinct from old.created_at
     or new.share_token is distinct from old.share_token then
    raise exception 'A payment cannot be moved to another rental, month or tenant.'
      using errcode = 'check_violation';
  end if;

  -- The receipt is final. updated_at is excluded because set_updated_at() is also
  -- a BEFORE UPDATE trigger and may already have moved it. tenant_id is excluded
  -- so a joining tenant can inherit their paid months.
  if old.status = 'paid' then
    if (new.status, new.amount, new.late_fee, new.paid_at, new.payment_method,
        new.utr_number, new.payment_note, new.payment_proof_url)
       is distinct from
       (old.status, old.amount, old.late_fee, old.paid_at, old.payment_method,
        old.utr_number, old.payment_note, old.payment_proof_url) then
      raise exception 'This payment has been confirmed. A confirmed payment is the record both of you hold and cannot be changed.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  select exists (
    select 1 from public.rentals r
    where r.id = old.rental_id and r.landlord_id = uid
  ) into is_landlord;

  if is_landlord then
    if managed then
      -- No tenant account: the landlord is the only party, and records it all.
      if new.status = 'paid' and new.paid_at is null then
        new.paid_at := now();
      end if;
      return new;
    end if;
    -- How the tenant says they paid is the tenant's statement, not the
    -- landlord's to edit -- and it is the first thing looked at in a dispute.
    if (new.payment_method, new.utr_number, new.payment_note, new.payment_proof_url)
       is distinct from
       (old.payment_method, old.utr_number, old.payment_note, old.payment_proof_url) then
      raise exception 'The tenant''s payment details are their record of how they paid and cannot be edited.'
        using errcode = 'check_violation';
    end if;
    if new.status = 'paid' and old.status <> 'pending_verification' then
      raise exception 'A payment can only be confirmed after the tenant has submitted it.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if uid = old.tenant_id then
    if new.amount is distinct from old.amount then
      raise exception 'The rent amount comes from the lease. Ask your landlord to change it.'
        using errcode = 'check_violation';
    end if;
    if new.paid_at is distinct from old.paid_at then
      raise exception 'The payment date is set when your landlord confirms.'
        using errcode = 'check_violation';
    end if;
    if new.status is distinct from old.status
       and not (new.status = 'pending_verification'
                and old.status in ('pending', 'overdue', 'partial')) then
      raise exception 'A tenant can submit a payment for confirmation; the landlord confirms it.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  return new;
end;
$function$;

-- == 4. The tenant still cannot rewrite the deal ===============================
-- Same as before, plus the two new columns: they are the landlord's record.

create or replace function public.enforce_tenant_rental_scope()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return new; end if;
  if uid = old.landlord_id then return new; end if;
  -- An unclaimed rental being claimed through claim_rental_invite() (see 030).
  if old.tenant_id is null then return new; end if;
  if uid <> old.tenant_id then return new; end if;

  if (new.monthly_rent, new.security_deposit, new.rent_due_day, new.late_fee_percent,
      new.maintenance_charges, new.notice_period_days, new.lock_in_period_months,
      new.rent_increment_percent, new.start_date, new.end_date, new.status,
      new.property_id, new.landlord_id, new.tenant_id, new.invite_token,
      new.invite_expires_at, new.agreement_custom_clauses, new.furnished_status,
      new.escalation_applied_at, new.tenant_name, new.tenant_phone)
     is distinct from
     (old.monthly_rent, old.security_deposit, old.rent_due_day, old.late_fee_percent,
      old.maintenance_charges, old.notice_period_days, old.lock_in_period_months,
      old.rent_increment_percent, old.start_date, old.end_date, old.status,
      old.property_id, old.landlord_id, old.tenant_id, old.invite_token,
      old.invite_expires_at, old.agreement_custom_clauses, old.furnished_status,
      old.escalation_applied_at, old.tenant_name, old.tenant_phone)
  then
    raise exception
      'A tenant may sign the agreement or give notice. Lease terms are the landlord''s to change.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$function$;

-- == 5. Joining hands the history over =========================================
-- Identical to the live function except for the final backfill. A managed rental
-- is already 'active', which the claim never required to be anything else.

create or replace function public.claim_rental_invite(invite_token_input text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r        public.rentals;
  claimed  public.rentals;
  uid      uuid := auth.uid();
begin
  if uid is null then
    return 'unauthenticated';
  end if;

  select * into r from public.rentals
  where invite_token = invite_token_input
  limit 1;

  if r.id is null                    then return 'notfound';    end if;
  if r.landlord_id = uid             then return 'is_landlord'; end if;
  if r.tenant_id   = uid             then return 'already';     end if;
  if r.tenant_id is not null         then return 'taken';       end if;
  if r.status = 'ended'              then return 'ended';       end if;
  if r.invite_expires_at is null
     or r.invite_expires_at <= now() then return 'expired';     end if;

  -- Atomic claim: only the caller who finds tenant_id still null wins.
  update public.rentals
  set tenant_id  = uid,
      status     = 'active',
      updated_at = now()
  where id = r.id
    and tenant_id is null
    and invite_expires_at > now()
    and status <> 'ended'
  returning * into claimed;

  if claimed.id is null then
    return 'claimed';  -- someone else won the race in between
  end if;

  -- Months the landlord tracked before the tenant had an account are theirs now.
  update public.rent_payments
  set tenant_id = uid
  where rental_id = claimed.id
    and tenant_id is null;

  return 'ok';
end;
$function$;

-- == 6. Monthly rows for managed rentals =======================================
-- Same as 034, widened to managed rentals. "Current month" is in the tenant's
-- timezone, else the landlord's: a managed tenant has no profile to ask.

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
    date_trunc('month', (now() at time zone coalesce(nullif(tp.timezone, ''), nullif(lp.timezone, ''), 'UTC')))::date,
    'pending'
  from public.rentals r
  left join public.profiles tp on tp.id = r.tenant_id
  left join public.profiles lp on lp.id = r.landlord_id
  where r.status = 'active'
    and (r.tenant_id is not null or r.tenant_name is not null)
    and date_trunc('month', (now() at time zone coalesce(nullif(tp.timezone, ''), nullif(lp.timezone, ''), 'UTC')))::date
        >= date_trunc('month', r.start_date)::date
  on conflict (rental_id, month) do nothing;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- The nightly job above creates the row at 00:30 UTC; a landlord who starts
-- tracking at 15:00 should not wait until tomorrow to see this month. Fires when a
-- rental becomes managed, on insert or on update.
create or replace function public.seed_managed_rent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  this_month date;
begin
  if new.status <> 'active' or new.tenant_id is not null or new.tenant_name is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'active' and old.tenant_name is not null then
    return new;  -- already managed; nothing new to seed
  end if;

  select date_trunc('month', (now() at time zone coalesce(nullif(lp.timezone, ''), 'UTC')))::date
  into this_month
  from public.profiles lp where lp.id = new.landlord_id;
  this_month := coalesce(this_month, date_trunc('month', now())::date);

  if this_month >= date_trunc('month', new.start_date)::date then
    insert into public.rent_payments (rental_id, tenant_id, amount, month, status)
    values (new.id, null, new.monthly_rent, this_month, 'pending')
    on conflict (rental_id, month) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists rentals_seed_managed_rent on public.rentals;
create trigger rentals_seed_managed_rent
  after insert or update of status, tenant_name on public.rentals
  for each row execute function public.seed_managed_rent();

revoke execute on function public.seed_managed_rent() from public, anon, authenticated;

-- == 7. Lateness for managed rentals ===========================================
-- Same as 029/031, with the landlord's timezone as the fallback.

create or replace function public.mark_overdue_payments()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  affected integer;
begin
  with due as (
    select
      rp.id,
      (date_trunc('month', rp.month::date) + ((r.rent_due_day - 1) || ' days')::interval)::date as due_on,
      (now() at time zone coalesce(nullif(tp.timezone, ''), nullif(lp.timezone, ''), 'UTC'))::date as local_today,
      -- coalesce, not `or 5`: a stored 0 is a waived fee and must stay 0.
      round(rp.amount * (coalesce(r.late_fee_percent, 5) / 100.0)) as fee
    from rent_payments rp
    join rentals r on r.id = rp.rental_id
    left join profiles tp on tp.id = rp.tenant_id
    left join profiles lp on lp.id = r.landlord_id
    where rp.status = 'pending'
      and r.status = 'active'
  )
  update rent_payments rp
  set status     = 'overdue',
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
$function$;

-- == 8. The share link =========================================================
-- Anyone holding the token sees one rent row: what is owed, for which month, to
-- whom, and how to pay. Deliberately NOT included: the property address, the
-- tenant's phone, the invite token (receipts get forwarded to employers for HRA,
-- and an invite token would let the recipient claim the tenancy), or any other
-- month.

create or replace function public.get_shared_rent(share_token_input text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'month',          rp.month,
    'amount',         rp.amount,
    'late_fee',       rp.late_fee,
    'status',         rp.status,
    'paid_at',        rp.paid_at,
    'payment_method', rp.payment_method,
    'receipt_ref',    upper(right(replace(rp.id::text, '-', ''), 8)),
    'rent_due_day',   r.rent_due_day,
    'property_name',  pr.name,
    'city',           pr.city,
    'country_code',   coalesce(pr.country_code, lp.country_code, 'IN'),
    'landlord_name',  lp.full_name,
    'tenant_name',    coalesce(tp.full_name, r.tenant_name),
    'upi_id',         lp.upi_id,
    'payout_details', lp.payout_details
  )
  from public.rent_payments rp
  join public.rentals r     on r.id = rp.rental_id
  join public.properties pr on pr.id = r.property_id
  left join public.profiles lp on lp.id = r.landlord_id
  left join public.profiles tp on tp.id = rp.tenant_id
  where rp.share_token = share_token_input
    and char_length(share_token_input) = 32
  limit 1;
$$;

revoke execute on function public.get_shared_rent(text) from public;
grant execute on function public.get_shared_rent(text) to anon, authenticated;

comment on function public.get_shared_rent(text) is
  'Public view of a single rent row by its share_token: a reminder before payment, a receipt after. Excludes address, phone and invite token by design.';
