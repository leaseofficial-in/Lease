-- Stop anonymous callers running privileged jobs, and close the second invite path.
--
-- Postgres grants EXECUTE on every new function to PUBLIC by default, and PostgREST
-- exposes every function in the schema at /rest/v1/rpc/<name>. Put together, that
-- means a SECURITY DEFINER function written for a cron job is, unless someone
-- remembers to revoke it, an endpoint anyone holding the anon key can call.
--
-- That is the same default-privilege footgun that gave anon TRUNCATE on the
-- analytics tables (027) and it had happened again here, to:
--
--   mark_overdue_payments()      029/031 -- flips rent to overdue, applies fees
--   ensure_current_month_rent()  034     -- creates the month's rent rows
--
-- Confirmed live: an unauthenticated POST to /rest/v1/rpc/mark_overdue_payments
-- ran the job. Both are idempotent and timezone-aware, so an attacker gains no
-- different OUTCOME than the 01:00 UTC schedule would produce -- but "the job
-- happens to be harmless when triggered by strangers" is not a property to rely
-- on. The next function written in this style might not be.
--
-- pg_cron runs as the postgres superuser and is unaffected by any of this.
--
-- accept_rental_invite() (004) is also revoked. The live app claims invites through
-- claim_rental_invite() (021), which sets status 'active' so that the
-- rental_activated trigger creates the tenant's first rent row. 004's version sets
-- 'pending_proof' and creates nothing. Its only caller is the abandoned Expo app.
-- Two claim paths with different semantics is an inconsistency waiting to be
-- exploited or debugged; there is now one. Revoked rather than dropped, so it is
-- one GRANT away from coming back if something turns out to need it.
--
-- The trigger functions in the same listing (enforce_*, notify_landlord_*,
-- generate_monthly_payment, handle_new_user) are left alone: Postgres refuses to
-- invoke a function that RETURNS TRIGGER outside a trigger, so the grant is inert.
-- expire_stale_approvals belongs to the other product sharing this database.

revoke execute on function public.mark_overdue_payments()          from public, anon, authenticated;
revoke execute on function public.ensure_current_month_rent()      from public, anon, authenticated;
revoke execute on function public.accept_rental_invite(text)       from public, anon, authenticated;

-- Make the intent stick for anything created later in this schema: new functions
-- are private by default, and each one that is meant to be an endpoint gets an
-- explicit GRANT, the way rental_invite_preview and claim_rental_invite do.
alter default privileges in schema public revoke execute on functions from public;

-- == Verification ==============================================================
--   anon POST /rest/v1/rpc/mark_overdue_payments     -> 401/403/404, not 200
--   anon POST /rest/v1/rpc/ensure_current_month_rent -> 401/403/404
--   anon POST /rest/v1/rpc/accept_rental_invite      -> 401/403/404
--   anon POST /rest/v1/rpc/rental_invite_preview     -> still 200 (explicit grant)
--   select jobname from cron.job;                    -> both jobs still scheduled
