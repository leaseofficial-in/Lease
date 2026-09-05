-- Fix two over-broad RLS policies on `rentals` that together let a stranger
-- discover live invites and claim other people's rentals.
--
-- Supersedes the earlier draft of this file (which addressed only hole #1 and was
-- never applied). Nothing from that draft reached the database, so replacing it in
-- place is safe and leaves one authoritative migration.

-- == Hole 1: "Public invite token lookup" (SELECT) ==============================
--
-- 001_schema.sql defines:
--
--   create policy "Public invite token lookup"
--     on rentals for select using (
--       invite_token is not null and invite_expires_at > now()
--     );
--
-- It never requires the caller to know a token, so every rental with a live invite
-- is readable by anyone holding the anon key -- which ships in the client bundle.
-- app/join/[token]/page.tsx filters with .eq('invite_token', tok), but that is a
-- client-supplied predicate: an attacker omits it and selects the lot.
--
-- CONFIRMED LIVE: an unauthenticated GET of /rest/v1/rentals returned a real row
-- with its invite_token, monthly_rent and landlord_id. The earlier draft recorded
-- 0 rows because no invite was live then; it armed itself when a landlord invited
-- a tenant.
--
-- Leaks: invite_token, monthly_rent, security_deposit, landlord_id, tenant_id,
-- agreement terms, and via the join page's joins, landlord name + property address.

-- == Hole 2: "Tenants can accept rental invites" (UPDATE) =======================
--
-- 004_allow_tenant_invite_acceptance.sql defines:
--
--   create policy "Tenants can accept rental invites"
--     on rentals for update
--     using (tenant_id is null and invite_token is not null
--            and invite_expires_at > now())
--     with check (tenant_id = auth.uid() and status = 'pending_proof');
--
-- The USING clause never checks the token either. Any authenticated user can claim
-- ANY unassigned rental with a live invite, by id, without ever seeing a link.
-- Hole 1 hands out the ids; this hole turns them into a takeover.

-- == 1. Read path becomes a function, so the token is a real argument ===========
--
-- SECURITY DEFINER bypasses RLS inside the body, so the WHERE clause is enforced
-- server-side and cannot be stripped by the caller. Only the row whose token was
-- actually supplied comes back.
--
-- Returns the narrow set of fields the join screen renders, deliberately NOT
-- select *, so future columns are not exposed by accident. tenant_id and
-- landlord_id are reduced to booleans about the viewer: the screen only needs to
-- know "is this taken" and "is that me", never the raw user ids.

create or replace function public.rental_invite_preview(invite_token_input text)
returns table (
  id                 uuid,
  status             text,
  monthly_rent       numeric,
  security_deposit   numeric,
  rent_due_day       int,
  invite_expires_at  timestamptz,
  is_taken           boolean,
  viewer_is_tenant   boolean,
  viewer_is_landlord boolean,
  property_name      text,
  property_city      text,
  landlord_name      text
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
  'Look up a single rental by invite token. Replaces the over-broad "Public invite token lookup" RLS policy, which exposed every live invite to any holder of the anon key.';

-- == 2. Write path becomes a function too ======================================
--
-- 004 already ships accept_rental_invite(), which is sound but sets status to
-- 'pending_proof'. The web client instead sets 'active', and 001's rental_activated
-- trigger fires on the transition to 'active' to create the tenant's first
-- rent_payments row. Routing the web flow through accept_rental_invite() would
-- silently stop generating that first rent record.
--
-- So: a claim function that matches what the web client does today, atomically and
-- with the token required. The single UPDATE ... where tenant_id is null is the
-- race guard -- no read-then-write window.
--
-- Returns a status string the join screen maps onto its existing state machine
-- rather than raising, so expected outcomes (expired, taken) are not error paths.

create or replace function public.claim_rental_invite(invite_token_input text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  r        public.rentals;
  claimed  public.rentals;
  uid      uuid := auth.uid();
begin
  if uid is null then
    return 'unauthenticated';
  end if;

  select * into r from public.rentals
  where invite_token = invite_token_input
  limit 1;

  if r.id is null                    then return 'notfound';    end if;
  if r.landlord_id = uid             then return 'is_landlord'; end if;
  if r.tenant_id   = uid             then return 'already';     end if;
  if r.tenant_id is not null         then return 'taken';       end if;
  if r.status = 'ended'              then return 'ended';       end if;
  if r.invite_expires_at is null
     or r.invite_expires_at <= now() then return 'expired';     end if;

  -- Atomic claim: only the caller who finds tenant_id still null wins.
  update public.rentals
  set tenant_id  = uid,
      status     = 'active',
      updated_at = now()
  where id = r.id
    and tenant_id is null
    and invite_expires_at > now()
    and status <> 'ended'
  returning * into claimed;

  if claimed.id is null then
    return 'claimed';  -- someone else won the race in between
  end if;

  return 'ok';
end;
$$;

grant execute on function public.claim_rental_invite(text) to authenticated;

comment on function public.claim_rental_invite(text) is
  'Atomically claim a rental using its invite token. Replaces the over-broad "Tenants can accept rental invites" UPDATE policy, which let any authenticated user claim any unassigned rental by id without knowing a token.';

-- == 3. Drop both over-broad policies ==========================================
--
-- Do NOT run this step until the client no longer reads or updates `rentals`
-- directly by invite token. See the rollout order at the bottom.

drop policy if exists "Public invite token lookup"        on public.rentals;
drop policy if exists "Tenants can accept rental invites" on public.rentals;

-- The remaining rentals policies from 001 are correctly scoped and stay as they
-- are: landlords manage rows where landlord_id = auth.uid(); tenants select and
-- update rows where tenant_id = auth.uid(). A claimed rental is visible to its
-- tenant through the latter as soon as claim_rental_invite() sets tenant_id.

-- == 4. Rotate tokens exposed while the policy was live ========================
--
-- Every unclaimed invite token that existed under the old policy must be assumed
-- public. Replacing them forces landlords to reissue, which is the correct trade:
-- a stale link is an annoyance, a leaked one is a takeover.
--
-- Both columns are NOT NULL and invite_token carries a UNIQUE index, so the token
-- is REPLACED with a fresh value rather than nulled, and the expiry is backdated
-- rather than cleared. A uuid with the dashes stripped is used for the replacement:
-- 32 hex chars, so there is no chance of colliding with the unique index, and the
-- table already contains tokens of that shape. The rotated rows are dead either
-- way -- the landlord regenerates a short code from the dashboard, which renders
-- the "expired, regenerate" state for exactly this condition.
--
-- Only unclaimed invites are touched. Rentals a tenant already joined keep working.

update public.rentals
set invite_token      = replace(gen_random_uuid()::text, '-', ''),
    invite_expires_at = now() - interval '1 second'
where tenant_id is null;

-- == Rollout order =============================================================
--   1. Apply sections 1 and 2 only (create both functions). Nothing breaks: the
--      old policies are still in place and the deployed client still works.
--   2. Deploy the client change (app/join/[token]/page.tsx uses the two RPCs).
--   3. Apply sections 3 and 4 (drop the policies, rotate the leaked tokens).
--   4. Verify: an unauthenticated GET of /rest/v1/rentals?select=* returns 0 rows
--      while an invite is live, and a fresh invite link still resolves and joins.
--
-- Splitting 1 from 3 is what makes this zero-downtime. Applying everything at once
-- breaks the join screen for anyone mid-invite until the client deploy lands.
