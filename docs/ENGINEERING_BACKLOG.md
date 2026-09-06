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
**Also.** Every bucket has `file_size_limit: null` and `allowed_mime_types: null` —
any authenticated user can upload any file of any size.

### P1-2 · Current month computed in UTC · OPEN
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
UTC server, so a tenant in UTC+13 can be marked overdue up to a day early.

### P1-3 · Product UI is hardcoded to India · OPEN
**Problem.** The region system (`lib/i18n/`) is real and the dashboard *does* use
it for computed amounts — but the surrounding UI does not:
- Every rent/deposit/maintenance input is labelled `(₹)` — 13 sites across four
  duplicated form blocks (add, edit, create, bulk create).
- `app/join/[token]/page.tsx:192` hardcodes `'₹' + toLocaleString('en-IN')`. This
  is on the invite path, shown to every tenant in every country.
- ~10 `toLocaleDateString('en-IN')` calls (agreements, payments, repairs).
- Lines 1231/1239 show an Indian TDS warning to all users regardless of country —
  legally wrong content for a non-Indian landlord.
- `relDate()` defaults to `en-IN`; the module-level `inr()` stub hardcodes INR.
**Impact.** Marketing advertises 10 countries and 56 cities; a landlord arriving
from `/rentals/us/austin` lands in a dashboard denominated in rupees. Directly
undermines the global positioning.
**Note.** Blog, `/tools`, and geo marketing pages are deliberately India-specific
content and are correct as they are.

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

### P1-6 · 21 foreign keys without indexes · OPEN
Includes hot paths: `rentals.property_id`, `rent_payments.tenant_id`,
`deposit_transactions.rental_id`, `messages.rental_id`, `proof_photos.proof_id`.
RLS policies run `exists (select 1 from rentals where id = X.rental_id ...)` on
every row check, so these columns are hit constantly. Irrelevant at 52 rentals, a
cliff at 10–100x. Safe to fix (`create index concurrently`).
Note: `agent_*`, `api_tokens`, `brands`, `content_*`, `engagement_metrics`,
`social_accounts` belong to a different product sharing this database — leave them.

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
