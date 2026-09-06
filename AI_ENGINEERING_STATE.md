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
  `scripts/verify-security.sh` (22 anon checks; 34 with `SUPABASE_SERVICE_ROLE_KEY`
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
- Tests 65 → 83. Lint 10 → **2**, both in the owner's uncommitted `app/rentals/[country]/page.tsx:233`
  (an `<a href="/rentals/">`). Every file I own is lint-clean. signin derives the
  auth-failed message from `useSearchParams` (Suspense-wrapped); country page and
  footer selector read `useRegion()` instead of seeding state from an effect;
  homepage `Dial` hoisted to module scope; seal flash is a ref-driven class toggle.

### P0 / P1 — open
- **Acquisition**: 7 signups in ~2 months, 0 in last 4 days. Not a code problem.
  Technical SEO verified good. (Owner.)
- **"Geotagged" claim** on 14 marketing surfaces is untrue. (Owner decision.)
- **Reminder cron re-enable** after stale-data cleanup. (Owner.)

### P2 — open
- Component primitives (Button/Badge/Card/EmptyState) — Modal and Field exist.
- Dashboard decomposition (extracting terms found a live money bug; do more).
- Verify analytics fires in a browser. Verify `client_errors` captures.
- Cron monitoring: assert on outcome, not on queue success.
- Lint: 2 errors, both in owner's WIP file. Put `lint` back into `verify` once the
  owner commits that page (check whether HEAD also has the `<a>` — see next task).
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

## Test status
83/83 tests · typecheck clean · build clean · security 34/34 · lint 2 (owner WIP only).

## Next task
Clear the 6 lint errors in owned files (then lint can rejoin `verify`, excluding the
owner's WIP path). Then: Button primitive (153 buttons; 30 on shared styles, 23
one-off pills), locale-aware month labels (dashboard MONTHS array is English-only),
and a `track()` unit test with a mocked client.
