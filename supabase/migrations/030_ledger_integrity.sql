-- Stop one party being able to rewrite the record both parties are asked to trust.
--
-- Found by signing in as a throwaway user and actually exercising the boundaries,
-- rather than reasoning about the policies. Two holes, both in the money path.
--
-- HOLE 1: any authenticated user could write payments onto any rental
-- -------------------------------------------------------------------
--   create policy "Tenants create payment records"
--     on rent_payments for insert with check (auth.uid() = tenant_id);
--
-- That checks the caller stamped THEMSELVES as tenant. It never checks they are
-- the tenant of the rental they are writing to. Demonstrated live: a brand-new
-- account with no relationship to anything inserted a rent_payments row against a
-- real landlord's rental and got a 201. (The row was deleted immediately.)
--
-- Because "Landlords view payments for their rentals" shows a landlord every
-- payment on their rentals, those forged rows surface directly on their ledger,
-- their collection rate and their month totals. "Tenants update their own
-- payments" has the identical predicate, so the attacker can then edit what they
-- injected.
--
-- Every other table in the schema already gets this right — proofs, proof_photos,
-- repair_requests, rental_events and deposit_transactions all test membership of
-- the rental. rent_payments was the exception, and it is the money table.
--
-- HOLE 2: a tenant could rewrite their own lease
-- ----------------------------------------------
--   create policy "Tenants can update their rental (sign agreement)"
--     on rentals for update using (auth.uid() = tenant_id);
--
-- The name says "sign agreement". The policy grants UPDATE on the whole row.
-- Demonstrated live: the tenant of a rental changed monthly_rent from 20000 to 1,
-- security_deposit to 0, and late_fee_percent to 0 — and then inserted a payment
-- marked 'paid' that they never made.
--
-- Postgres RLS cannot restrict which COLUMNS a policy allows, and column-level
-- grants are per-role — landlord and tenant are both `authenticated`, so they
-- cannot be separated that way. A trigger is the right instrument.

-- == 1. Payments must belong to a rental you are actually part of ==============

drop policy if exists "Tenants create payment records"   on public.rent_payments;
drop policy if exists "Tenants update their own payments" on public.rent_payments;

create policy "Tenants record payments on their own rental"
  on public.rent_payments for insert
  with check (
    auth.uid() = tenant_id
    and exists (
      select 1 from public.rentals r
      where r.id = rent_payments.rental_id
        and r.tenant_id = auth.uid()
    )
    -- A tenant declares a payment; the landlord confirms it. Letting the tenant
    -- write 'paid' directly makes the confirmation step decorative.
    and status <> 'paid'
  );

create policy "Tenants update payments on their own rental"
  on public.rent_payments for update
  using (
    auth.uid() = tenant_id
    and exists (
      select 1 from public.rentals r
      where r.id = rent_payments.rental_id
        and r.tenant_id = auth.uid()
    )
  )
  with check (
    auth.uid() = tenant_id
    and status <> 'paid'
  );

-- Landlords already hold `for all` on their own rentals' rows via
-- "Landlords view payments for their rentals" plus the rentals ALL policy, so
-- confirming a payment as 'paid' is unaffected.

-- == 2. A tenant may sign and give notice — not re-price the lease =============

create or replace function public.enforce_tenant_rental_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  -- No JWT at all: a server-side job, a migration, or service_role. Not a tenant.
  if uid is null then return new; end if;

  -- The landlord owns the terms.
  if uid = old.landlord_id then return new; end if;

  -- An unclaimed rental being claimed. claim_rental_invite() is SECURITY DEFINER,
  -- which bypasses RLS but NOT triggers, and auth.uid() inside it is still the
  -- tenant's — so without this the invite flow would break at the moment of
  -- joining. Safe because the over-broad UPDATE policy that used to allow claims
  -- without a token was dropped in 021; the only route to this state is the RPC.
  if old.tenant_id is null then return new; end if;

  -- Anyone else is blocked by RLS before reaching here.
  if uid <> old.tenant_id then return new; end if;

  -- The tenant. Only signing and notice may move; everything describing the deal
  -- must be identical. `is distinct from` rather than <> so NULLs compare
  -- correctly — a null end_date changing to a date must be caught, and <> would
  -- yield NULL and silently pass.
  if (new.monthly_rent, new.security_deposit, new.rent_due_day, new.late_fee_percent,
      new.maintenance_charges, new.notice_period_days, new.lock_in_period_months,
      new.rent_increment_percent, new.start_date, new.end_date, new.status,
      new.property_id, new.landlord_id, new.tenant_id, new.invite_token,
      new.invite_expires_at, new.agreement_custom_clauses, new.furnished_status,
      new.escalation_applied_at)
     is distinct from
     (old.monthly_rent, old.security_deposit, old.rent_due_day, old.late_fee_percent,
      old.maintenance_charges, old.notice_period_days, old.lock_in_period_months,
      old.rent_increment_percent, old.start_date, old.end_date, old.status,
      old.property_id, old.landlord_id, old.tenant_id, old.invite_token,
      old.invite_expires_at, old.agreement_custom_clauses, old.furnished_status,
      old.escalation_applied_at)
  then
    raise exception
      'A tenant may sign the agreement or give notice. Lease terms are the landlord''s to change.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.enforce_tenant_rental_scope() is
  'Restricts what a tenant may change on their rental to the signing and notice columns. RLS cannot express column scope and column grants cannot separate landlord from tenant, since both are the `authenticated` role.';

drop trigger if exists rentals_tenant_scope on public.rentals;
create trigger rentals_tenant_scope
  before update on public.rentals
  for each row execute function public.enforce_tenant_rental_scope();

-- == Verification ==============================================================
-- Exercised with a real signed-in user, not reasoned about:
--   1. A stranger inserting rent_payments on someone else's rental -> denied.
--   2. A tenant setting monthly_rent / security_deposit / late_fee_percent
--      on their own rental -> denied.
--   3. A tenant inserting a payment with status 'paid' -> denied.
--   4. A tenant signing the agreement (agreement_signed_at, agreement_status)
--      and giving notice (notice_given_at, move_out_date) -> still allowed.
--   5. A landlord changing rent, and the invite claim flow -> still allowed.
