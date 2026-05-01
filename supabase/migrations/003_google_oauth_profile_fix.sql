-- Ensure Google OAuth users can be created without a phone number.

alter table profiles
  alter column phone drop not null;

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, phone, full_name, email)
  values (
    new.id,
    nullif(coalesce(new.phone, new.raw_user_meta_data->>'phone', ''), ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;
