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

### P1-1 · Private photos served from public storage buckets · SHIPPED
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

**Done 2026-09-06**, in that order. A second hole surfaced while doing it: the
policies read `auth.role() = 'authenticated'`, which is a login check, not tenant
isolation — any signed-in user could read (and upload into) any other rental's
photos, and once the bucket was private could still mint a signed URL for them,
because signing is gated by that same policy. Flipping the bucket alone would have
closed the anonymous door and left the cross-tenant one wide open. Both read and
write are now scoped to the rental's landlord and tenant via
`storage_rental_id()`, which handles all three historical path layouts.
**Validation.** All 11 stored objects resolve to a real rental and pass the new
predicate for both parties; the exact photo that downloaded unauthenticated during
the audit now returns 400; anonymous signing returns not_found. One caveat recorded
in the migration: Cloudflare caches the public path for an hour, so previously
fetched URLs survive at the edge that long.

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

### P1-4 · No product analytics · SHIPPED
**Problem.** Only `@vercel/analytics` (pageviews) and Speed Insights. No funnel, no
activation events, no way to see where users drop off.
**Impact.** The July–September funnel had to be reconstructed by querying Postgres
by hand. 4 of 7 real signups never created a property and nobody knows why.
**Fix.** Built first-party rather than waiting on the blocked PostHog connector:
`027_product_events.sql` plus `lib/analytics/track.ts`. A fixed 14-event taxonomy
enforced by a CHECK constraint, covering one question — does a landlord reach an
accepted invite, and where do they stop.
The `*_started` events are the point. The database already records outcomes; a
`properties` row proves someone succeeded and says nothing about the 4-in-7 who
never created one. `property_create_started` vs `property_created` is the first
number that has ever been able to distinguish "never tried" from "tried and gave
up", and `invite_opened` is the only signal that a landlord's link was ever
actually opened by a human.
**Privacy.** No PII, no URLs, no user agents. Insert-only for users and
**unreadable through the API by anyone** — no SELECT policy and no SELECT grant, so
a table nobody can read cannot leak. Analysis runs as service_role.
**Validation.** All five checks in the migration pass: valid event 201, unknown
event name 400 (CHECK), forged `user_id` 401 (RLS), anon read 401, oversized props
400. Test rows deleted afterwards.
**Still worth doing:** PostHog when authorized, for session-level analysis this
cannot do. This answers the funnel question, not every question.

### P1-5 · No error tracking · PARTIAL
Production exceptions were invisible — no Sentry, and `console.error` in a user's
browser reaches nobody. `client_errors` (027) plus `lib/analytics/report-error.ts`
now records them: wired into the existing `app/error.tsx` and
`app/global-error.tsx` boundaries (which already carried a "when Sentry lands,
report here" note), plus window-level `error` and `unhandledrejection` handlers,
since a React boundary catches neither an async rejection nor a throwing event
handler. Deduped per page and capped at 10 rows to survive a render loop. Route
patterns are recorded, never live URLs — `/join/ABC123` would otherwise log a live
invite token.
**Explicitly a stopgap.** No grouping, no release tracking, no source maps, so
minified stacks are of limited use. Marked PARTIAL rather than SHIPPED for that
reason; a real tracker is still worth adding once there is volume to justify it.

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

### P1-7 · Dashboard accessibility · PARTIAL
153 `<button>` elements with 4 `aria-label`s, zero `role=` attributes, 5
click-handling `<div>`s that keyboard users cannot reach, 82 inputs whose
label association is unverified. No focus-visible styling audit has been done.

**Done 2026-09-06 — the structural blockers:**
- `Field` rendered a bare `<label>` beside its control with no association, so
  roughly 80 inputs were announced as unlabelled "edit text". Now `htmlFor` + a
  generated id when the field holds exactly one control, and `role="group"` +
  `aria-label` when it wraps several (the status chips, the payment-method
  picker) — `htmlFor` would have named only the first of those, and wrapping them
  in a `<label>` would make clicking the text activate it.
- `Modal` had no dialog semantics, no Escape, and no focus management. Now
  `role="dialog"` + `aria-modal` + `aria-labelledby`, Escape to close, focus moved
  in on open (to the first real field rather than the close button) and returned to
  the trigger on close, Tab trapped inside, and body scroll locked.
- The three click-handling `<div>`s are keyboard-operable via a shared
  `clickableProps` helper (role, tabIndex, Enter/Space).
- The lightbox and mobile "more" sheet close on Escape; their scrims are
  `aria-hidden` rather than announced as buttons.

**Still open:** icon-only buttons largely lack `aria-label`; no `:focus-visible`
styling audit; colour-contrast has not been measured; no screen-reader pass has
actually been performed. Marked PARTIAL for that reason — what shipped is the
structural layer, verified by reading the DOM contract rather than by testing with
assistive technology.

---

## P2 — Important

### P2-1 · Component primitives are missing (token layer exists) · OPEN
**This entry was overstated and is corrected here.** The original claim — "no design
system" — was drawn from a raw count of `style={{` and was wrong.

What actually exists: a real token layer of ~20 CSS custom properties
(`--rb-ink`, `--rb-action`, `--rb-canvas`, `--rb-border`, …), used by **495 of the
896** inline styles, plus shared style objects (`cardStyle`, `inputStyle`,
`topStyle`, `eyebrowStyle`, `subStyle`, `gridStyle`, `emptyStyle`, `actBtnPrimary`).
Most of the remaining inline styles are one-off layout — flex, grid, padding —
which is unremarkable.

The genuine gaps, in order:
1. **No component primitives.** Styles are shared; components are not. There is no
   `Button`, `Badge`, `EmptyState`, `Card`. `Modal` and `Field` are the only two,
   and both were rebuilt during the accessibility pass — which is precisely the
   argument for primitives: fixing `Field` once fixed ~80 inputs.
2. **116 hardcoded hex values** bypass the tokens. Most are legitimate (`#fff` ×83
   is white text on dark cards, and the agreement print view is deliberately
   document-styled rather than themed). The real bypasses are `#0e1413`,
   `#0f4c5c` and `#f6f4ee`, which duplicate `--rb-ink`, `--rb-action` and
   `--rb-canvas`, and would not follow a rebrand.
3. Those bypasses mostly sit **inside gradients** whose other stop (`#163A47`,
   `#14403E`, `#0F2A2D`) has no token at all. Swapping one stop to a var and
   leaving the other would be less consistent, not more — doing this properly
   means introducing gradient tokens, which is a design decision rather than a
   mechanical refactor. Deliberately not half-done.

### P2-2 · Dashboard is one 4,559-line file · OPEN
Landlord and tenant products, ~20 views, all modals and all data fetching in one
client component. Hurts reviewability, testability, and bundle splitting.

### P2-3 · Lint gate is decorative, and hides a latent crash · OPEN
`npm run lint` fails with 89 errors / 86 warnings on a clean `main`, despite commit
`8caed53` adding "CI quality gates". `npm run verify` chains lint, so the whole
gate has presumably been ignored since the day it was added. `typecheck`, `test`
(30 tests) and `build` all pass.

Breakdown, because "89 lint errors" hides the one category that is not style:

| Rule | Count | Verdict |
|---|---|---|
| `react-hooks/rules-of-hooks` | 23 | **Real. See below.** |
| `@typescript-eslint/no-explicit-any` | 73 | Mostly warnings; type debt |
| `react/no-unescaped-entities` | 19 | Cosmetic |
| `@next/next/no-html-link-for-pages` | 15 | Real: full page reload instead of client nav |
| `@typescript-eslint/no-unused-vars` | 14 | Dead code |

**The hooks violations are a latent crash, not lint noise.** Nested components
inside `DashboardPage` — `PropertyDetailModal` is the clearest — call `useState`
*after* an early `if (!r) return null`. If such a component ever renders once with
hooks and again without, React throws "Rendered fewer hooks than expected" and the
dashboard white-screens.

Checked for reachability rather than assumed: every `setSelectedRental(null)` in
the file is batched with `setModal(null)`, and the render site is gated on
`modal === 'property-detail'`, so the component unmounts rather than re-rendering
with a null. **Latent today, live the moment anyone nulls the rental without also
closing the modal** — an ordinary-looking change that would be very hard to connect
to the resulting crash.

Fix is mechanical but touches ~23 sites in a 4,559-line file: move every hook above
the guard and make the pre-hook derivations null-safe. Deliberately not attempted at
the end of a long session — a careless pass here would introduce exactly the class
of bug it is meant to remove. Best done alongside P2-2 (splitting the file), where
each extracted component can be fixed and reviewed in isolation.

### P2-4 · Move-in proof did not deliver what the copy promises · PARTIAL — **needs a decision**
Raised as a copy nit; it is bigger than that. Across 14 places the marketing claims
move-in photos are "tamper-proof", "sealed", carry "a cryptographic seal", that
"neither side can edit them", and that "server time + GPS" is captured at submit.

Checked against the code. There was **no hashing anywhere in the repository**, no
geolocation capture anywhere, and the stored JPEGs carry no GPSInfo EXIF tag. The
whole "sealed record" value proposition rested on nothing.

Worse, migration `026` — from earlier in this same session — had *granted* UPDATE
on the photo buckets, reasoning that uploads pass `upsert: true`. That reasoning
was wrong twice over: every upload path already carries a timestamp so collisions
cannot realistically happen, and what the policy actually permitted was replacing
the bytes behind an already-submitted proof photo while its row — id, timestamp,
uploader — stayed identical. Exactly the substitution "tamper-proof" promises is
impossible. Caught on re-reading and reverted in `028`.

**Now true:** the UPDATE policy is gone, uploads pass `upsert: false` so a
collision errors instead of replacing evidence, `proof_photos` carries a SHA-256 of
the bytes computed before upload, and the table already had only SELECT and INSERT
policies so its rows were never editable. If a stored object stops matching its
recorded hash, either party can demonstrate the file changed. Pinned by 5 tests
against published SHA-256 vectors, because a hash column that silently changes
encoding would make untouched photos look tampered with.

**Still not true, and needs your decision:** nothing is geotagged. Implementing it
means a location-permission prompt at the moment a tenant is mid-task, which is a
product call, not an engineering one. Either build it or drop the claim from those
14 places. Deliberately not changed unilaterally — it is public-facing positioning.

Honest framing of what the hash is: the client computes it, so it attests to what
that browser saw, not to who saw it. It is not a signature and should not be
described as one.

### P2-5 · `maintenance_charges` is `integer` · SHIPPED
Every other money column is `numeric(12,2)`. This one cannot represent cents, so it
breaks for any currency with subunits in normal use. `repair_requests.cost` and
`rentals.rent_increment_percent` are unconstrained `numeric` — inconsistent.
**Fixed in `029`.** Widening is lossless (all existing values are whole numbers);
verified the sum is identical before and after (4900 → 4900.00). `cost` pinned to
`numeric(12,2)` and `rent_increment_percent` to `numeric(5,2)` — unbounded numeric
lets two amounts that display identically compare unequal.

### P2-8 · Overdue cron used UTC `current_date` · SHIPPED
`007` marked rent overdue by comparing the due day against `current_date` on a UTC
server, so "is this late?" was answered in the server's calendar rather than the
tenant's.

**This was not theoretical.** Checked live: at the time of the fix, IST was already
on 2026-09-07 while UTC was on 2026-09-06 — so the comparison was a full day out for
every Indian tenant, which is the entire current user base. Auckland diverges the
same way; Honolulu and Los Angeles diverge in the other direction at other hours.
The damaging direction is being marked overdue while it is still the due date where
you live: an incorrect late fee on a ledger the product asks both sides to trust.

**Fixed in `029`.** Replaced the inline SQL with `mark_overdue_payments()`, which
compares against `(now() at time zone profiles.timezone)::date`, falling back to
UTC. `profiles.timezone` only became real when `003` was applied earlier today.
The fallback matters: an empty or invalid IANA name would otherwise raise inside
the job and abort the entire run rather than skipping one row. The pg_cron schedule
is unscheduled-then-rescheduled so re-running cannot create a duplicate job.

### P2-9 · New users are never asked for their country · SHIPPED
`003` defaults `country_code` to `'IN'`, and `auth/callback` only routes to
`/onboarding/country` when the column is null — which it now never is. So a US or
UK landlord is silently assigned India and sees rupees until they change it
manually. The page existed and worked; nothing reached it — and there was no way to
change country anywhere in the app, so a landlord outside India had no route out of
rupees at all.
**Fix.** Signup now stamps country/currency/locale/timezone from the detected
region instead of leaning on the `'IN'` column default, and the profile screen
shows Country with a Change link to the existing `/onboarding/country` page rather
than duplicating a picker. That page now writes all four region fields together —
it previously wrote only `country_code`, leaving a profile that disagreed with
itself (`country_code: 'US'` alongside `currency_code: 'INR'`), which matters
because those columns are what any server-side job would have to trust.
Chose seeding-plus-correctable over adding a country step to signup: it adds no
friction to the funnel, and the funnel is the thing that is already failing.

### P2-6 · Test coverage is one file · PARTIAL
Was 9 tests in one file. Now **53 across five**: calendar boundaries, storage-ref
parsing, SHA-256 vectors, and rental terms (late fee, lease expiry, escalation
window, score bands).

Extracting the rental-terms logic to `lib/rentals/terms.ts` found a live money bug.
`computeLateFee` used `Number(rental.late_fee_percent || 5)`, so a stored `0` — a
landlord who deliberately waived the late fee — was read as falsy and charged 5%
anyway. **12 of 52 rentals have `late_fee_percent = 0.00`.** It is not
display-only: the function writes to `rent_payments.late_fee`, so it lands on a
tenant's ledger. No payment exists against those 12 yet, so nobody has been
wrongly charged — it was armed for the first tenant on a waived rental to go
overdue. Same shape as the invite-token leak: latent, and one ordinary event away
from real.

**RLS now has a harness.** `scripts/verify-security.sh` re-checks 22 boundaries
from the position an attacker occupies — holding the publishable anon key and
nothing else — and every one of them was genuinely open in production at some
point. Wired into `npm run verify`, which exits non-zero on the first failure.

One check in the first draft was weaker than it looked: PostgREST answers `204`
both when a PATCH updates rows and when it matches none, so a status-code check
could not tell a blocked write from a successful one — precisely the kind of test
that stays green while the hole is open. It now sends
`Prefer: return=representation` and asserts the affected-rows array is empty.

`lint` is deliberately **not** in the `verify` chain: it still fails on 10
pre-existing violations, and a gate that is always red is a gate everyone ignores.
Put it back once P2-3 is finished.

**Still untested:** cross-tenant access between two signed-in users (needs two
seeded sessions — the obvious next extension, since everything so far is verified
against the anonymous case plus SQL-level simulation of the policy predicates,
which is weaker than exercising it), the invite claim path end-to-end, and deposit
ledger arithmetic.

### P2-7 · `/dashboard` redirect drops the destination · SHIPPED
`proxy.ts` redirected unauthenticated dashboard hits to `/signin` with no `next`,
so a deep link was lost on sign-in — worst for the case that matters most, a tenant
following an invite. Now forwards path + search. Only a path is forwarded and
`/auth/callback` already re-checks that `next` starts with `/`, so it cannot become
an open redirect.

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
