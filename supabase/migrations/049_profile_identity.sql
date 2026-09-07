-- Your email address is who you signed in as, not a field you can type over.
--
-- What was wrong
-- --------------
-- "Users can update their own profile" is USING (auth.uid() = id) with no WITH
-- CHECK and no column scope. Everything on the row is therefore editable by its
-- owner over the API, including two columns that are not really theirs:
--
-- 1. `email`. This is the address every message this product sends goes to: the
--    welcome mail, rent reminders, payment-confirmed, proof-submitted. It is set
--    once by handle_new_user() from the verified auth identity and nothing else
--    maintains it. A signed-in user could set it to someone else's address and
--    have RentyBase deliver mail there -- carrying their own chosen display name,
--    from our domain, at our sending reputation. Today all 22 profiles still match
--    auth.users, so nothing has diverged; there is simply nothing stopping it.
--
-- 2. `role`. "landlord or tenant -- permanent, set once during onboarding" is
--    written into the project's own documentation and enforced nowhere. It does
--    not cross a tenancy boundary (every policy keys off rental membership, not
--    role) but it decides which dashboard a person gets, and a role that silently
--    flips is a support ticket nobody can explain.
--
-- The fix
-- -------
-- A BEFORE UPDATE trigger, in the shape of 030/039/042/043: a caller holding a JWT
-- may not change `email` or `id` at all, and may set `role` only from null. Callers
-- with no JWT -- handle_new_user(), migrations, service_role -- are untouched.
--
-- And because auth is the source of truth, an email changed there must follow:
-- Supabase's own email-change flow updates auth.users and nothing was propagating
-- it to profiles, so a user who changed their address would have kept receiving
-- mail at the old one. A trigger on auth.users now syncs it.
--
-- The profile UI edits full_name, phone, upi_id and pan_number; onboarding sets the
-- region columns; signup sets role once. None of that is affected.

create or replace function public.enforce_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  -- No JWT: handle_new_user(), the auth sync below, a migration, service_role.
  if uid is null then return new; end if;

  if new.id is distinct from old.id then
    raise exception 'A profile cannot be moved to another account.'
      using errcode = 'check_violation';
  end if;

  if new.email is distinct from old.email then
    raise exception 'Your email address comes from the account you sign in with. Change it in your account settings.'
      using errcode = 'check_violation';
  end if;

  if new.role is distinct from old.role and old.role is not null then
    raise exception 'Whether you are a landlord or a tenant is set once, when you join.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_profile_identity() from public, anon, authenticated;

drop trigger if exists profiles_identity on public.profiles;
create trigger profiles_identity
  before update on public.profiles
  for each row execute procedure public.enforce_profile_identity();

-- == Keep it in step with auth ================================================
-- handle_new_user() fires on INSERT only, so an address changed through
-- Supabase's email-change flow never reached profiles. Freezing the column
-- without this would strand mail at the old address permanently.

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

revoke execute on function public.sync_profile_email() from public, anon, authenticated;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute procedure public.sync_profile_email();

-- == Verification ==============================================================
--   As a signed-in user, on their own profile:
--     update profiles set email = 'someone@else.test'  -> check_violation
--     update profiles set role = 'landlord' (role set)  -> check_violation
--     update profiles set full_name = 'New Name'        -> 1 row
--   A profile whose role is still null: set it once     -> 1 row, then refused
--   Change auth.users.email for that id                 -> profiles.email follows
--   select count(*) from profiles p join auth.users u on u.id = p.id
--     where p.email is distinct from u.email;           -> 0
