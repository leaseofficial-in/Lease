-- Fix: "Public invite token lookup" exposes every live invite to anyone.
--
-- NOT YET APPLIED. This migration must be applied BEFORE the client is switched to
-- rental_invite_preview(), and the client must be switched before the old policy is
-- relied upon as gone. See the rollout order at the bottom of this file.
--
-- The problem
-- -----------
-- 001_schema.sql defines:
--
--   create policy "Public invite token lookup"
--     on rentals for select using (
--       invite_token is not null
--       and invite_expires_at > now()
--     );
--
-- This never requires the caller to know a token. It makes EVERY rental row with a
-- live invite readable by anyone holding the anon key — which ships in the client
-- bundle and is therefore public. app/join/[token]/page.tsx filters with
-- .eq('invite_token', tok), but that is a client-supplied predicate: an attacker
-- simply omits it and selects the lot.
--
-- What leaks: invite_token itself, monthly_rent, security_deposit, landlord_id,
-- tenant_id, agreement terms, and — through the joins the join page already performs
-- — landlord full name and full property address.
--
-- Worse than disclosure: knowing invite_token is sufficient to call
-- accept_rental_invite() (004) and claim someone else's rental as their tenant.
--
-- Current exposure: at the time of writing, an unauthenticated SELECT against
-- /rest/v1/rentals returned 0 rows, because no invite was live. The flaw is latent,
-- not actively leaking — it arms itself the moment a landlord issues an invite.

-- ── 1. Token lookup becomes a function, so the token is a real argument ──────────
--
-- SECURITY DEFINER bypasses RLS inside the function body, so the WHERE clause here
-- is enforced server-side and cannot be stripped by the caller. Only the row whose
-- token was actually supplied comes back.
--
-- Returns the narrow set of fields the join screen renders — deliberately NOT
-- select *, so future columns are not exposed by accident.

create or replace function public.rental_invite_preview(invite_token_input text)
returns table (
  id uuid,
  status text,
  monthly_rent numeric,
  security_deposit numeric,
  rent_due_day int,
  invite_expires_at timestamptz,
  tenant_id uuid,
  property_name text,
  property_city text,
  landlord_name text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    r.id,
    r.status,
    r.monthly_rent,
    r.security_deposit,
    r.rent_due_day,
    r.invite_expires_at,
    r.tenant_id,
    p.name,
    p.city,
    lp.full_name
  from public.rentals r
  left join public.properties p on p.id = r.property_id
  left join public.profiles  lp on lp.id = r.landlord_id
  where r.invite_token = invite_token_input
  limit 1;
$$;

-- Deliberately granted to anon as well as authenticated: the join page is opened
-- from an invite link before the tenant has signed in. The token is the credential.
grant execute on function public.rental_invite_preview(text) to anon, authenticated;

comment on function public.rental_invite_preview(text) is
  'Look up a single rental by invite token. Replaces the over-broad "Public invite token lookup" RLS policy, which exposed every live invite to any holder of the anon key.';

-- ── 2. Drop the over-broad policy ───────────────────────────────────────────────
--
-- Do NOT run this until the client no longer selects from `rentals` by invite token.
-- Dropping it first breaks the join flow for tenants mid-invite.

drop policy if exists "Public invite token lookup" on public.rentals;

-- ── 3. Note on accept_rental_invite ─────────────────────────────────────────────
--
-- 004's accept_rental_invite() is itself sound: it matches on the token, requires
-- tenant_id is null and a live expiry, and is SECURITY DEFINER. It was only
-- dangerous in combination with the leak above, which handed out the tokens. With
-- the policy dropped, a token is once again a secret known only to its recipient.
--
-- Consider additionally shortening invite_expires_at (011 sets a 7-day default) and
-- rotating any invite tokens that were live while the old policy was in place.

-- ── Rollout order ───────────────────────────────────────────────────────────────
--   1. Apply sections 1 and 2 of this migration together (function created, policy
--      dropped in the same transaction).
--   2. Deploy the client change replacing the .from('rentals').eq('invite_token')
--      query in app/join/[token]/page.tsx with
--      supabase.rpc('rental_invite_preview', { invite_token_input: tok }).
--   3. Verify: an unauthenticated GET of /rest/v1/rentals?select=* returns 0 rows
--      while an invite is live, and the join link still resolves for the invitee.
--
-- Applying step 1 without step 2 breaks the join screen. Doing step 2 first fails
-- because the function does not exist yet. They should ship together.
