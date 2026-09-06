-- Neither party may sign for the other.
--
-- What was wrong
-- --------------
-- The agreement is the one document in this product that is meant to bind two
-- people, and the dashboard prints it with both signature timestamps on it
-- ("Tenant signed <ts> · Landlord signed <ts>", and an EXECUTED badge). The flow
-- the UI implements is:
--
--   landlord  agreement_status -> 'pending_signature'
--   tenant    agreement_signed_at = now(),  agreement_status -> 'tenant_signed'
--   landlord  landlord_signed_at  = now(),  agreement_status -> 'executed'
--
-- Nothing enforced any of it. The tenant UPDATE policy checks `tenant_id =
-- auth.uid()` and 030's `enforce_tenant_rental_scope` freezes the lease TERMS --
-- rent, deposit, dates, notice -- but its frozen list does not include a single
-- agreement column. The landlord's UPDATE policy (040) checks ownership and no
-- columns at all. So, over the API:
--
--   * A tenant could set `landlord_signed_at` and `agreement_status = 'executed'`
--     and produce a fully executed agreement the landlord never signed.
--   * A landlord could set `agreement_signed_at` and do the same in reverse,
--     producing a document that says the tenant signed on a day they did not.
--   * Either could back-date or clear a signature that already existed.
--   * The landlord could rewrite `agreement_custom_clauses` AFTER the tenant
--     signed -- changing the document the tenant agreed to, with the tenant's
--     signature timestamp still on it.
--
-- The fix
-- -------
-- A BEFORE UPDATE trigger, as in 030/031/039/042. Each party may take exactly one
-- step, in order, and only their own:
--
--   tenant:    pending_signature -> tenant_signed, setting agreement_signed_at
--              once. Never landlord_signed_at. Never 'executed'.
--   landlord:  draft -> pending_signature, and tenant_signed -> executed setting
--              landlord_signed_at once, only after the tenant has actually signed.
--              Never agreement_signed_at.
--   both:      a signature timestamp is stamped with now() by this trigger rather
--              than trusted from the client, so it cannot be back-dated.
--              Once executed, the clauses and both signatures are frozen.
--
-- `agreement_custom_clauses` freezes as soon as the tenant signs: what they signed
-- is what stands. There is no amend-and-re-sign flow in the product; if one is
-- wanted it belongs in the UI as a new signing round, not as a silent edit.

create or replace function public.enforce_agreement_signing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  touched boolean;
begin
  -- No JWT: migrations, service_role, jobs.
  if uid is null then return new; end if;

  -- An unclaimed rental being claimed by claim_rental_invite() -- SECURITY DEFINER
  -- bypasses RLS but not triggers, and auth.uid() there is still the tenant's.
  if old.tenant_id is null then return new; end if;

  touched := (new.agreement_status, new.agreement_signed_at, new.landlord_signed_at,
              new.agreement_custom_clauses)
             is distinct from
             (old.agreement_status, old.agreement_signed_at, old.landlord_signed_at,
              old.agreement_custom_clauses);
  if not touched then return new; end if;

  -- A signed agreement is the record both people hold.
  if old.agreement_status = 'executed' then
    raise exception 'This agreement has been signed by both of you and cannot be changed.'
      using errcode = 'check_violation';
  end if;

  -- Once the tenant has signed, the text they signed is fixed.
  if old.agreement_signed_at is not null
     and new.agreement_custom_clauses is distinct from old.agreement_custom_clauses then
    raise exception 'The tenant has already signed this agreement. Its terms cannot be edited afterwards.'
      using errcode = 'check_violation';
  end if;

  if uid = old.tenant_id then
    if new.landlord_signed_at is distinct from old.landlord_signed_at then
      raise exception 'Only your landlord can sign for the landlord.'
        using errcode = 'check_violation';
    end if;
    if new.agreement_custom_clauses is distinct from old.agreement_custom_clauses then
      raise exception 'The agreement''s clauses are set by the landlord.'
        using errcode = 'check_violation';
    end if;
    if new.agreement_signed_at is distinct from old.agreement_signed_at then
      if old.agreement_signed_at is not null then
        raise exception 'You have already signed this agreement.'
          using errcode = 'check_violation';
      end if;
      if old.agreement_status is distinct from 'pending_signature' then
        raise exception 'This agreement has not been sent to you for signature yet.'
          using errcode = 'check_violation';
      end if;
      -- Stamped here, not taken from the client, so it cannot be back-dated.
      new.agreement_signed_at := now();
    end if;
    if new.agreement_status is distinct from old.agreement_status
       and not (new.agreement_status = 'tenant_signed'
                and old.agreement_status = 'pending_signature'
                and new.agreement_signed_at is not null) then
      raise exception 'A tenant can sign the agreement; only the landlord can send or execute it.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if uid = old.landlord_id then
    if new.agreement_signed_at is distinct from old.agreement_signed_at then
      raise exception 'Only your tenant can sign for the tenant.'
        using errcode = 'check_violation';
    end if;
    if new.landlord_signed_at is distinct from old.landlord_signed_at then
      if old.landlord_signed_at is not null then
        raise exception 'You have already signed this agreement.'
          using errcode = 'check_violation';
      end if;
      if old.agreement_signed_at is null then
        raise exception 'Your tenant has not signed this agreement yet.'
          using errcode = 'check_violation';
      end if;
      new.landlord_signed_at := now();
    end if;
    if new.agreement_status is distinct from old.agreement_status
       and not (
         (new.agreement_status = 'pending_signature' and coalesce(old.agreement_status, 'draft') = 'draft')
         or (new.agreement_status = 'executed'
             and old.agreement_status = 'tenant_signed'
             and new.landlord_signed_at is not null)
       ) then
      raise exception 'An agreement goes draft -> sent for signature -> signed by the tenant -> executed.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_agreement_signing() from public, anon, authenticated;

drop trigger if exists rentals_agreement_signing on public.rentals;
create trigger rentals_agreement_signing
  before update on public.rentals
  for each row execute procedure public.enforce_agreement_signing();

comment on function public.enforce_agreement_signing() is
  'Each party signs only their own line, in order, and only once. Timestamps are stamped server-side.';

-- == Verification ==============================================================
--   As the tenant, on a rental sent for signature:
--     set landlord_signed_at = now()                     -> check_violation
--     set agreement_status = 'executed'                  -> check_violation
--     set agreement_signed_at = '2020-01-01'             -> stored as now()
--     sign, then sign again                              -> check_violation
--   As the landlord:
--     set agreement_signed_at = now()                    -> check_violation
--     execute before the tenant has signed               -> check_violation
--     edit agreement_custom_clauses after the tenant signed -> check_violation
--     draft -> pending_signature -> (tenant signs) -> executed  -> each 1 row
--   Once executed, any further change to those four columns   -> check_violation
