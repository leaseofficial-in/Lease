-- Give rent_payments the updated_at column everything already assumes it has.
--
-- What was wrong
-- --------------
-- profiles, rentals, proofs and repair_requests all carry `updated_at` maintained
-- by the set_updated_at() trigger from 001. rent_payments never got one. Three
-- pieces of code assumed it did:
--
--   1. 007's pg_cron overdue job:            `set status = 'overdue', updated_at = now()`
--   2. mark_overdue_payments() (029, 031):   the same statement
--   3. The dashboard: reads currentPayment.updated_at, and the landlord's Reject
--      handler writes `{ status: 'pending', updated_at: ... }`.
--
-- Postgres rejects the whole statement on the unknown column (42703). So the SQL
-- overdue job -- 007's inline version and my replacement alike -- has NEVER run
-- successfully. The thing that actually marked rent overdue all along was the
-- process-rent Edge Function, which does not touch updated_at. 034 unscheduled it
-- on the understanding that mark_overdue_payments() had taken over. It had not.
-- Overdue marking has been silently broken since then; one payment that should be
-- overdue is sitting in 'pending' at the time of this migration.
--
-- It surfaced only because the previous migration probed whether anon could
-- execute the function and the reply was an error message naming the column. The
-- cron run log would have shown it tonight -- as a failed row nobody reads.
--
-- Why fix the schema rather than the callers
-- ------------------------------------------
-- A payment row changes state several times (pending -> pending_verification ->
-- paid, or -> overdue, or back to pending on reject). "When did this last change"
-- is exactly what the client shows next to "Paid"; today it falls back to
-- created_at, which is the wrong date for anything but a fresh row. Every other
-- mutable table has the column. This one was the anomaly.
--
-- Backfill: paid_at where present (the last meaningful change), else created_at.
-- Nullable-then-NOT NULL so existing rows are filled before the constraint lands.

alter table public.rent_payments
  add column if not exists updated_at timestamptz;

update public.rent_payments
set updated_at = coalesce(paid_at, created_at, now())
where updated_at is null;

alter table public.rent_payments
  alter column updated_at set default now(),
  alter column updated_at set not null;

-- Same trigger every other table uses (001). Fires on every UPDATE regardless of
-- who or what performs it, so the cron job, the landlord's confirm/reject, and the
-- tenant's payment submission all keep it honest without remembering to.
drop trigger if exists rent_payments_updated_at on public.rent_payments;
create trigger rent_payments_updated_at
  before update on public.rent_payments
  for each row execute procedure public.set_updated_at();

comment on column public.rent_payments.updated_at is
  'Last state change. Maintained by trigger. Added in 037 -- its absence had broken every SQL overdue job since 007.';

-- == Verification ==============================================================
--   select public.mark_overdue_payments();   -> returns a count, no 42703
--   select count(*) from rent_payments where updated_at is null;  -> 0
--   As the landlord: PATCH a payment {status:'pending', updated_at:...} -> 200
--   Tomorrow: cron.job_run_details for mark-overdue-payments shows 'succeeded'.
