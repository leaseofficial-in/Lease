# RentyBase Engineering Backlog

Living record of known problems, ranked. Update on discovery and on completion —
the point is to stop rediscovering the same things.

**Priorities:** P0 critical (security / data loss / production broken) · P1 major
user or business impact · P2 important improvement · P3 nice to have.

**Status:** `OPEN` · `IN PROGRESS` · `SHIPPED` (with verification) · `WONTFIX`.

Audit baseline: 2026-09-06. Production scale at time of audit — 22 profiles
(7 real signups since July), 41 properties, 52 rentals, 54 rent payments, 1 rental
event, 26 stored files. Everything below is judged against a product that intends
to be globally scalable, not against current traffic.

---

## P0 — Critical

### P0-1 · `rental_activity_feed` view bypasses RLS · SHIPPED
**Problem.** The view is owned by `postgres` with `security_invoker` unset, so it
runs with the owner's privileges and ignores RLS on `rental_events`. `SELECT` is
granted to `anon`. It joins `profiles`, so it exposes actor names too.
**Verified live:** an unauthenticated request returned a real event — rental id,
actor name, event type, and a payload containing payment amount and method.
**Impact.** Every rent payment event, amount, method and participant name becomes
publicly readable as the product is used. Same class as the invite-token leak.
**Fix.** `security_invoker = on` so the caller's RLS applies, plus revoke the
write grants (`INSERT/UPDATE/DELETE` are currently granted to `anon`; they fail
today only because a joined view is not auto-updatable — that is luck, not design).
**Validation.** Applied 2026-09-06. Anonymous read now returns `[]` (was returning
a real payment event); `security_invoker = on` confirmed in `pg_class.reloptions`;
grants reduced to `SELECT` only for `anon` and `authenticated`; the single existing
event row is intact. Anonymous writes still surface as 500 rather than 403 because
Postgres hits the not-auto-updatable rule before the privilege check — the grant is
genuinely gone, verified in `information_schema.role_table_grants`.

---

## P1 — Major

### P1-1 · Private photos served from public storage buckets · OPEN
**Problem.** `proof-photos` and `repair-photos` are `public = true`, which bypasses
their own "Authenticated read" RLS policies for the `/object/public/` path.
**Verified live:** a tenant's move-in photo (380 KB JPEG) downloaded with no API
key and no session.
**Mitigating.** Paths are three UUIDs deep; bucket listing and the `proof_photos`
table both correctly return empty to `anon`, so paths are not enumerable. This is
why it is P1 and not P0.
**Still serious.** Any leaked URL (chat, referrer, screenshot, log, CDN cache)
grants permanent unauthenticated access that survives lease termination, and the
security model on paper is not the one enforced. These are photos of the inside of
people's homes, used as deposit evidence.
**Fix.** Set both buckets private; render via `createSignedUrl(storage_path)`.
`proof_photos` already stores `storage_path` alongside `public_url`, so the data is
there. `repair_requests.photos` stores URLs in an array and needs paths instead
(all rows are currently empty, so the migration is free).
**Also.** ~~Every bucket has `file_size_limit: null` and `allowed_mime_types: null`~~
— **fixed** in `025_storage_upload_limits.sql`. Photo buckets now cap at 15 MB and
accept only real image types (SVG deliberately excluded: it is an executable
document format, and no camera produces one). Verified that zero existing objects
would be rejected — which is how a regression was caught mid-flight: agreements are
stored as **HTML**, not PDF, so the first draft would have blocked every future
agreement upload, and `text/html; charset=utf-8` needed listing separately because
Supabase matches mime strings exactly.

**Remaining work for P1-1** is only the public→private flip, which must ship in this
order or every stored photo stops rendering:
1. Deploy a client that resolves images through `createSignedUrl`, derived from the
   path inside the stored public URL (works while the buckets are still public, so
   this step is invisible).
2. Verify photos still render for a real landlord and tenant.
3. Flip `proof-photos` and `repair-photos` to `public = false`.
No data migration is needed — `proof_photos.storage_path` already holds the path,
and the path is recoverable from the stored URL for the other two tables.

### P1-2 · Current month computed in UTC · SHIPPED
**Problem.** `app/dashboard/page.tsx` computes `const now = new Date()` and
`currentMonth = now.toISOString().slice(0, 7)` at **module level**, in UTC.
**Impact.** Two distinct bugs. (a) In IST, between 00:00 and 05:30 on the 1st, UTC
is still the previous month, so the dashboard shows last month's rent as current.
For UTC-negative zones the mirror applies at month end — a US landlord sees next
month's row early. (b) `now` is frozen at module load, so a tab left open across
midnight renders "Today"/"Yesterday" against a stale date.
**Fix.** Compute the current month from the viewer's local date, and evaluate
`now` per render rather than once at module scope.
**Related.** `007_cron_overdue_payments.sql` compares against `current_date` on a
UTC server, so a tenant in UTC+13 can be marked overdue up to a day early. NOT yet
fixed — tracked as P2-8.
**Validation.** Helpers extracted to `lib/date/calendar.ts` with 13 unit tests
covering both UTC boundaries (00:30 on the 1st, 23:30 on the last day), the year
rollover, and the sub-24-hour "yesterday" case. Suite went 9 -> 22 tests. Typecheck
and build pass.

### P1-3 · Product UI is hardcoded to India · SHIPPED
**Problem.** The region system (`lib/i18n/`) is real and the dashboard *does* use
it for computed amounts — but the surrounding UI does not:
- Every rent/deposit/maintenance input is labelled `(₹)` — 13 sites across four
  duplicated form blocks (add, edit, create, bulk create).
- `app/join/[token]/page.tsx:192` hardcodes `'₹' + toLocaleString('en-IN')`. This
  is on the invite path, shown to every tenant in every country.
- ~10 `toLocaleDateString('en-IN')` calls (agreements, payments, repairs).
- ~~Lines 1231/1239 show an Indian TDS warning to all users~~ — **this entry was
  wrong.** The TDS block was already correctly gated behind `isIndia`. Corrected on
  re-reading rather than left to mislead the next person.
- `relDate()` defaults to `en-IN`; the module-level `inr()` stub hardcodes INR.
**Impact.** Marketing advertises 10 countries and 56 cities; a landlord arriving
from `/rentals/us/austin` lands in a dashboard denominated in rupees. Directly
undermines the global positioning.
**Note.** Blog, `/tools`, and geo marketing pages are deliberately India-specific
content and are correct as they are.
**Validation.** 13 money-field labels and 13 `en-IN` date calls now derive from
`region`; the repair-cost prefix, the WhatsApp invite line and the agreement clause
suggestions follow suit. Typecheck, 22 tests, build all pass.

### P1-4 · No product analytics · OPEN
**Problem.** Only `@vercel/analytics` (pageviews) and Speed Insights. No funnel, no
activation events, no way to see where users drop off.
**Impact.** The July–September funnel had to be reconstructed by querying Postgres
by hand. 4 of 7 real signups never created a property and nobody knows why.
**Fix.** A small, deliberate event taxonomy on the activation path
(signup → property → invite sent → invite accepted → first payment), not blanket
autocapture. PostHog connector needs OAuth authorization first.

### P1-5 · No error tracking · OPEN
Production exceptions are invisible. No Sentry or equivalent.

### P1-6 · 21 foreign keys without indexes · SHIPPED
Includes hot paths: `rentals.property_id`, `rent_payments.tenant_id`,
`deposit_transactions.rental_id`, `messages.rental_id`, `proof_photos.proof_id`.
RLS policies run `exists (select 1 from rentals where id = X.rental_id ...)` on
every row check, so these columns are hit constantly. Irrelevant at 52 rentals, a
cliff at 10–100x. Safe to fix (`create index concurrently`).
Note: `agent_*`, `api_tokens`, `brands`, `content_*`, `engagement_metrics`,
`social_accounts` belong to a different product sharing this database — leave them.
**Validation.** 023 adds 14 indexes; re-running the unindexed-FK audit leaves only
the other product's 7. Applied to production.

### P1-8 · Migration 003 was never applied · SHIPPED
**Problem.** `003_global_support.sql` — the entire i18n data layer — had never
reached the database. None of `profiles.country_code / currency_code / timezone /
locale` nor `properties.country_code` existed, and neither did its two indexes.
The "multi-region system shipped May 2026" was frontend-only; region lived
exclusively in an IP-geolocation cookie and was never persisted.
**Impact — this was the root cause of a live auth defect.** `app/auth/callback`
runs `.select('role, country_code')`. Against a missing column PostgREST returns
**HTTP 400**, so `profile` came back `null`, `profile?.role` was always falsy, and
**every returning web user was routed to `/signup` instead of `/dashboard`**. They
still reached the dashboard, because the signup page re-checks the session and
redirects — but via a bounce through the signup screen. It also made
`/onboarding/country` unreachable, which is precisely why no user has ever had a
country set.
**Fix.** Applied 003 as written; it is additive-only (ADD COLUMN with defaults).
**Validation.** All five columns present with correct defaults; 22/22 profiles and
all properties backfilled non-null; the callback's exact query now returns 200.

### P1-9 · Money was denominated by the viewer's IP · SHIPPED
**Problem.** `useRegion()` reads the `rb_country` cookie that `proxy.ts` seeds from
the Vercel IP header, and the dashboard formatted every amount with it. Rent is
stored as a bare numeric with no currency attached, so the currency the UI picks
*is* the currency the number appears to be in. A landlord travelling, on a VPN, or
mis-geolocated on first visit saw ₹8,000 of rent redrawn as $8,000 — same digits,
silently reinterpreted. The join page was worse: it hardcoded `'₹'`, so every
invite worldwide was drawn in rupees.
**Fix.** Dashboard currency now derives from `profiles.country_code` (owned by the
user, set at onboarding), falling back to the cookie only before the profile loads.
The invite screen uses the **property's** country — money belongs to the property,
not to whoever is looking at it — delivered by extending `rental_invite_preview` in
`024_invite_preview_currency.sql`.
**Validation.** RPC returns `property_country`; bogus tokens still return `[]` and
`rentals` is still unreadable by anon, so 021's guarantees are intact.

### P1-7 · Dashboard accessibility · OPEN
153 `<button>` elements with 4 `aria-label`s, zero `role=` attributes, 5
click-handling `<div>`s that keyboard users cannot reach, 82 inputs whose
label association is unverified. No focus-visible styling audit has been done.

---

## P2 — Important

### P2-1 · No design system · OPEN
847 inline `style={{…}}` objects in `app/dashboard/page.tsx` alone. No shared
Button / Input / Card / Dialog / Badge / EmptyState primitives, so every surface is
one-off. This is the single biggest reason the product reads as a solo build rather
than a designed system, and it makes both theming and i18n harder.

### P2-2 · Dashboard is one 4,559-line file · OPEN
Landlord and tenant products, ~20 views, all modals and all data fetching in one
client component. Hurts reviewability, testability, and bundle splitting.

### P2-3 · Lint gate is decorative · OPEN
`npm run lint` fails with 88 errors / 91 warnings on a clean `main`, despite commit
`8caed53` adding "CI quality gates". Either fix the violations or the gate is
theatre. `typecheck`, `test` (9 tests) and `build` all pass.

### P2-4 · Marketing claims "geotagged" move-in photos · OPEN
`/for/landlords` advertises "tamper-proof, geotagged move-in photos". The stored
JPEG inspected during the audit has EXIF but **no GPSInfo tag**. Either implement
geotagging or drop the claim — an unsupported trust claim is worse than no claim.

### P2-5 · `maintenance_charges` is `integer` · OPEN
Every other money column is `numeric(12,2)`. This one cannot represent cents, so it
breaks for any currency with subunits in normal use. `repair_requests.cost` and
`rentals.rent_increment_percent` are unconstrained `numeric` — inconsistent.

### P2-8 · Overdue cron uses UTC `current_date` · OPEN
`007_cron_overdue_payments.sql` marks rent overdue by comparing the due day against
`current_date` on a UTC server. A tenant in UTC+13 can be flagged overdue up to a
day early, one in UTC-11 a day late. Needs the tenant's timezone
(`profiles.timezone`, which now finally exists) folded into the comparison.

### P2-9 · New users are never asked for their country · OPEN
`003` defaults `country_code` to `'IN'`, and `auth/callback` only routes to
`/onboarding/country` when the column is null — which it now never is. So a US or
UK landlord is silently assigned India and sees rupees until they change it
manually. The page exists and works; nothing reaches it. Correct fix is to ask
during signup, seeded from the IP guess rather than defaulting silently.

### P2-6 · Test coverage is one file · OPEN
9 tests, all in `lib/format/amount-in-words.test.ts`. No tests for the invite flow,
rent calculation, late fees, deposit ledger, or any RLS boundary.

### P2-7 · `/dashboard` redirect drops the destination · OPEN
`proxy.ts` redirects unauthenticated dashboard hits to `/signin` without a `next`
param, so the user loses their destination after signing in. The OAuth callback
already handles `next` correctly and safely.

---

## P3 — Nice to have

- `genToken()` yields ~32 bits (6 random bytes base36, sliced to 8 chars). Fine
  against brute force through the RPC today; revisit if invite abuse appears.
- No billing/entitlement architecture. Fine while everything is free, but pricing
  logic should not be scattered when it arrives.
- Two products share one Supabase project (RentyBase + a social-media manager).
  Acceptable, worth a boundary before either grows.

---

## Shipped

| ID | Item | Verified |
|----|------|----------|
| — | Invite-token leak + rental takeover (two over-broad RLS policies on `rentals`) | 2026-09-05, anon `SELECT` returns `[]`, PATCH matches 0 rows |
| — | Invite expiry 72h → 7 days (migration 011 was dead code for 4 months) | 2026-09-05, build + typecheck |
| — | Welcome email fired on all 3 signup paths; `pg` role mapped to landlord email | 2026-09-05, build + typecheck |
| P0-1 | `rental_activity_feed` RLS bypass | see entry |
