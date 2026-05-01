-- Durable landlord notifications for tenant-generated events.
-- These rows power cross-device action queues and can later fan out to push/email/WhatsApp.

create or replace function public.notify_landlord_repair_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rental_row public.rentals;
  property_name text;
begin
  select * into rental_row
  from public.rentals
  where id = new.rental_id;

  if rental_row.landlord_id is null then
    return new;
  end if;

  select name into property_name
  from public.properties
  where id = rental_row.property_id;

  insert into public.notifications (user_id, title, body, type, data)
  values (
    rental_row.landlord_id,
    'New repair request',
    coalesce(property_name, 'Rental') || ': ' || new.title,
    'repair_update',
    jsonb_build_object(
      'rental_id', new.rental_id,
      'repair_id', new.id,
      'property_id', rental_row.property_id,
      'status', new.status
    )
  );

  return new;
end;
$$;

drop trigger if exists repair_request_notify_landlord on public.repair_requests;
create trigger repair_request_notify_landlord
  after insert on public.repair_requests
  for each row execute function public.notify_landlord_repair_created();

create or replace function public.notify_landlord_payment_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rental_row public.rentals;
  property_name text;
begin
  if new.status <> 'paid' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'paid' then
    return new;
  end if;

  select * into rental_row
  from public.rentals
  where id = new.rental_id;

  if rental_row.landlord_id is null then
    return new;
  end if;

  select name into property_name
  from public.properties
  where id = rental_row.property_id;

  insert into public.notifications (user_id, title, body, type, data)
  values (
    rental_row.landlord_id,
    'Rent payment received',
    coalesce(property_name, 'Rental') || ': payment received',
    'payment_received',
    jsonb_build_object(
      'rental_id', new.rental_id,
      'payment_id', new.id,
      'property_id', rental_row.property_id,
      'amount', new.amount,
      'month', new.month
    )
  );

  return new;
end;
$$;

drop trigger if exists rent_payment_notify_landlord on public.rent_payments;
create trigger rent_payment_notify_landlord
  after insert or update of status on public.rent_payments
  for each row execute function public.notify_landlord_payment_received();

create or replace function public.notify_landlord_proof_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rental_row public.rentals;
  property_name text;
begin
  select * into rental_row
  from public.rentals
  where id = new.rental_id;

  if rental_row.landlord_id is null then
    return new;
  end if;

  select name into property_name
  from public.properties
  where id = rental_row.property_id;

  insert into public.notifications (user_id, title, body, type, data)
  values (
    rental_row.landlord_id,
    'Move-in proof submitted',
    coalesce(property_name, 'Rental') || ': photos are ready for review',
    'proof_submitted',
    jsonb_build_object(
      'rental_id', new.rental_id,
      'proof_id', new.id,
      'property_id', rental_row.property_id,
      'proof_type', new.type
    )
  );

  return new;
end;
$$;

drop trigger if exists proof_notify_landlord on public.proofs;
create trigger proof_notify_landlord
  after insert on public.proofs
  for each row execute function public.notify_landlord_proof_submitted();

create or replace function public.notify_landlord_agreement_signed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  property_name text;
begin
  if new.agreement_signed_at is null or old.agreement_signed_at is not null then
    return new;
  end if;

  select name into property_name
  from public.properties
  where id = new.property_id;

  insert into public.notifications (user_id, title, body, type, data)
  values (
    new.landlord_id,
    'Agreement signed',
    coalesce(property_name, 'Rental') || ': tenant signed the agreement',
    'general',
    jsonb_build_object(
      'rental_id', new.id,
      'property_id', new.property_id
    )
  );

  return new;
end;
$$;

drop trigger if exists agreement_signed_notify_landlord on public.rentals;
create trigger agreement_signed_notify_landlord
  after update of agreement_signed_at on public.rentals
  for each row execute function public.notify_landlord_agreement_signed();
