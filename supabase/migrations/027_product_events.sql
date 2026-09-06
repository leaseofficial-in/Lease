-- First-party activation analytics, and a place for client errors to land.
--
-- Why build this rather than reach for a vendor
-- --------------------------------------------
-- The only instrumentation in the product is Vercel Analytics, which counts
-- pageviews. Every funnel number in the September audit had to be reconstructed by
-- hand-querying Postgres — which worked at 7 signups and will not at 700, and
-- cannot answer "where did they give up" at any scale, because the database records
-- outcomes and never attempts.
--
-- That is the actual gap. Of 7 real signups, 4 never created a property; nothing
-- anywhere records whether they opened the form and abandoned it, or never found
-- it. A `properties` row tells you someone succeeded. It cannot tell you who tried.
--
-- This is deliberately NOT a general-purpose tracking system. It is a fixed
-- taxonomy covering one question — does a landlord reach an accepted invite — and
-- the CHECK constraint is the enforcement of that. Adding an event requires
-- editing this list on purpose, which is the intended friction: it keeps the table
-- answerable instead of turning it into a landfill of autocaptured clicks.
--
-- Privacy posture: no free-text, no PII, no page URLs, no user agents. `props` is
-- for small structured facts (a role, a count, a failure reason). Nobody can read
-- this table through the API — not even the user who generated the row — because
-- there is no legitimate in-product reason to, and a table nobody can read cannot
-- leak. Analysis happens through the management API as service_role.

-- ── Events ────────────────────────────────────────────────────────────────────

create table if not exists public.product_events (
  id         bigserial primary key,
  -- Null for events that happen before sign-in (an invite opened by a prospective
  -- tenant who has never had an account). Set null on delete rather than cascade:
  -- funnel history should survive an account being removed, and without the user
  -- id the surviving row is anonymous.
  user_id    uuid references auth.users(id) on delete set null,
  event      text not null,
  props      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  -- The taxonomy. One question: does a landlord reach an accepted invite, and
  -- where do they stop. Anything outside this list is rejected at the database.
  constraint product_events_known_event check (event in (
    -- acquisition
    'signup_started',          -- OAuth begun, role chosen
    'signup_completed',        -- profile has a role; props: { role }
    -- landlord activation
    'property_create_started', -- the add-property form was opened
    'property_created',
    'rental_create_started',
    'rental_created',
    'invite_sent',             -- props: { channel: whatsapp | sms | copy | share }
    'invite_regenerated',
    -- tenant activation
    'invite_opened',           -- props: { state } from the join screen's machine
    'invite_accepted',
    -- recurring value, the thing retention actually depends on
    'payment_recorded',        -- props: { method }
    'payment_confirmed',
    'repair_raised',
    'agreement_signed'
  )),

  -- A props blob is a small bag of facts, not a document. Caps the damage from a
  -- caller that decides to stuff a stack trace or a form payload in here.
  constraint product_events_props_small check (pg_column_size(props) < 2048)
);

create index if not exists idx_product_events_event_time on public.product_events (event, created_at desc);
create index if not exists idx_product_events_user       on public.product_events (user_id, created_at desc);

alter table public.product_events enable row level security;

-- Insert only, and only ever as yourself. A signed-in caller must stamp their own
-- id; an anonymous caller must leave it null. Neither can attribute an event to
-- somebody else, which is what stops the table being usable to forge another
-- account's history.
drop policy if exists "Callers record their own events" on public.product_events;
create policy "Callers record their own events"
  on public.product_events for insert
  with check (user_id is null or user_id = auth.uid());

-- No SELECT policy, on purpose. With RLS enabled and no policy, reads return
-- nothing to anon and authenticated alike. service_role bypasses RLS, so analysis
-- through the management API is unaffected.

comment on table public.product_events is
  'Fixed-taxonomy activation funnel. Insert-only for users, unreadable through the API by design; query as service_role. No PII, no URLs, no user agents.';

-- ── Client errors ─────────────────────────────────────────────────────────────
--
-- Production exceptions are currently invisible: there is no Sentry, and a
-- console.error inside a user's browser reaches nobody. This is the smallest thing
-- that answers "is the app throwing for real users", using the stack already in
-- place rather than adding a vendor.
--
-- Deliberately coarse. It is not a replacement for a real error tracker — no
-- release tracking, no grouping, no source maps — and should be swapped for one
-- when there is volume to justify it. It is, however, the difference between zero
-- visibility and some.

create table if not exists public.client_errors (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete set null,
  message    text not null,
  -- Where in the app, as a route pattern rather than a live URL, so ids in the
  -- path do not turn this into a log of who looked at what.
  context    text,
  stack      text,
  created_at timestamptz not null default now(),

  constraint client_errors_message_len check (char_length(message) <= 500),
  constraint client_errors_stack_len   check (stack is null or char_length(stack) <= 4000),
  constraint client_errors_context_len check (context is null or char_length(context) <= 120)
);

create index if not exists idx_client_errors_time on public.client_errors (created_at desc);

alter table public.client_errors enable row level security;

drop policy if exists "Callers record their own errors" on public.client_errors;
create policy "Callers record their own errors"
  on public.client_errors for insert
  with check (user_id is null or user_id = auth.uid());

-- Same reasoning as above: no SELECT policy. A stack trace can name internals, and
-- there is no reason for one user to read another's.

comment on table public.client_errors is
  'Lightweight client exception log. Insert-only for users, unreadable through the API; query as service_role. A stopgap until a real error tracker is justified.';

-- ── Reduce the default grants to what these tables actually need ──────────────
--
-- Supabase's default privileges hand anon and authenticated the full set on every
-- new table in public. On an RLS-protected table that mostly does not matter --
-- except TRUNCATE, which is a table-level privilege that RLS does not govern at
-- all. PostgREST does not expose TRUNCATE today, so this is not a live hole, but
-- relying on "the API happens not to offer it" is exactly the reasoning that left
-- rental_activity_feed writable in 022. Grant what is needed and nothing else.
--
-- INSERT only. Reads are service_role, which bypasses grants and RLS alike.

revoke all on public.product_events from anon, authenticated;
revoke all on public.client_errors  from anon, authenticated;

grant insert on public.product_events to anon, authenticated;
grant insert on public.client_errors  to anon, authenticated;

-- bigserial means a sequence, and INSERT needs USAGE on it to get an id.
grant usage on sequence public.product_events_id_seq to anon, authenticated;
grant usage on sequence public.client_errors_id_seq  to anon, authenticated;

-- PostgREST caches the schema; without this the new tables 404 until it reloads.
notify pgrst, 'reload schema';

-- ── Verification ──────────────────────────────────────────────────────────────
--   1. anon POST /rest/v1/product_events with a valid event  -> 201
--   2. anon POST with event 'nonsense'                        -> 400 (check violation)
--   3. anon POST with someone else's user_id                  -> 403 (RLS)
--   4. anon GET  /rest/v1/product_events                      -> []
