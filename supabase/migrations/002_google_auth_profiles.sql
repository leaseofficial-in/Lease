-- Allow Google OAuth users to have profiles without a phone number.

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
  on conflict (id) do nothing;
  return new;
end;
$$;
