-- Give every property the country its landlord actually lives in.
--
-- properties.country_code (003) defaults to 'IN', and until 2026-10-13 no client
-- insert path set it. So every property ever created is 'IN' regardless of where
-- the landlord is. That column is what the invite preview (024/047) uses to
-- format rent, so a US landlord's tenant opened the invite and saw "₹2,000"
-- for a $2,000 rental.
--
-- 1. Drop the 'IN' default and fill a missing value from the landlord's profile
--    instead, so an older client (the Android WebView caches JS) that still
--    omits the column gets the right answer.
-- 2. Backfill: a property marked 'IN' whose landlord's profile says otherwise
--    was almost certainly stamped by the default. A landlord abroad who really
--    owns an Indian property would be re-labelled; at current scale that is
--    worth checking by hand with the SELECT below before running the UPDATE.
--
--   select p.id, p.name, p.city, pr.country_code as landlord_country
--   from properties p join profiles pr on pr.id = p.landlord_id
--   where p.country_code = 'IN' and pr.country_code is distinct from 'IN';

alter table properties alter column country_code drop default;

create or replace function public.properties_default_country()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.country_code is null or new.country_code = '' then
    select coalesce(nullif(country_code, ''), 'IN')
      into new.country_code
      from profiles where id = new.landlord_id;
    new.country_code := coalesce(new.country_code, 'IN');
  end if;
  new.country_code := upper(new.country_code);
  return new;
end;
$$;

revoke all on function public.properties_default_country() from public, anon, authenticated;

drop trigger if exists properties_default_country on properties;
create trigger properties_default_country
  before insert on properties
  for each row execute function public.properties_default_country();

update properties p
   set country_code = pr.country_code
  from profiles pr
 where pr.id = p.landlord_id
   and p.country_code = 'IN'
   and pr.country_code is not null
   and pr.country_code <> 'IN';

-- Profiles likewise accept any ISO country now, not only the curated twelve.
-- No CHECK constraint existed, so nothing to relax; this documents the contract.
comment on column profiles.country_code is
  'ISO 3166-1 alpha-2. Any assigned country; lib/i18n/regions.ts curates 12, lib/i18n/world.ts covers the rest.';

-- Buildings: state and postcode become optional, as 032 already did for
-- properties. Many countries have no states (the UAE, Singapore) or no postcodes
-- (Hong Kong, much of Africa); the form no longer demands them and sends ''.
alter table buildings alter column state   drop not null;
alter table buildings alter column pincode drop not null;
