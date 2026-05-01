-- Payment verification contract.
-- Makes tenant-submitted offline payments first-class and confirms them through
-- a narrow landlord-only RPC instead of a broad client-side update.

alter type public.payment_status add value if not exists 'pending_verification';

create or replace function public.confirm_rent_payment(payment_id uuid)
returns public.rent_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.rent_payments;
begin
  update public.rent_payments payment
  set
    status = 'paid',
    paid_at = coalesce(payment.paid_at, now())
  where payment.id = payment_id
    and exists (
      select 1
      from public.rentals rental
      where rental.id = payment.rental_id
        and rental.landlord_id = auth.uid()
    )
  returning * into payment_row;

  if payment_row.id is null then
    raise exception 'Payment not found or you are not allowed to confirm it.';
  end if;

  return payment_row;
end;
$$;

revoke all on function public.confirm_rent_payment(uuid) from public;
grant execute on function public.confirm_rent_payment(uuid) to authenticated;

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
  if new.status::text <> 'pending_verification' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status::text = 'pending_verification' then
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
    'Payment needs confirmation',
    coalesce(property_name, 'Rental') || ': tenant marked rent as paid',
    'payment_received',
    jsonb_build_object(
      'rental_id', new.rental_id,
      'payment_id', new.id,
      'property_id', rental_row.property_id,
      'amount', new.amount,
      'month', new.month,
      'status', new.status::text,
      'payment_method', new.payment_method,
      'utr_number', new.utr_number
    )
  );

  return new;
end;
$$;

drop trigger if exists rent_payment_notify_landlord on public.rent_payments;
create trigger rent_payment_notify_landlord
  after insert or update of status on public.rent_payments
  for each row execute function public.notify_landlord_payment_received();
