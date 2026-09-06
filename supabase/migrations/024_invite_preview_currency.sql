-- Return the property's country from rental_invite_preview so the join screen can
-- render the rent in the currency it is actually denominated in.
--
-- Why this is a correctness fix, not a cosmetic one
-- ------------------------------------------------
-- app/join/[token]/page.tsx formatted the invited rent as
--
--   '₹' + Number(n).toLocaleString('en-IN')
--
-- so every invite in every country was drawn in rupees. The obvious repair is to
-- use the viewer's region — and that would be worse. Rent is stored as a bare
-- numeric with no currency attached, so whichever currency the UI chooses IS the
-- currency the number appears to be in. Formatting by the viewer means a tenant
-- opening an Indian landlord's invite from the United States reads "$8,000" for a
-- rental that costs ₹8,000: the same digits, silently reinterpreted, off by two
-- orders of magnitude in real terms.
--
-- Money belongs to the property, not to whoever is looking at it. properties
-- .country_code (added in 003_global_support) is the source of truth, and the
-- client maps it to a currency through lib/i18n/regions.
--
-- Backward compatible: this only ADDS a column to the result. The deployed client
-- ignores columns it does not select, so this can be applied before the client
-- ships. Postgres cannot change a function's return type in place, so the function
-- is dropped and recreated — atomic here, because the statements run in one
-- transaction.

drop function if exists public.rental_invite_preview(text);

create function public.rental_invite_preview(invite_token_input text)
returns table (
  id                   uuid,
  status               text,
  monthly_rent         numeric,
  security_deposit     numeric,
  rent_due_day         int,
  invite_expires_at    timestamptz,
  is_taken             boolean,
  viewer_is_tenant     boolean,
  viewer_is_landlord   boolean,
  property_name        text,
  property_city        text,
  property_country     text,
  landlord_name        text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    r.id,
    r.status::text,
    r.monthly_rent,
    r.security_deposit,
    r.rent_due_day,
    r.invite_expires_at,
    r.tenant_id is not null,
    coalesce(r.tenant_id  = auth.uid(), false),
    coalesce(r.landlord_id = auth.uid(), false),
    coalesce(p.name, p.address_line1),
    p.city,
    coalesce(p.country_code, 'IN'),
    lp.full_name
  from public.rentals r
  left join public.properties p  on p.id  = r.property_id
  left join public.profiles   lp on lp.id = r.landlord_id
  where r.invite_token = invite_token_input
  limit 1;
$$;

-- Granted to anon as well as authenticated: the join page is opened from an invite
-- link before the tenant has signed in. The token is the credential.
grant execute on function public.rental_invite_preview(text) to anon, authenticated;

comment on function public.rental_invite_preview(text) is
  'Look up a single rental by invite token. Replaces the over-broad "Public invite token lookup" RLS policy. Returns the property''s country so the invite renders in the currency the rent is denominated in, never the viewer''s.';
