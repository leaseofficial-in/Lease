# RentyBase — AI Engineering State

**If you are reading this after a context reset: this is your memory. Read it fully,
then continue from "Next task". Do not re-derive what is recorded here.**

Sprint started 2026-09-07. Owner: akhilchintu93@gmail.com. Repo: leaseofficial-in/Lease
(public). All work targets `nextjs/`; the Expo app at repo root is dead — never touch it.

---

## Architecture (verified, not assumed)

- **Web**: Next.js 16 App Router in `nextjs/`, Vercel project `landing`
  (`prj_bqSMVYBXZEJrWksu0Sjblt7BhQF2`), domain rentybase.com. Auto-deploys on push to
  `main`. `proxy.ts` is the middleware (not middleware.ts).
- **Android**: Capacitor WebView loading rentybase.com live — JS changes need a Vercel
  deploy, not an APK. Native Google sign-in via `@codetrix-studio/capacitor-google-auth`.
- **DB**: Supabase project `tuojgwrzfecyeiccdrlj`, Postgres 17. Shared with a second
  product (tables `agent_*`, `api_tokens`, `brands`, `content_*`, `engagement_metrics`,
  `social_accounts`) — leave those alone.
- **Auth**: Google OAuth only. `profiles.role` ∈ landlord | tenant (| pg → landlord-side).
- **Email**: Resend, domain verified, `hello@rentybase.com`. `lib/resend.ts` has
  `sendEmail`, `emailLayout`, `esc`, `escSubject`. Rent templates in `lib/resend-rent.ts`.
- **Cron**: pg_cron runs `mark-overdue-payments` (01:00 UTC, mine, tz-aware),
  `process-rent-daily` and `rent-reminder-agent-daily` (03:30 UTC, both hit Edge
  Functions). Vercel cron for `/api/cron/rent-reminders` is **DISABLED** (see incident).
- **Storage**: `proof-photos`, `repair-photos` private (signed URLs via
  `lib/supabase/media.ts` + `components/secure-image.tsx`); `avatars` public by design;
  `agreements` private, stores HTML.
- **Analytics**: first-party `product_events` (14-event CHECK-constrained taxonomy,
  `lib/analytics/track.ts`) and `client_errors` (`lib/analytics/report-error.ts`).
  Both insert-only, unreadable via API; query as service_role. **Zero rows so far** —
  no traffic to record; never observed firing in a real browser.
- **Dashboard**: `app/dashboard/page.tsx`, ~4,800 lines, both landlord and tenant
  products, all modals, all fetching. The monolith.

## How to operate

- SQL against prod: `scratchpad/q.sh "<sql>"` (Supabase Management API, token in
  memory `credentials.md`). service_role key: fetch from
  `GET /v1/projects/<ref>/api-keys`, use in-session, **never store**.
- Verify: `cd nextjs && npm run verify` = typecheck + 65 tests + build +
  `scripts/verify-security.sh` (22 anon checks; 36 with `SUPABASE_SERVICE_ROLE_KEY`
  exported — creates and destroys its own probe user).
- `npm run lint` fails on 10 pre-existing errors; deliberately NOT in `verify`.
- Commit only my files; the owner has uncommitted geo work in `app/rentals/[country]`,
  `data/locations.ts`, `components/city-postmark.tsx`, `CLAUDE.md`. Never stage those.
- Push: `git push https://leaseofficial-in:<ghp token>@github.com/leaseofficial-in/Lease.git main`
- **Before any mass-send: dry-run first.** `?dry=1` on the reminder route.

## Hard-won facts (each cost something)

1. `supabase/migrations/` is not a record of the DB. `003` had never been applied.
   Check `information_schema` before trusting a column exists.
2. Views need `security_invoker = on`; `public = true` buckets bypass their own
   policies; default grants give anon TRUNCATE (RLS does not govern it).
3. `auth.role() = 'authenticated'` is a login check, not tenant isolation.
4. RLS cannot scope to a column; landlord and tenant are both `authenticated` so
   column grants cannot separate them. Use a `before update` trigger.
5. SECURITY DEFINER bypasses RLS but **not triggers**; `auth.uid()` inside is still
   the caller's. A naive trigger on `rentals` breaks `claim_rental_invite()`.
6. `supabase-js` returns `error: null` for a zero-row update. Every RLS-blocked write
   looks like success unless you `.select()` and check length. ~40 call sites do not.
7. `late_fee_percent || 5` turned a waived 0 into 5%. Use explicit null checks.
8. `net.http_post` "succeeds" when queued. pg_cron success ≠ the job worked.
9. Test the path the app actually uses (`confirm_rent_payment` RPC), not the one
   that looks equivalent (direct PATCH).
10. Check for an existing helper before writing one (`escSubject`, `confirm_rent_payment`).
11. Postgres tokens: `invite_token`/`invite_expires_at` NOT NULL + UNIQUE. Rotate by
    replacing, never nulling.
12. **Run a replacement job by hand before retiring the thing it replaces.** 034
    unscheduled process-rent trusting mark_overdue_payments(), which had a 42703
    and had never once succeeded. Postgres grants EXECUTE to PUBLIC on every new
    function — always revoke, or rely on the schema default set in 036.

13. A `FOR ALL` policy with USING and no WITH CHECK reuses USING for INSERT and
    UPDATE. "Caller is a party to this rental" says nothing about `sender_id`;
    `messages` let a tenant post as the landlord and edit/delete the other side's
    messages for the life of the product. Every write policy needs WITH CHECK that
    binds the author column to `auth.uid()`. Separately: RLS does not apply to
    TRUNCATE, and Supabase's default grants included it for anon/authenticated on
    every table. Revoked in 038 and removed from the defaults.

## Incident log

- **2026-09-07 — 23 unintended emails.** Fired `/api/cron/rent-reminders` at prod
  without dry-run; dedup was per-payment so one tenant got 8 mails. Delivered to 4 real
  Gmail addresses. Fixed (grouped per tenant, `?dry=1`, cap 50, `email_logs`
  backfilled so no second wave). Cron **stays disabled** until owner cleans stale test
  rentals (founder account owns 34 rentals with months of "unpaid" test rent against
  real emails).

## Backlog

### Done this sprint (in order)
- 034: monthly rent rows created in Postgres per tenant tz; `process-rent-daily` and
  `rent-reminder-agent-daily` pg_cron jobs UNSCHEDULED (Edge Functions still deployed).
- `lib/supabase/write.ts` `assertAffected()` on all 18 meaningful dashboard writes.
- `lib/auth/authed-user.ts` shared; `/api/email/payment-submitted` emails the landlord
  when a tenant records a payment (least privilege, runs as tenant under RLS).
- `lib/rent/reminders.ts`: pure `planReminders()` extracted from the cron route and
  pinned by 13 tests (one-email-per-tenant, oldest-month, tenant-tz "today", windows,
  clamp, dedup key). The route now only dedups/renders/sends.
- `useRegion` → `useSyncExternalStore` (no cascading render, no hydration mismatch).
- `genToken()` 8 chars/~32 bits → 10 chars/~50 bits, confusable glyphs excluded.
- `components/ui/button.tsx`: 5 variants copied VERBATIM from the styles they replace;
  31 dashboard buttons migrated (5 submit, 11 cancel, 11 primary, 4 primary-sm).
  15 `{ ...actBtnPrimary, override }` spreads deliberately left — they are real
  visual variants, not migrations.
- `lib/date/month-label.ts`: locale-aware month labels via Intl; English MONTHS
  array deleted. Parses 'YYYY-MM-01' by hand so it never drifts a month via UTC.
- Last `<a href="/rentals">` (existed at HEAD) converted; staged as a blob so the
  owner's WIP on that file stayed untouched. **Lint = 0 and is back in `verify`.**
- TenantEmpty now offers "Have an invite code? Enter it →" (was a dead end).
  `/join` normalises internal whitespace, phone-friendly input attrs, 10-char placeholder.
- `track()` and `reportError()` pinned by mocked tests (insert shape, null user_id for
  anonymous, PII-free route patterns, dedup, per-page cap, truncation).
- `components/ui/empty-state.tsx`: the 8 verbatim "icon + one line" empty states
  migrated by exact-match regex; the 6 variants left. `role="status"` added.
- **`/join/*` and `/onboarding/*` were `index, follow`** (inherited from root). Invite
  pages show rent/deposit/landlord name to link-holders; a crawled link would have
  indexed it. Fixed with `robots: noindex` layouts. `/signin`,`/signup` left indexable
  on purpose (entry points people search for).
- 035: avatar bucket writes scoped to `<uid>/…` (were `auth.role()='authenticated'`
  → any user could overwrite anyone's public profile picture). Dormant (no upload
  feature, 0 objects) but reachable via API. Harness now checks it (36 checks).
- `lib/native.ts`: `isNativeApp` was duplicated verbatim in signin + signup.
- `lib/i18n/regions.test.ts`: 12 regions × (locale, IANA timezone, currency,
  phone, payment-method labels, currency formatting) + picker coverage + fallback.
  A broken region now fails the build instead of silently breaking a country.
  Note: ICU canonicalises `Asia/Kolkata`→`Asia/Calcutta`; the test compares offsets.
- **036**: revoked EXECUTE from public/anon/authenticated on `mark_overdue_payments`,
  `ensure_current_month_rent` (anon could run privileged cron jobs via /rpc — proven
  live) and `accept_rental_invite` (second claim path, only the dead Expo app called
  it). `alter default privileges ... revoke execute on functions from public` so new
  functions are private unless granted. Harness 36 → 39.
- **037 — found by 036's probe**: `rent_payments` had NO `updated_at` column, but
  007's cron, my 029/031 function, and the dashboard reject handler all set it →
  42703. **The SQL overdue job had never run successfully**; process-rent (Edge) was
  what actually marked rent overdue, and 034 unscheduled it → overdue marking silently
  broken since 034, one payment stuck pending. Column + set_updated_at trigger added;
  job now runs; stuck payment marked. Lesson 12: after replacing a job, RUN the
  replacement once by hand before retiring the old one.
- **E2E-verified on production** (lesson 12 applied to my own new code): with a
  disposable GB landlord/tenant pair — `payment-submitted` 200 as tenant, 202 no-op
  as non-party, 400 on malformed id; `welcome` 200 via the shared bearer helper.
  Resend shows both mails; landlord notification renders £1,250.00 and "Faster
  Payments" (no raw id), names, CTA. Probe fully removed; baseline 22/52/54/41.
- Mobile: 27 modal field-pair grids (`1fr 1fr`, gap 12/16) → `.grid-2` class that
  stacks under 520px; gap kept inline so desktop is pixel-identical. The 3 non-modal
  two-column grids (agreement parties block, two landlord stat rows) deliberately
  untouched — the agreement must stay two-column in print.
- `lib/date/relative.ts`: "Today"/"Yesterday" via Intl.RelativeTimeFormat (fr/de/es
  verified), weekday + short date via Intl; dashboard `relDate` wired to it. The one
  English word left is the joiner "at" — joining day+time is locale grammar Intl
  has no primitive for; documented as the single place to change when translations
  arrive. Test caught a throw on malformed locales in toLocaleUpperCase; guarded.
- Tests 65 → 198. Lint 10 → **0**. Security 39/39. (Old note: lint 10 → 2, both in `app/rentals/[country]/page.tsx:233`
  (an `<a href="/rentals/">`). Every file I own is lint-clean. signin derives the
  auth-failed message from `useSearchParams` (Suspense-wrapped); country page and
  footer selector read `useRegion()` instead of seeding state from an effect;
  homepage `Dial` hoisted to module scope; seal flash is a ref-driven class toggle.

- **Batch 21 — in-thread impersonation + the receipt moment (038).** Fresh audit
  angle: the `messages` policy was FOR ALL with no WITH CHECK. Proven live as a
  real tenant (JWT claims simulated in a DO block ending in `raise` so nothing
  persisted): forging the landlord's `sender_id` accepted before, denied after;
  reassigning a message denied; own message allowed. Split into SELECT / INSERT
  (sender bound) / UPDATE (sender only, re-bound) / DELETE (sender only), `to
  authenticated`; anon revoked from the table; TRUNCATE revoked from the API
  roles on all 23 tables + default privileges. Harness: probe is now made
  landlord of a throwaway property+rental with the service key, posts as `OTHER`
  → 403, as itself → 201, PATCH sender → []; seeded rows deleted before the user
  (rentals.landlord_id has no cascade). 39 → 42 checks. Also: `notifications`
  has no INSERT policy (triggers only — correct) but every trigger is
  landlord-directed; tenants have received 0 of 15 ever. Added
  `/api/email/payment-confirmed` — landlord-authenticated mirror of
  payment-submitted, reads payment→tenant under the landlord's own RLS, sends only
  when `status='paid'`, property currency, long-form month — wired into
  `handleAcceptPayment` (keepalive, id + receipt number only). `monthLabel` /
  `formatMonthYear` gained a `'long'` style. Tests 198 → 202.
  `read_at` is not writable by the recipient under the new policies; the client
  never writes it. When "mark read" is built it needs a BEFORE UPDATE trigger
  (documented in 038), or the write silently matches zero rows.

### P1 — needs the owner (found this sprint)
- **Android App Links are unverified in production.** `/.well-known/assetlinks.json`
  serves the literal placeholders `REPLACE_WITH_RELEASE_KEYSTORE_SHA256` /
  `REPLACE_WITH_PLAY_SIGNING_SHA256`. Effect: an invite link tapped on Android opens
  Chrome, never the installed app. Fix needs the local release keystore (never
  regenerate it): `keytool -list -v -keystore rentybase.keystore -alias rentybase`
  → SHA-256, plus Play Console → Setup → App Integrity → app signing SHA-256. Paste
  both into `app/.well-known/assetlinks.json/route.ts`.

### Verified clean this round (do not re-audit)
- `agreements` bucket: no policy, no live reader. 15 HTML files from the old Expo
  Edge Function; the Next.js app renders agreements inline and prints. Orphaned.
- Edge Functions all run as service_role; triggers exempt null uid → unaffected.
- sitemap/robots, updated_at triggers, service-role-only policies: all correct.
- `notifications`: SELECT own + UPDATE own only, no INSERT policy; the four
  `notify_*` triggers are the sole writers. Correct. (Tenant-facing gap covered by
  the payment-confirmed email, not by in-app rows they never open.)
- `messages`: four bound policies as of 038; anon has no grant.

### P0 / P1 — open
- **Acquisition**: 7 signups in ~2 months, 0 in last 4 days. Not a code problem.
  Technical SEO verified good. (Owner.)
- **"Geotagged" claim** on 14 marketing surfaces is untrue. (Owner decision.)
- **Reminder cron re-enable** after stale-data cleanup. (Owner.)

### P2 — open
- Component primitives: Button (31 sites) and EmptyState (8 sites) DONE. Badge/Card open.
- Dashboard decomposition (extracting terms found a live money bug; do more).
- Analytics/error capture: insert shapes verified by mocked tests. Browser-level
  observation still unverified (no browser here). Tables have 0 rows = 0 traffic.
- Cron monitoring: both remaining jobs are plain SQL, so `cron.job_run_details.
  return_message` will hold their row counts. Verify after first tick (00:30/01:00 UTC).
- Mobile: audited. Dashboard has a real phone shell; the three un-collapsed 3-col
  grids are fine on phones (More-sheet icons, 3 small stats, 3 tiny numeric inputs).
  No action needed. 33 two-col grids in modals are cramped-but-functional.

### Shipped (this and prior sessions) — do not redo
021 invite leak/takeover · 022 view RLS · 003 applied · 023 FK indexes · 024 invite
currency · 025 upload limits · 026 private buckets + party-scoped storage · 027
analytics tables · 028 proof integrity (sha256, no overwrite) · 029 money types +
tz-aware overdue · 030 ledger integrity (tenant can't rewrite lease / forge payments)
· 031 server-side late fees · 032 optional address (9→2 required fields) · 033
landlord payment updates. Client: timezone (lib/date), currency by account/property,
signed images, a11y (Field/Modal/keyboard), hooks-order fixes, Link conversions,
tracking, error boundaries, welcome email on all paths, country onboarding, next-param
preservation, reminder emails. Tests 9 → 65. Security harness 34 checks.

## Sprint summary — 2026-09-07

**Starting point:** 65 tests · lint 10 errors (not gating) · security harness 34 ·
two cron jobs silently dead · one activation-blocking form · reminders never sent.

**Ending point:** 198 tests · lint 0 (gating `verify`) · security harness 39, all
green, self-cleaning · production healthy on every route · every DB change applied,
verified by execution, and committed as a migration.

### What materially changed
- **Ledger correctness.** The SQL overdue job had NEVER run (missing column, 037);
  process-rent judged every tenant by Indian time (034 retired it); rent-row creation
  now happens in Postgres per tenant timezone. Late fees respect a waived 0%.
- **Security.** Anon could execute privileged functions via /rpc (036). Any user
  could overwrite any avatar (035). Invite pages were indexable (noindex layouts).
  Every dashboard write now fails loudly on zero rows (`assertAffected`) instead of
  green-toasting an RLS denial. Function EXECUTE now defaults to private.
- **Retention loop.** Landlord is emailed when a tenant records a payment
  (`payment-submitted`, least-privilege, e2e-verified on prod with £ formatting).
  Reminder planning is a pure, tested function; the incident shape (8 mails to one
  person) is a regression test.
- **Globalisation.** Locale month labels, Intl relative days (fr/de/es verified),
  12-region registry integrity test, timezone-correct cron.
- **Product/UX.** Tenants have a self-serve invite-code path; `/join` normalises
  pasted codes; modal field pairs stack on phones; Button + EmptyState primitives
  (39 sites, pixel-identical); hydration effects removed; token entropy ~50 bits.

### What I got wrong this sprint, and caught
- Retired process-rent before running its replacement by hand → overdue marking
  broken until 037. (Lesson 12.)
- First cut of the cron-route rewrite spliced into the wrong `return`. Typecheck.
- Three new modules each had a real bug found by their own first test run
  (planner clamp window, RelativeTimeFormat upper-casing throw, Kolkata alias).
- Repeated cwd slips on this Windows shell cost several retries. Use absolute paths.

### Still open — needs the owner
1. `assetlinks.json` serves placeholder fingerprints → Android deep links open Chrome.
2. Reminder cron disabled pending cleanup of stale founder test rentals.
3. "Geotagged" claim on 14 marketing surfaces is untrue.
4. Acquisition: 0 signups in 5 days. Technical SEO is correct; this is distribution.

### Still open — engineering, lower priority
- Badge/Card primitives (visual change, needs a browser to verify).
- Dashboard split (4,800 lines); `AgreementDocument` is the safe first extraction.
- Vercel KV for the rate limiter before any per-call-cost endpoint.
- String extraction for real i18n once a translation source exists.
- Verify tomorrow: `cron.job_run_details` shows both jobs succeeded at 00:30/01:00 UTC.

## Test status
202/202 tests · typecheck clean · build clean · security 42/42 · lint 0 (gates verify).

## Known bounds (documented, not fixing autonomously)
- `lib/rate-limit.ts` is per-serverless-instance memory; header says so and names
  the fix (Upstash/KV) before any per-call-cost endpoint. Mail routes are auth+RLS
  bound or dual-keyed (IP + recipient). Acceptable at current scale.
- UI strings are English (relDate "Today at", email templates, marketing). Real i18n
  needs a translation source and a string-extraction pass — not safe to invent.
- Badge: 11 status pills with heterogeneous padding/spacing; consolidating changes
  pixels I cannot see. Left.

## Next task
`/api/email/payment-confirmed` is deployed but has not been exercised end-to-end on
production (the sibling route was). After the Vercel deploy: unauthenticated → 401;
probe landlord JWT + bogus id → 202 with no send. A real send needs a landlord
confirming a payment whose tenant address is controllable — do it with a probe
landlord + probe tenant + seeded paid payment, or leave to the next real
confirmation and check Resend's log. Then keep auditing from angles not yet
covered: `proofs`/`proof_photos` UPDATE binding (`submitted_by`/`uploaded_by`),
`repair_requests` `raised_by`, `deposit_transactions` `created_by` — the same
class of hole as 038 wherever an author column exists.
