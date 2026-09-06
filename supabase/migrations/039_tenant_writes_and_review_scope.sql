-- Let tenants perform the three actions the UI offers them; scope every side's
-- UPDATE to its own columns.
--
-- What was wrong
-- --------------
-- The tenant dashboard has three write actions on records the tenant created:
--
--   repair_requests  "Cancel request"        update { status: 'resolved' }
--   repair_requests  "Confirm it's fixed"    update { resolved_confirmed_at }
--   deposit_transactions  "File a dispute"   update { tenant_dispute_note, dispute_status }
--
-- Neither table has ever had a tenant UPDATE policy. repair_requests has one
-- UPDATE policy (landlord); deposit_transactions has none at all. Every one of
-- those writes matched zero rows. Proven live by simulating the real tenant who
-- can see 3 repair requests and 1 deduction: 0 rows updatable on either table.
-- Before lib/supabase/write.ts (assertAffected) the buttons showed "Confirmed"
-- and "Dispute filed"; since then they show "could not be saved". Both wrong.
--
-- The landlord side had the opposite problem, the same one 038 closed on
-- messages: "Landlords review proofs" and "Landlords update repair status" are
-- USING-only, so a landlord can rewrite the tenant's title, description, photos,
-- or reassign raised_by / submitted_by. The tenant's evidence is the tenant's.
--
-- The shape
-- ---------
-- Policies decide WHO may touch a row. Column scope is a BEFORE UPDATE trigger,
-- as in 030/031, because RLS cannot compare OLD and NEW. Each trigger:
--   * no JWT (cron, migration, service_role): pass through
--   * the author (tenant): may change only their own action columns
--   * the landlord: may change only review/management columns
--   * anyone: never the author column, rental_id, or created_at
-- Raised as check_violation so PostgREST returns 400 with the message, and the
-- dashboard's assertAffected surfaces it verbatim.
--
-- Not built here: a landlord write for deposit_transactions.dispute_resolved_note.
-- The column exists, nothing writes it, and there is no UI to resolve a dispute.
-- That needs a product decision on what "resolved" means for the ledger. Recorded.

-- == repair_requests ===========================================================

create policy "Tenants act on their own repair requests"
  on public.repair_requests for update to authenticated
  using (
    raised_by = auth.uid()
    and exists (
      select 1 from public.rentals r
      where r.id = repair_requests.rental_id and r.tenant_id = auth.uid()
    )
  )
  with check (raised_by = auth.uid());

create or replace function public.enforce_repair_request_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_landlord boolean;
begin
  if uid is null then return new; end if;

  -- Nobody re-parents a request or changes who raised it.
  if new.raised_by is distinct from old.raised_by
     or new.rental_id is distinct from old.rental_id
     or new.created_at is distinct from old.created_at then
    raise exception 'A repair request cannot be moved or re-attributed.'
      using errcode = 'check_violation';
  end if;

  select exists (
    select 1 from public.rentals r
    where r.id = old.rental_id and r.landlord_id = uid
  ) into is_landlord;

  if is_landlord then
    -- The landlord manages the request; the tenant's account of the problem and
    -- the tenant's confirmation are not theirs to edit.
    if new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.photos is distinct from old.photos
       or new.photo_url is distinct from old.photo_url
       or new.category is distinct from old.category
       or new.urgency is distinct from old.urgency
       or new.priority is distinct from old.priority
       or new.resolved_confirmed_at is distinct from old.resolved_confirmed_at then
      raise exception 'The tenant''s description of the problem and their confirmation cannot be changed by the landlord.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if uid = old.raised_by then
    -- The tenant may withdraw the request or confirm the fix. Nothing else.
    if new.status is distinct from old.status and new.status <> 'resolved' then
      raise exception 'A tenant can close their own request, not reopen or reprioritise it.'
        using errcode = 'check_violation';
    end if;
    if new.cost is distinct from old.cost
       or new.landlord_note is distinct from old.landlord_note
       or new.scheduled_date is distinct from old.scheduled_date
       or new.deduct_from_deposit is distinct from old.deduct_from_deposit
       or new.vendor_name is distinct from old.vendor_name
       or new.vendor_phone is distinct from old.vendor_phone
       or new.resolved_at is distinct from old.resolved_at
       or new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.photos is distinct from old.photos
       or new.photo_url is distinct from old.photo_url
       or new.category is distinct from old.category
       or new.urgency is distinct from old.urgency
       or new.priority is distinct from old.priority then
      raise exception 'Only the landlord can change the cost, schedule, contractor or notes on a repair request.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_repair_request_scope() from public, anon, authenticated;

drop trigger if exists repair_requests_scope on public.repair_requests;
create trigger repair_requests_scope
  before update on public.repair_requests
  for each row execute procedure public.enforce_repair_request_scope();

-- == deposit_transactions ======================================================

create policy "Tenants dispute deductions on their own rental"
  on public.deposit_transactions for update to authenticated
  using (
    type = 'deduction'
    and exists (
      select 1 from public.rentals r
      where r.id = deposit_transactions.rental_id and r.tenant_id = auth.uid()
    )
  )
  with check (
    type = 'deduction'
    and exists (
      select 1 from public.rentals r
      where r.id = deposit_transactions.rental_id and r.tenant_id = auth.uid()
    )
  );

create or replace function public.enforce_deposit_transaction_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_landlord boolean;
begin
  if uid is null then return new; end if;

  -- The ledger line itself is immutable for everyone with a JWT. Amount, type,
  -- attribution and the landlord's description are what a deposit statement is.
  if new.amount is distinct from old.amount
     or new.type is distinct from old.type
     or new.rental_id is distinct from old.rental_id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at
     or new.note is distinct from old.note then
    raise exception 'A deposit ledger entry cannot be edited. Record a correcting entry instead.'
      using errcode = 'check_violation';
  end if;

  select exists (
    select 1 from public.rentals r
    where r.id = old.rental_id and r.landlord_id = uid
  ) into is_landlord;

  if is_landlord then
    -- No landlord UPDATE policy exists today, so this branch is reached only if
    -- one is added later. The tenant's note is the tenant's.
    if new.tenant_dispute_note is distinct from old.tenant_dispute_note then
      raise exception 'The tenant''s dispute note cannot be changed by the landlord.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  -- The tenant: may raise a dispute, and only that. A tenant does not resolve
  -- their own dispute, and cannot un-dispute an entry the landlord has answered.
  if new.dispute_resolved_note is distinct from old.dispute_resolved_note then
    raise exception 'Only the landlord can resolve a dispute.'
      using errcode = 'check_violation';
  end if;
  if new.dispute_status is distinct from old.dispute_status and new.dispute_status <> 'disputed' then
    raise exception 'A tenant can dispute a deduction; the landlord resolves it.'
      using errcode = 'check_violation';
  end if;
  if old.dispute_status = 'resolved' then
    raise exception 'This dispute has already been resolved by the landlord.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_deposit_transaction_scope() from public, anon, authenticated;

drop trigger if exists deposit_transactions_scope on public.deposit_transactions;
create trigger deposit_transactions_scope
  before update on public.deposit_transactions
  for each row execute procedure public.enforce_deposit_transaction_scope();

-- == proofs ====================================================================
-- Landlord review only touches status, reviewed_by, dispute_note. The client
-- does not update proofs today; this closes the door before something does.

create or replace function public.enforce_proof_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return new; end if;

  if new.submitted_by is distinct from old.submitted_by
     or new.rental_id is distinct from old.rental_id
     or new.type is distinct from old.type
     or new.created_at is distinct from old.created_at then
    raise exception 'A proof cannot be moved or re-attributed.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_proof_scope() from public, anon, authenticated;

drop trigger if exists proofs_scope on public.proofs;
create trigger proofs_scope
  before update on public.proofs
  for each row execute procedure public.enforce_proof_scope();

-- == Verification ==============================================================
--   As the real tenant (claims simulated):
--     update repair_requests set resolved_confirmed_at = now() where raised_by = uid  -> rows > 0
--     update repair_requests set cost = 1 where raised_by = uid                       -> check_violation
--     update deposit_transactions set dispute_status='disputed', tenant_dispute_note='x'
--       where rental_id in (own rentals) and type='deduction'                          -> rows > 0
--     update deposit_transactions set amount = 1 ...                                   -> check_violation
--   As the landlord:
--     update repair_requests set landlord_note = 'x' where id = ...                    -> ok
--     update repair_requests set description = 'x' where id = ...                      -> check_violation
--   scripts/verify-security.sh: probe landlord cannot rewrite a seeded tenant's
--   repair description (400); the seeded tenant can confirm resolution (200, 1 row).
