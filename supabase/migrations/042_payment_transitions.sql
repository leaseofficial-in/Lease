-- A confirmed payment is final, and each side may only move its own part of it.
--
-- What was wrong
-- --------------
-- The policies on `rent_payments` decide WHO may write (and they are sound: a
-- tenant cannot insert or update a row into `paid` — that is the landlord's, via
-- `confirm_rent_payment`). Neither side has any column or transition scope:
--
--   * A landlord can UPDATE a **paid** payment. Set it back to `pending`, change
--     the amount, and the tenant's confirmed receipt — the thing this product
--     exists to produce, with `UNIQUE (rental_id, month)` meaning there is exactly
--     one per month and no way to record a correction — is simply gone. The
--     dashboard only offers Reject on `pending_verification`, so nothing in the
--     product wants this; it is reachable over the API alone.
--   * A landlord can rewrite `payment_method`, `utr_number`, `payment_note` and
--     `payment_proof_url`: the tenant's account of how they paid, which is exactly
--     what is in dispute when a payment is disputed.
--   * A tenant can change `amount` on their own pending row — the rent is the
--     lease's, not theirs — and can move `month` or `tenant_id` on any row they
--     may touch.
--
-- Same class as 038 (messages), 039 (repairs/deposits) and 040 (deletes): the
-- policy answers "may this person write here" and nothing answers "may they write
-- *this*". RLS cannot compare OLD and NEW, so this is a BEFORE UPDATE trigger, in
-- the shape 030/031/039 established.
--
-- What each side may do
-- ---------------------
--   nobody with a JWT:  rental_id, tenant_id, month, created_at are fixed
--   once status = paid: nothing changes, for anyone (updated_at aside)
--   tenant:             pending | overdue | partial  ->  pending_verification,
--                       plus payment_method, utr_number, payment_note,
--                       payment_proof_url. Not amount, not late_fee (031),
--                       not paid_at.
--   landlord:           pending_verification -> paid (that is
--                       confirm_rent_payment, which is SECURITY DEFINER but still
--                       runs with the landlord's auth.uid(), so it lands here) or
--                       -> pending (Reject). May set amount and late_fee while the
--                       row is not paid. Not the tenant's four evidence columns.
--   no JWT:             pg_cron, migrations, service_role — untouched, which is
--                       how mark_overdue_payments() and ensure_current_month_rent()
--                       keep working.
--
-- On freezing `paid`
-- ------------------
-- There is no un-confirm anywhere in the product and no second row to correct it
-- with. Freezing therefore changes nothing a user can currently do, and closes the
-- only path by which one party can erase the other's receipt. If an undo is ever
-- wanted it should be a deliberate feature that writes a `rental_events` entry,
-- not an unguarded UPDATE.

create or replace function public.enforce_payment_transitions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_landlord boolean;
begin
  -- No JWT: the cron jobs, a migration, service_role. Not a party.
  if uid is null then return new; end if;

  if new.rental_id is distinct from old.rental_id
     or new.tenant_id is distinct from old.tenant_id
     or new.month is distinct from old.month
     or new.created_at is distinct from old.created_at then
    raise exception 'A payment cannot be moved to another rental, month or tenant.'
      using errcode = 'check_violation';
  end if;

  -- The receipt is final. updated_at is excluded because set_updated_at() is also
  -- a BEFORE UPDATE trigger and may already have moved it.
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
$$;

revoke execute on function public.enforce_payment_transitions() from public, anon, authenticated;

-- Name chosen so it sorts after rent_payments_tenant_scope and
-- rent_payments_updated_at: triggers on the same event fire in name order, and
-- this one reads new.updated_at expecting set_updated_at() to have run.
drop trigger if exists rent_payments_transitions on public.rent_payments;
create trigger rent_payments_transitions
  before update on public.rent_payments
  for each row execute procedure public.enforce_payment_transitions();

comment on function public.enforce_payment_transitions() is
  'Column and transition scope for rent_payments. RLS says who may write; this says what they may write.';

-- == Verification ==============================================================
--   As the landlord:
--     update a paid payment set status = 'pending'        -> check_violation
--     update a paid payment set amount = 1                -> check_violation
--     update pending_verification -> 'pending' (Reject)   -> 1 row
--     select confirm_rent_payment(<pending_verification>) -> paid
--     update any row set utr_number = 'x'                 -> check_violation
--   As the tenant:
--     update own pending row: status -> pending_verification, payment_method -> 1 row
--     update own pending row: amount = 1                  -> check_violation
--     update own row: status -> 'paid'                    -> RLS denial
--   With no JWT: mark_overdue_payments() still runs.
