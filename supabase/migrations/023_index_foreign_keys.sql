-- Index the foreign keys RentyBase actually joins and filters on.
--
-- Why this matters more than the row counts suggest
-- -------------------------------------------------
-- Most RLS policies in this schema are of the form
--
--   exists (select 1 from rentals r
--           where r.id = <table>.rental_id
--             and (r.landlord_id = auth.uid() or r.tenant_id = auth.uid()))
--
-- That subquery runs per candidate row on every read. Without an index on the
-- referencing column, each check degrades to a sequential scan, so the cost is
-- quadratic in table size rather than linear. At 52 rentals this is invisible; it
-- is exactly the kind of thing that stops being invisible all at once.
--
-- Unindexed FKs also make parent deletes slow, because Postgres must scan every
-- child table to enforce the constraint.
--
-- Scope
-- -----
-- Only RentyBase tables. This database is shared with a separate social-media
-- product (agent_runs, agent_approvals, api_tokens, brands, content_calendar,
-- content_posts, engagement_metrics, social_accounts); its indexing is its own
-- concern and is deliberately left alone.
--
-- `if not exists` throughout so this is safe to re-run. Written as plain CREATE
-- INDEX rather than CONCURRENTLY because these tables are small today and the
-- Supabase query endpoint wraps statements in a transaction, which CONCURRENTLY
-- cannot run inside. At current scale the lock is measured in milliseconds; if
-- these tables were large, this would need to be split into separate
-- non-transactional statements instead.

-- ── rentals ───────────────────────────────────────────────────────────────────
-- Every property page and dashboard load resolves rentals -> property.
create index if not exists idx_rentals_property     on public.rentals (property_id);

-- ── rent_payments ─────────────────────────────────────────────────────────────
-- "Tenants view their own payments" filters on tenant_id directly.
create index if not exists idx_rent_payments_tenant on public.rent_payments (tenant_id);

-- ── deposit_transactions ──────────────────────────────────────────────────────
-- The deposit ledger reads every transaction for a rental, and its RLS policy
-- joins back to rentals on rental_id.
create index if not exists idx_deposit_tx_rental    on public.deposit_transactions (rental_id);
create index if not exists idx_deposit_tx_creator   on public.deposit_transactions (created_by);

-- ── messages ──────────────────────────────────────────────────────────────────
-- The thread view is "all messages for this rental, newest last". Composite,
-- because that is how it is queried — a bare rental_id index would still leave
-- the sort unindexed.
create index if not exists idx_messages_rental_time on public.messages (rental_id, created_at);
create index if not exists idx_messages_sender      on public.messages (sender_id);

-- ── proofs / proof_photos ─────────────────────────────────────────────────────
-- Move-in proof review walks proofs -> photos.
create index if not exists idx_proof_photos_proof   on public.proof_photos (proof_id);
create index if not exists idx_proof_photos_uploader on public.proof_photos (uploaded_by);
create index if not exists idx_proofs_submitter     on public.proofs (submitted_by);
create index if not exists idx_proofs_reviewer      on public.proofs (reviewed_by);

-- ── repair_requests ───────────────────────────────────────────────────────────
create index if not exists idx_repairs_raised_by    on public.repair_requests (raised_by);

-- ── properties / buildings ────────────────────────────────────────────────────
create index if not exists idx_properties_building  on public.properties (building_id);
create index if not exists idx_buildings_landlord   on public.buildings (landlord_id);

-- ── tenant_referrals ──────────────────────────────────────────────────────────
create index if not exists idx_referrals_landlord   on public.tenant_referrals (landlord_id);

-- ── Verification ──────────────────────────────────────────────────────────────
-- Re-run the unindexed-FK audit; only the other product's tables should remain:
--
--   select c.conrelid::regclass::text tbl, a.attname col
--   from pg_constraint c
--   join lateral unnest(c.conkey) k(attnum) on true
--   join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
--   where c.contype = 'f' and c.connamespace = 'public'::regnamespace
--     and not exists (select 1 from pg_index i
--                     where i.indrelid = c.conrelid
--                       and a.attnum = any(i.indkey[0:0]));
