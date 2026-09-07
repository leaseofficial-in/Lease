-- An invite code stops telling anyone anything once it can no longer be used.
--
-- What was wrong
-- --------------
-- `rental_invite_preview(token)` is SECURITY DEFINER and callable by anon -- it
-- has to be, since the point is to show someone what they are joining before they
-- sign up. It returns the rent, the deposit, the due day, the property name and
-- city, and the landlord's full name, for any token, forever:
--
--   * after the invite has been claimed
--   * after it has expired
--   * after the tenancy has ended
--
-- The client withholds all of that (it only renders those fields in the `preview`
-- state), but the client is not the boundary: PostgREST exposes the function at
-- /rest/v1/rpc/rental_invite_preview and anyone can call it directly.
--
-- These codes travel by WhatsApp and SMS. They get forwarded, screenshotted and
-- left in group chats. Every unclaimed invite in this database is expired (43 of
-- them, 0 live), so today every code ever shared still discloses a landlord's name
-- and what they charge, to anyone who has it, for a tenancy that may have started
-- months ago.
--
-- The rule
-- --------
-- Details are returned when the invite is still usable (unclaimed, unexpired, not
-- ended) or when the caller is already a party to the rental -- the tenant who
-- claimed it and the landlord who sent it can both still see their own rental.
-- Otherwise the row still comes back, so the /join screen can keep telling people
-- apart ("expired", "already taken", "that's your own property"), but the columns
-- that describe the deal come back null.
--
-- Signature unchanged: same name, same argument, same column list and order, so
-- the client keeps working untouched.

create or replace function public.rental_invite_preview(invite_token_input text)
returns table (
  id uuid,
  status text,
  monthly_rent numeric,
  security_deposit numeric,
  rent_due_day integer,
  invite_expires_at timestamptz,
  is_taken boolean,
  viewer_is_tenant boolean,
  viewer_is_landlord boolean,
  property_name text,
  property_city text,
  property_country text,
  landlord_name text
)
language sql
stable
security definer
set search_path = public
as $$
  with row as (
    select
      r.*,
      coalesce(r.tenant_id = auth.uid(), false)   as is_tenant,
      coalesce(r.landlord_id = auth.uid(), false) as is_landlord,
      (
        r.tenant_id is null
        and r.status <> 'ended'
        and r.invite_expires_at is not null
        and r.invite_expires_at > now()
      ) as claimable
    from public.rentals r
    where r.invite_token = invite_token_input
    limit 1
  )
  select
    row.id,
    row.status::text,
    -- Shown to someone who can act on this invite, or to the two people whose
    -- rental it already is. To anyone else holding a stale code: nothing.
    case when row.claimable or row.is_tenant or row.is_landlord then row.monthly_rent end,
    case when row.claimable or row.is_tenant or row.is_landlord then row.security_deposit end,
    case when row.claimable or row.is_tenant or row.is_landlord then row.rent_due_day end,
    row.invite_expires_at,
    row.tenant_id is not null,
    row.is_tenant,
    row.is_landlord,
    case when row.claimable or row.is_tenant or row.is_landlord then coalesce(p.name, p.address_line1) end,
    case when row.claimable or row.is_tenant or row.is_landlord then p.city end,
    -- Country drives currency formatting on a screen that may still render an
    -- empty state; harmless on its own and safe to keep unconditional.
    coalesce(p.country_code, 'IN'),
    case when row.claimable or row.is_tenant or row.is_landlord then lp.full_name end
  from row
  left join public.properties p  on p.id  = row.property_id
  left join public.profiles   lp on lp.id = row.landlord_id;
$$;

-- == Verification ==============================================================
--   anon, live unclaimed token   -> rent, deposit, property, landlord name present
--   anon, expired token          -> id/status/is_taken/expires present, rest null
--   anon, claimed token          -> same
--   the tenant who claimed it    -> full details (it is their rental)
--   the landlord                 -> full details
--   /join/<token> still shows expired / taken / already / is-landlord correctly,
--   because every field that state machine reads is still returned.
