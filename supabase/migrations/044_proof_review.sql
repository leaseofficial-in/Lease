-- Move-in proof: who may review it, in what order, and who gets told.
--
-- Two problems, both in the same dead-end flow
-- --------------------------------------------
-- 1. `proofs` has a landlord UPDATE policy ("Landlords review proofs") with no
--    WITH CHECK and, after 039, a trigger that stops re-attribution but says
--    nothing about `status`. So a landlord could move an **approved** proof back
--    to `pending` -- which matters because 040 and 041 both hang the tenant's
--    ability to delete photos and rows off `status = 'pending'`. Flipping it back
--    unfreezes the evidence. `reviewed_by` was also unbound: a landlord could
--    record someone else as the reviewer.
--
-- 2. The tenant's "Notify landlord" button on the move-in proof screen inserts
--    into `notifications` directly. `notifications` has no INSERT policy -- only
--    the four notify_* triggers write it -- so RLS refuses every one of those
--    inserts. supabase-js returns the error rather than throwing, the handler
--    never checks it, and the tenant is told "Landlord notified ✓" while nothing
--    happened. The landlord is never told, and the notification the code wanted to
--    send offers "View photos →", an action that has nowhere to go.
--
-- Giving the client a direct INSERT policy on `notifications` would let either
-- party write arbitrary title and body text into the other's inbox, under the
-- product's own chrome. So instead: a SECURITY DEFINER function that takes only a
-- rental id, checks the caller is a party, and writes text this migration owns.
--
-- Status transitions
-- ------------------
--   pending  -> approved | rejected | dispute   (the landlord reviews)
--   rejected -> pending                          (so the tenant can re-shoot;
--                                                 uploads require pending)
--   approved -> dispute                          (a dispute can surface later,
--                                                 e.g. at move-out)
--   approved -> pending                          never: that would unfreeze
--                                                 evidence both sides rely on
-- Only the landlord of the rental moves any of it, and `reviewed_by` is stamped
-- with the caller rather than trusted.

create or replace function public.enforce_proof_review()
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
  if new.status is not distinct from old.status
     and new.reviewed_by is not distinct from old.reviewed_by
     and new.dispute_note is not distinct from old.dispute_note then
    return new;
  end if;

  select exists (
    select 1 from public.rentals r
    where r.id = old.rental_id and r.landlord_id = uid
  ) into is_landlord;

  if not is_landlord then
    raise exception 'Only the landlord reviews a move-in proof.'
      using errcode = 'check_violation';
  end if;

  if new.status is distinct from old.status then
    if old.status = 'approved' and new.status <> 'dispute' then
      raise exception 'This proof has been approved. It is the record both of you rely on and cannot be reopened.'
        using errcode = 'check_violation';
    end if;
    if old.status = 'dispute' then
      raise exception 'This proof is under dispute and cannot be reviewed again.'
        using errcode = 'check_violation';
    end if;
    if old.status = 'rejected' and new.status <> 'pending' then
      raise exception 'A rejected proof goes back to the tenant to redo.'
        using errcode = 'check_violation';
    end if;
    -- Stamped, not trusted: the reviewer is whoever is signed in.
    new.reviewed_by := uid;
  end if;

  if new.reviewed_by is distinct from old.reviewed_by
     and new.reviewed_by is distinct from uid then
    raise exception 'The reviewer is recorded automatically.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_proof_review() from public, anon, authenticated;

drop trigger if exists proofs_review on public.proofs;
create trigger proofs_review
  before update on public.proofs
  for each row execute procedure public.enforce_proof_review();

-- == Telling the other party =================================================
-- Text lives here, not in the client, so neither party can put words in the
-- other's inbox. `kind` is a closed set; anything else is refused.

create or replace function public.notify_rental_counterparty(
  rental_id_input uuid,
  kind text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r public.rentals;
  recipient uuid;
  sender_name text;
  property_name text;
  notif_title text;
  notif_body text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into r from public.rentals where id = rental_id_input;
  if r.id is null then
    raise exception 'Rental not found';
  end if;

  if uid = r.tenant_id then
    recipient := r.landlord_id;
  elsif uid = r.landlord_id then
    recipient := r.tenant_id;
  else
    raise exception 'You are not part of this rental';
  end if;

  if recipient is null then
    return false;  -- nobody on the other side yet
  end if;

  select coalesce(full_name, 'Your tenant') into sender_name from public.profiles where id = uid;
  select coalesce(p.name, 'your property') into property_name
    from public.properties p where p.id = r.property_id;

  if kind = 'move_in_proof' then
    notif_title := 'Move-in photos submitted';
    notif_body  := sender_name || ' has uploaded move-in photos for ' || property_name || '. Review them to confirm the condition at move-in.';
  elsif kind = 'proof_approved' then
    notif_title := 'Move-in photos approved';
    notif_body  := sender_name || ' has approved your move-in photos for ' || property_name || '. They are now part of your record.';
  else
    raise exception 'Unknown notification kind';
  end if;

  insert into public.notifications (user_id, title, body, type, data)
  values (
    recipient, notif_title, notif_body, 'general',
    jsonb_build_object('rental_id', r.id, 'type', kind)
  );

  return true;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC on every new function; 036 set a default that
-- revokes it, but be explicit -- this one is meant to be called by signed-in
-- users, and only by them.
revoke execute on function public.notify_rental_counterparty(uuid, text) from public, anon;
grant execute on function public.notify_rental_counterparty(uuid, text) to authenticated;

-- == Verification ==============================================================
--   As the tenant:  select notify_rental_counterparty(<own rental>, 'move_in_proof') -> true,
--                   and a row appears in the LANDLORD's notifications
--                   select notify_rental_counterparty(<someone else's>, ...)         -> 'not part of this rental'
--                   select notify_rental_counterparty(<own>, 'anything')             -> 'Unknown notification kind'
--                   update proofs set status = 'approved'                            -> check_violation
--   As anon:        rpc/notify_rental_counterparty                                   -> 401
--   As the landlord: pending -> approved -> pending                                  -> check_violation
--                    pending -> rejected -> pending                                  -> ok
