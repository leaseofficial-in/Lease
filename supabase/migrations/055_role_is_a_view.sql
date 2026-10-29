-- `profiles.role` becomes "which side of the app you are looking at", not a
-- permanent identity. One account can own a flat and rent another.
--
-- Why
-- ---
-- 049 made role write-once ("set once, when you join"). In practice:
--   - 6 of 26 accounts signed in and never picked a role, and stopped there.
--   - 3 of those 6 were already tenants on a rental. The dashboard decides
--     everything from `role`, so they saw a "choose your role" card instead of
--     the rental they had just joined.
--   - People who are both a landlord and a tenant had no way to be both.
--
-- Nothing secures data by role: every policy keys off rental membership
-- (landlord_id / tenant_id), as 049 itself notes. So letting role move between
-- landlord and tenant changes which screens someone sees, never what they can
-- read or write.
--
-- What changes
-- ------------
-- 1. The identity trigger still forbids changing `id` or `email`, and still
--    forbids clearing a role back to null. It now allows landlord <-> tenant.
-- 2. Accounts with no role but real data get the role their data implies.

create or replace function public.enforce_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  -- No JWT: handle_new_user(), the auth sync, a migration, service_role.
  if uid is null then return new; end if;
  if new.id is distinct from old.id then
    raise exception 'A profile cannot be moved to another account.'
      using errcode = 'check_violation';
  end if;
  if new.email is distinct from old.email then
    raise exception 'Your email address comes from the account you sign in with. Change it in your account settings.'
      using errcode = 'check_violation';
  end if;
  if new.role is null and old.role is not null then
    raise exception 'Choose the landlord or tenant view; the view cannot be cleared.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_profile_identity() from public, anon, authenticated;

-- Backfill from data. Tenancy wins over ownership for the default view: someone
-- who joined a rental came here to see it.
update public.profiles p
   set role = 'tenant'
 where p.role is null
   and exists (select 1 from public.rentals r where r.tenant_id = p.id and r.status <> 'ended');

update public.profiles p
   set role = 'landlord'
 where p.role is null
   and (exists (select 1 from public.properties x where x.landlord_id = p.id)
        or exists (select 1 from public.rentals r where r.landlord_id = p.id));
