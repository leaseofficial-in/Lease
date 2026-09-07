-- Tell the tenant when their rent changes.
--
-- What was wrong
-- --------------
-- The escalation modal writes the new rent, then INSERTs a "Rent revised"
-- notification for the tenant, then toasts "Escalation applied — tenant
-- notified". `notifications` has no INSERT policy, so RLS refuses it; the insert
-- is wrapped in a try/catch marked "non-fatal" which never fires anyway, because
-- supabase-js returns the error rather than throwing. The landlord is told their
-- tenant knows. The tenant is never told anything, and finds out when a larger
-- amount appears on their ledger.
--
-- The other `notifications` INSERT in the client (a new repair request) is dead
-- for the same reason but harmless: the `notify_landlord_repair_created` trigger
-- already sends that one. Removed in the client rather than replaced.
--
-- Rent is the number the whole relationship turns on, so this one gets said
-- properly: server-side text, server-read amount, and the effective date computed
-- in the TENANT's timezone rather than the browser's.

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
  -- `notifications.type` is the enum notification_type, whose values are
  -- rent_due | payment_received | proof_submitted | repair_update | general. The
  -- client was sending 'info', which is not one of them -- so that insert would
  -- have failed on the type even if RLS had allowed it.
  notif_type public.notification_type := 'general';
  recipient_tz text;
  effective_from date;
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
    return false;
  end if;

  select coalesce(full_name, 'The other party') into sender_name from public.profiles where id = uid;
  select coalesce(p.name, 'your property') into property_name
    from public.properties p where p.id = r.property_id;

  if kind = 'move_in_proof' then
    notif_title := 'Move-in photos submitted';
    notif_body  := sender_name || ' has uploaded move-in photos for ' || property_name || '. Review them to confirm the condition at move-in.';

  elsif kind = 'proof_approved' then
    notif_title := 'Move-in photos approved';
    notif_body  := sender_name || ' has approved your move-in photos for ' || property_name || '. They are now part of your record.';

  elsif kind = 'rent_revised' then
    -- Only the landlord revises rent, and only the current stored amount is
    -- quoted -- the client does not get to say what the new rent is.
    if uid <> r.landlord_id then
      raise exception 'Only the landlord can revise the rent';
    end if;
    select coalesce(timezone, 'Asia/Kolkata') into recipient_tz
      from public.profiles where id = recipient;
    effective_from := (date_trunc('month', (now() at time zone recipient_tz)) + interval '1 month')::date;
    notif_title := 'Rent revised';
    notif_body  := 'Your monthly rent for ' || property_name || ' has been revised to '
                   || trim(to_char(r.monthly_rent, 'FM999999999.00'))
                   || ', effective ' || to_char(effective_from, 'DD Mon YYYY')
                   || '. Open RentyBase to see the change.';

  else
    raise exception 'Unknown notification kind';
  end if;

  insert into public.notifications (user_id, title, body, type, data)
  values (
    recipient, notif_title, notif_body, notif_type,
    jsonb_build_object('rental_id', r.id, 'type', kind)
  );

  return true;
end;
$$;

revoke execute on function public.notify_rental_counterparty(uuid, text) from public, anon;
grant execute on function public.notify_rental_counterparty(uuid, text) to authenticated;

-- The amount is deliberately unformatted by currency here: `notifications` has no
-- currency context and the dashboard renders amounts in the property's currency
-- everywhere else. A bare number with two decimals is honest in every region;
-- inventing a symbol server-side would not be.

-- == Verification ==============================================================
--   As the landlord, after applying an escalation:
--     select notify_rental_counterparty(<rental>, 'rent_revised') -> true
--     the tenant's inbox holds the NEW stored rent and next month's 1st,
--     in the tenant's own timezone
--   As the tenant: same call -> 'Only the landlord can revise the rent'
