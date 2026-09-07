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

14. `git push origin main` hangs on a credential prompt in this shell, and pushes
    through a token URL do not move `refs/remotes/origin/main` — so `git status`
    says "ahead N" forever. Truth is `git ls-remote origin refs/heads/main`. Push
    with the token from `nextjs/.env.local` read into the URL, output masked, then
    `git fetch origin` to realign the ref.
15. A table with no UPDATE policy for a role is not "safe by default" if the UI
    offers that role a button. `repair_requests` (tenant cancel / confirm-fixed) and
    `deposit_transactions` (tenant dispute) had never accepted a tenant write; the
    buttons faked success until assertAffected, then failed honestly. Walk every
    client write site against `pg_policies` by (table, cmd, role).

16. RLS is NOT evaluated for cascaded deletes. A DELETE policy on a child table is
    worthless if the parent can be deleted and the FK says CASCADE — the property
    policy had to carry the rental rule itself (040). Check `confdeltype` on every
    FK before trusting a child's policy.

17. Supabase blocks direct SQL DELETE on `storage.objects` ("Use the Storage API
    instead"), so the simulate-claims-in-a-DO-block trick cannot prove a storage
    policy. Prove those over HTTP with two real probe sessions, which is why the
    harness builds a landlord *and* a tenant.

18. PostgREST rejects the WHOLE request for one unknown column in a `select`, and
    the client's `data || []` turns that 400 into "nothing here". Two migrations
    were both numbered 002; one was never applied; the tenant's deposit screen has
    been blank ever since. Grep the client's select strings against
    `information_schema.columns` — it is a two-minute check that no test covers.
19. `.insert()` without `.select()` and without an error check is invisible. The
    repair auto-deduction had a wrong column AND a missing `created_by` its own
    policy required, and reported success for months.

20. Triggers on the same table and event fire in NAME order. `set_updated_at()` is
    also a BEFORE UPDATE trigger, so any "nothing may change" comparison must
    exclude `updated_at` or it fires on every write. Named 042's trigger
    `rent_payments_transitions` to sort after the existing two.

21. Four dead client writes have now been found the same way (repair cancel/confirm,
    deposit dispute, notify-landlord). The tell is always `await sb.from(...)`
    with no `.select()` and no error check: supabase-js RETURNS the error rather
    than throwing, so `try/catch` around it catches nothing and the success toast
    fires regardless. Grep for `.insert(`/`.update(` not followed by `.select(`.

22. Harness checks must not mutate the shared probe fixture. Borrowing the probe
    rental for the invite test meant detaching its tenant, and 13 later checks
    failed as a result — including one that "passed" a deletion it should have
    refused, because the rental really was unclaimed by then. A check that needs a
    different fixture creates its own and deletes it.

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

- **Batch 22 — three dead tenant buttons + review scope (039).** Walking every
  client write against `pg_policies` found `repair_requests` has only a landlord
  UPDATE policy and `deposit_transactions` none: the tenant's "Cancel request",
  "Confirm it's fixed" and "File a dispute" were zero-row writes since they were
  built. Proven live as the real tenant (0 rows on both tables). The landlord
  policies on `proofs`/`repair_requests` were the 038 shape (USING only) — a
  landlord could rewrite the tenant's description or `raised_by`. 039 adds tenant
  UPDATE policies on both tables and three BEFORE UPDATE scope triggers
  (030-style): tenant may change only `status→resolved` / `resolved_confirmed_at`
  and `dispute_status→disputed` / `tenant_dispute_note`; landlord may not touch the
  tenant's content columns or confirmation; nobody re-parents, re-attributes, or
  edits a deposit ledger line's amount/type/note. EXECUTE revoked on all three.
  Proven live both sides (rolled back). Harness seeds a probe tenant on the probe
  rental with a repair request: tenant confirm 1 row / cost 400, landlord note 1
  row / description 400. 42 → 46 checks.

- **Batch 23 — the ledger was one REST call from gone (040).** `rentals` and
  `properties` each had a single FOR ALL policy (`landlord_id = auth.uid()`), and
  every child table cascades from rentals. A landlord could DELETE a rental over
  PostgREST and erase the tenant's whole payment history, deposits, proofs and
  messages; deleting the *property* was worse, since RLS is not evaluated for
  cascaded deletes, so it bypassed any rental policy entirely. The client never
  does either — the product's own "end tenancy" is `status='ended'` — so this was
  an API-only path contradicting the product. FOR ALL also meant no WITH CHECK: a
  landlord could reassign `landlord_id` or move a rental to a property they do not
  own. 040 splits both into SELECT/INSERT/UPDATE/DELETE, binds the UPDATE, and
  allows DELETE only for a rental with `tenant_id is null` and no payments or
  deposit rows (43 of 52 rentals are unclaimed invites — the real cleanup case
  survives); the property rule repeats the test over its rentals so the cascade
  cannot outflank it. Also `proof_photos` had no DELETE policy: the tenant's
  remove-photo control was the third dead write of the 039 class — added, scoped to
  the uploader while the proof is `pending`, which is what the client's
  `isApproved` guard was trying to say. Proven live both directions, rolled back.
  Harness now does its own cleanup *through the policy* (landlord deletes the
  unclaimed rental), so a regression that blocks legitimate deletes also fails.
  46 → 49 checks.

- **Batch 24 — nobody could ever delete a file (041).** `storage.objects` had five
  policies and not one DELETE, for any bucket. So 040's restored remove-photo
  button deleted the row and left the image; every failed-insert-after-upload
  stranded a blob (proof-photos held 10 objects against 9 rows — one orphan, live);
  and no user could remove their own avatar. 041 adds two DELETE policies: the
  uploader (`owner = auth.uid()`, populated on every object) who is still a party
  to the rental, blocked once the proof is approved so the file and the row freeze
  together as 040 intended; and own-avatar. `agreements` (15 files, retired Expo
  Edge Function, service_role only) deliberately untouched. Client `handleDelete`
  now takes the row, then the blob, in that order — the row is the record, and a
  storage failure costs bytes rather than correctness. Harness proves it over HTTP
  with both probe sessions: uploader deletes (200), the other party to the same
  rental cannot (400). 49 → 52 checks.

- **Batch 25 — every invite in production is dead, and the landlord is not told.**
  `select count(*) from rentals where tenant_id is null`: 43 expired, **0 live**.
  Nine rentals of 52 ever got a tenant. The invite modal renders on
  `inviteLink && !inviteExpired`; the else branch says "No invite link yet" whether
  the landlord never made one or the one they sent by WhatsApp lapsed after 7 days.
  So the landlord believes the shared code works while the tenant is told it has
  expired, and neither is looking at the same screen. The regenerate path did exist
  (`handleRegenerateLink`), just behind copy that gave nobody a reason to press it.
  Now: "This invite has expired", the dead code shown inline with when it stopped
  working, and "Generate a new link". The invite-claim RPCs themselves are sound —
  `claim_rental_invite` is atomic on `tenant_id is null` + expiry + not-ended.
  No behaviour change beyond the copy; the 7-day window is the owner's call (below).

- **Batch 26 — the tenant's deposit ledger has always been empty (client/schema
  drift).** Walking client *reads* against the schema, as the write walk was done:
  the tenant's deposit query asks for `category, payment_method, reference`, which
  do not exist — they live in `002_deposit_enhancements.sql`, a migration that
  collided with `002_dashboard_columns.sql` and was never applied. PostgREST 400s
  the entire request for one unknown column (proven live: 42703), and `depRes.data
  || []` renders that as "no deductions". Every tenant has seen an empty deposit
  screen, including the one rental holding a real ₹50,000 entry — and 039's new
  dispute button sits on that list. The mirror bug in the same table: the repair
  auto-deduction insert used `description` (not a column; the column is `note`) and
  omitted `created_by`, which its own INSERT policy requires — unchecked, so
  resolving a repair with "deduct from deposit" has never written anything to the
  deposit ledger. Both proven live (fixed payload inserts 1 row; the old one is
  refused by RLS), rolled back. Fixed the select, the payload, the `DepositTx`
  type and two `t.description` renders; the deduction now surfaces a failure to the
  landlord without making the repair update look failed. The three phantom columns
  were NOT added: nothing writes or renders them. Harness gained two checks that
  run the client's exact select string and exact insert payload, so this drift
  cannot return silently. Helpers now retry once on curl 000 and report
  "could not reach the API" instead of crying breach at a dropped connection.
  52 → 54 checks.

- **Batch 27 — a permanent check for the class of bug batch 26 was.** Nothing in
  this repo asks the database what columns it has: TypeScript does not know it, the
  tests mock it, the build never connects. `scripts/check-schema-drift.py` reads the
  live column list from PostgREST's OpenAPI document (service key; the anon role
  cannot introspect) and walks every `.select()`, `.insert()`, `.update()` and
  `.upsert()` in `nextjs/app` and `nextjs/lib`, skipping embedded resources.
  Verified three ways: passes clean on 26 tables, skips without the key, and catches
  an injected bad column in both a select and an insert payload. Wired into
  `verify-security.sh` as section 6, so `npm run verify` covers it. 54 → 55.
- **Batch 27b — reconciled all 41 migration files against the live database.** Only
  one file is genuinely unapplied: `002_deposit_enhancements.sql` (batch 26's root
  cause), and its three columns are deliberately not being added since nothing
  writes or renders them. Everything else flagged is a later migration superseding
  an earlier one (021 replaced 001/004's invite policies, 026 the photo buckets, 030
  the payment policies, 035 avatars, 038 messages, 040 rentals/properties) — the
  expected shape of an evolving policy set, not drift. One real difference worth
  recording: `018_buildings.sql` declares a `Tenants view building via rental`
  SELECT policy that does not exist live, and the landlord policy was renamed on the
  way in. No user-visible effect — property rows denormalise the building's name,
  address and city ("PG Hostel TukkuGuda – Unit 210"), and no client query embeds
  `buildings` on the tenant path — so the policy is deliberately NOT added rather
  than widening the read surface for nothing. Recorded here so the next audit does
  not re-derive it.

- **Batch 28 — a confirmed receipt was one API call from gone (042).** The
  `rent_payments` policies are sound about *who* (a tenant genuinely cannot write a
  row into `paid`) and say nothing about *what*. A landlord could UPDATE a **paid**
  payment: back to `pending`, or a new amount. With `UNIQUE (rental_id, month)`
  there is exactly one row per month and no correcting entry, so the tenant's
  confirmed receipt — the artefact the whole product exists to produce — could be
  erased or rewritten by the other party. The dashboard only offers Reject on
  `pending_verification`, so this was reachable over the API alone. Two smaller
  holes alongside: the landlord could rewrite `payment_method` / `utr_number` /
  `payment_note` / `payment_proof_url` (the tenant's account of how they paid, and
  the first thing looked at in a dispute), and the tenant could change `amount` on
  their own pending row. 042 adds `enforce_payment_transitions`: rental_id, tenant_id,
  month and created_at fixed for anyone holding a JWT; a `paid` row frozen entirely;
  the tenant limited to pending|overdue|partial → pending_verification plus the four
  evidence columns; the landlord limited to confirm-after-submit and reject, never
  the tenant's columns; no-JWT callers (pg_cron, service_role) untouched. Ten
  transitions proven live and rolled back, including the happy paths —
  `confirm_rent_payment` still sets paid + paid_at, Reject still works,
  `mark_overdue_payments()` and `ensure_current_month_rent()` still run. Freezing
  `paid` removes nothing a user can do today: there is no un-confirm anywhere in the
  product. Harness gained six checks driving the whole state machine over REST.
  55 → 61.

- **Batch 29 — either party could sign for the other (043).** The agreement is the
  one document meant to bind two people, and the dashboard prints it with both
  signature timestamps and an EXECUTED badge. Nothing enforced the flow. 030's
  tenant scope trigger freezes the lease TERMS and its frozen list contains no
  agreement column; the landlord's UPDATE policy checks ownership and no columns.
  So a tenant could set `landlord_signed_at` and `agreement_status = 'executed'` and
  hold a fully executed agreement the landlord never signed; a landlord could stamp
  `agreement_signed_at` and produce one the tenant never signed; either could
  back-date or clear a signature; and the landlord could rewrite
  `agreement_custom_clauses` AFTER the tenant signed, with the tenant's timestamp
  still on the document. 043 adds `enforce_agreement_signing`: each party takes one
  step, in order, on their own line only (draft → pending_signature → tenant_signed
  → executed); a signature can be set once and never cleared; both timestamps are
  stamped `now()` by the trigger rather than trusted from the client; clauses freeze
  the moment the tenant signs; an executed agreement is frozen entirely. Eleven
  behaviours proven live and rolled back — including a back-dated signature being
  stored as today — and the happy path end to end. Harness drives the full signing
  sequence over REST. 61 → 67.

- **Batch 30 — the move-in proof was a dead-end flow, end to end (044, 045).**
  The tenant's most-promoted feature ("protect your deposit") went nowhere:
  * "Notify landlord" INSERTed into `notifications`, a table with **no INSERT
    policy** — RLS refused every one, supabase-js returned the error instead of
    throwing, nothing checked it, and the tenant was told "Landlord notified ✓".
    Proven live. Fourth dead write of this shape.
  * The landlord had no proof screen at all: `proof` is in `tNavItems` only, and
    the notification's own "View photos →" navigated to the properties list.
  * `proofs` had a landlord UPDATE policy with no transition scope, so an
    **approved** proof could be moved back to `pending` — which unfreezes photo
    deletion under 040/041 — and `reviewed_by` was unbound.
  044: `enforce_proof_review` (pending → approved|rejected|dispute, rejected →
  pending, approved → dispute only, reviewer stamped from `auth.uid()`), plus
  `notify_rental_counterparty(rental_id, kind)` — a SECURITY DEFINER RPC that owns
  its own wording, because an INSERT policy on `notifications` would let either
  party write arbitrary text into the other's inbox under the product's chrome.
  045: "open for editing" became `pending OR rejected` across all three photo
  policies — otherwise a rejected proof is frozen and the tenant cannot add the
  photos they were just asked for, making reject a dead end.
  Client: the tenant's button now calls the RPC with a real error check and fires
  a new `/api/email/proof-submitted` (tenant-authenticated, photo count read
  server-side) so the landlord hears about it where they actually are; a review
  card in `PropertyDetailModal` shows the photos with Approve / Ask for more; the
  notification now opens that rental. Approving notifies the tenant — the first
  landlord→tenant notification in the product. Everything proven live and rolled
  back. 67 → 74 checks, 202 → 205 tests.

- **Batch 31 — swept for the dead-write shape, found the last two (046).** Wrote a
  scanner for every `.insert()/.update()/.upsert()/.delete()` in `nextjs/` that is
  neither `.select()`-chained nor destructured for `error`. 21 hits, 19 benign
  (destructured, or deliberately fire-and-forget analytics). The two real ones were
  both the remaining `notifications` INSERTs:
  * **Rent revision.** The escalation modal wrote a "Rent revised" notification for
    the tenant inside a try/catch marked "non-fatal" — a catch that never ran,
    because supabase-js returns errors. RLS refused it (no INSERT policy) and
    `type: 'info'` is not even a value of the `notification_type` enum, so it would
    have failed twice over. The landlord was told "tenant notified"; the tenant
    found out from a bigger number on their ledger. 046 adds a `rent_revised` kind
    to `notify_rental_counterparty` that reads the stored amount server-side,
    refuses any caller who is not the landlord, and computes the effective date in
    the TENANT's timezone. The toast now only claims notification when it happened,
    and tapping it opens the ledger.
  * **New repair request.** Same dead INSERT, but harmless: the
    `notify_landlord_repair_created` trigger already sends that one. Deleted, with
    a comment saying where it really comes from.
  Two remaining unchecked writes are `notifications.update({read:true})`, which has
  a policy and works. Proven live and rolled back; harness 74/74, drift clean.

- **Batch 32 — a shared invite code kept talking forever (047).**
  `rental_invite_preview` is anon-callable by design, and returned the rent, the
  deposit, the due day, the property name and city, and the landlord's full name
  for ANY token — after it was claimed, after it expired, after the tenancy ended.
  The client withholds all of that (those fields only render in the `preview`
  state) but the client is not the boundary: PostgREST exposes the function
  directly. These codes travel by WhatsApp and get forwarded and screenshotted, and
  every unclaimed invite in this database is expired — so every code ever shared
  was still disclosing a landlord's name and what they charge. 047 returns the
  descriptive columns only when the invite is still usable (unclaimed, unexpired,
  not ended) or the caller is already a party; the identifying columns still come
  back so /join can tell expired from taken from unknown. Same signature, so the
  client is untouched. Proven live against real claimed and expired tokens (nulls)
  and a claimable one (full details, to anon as intended). 74 → 77 checks.

- **Batch 33 — tenants could not read a notification even after one arrived.** The
  bell sits in the shared header and its badge counts `notifications`, but
  `renderView()` had an `inbox` case only in the landlord branch: a tenant tapping
  a badged bell landed back on their own home screen. It went unnoticed because
  nothing had ever sent a tenant a notification — until 044 and 046 did. The
  component was never landlord-specific (it renders `notifications`, which RLS
  already scopes to the caller), only its name was: renamed `LandlordInbox` →
  `Inbox`, given to both roles, added to the tenant nav as "Activity", and
  `handleNotifTap` now routes by role — for a tenant `navigate('props')` renders
  TenantHome, so the old path would have sent them nowhere. Labels, icons and
  colours added for the two new kinds.

### P1 — needs the owner (found this sprint)
- **Android App Links are unverified in production.** `/.well-known/assetlinks.json`
  serves the literal placeholders `REPLACE_WITH_RELEASE_KEYSTORE_SHA256` /
  `REPLACE_WITH_PLAY_SIGNING_SHA256`. Effect: an invite link tapped on Android opens
  Chrome, never the installed app. Fix needs the local release keystore (never
  regenerate it): `keytool -list -v -keystore rentybase.keystore -alias rentybase`
  → SHA-256, plus Play Console → Setup → App Integrity → app signing SHA-256. Paste
  both into `app/.well-known/assetlinks.json/route.ts`.

- **Deposit disputes cannot be resolved.** Tenants can now file one (039), and
  `dispute_resolved_note` / `dispute_status='resolved'` exist, but there is no
  landlord UPDATE policy and no UI. Product decision needed: does "resolved" reverse
  the deduction (a correcting entry) or merely annotate it? Trigger 039 already
  reserves those two columns for the landlord.

- **The 7-day invite window is the biggest funnel drop in the product.** 43 of 52
  rentals hold an expired, never-claimed invite; 0 are live. A landlord adds a unit,
  sends a WhatsApp code, and the tenant — who has to download an app and sign up —
  takes longer than a week. Extending to 30 days (`011_invite_token_7day_default.sql`
  plus `tokenExpiry()` in the dashboard) is a one-line change on each side, but it
  widens the window in which a leaked code can claim a tenancy, so it is a product
  decision, not mine. The copy fix in Batch 25 is the safe half. Also worth the
  owner's attention: nothing emails a landlord when an invite lapses unclaimed.
- **`accept_rental_invite` contradicts `claim_rental_invite`.** The former sets
  `status = 'pending_proof'`, a value no other code path produces (live values are
  active / pending_tenant / ended) and no CHECK constraint forbids. EXECUTE was
  revoked in 036 so it is unreachable from the API and nothing calls it; dropping it
  is safe but is a deletion, so it is recorded rather than done.

- **There is no way to undo a confirmed payment, by design as of 042.** If a
  landlord confirms the wrong month, nothing in the product can reverse it and the
  row is now frozen at the database. That was already true in the UI (Reject only
  appears on `pending_verification`); 042 makes it true underneath. If an undo is
  wanted it should be a deliberate feature that writes a `rental_events` entry, not
  a loosened policy — say so and it can be built.

- **The lease terms can still change under a signed agreement.** 043 freezes the
  clauses and the signatures once signed, but `monthly_rent`, `security_deposit`,
  `rent_due_day` and the dates remain landlord-editable after execution — and the
  printed agreement renders the CURRENT values, so an executed document can quietly
  say something different tomorrow. Rent increases are a real workflow, so the fix
  is a product decision, not a lock: either snapshot the signed terms into the
  agreement record, or make a change after execution start a new signing round.

### Verified clean this round (do not re-audit)
- `agreements` bucket: no policy, no live reader. 15 HTML files from the old Expo
  Edge Function; the Next.js app renders agreements inline and prints. Orphaned.
- Edge Functions all run as service_role; triggers exempt null uid → unaffected.
- sitemap/robots, updated_at triggers, service-role-only policies: all correct.
- `notifications`: SELECT own + UPDATE own only, no INSERT policy; the four
  `notify_*` triggers are the sole writers. Correct. (Tenant-facing gap covered by
  the payment-confirmed email, not by in-app rows they never open.)
- `messages`: four bound policies as of 038; anon has no grant.
- Anonymous listing of `avatars` (public bucket) and `proof-photos` both return
  `[]` — no user-id enumeration through the storage API.
- `profiles`: SELECT own + counterparty-scoped, UPDATE own. No DELETE, no INSERT
  (the `on_auth_user_created` trigger is the only writer). Correct.
- `buildings` FOR ALL (landlord_id = uid): properties FK is ON DELETE SET NULL, so
  deleting a building strands nothing. Left as FOR ALL deliberately.
- Every INSERT policy binds its author column (`created_by`, `submitted_by`,
  `uploaded_by`, `raised_by`, `actor_id`, `landlord_id`). `buildings` FOR ALL binds
  via USING fallback (landlord_id = uid) — fine for a single-owner table.
  `deposit_transactions` has no DELETE, `repair_requests`/`proofs` no DELETE: immutable.

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
205/205 tests · typecheck clean · build clean · security 77/77 · lint 0 errors (gates verify).

## Known bounds (documented, not fixing autonomously)
- `lib/rate-limit.ts` is per-serverless-instance memory; header says so and names
  the fix (Upstash/KV) before any per-call-cost endpoint. Mail routes are auth+RLS
  bound or dual-keyed (IP + recipient). Acceptable at current scale.
- UI strings are English (relDate "Today at", email templates, marketing). Real i18n
  needs a translation source and a string-extraction pass — not safe to invent.
- Badge: 11 status pills with heterogeneous padding/spacing; consolidating changes
  pixels I cannot see. Left.

## Next task
Everything mechanical is done and green: 038-047 applied and live-proven, 77
harness checks, schema-drift clean, 205 tests. What remains cannot be checked from
here:
1. A browser and an inbox pass — the landlord proof review card, the expired-invite
   copy, and the three new emails (payment-confirmed, proof-submitted, and whether
   Resend actually delivered them).
2. Owner decisions, listed below: the 7-day invite window (the biggest funnel drop
   in the product), lease terms editable after signing, deposit dispute
   resolution, no undo on a confirmed payment, assetlinks fingerprints, the
   reminder cron, the "geotagged" claim.
3. Engineering left over: Badge/Card primitives, the 4,800-line dashboard split
   (`AgreementDocument` first), Vercel KV for the rate limiter, string extraction.
