-- Tell the other party a message arrived.
--
-- What was wrong
-- --------------
-- `messages` has no trigger and nothing else writes a notification for it. Four
-- events in this product notify somebody -- an agreement signed, a payment
-- received, a proof submitted, a repair raised -- and the one feature whose entire
-- purpose is to reach the other person notifies nobody. A landlord writes "the
-- plumber comes Tuesday" and the tenant finds out if and when they next open the
-- app. All 8 messages in this database are unread, and `read_at` has never been
-- written by anything, so there is not even an unread badge to notice.
--
-- The shape follows the four existing notify_* triggers: AFTER INSERT, SECURITY
-- DEFINER (the `notifications` table has no INSERT policy on purpose -- see 044 --
-- so triggers are the only writers), text owned by this migration.
--
-- Not an email. A message is a conversation and can arrive in bursts; a mail per
-- line would train people to filter the sender, which would cost the reminders and
-- receipts that matter. In-app is the right weight for this one.
--
-- Bursts are handled by not stacking: if the recipient already has an unread
-- message notification for this rental, the body is refreshed instead of adding
-- another row. Ten messages in a row leave one entry saying so, not ten.

create or replace function public.notify_message_recipient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rentals;
  recipient uuid;
  sender_name text;
  property_name text;
  existing uuid;
  preview text;
begin
  select * into r from public.rentals where id = new.rental_id;
  if r.id is null then return new; end if;

  if new.sender_id = r.tenant_id then
    recipient := r.landlord_id;
  elsif new.sender_id = r.landlord_id then
    recipient := r.tenant_id;
  else
    return new;   -- 038 makes this unreachable; harmless if it ever is not
  end if;

  if recipient is null then return new; end if;

  select coalesce(full_name, 'They') into sender_name from public.profiles where id = new.sender_id;
  select coalesce(p.name, 'your rental') into property_name
    from public.properties p where p.id = r.property_id;

  -- A glimpse, not the message: enough to know whether it needs opening now.
  preview := left(regexp_replace(new.body, '\s+', ' ', 'g'), 90);
  if length(new.body) > 90 then
    preview := preview || '…';
  end if;

  select id into existing
  from public.notifications
  where user_id = recipient
    and read = false
    and data->>'type' = 'message'
    and data->>'rental_id' = r.id::text
  order by created_at desc
  limit 1;

  if existing is not null then
    update public.notifications
    set title = sender_name || ' sent you a message',
        body = preview,
        created_at = now()
    where id = existing;
  else
    insert into public.notifications (user_id, title, body, type, data)
    values (
      recipient,
      sender_name || ' sent you a message',
      preview,
      'general',
      jsonb_build_object('rental_id', r.id, 'type', 'message')
    );
  end if;

  return new;
end;
$$;

revoke execute on function public.notify_message_recipient() from public, anon, authenticated;

drop trigger if exists messages_notify_recipient on public.messages;
create trigger messages_notify_recipient
  after insert on public.messages
  for each row execute procedure public.notify_message_recipient();

comment on function public.notify_message_recipient() is
  'Notifies the other party to the rental. Collapses a burst into one unread entry.';

-- == Verification ==============================================================
--   As the tenant: insert a message -> the LANDLORD gains one notification
--   Insert three more            -> still one, body updated to the latest
--   Mark it read, insert another -> a second notification appears
--   The sender never notifies themselves.
