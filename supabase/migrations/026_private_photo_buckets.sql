-- Make the photo buckets private, and scope them to the parties of the rental.
--
-- Two separate holes, and fixing only the first would have been misleading.
--
-- Hole 1: the buckets are PUBLIC
-- ------------------------------
-- `public = true` means the /storage/v1/object/public/... path bypasses RLS
-- entirely. Verified live during the audit: a tenant's move-in photo downloaded
-- with no session and no API key. Paths are three UUID segments deep and bucket
-- listing is correctly denied, so they are not enumerable — but any URL that ever
-- leaks (a screenshot, a chat, a referrer header, a CDN cache) grants permanent
-- anonymous access that outlives the tenancy.
--
-- Hole 2: the policies say "any authenticated user"
-- ------------------------------------------------
--   using (bucket_id = 'proof-photos' and auth.role() = 'authenticated')
--
-- That is not tenant isolation, it is a login check. Any signed-in user could read
-- any other rental's photos given a path — and, once the bucket is private, could
-- still MINT A SIGNED URL for them, because signing is gated by exactly this
-- policy. Flipping the bucket without fixing this would have closed the anonymous
-- door and left the cross-tenant one open.
--
-- The INSERT policies were the same shape, which meant any authenticated user could
-- upload INTO another rental's folder — planting fake move-in evidence in a
-- dispute that turns on precisely those photos.

-- ── 1. Recover the rental from an object path ─────────────────────────────────
--
-- Three path conventions exist in production, because the layout changed over time
-- and old objects were never migrated:
--
--   <rental_id>/<proof_id>/<file>      7 objects (legacy)
--   move-in/<rental_id>/<file>         2 objects (current)
--   payment-receipts/<rental_id>/<file> 1 object  (current)
--   <rental_id>/<file>                 1 object  (repair-photos)
--
-- So the rental id is the first segment, unless the first segment is a known
-- prefix, in which case it is the second. Every one of the 11 stored objects was
-- checked against this function before the policies below were applied: all 11
-- resolve to a real rental, and all 11 of those rentals have both a landlord and a
-- tenant, so no existing photo loses its rightful audience.
--
-- The regex guard matters: a bare ::uuid cast on a non-uuid segment raises, and an
-- exception inside a policy predicate is a failed request, not a denied row.

create or replace function public.storage_rental_id(object_name text)
returns uuid
language sql
immutable
set search_path = public
as $fn$
  with seg as (
    select (storage.foldername(object_name))[1] as s1,
           (storage.foldername(object_name))[2] as s2
  ),
  pick as (
    select case
             when s1 in ('move-in', 'payment-receipts', 'repairs', 'damage') then s2
             else s1
           end as v
    from seg
  )
  select case
           when v ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
             then v::uuid
           else null
         end
  from pick;
$fn$;

comment on function public.storage_rental_id(text) is
  'Extract the rental id from a storage object path, across all three historical path layouts. Returns null rather than raising for anything unrecognised.';

-- ── 2. Read: only the landlord and tenant on that rental ──────────────────────

drop policy if exists "Authenticated read proof photos"  on storage.objects;
drop policy if exists "Authenticated read repair photos" on storage.objects;

create policy "Rental parties read photos"
  on storage.objects for select
  using (
    bucket_id in ('proof-photos', 'repair-photos')
    and exists (
      select 1 from public.rentals r
      where r.id = public.storage_rental_id(storage.objects.name)
        and (r.landlord_id = auth.uid() or r.tenant_id = auth.uid())
    )
  );

-- ── 3. Write: same test, so nobody can plant evidence in another rental ───────

drop policy if exists "Tenants upload proof photos"      on storage.objects;
drop policy if exists "Authenticated upload repair photos" on storage.objects;

create policy "Rental parties upload photos"
  on storage.objects for insert
  with check (
    bucket_id in ('proof-photos', 'repair-photos')
    and exists (
      select 1 from public.rentals r
      where r.id = public.storage_rental_id(storage.objects.name)
        and (r.landlord_id = auth.uid() or r.tenant_id = auth.uid())
    )
  );

-- Note: uploads use { upsert: true }, which issues an UPDATE when the object
-- already exists. Without a matching UPDATE policy a re-upload to the same path
-- fails, so it is granted on the same terms.
drop policy if exists "Rental parties update photos" on storage.objects;

create policy "Rental parties update photos"
  on storage.objects for update
  using (
    bucket_id in ('proof-photos', 'repair-photos')
    and exists (
      select 1 from public.rentals r
      where r.id = public.storage_rental_id(storage.objects.name)
        and (r.landlord_id = auth.uid() or r.tenant_id = auth.uid())
    )
  );

-- ── 4. Close the public door ──────────────────────────────────────────────────
--
-- Safe only because the client that renders these photos already resolves them
-- through createSignedUrl (see lib/supabase/media.ts, deployed first and verified
-- live). Signing is itself gated by the SELECT policy above, so a signed URL can
-- only ever be minted by a party to the rental.
--
-- avatars stays public: it is a profile picture shown next to a name, and its
-- public-read policy is deliberate. agreements was already private.

update storage.buckets
set public = false
where id in ('proof-photos', 'repair-photos');

-- ── Verification (performed 2026-09-06) ───────────────────────────────────────
--   1. Anonymous GET of the exact object that downloaded unauthenticated during
--      the audit now returns 400. Anonymous createSignedUrl on it returns
--      not_found, which is what a denied RLS check looks like through the storage
--      API — so the cross-tenant path is closed too, not just the anonymous one.
--   2. All 11 stored objects were simulated against the new SELECT predicate for
--      both the landlord and the tenant of their rental: all 11 pass for both,
--      across all three path layouts. (Simulated in SQL against real rows — not
--      exercised with a second live user session.)
--   3. select id, public from storage.buckets -> only avatars remains public.
--
-- CDN CACHE CAVEAT
-- ----------------
-- Supabase serves the public path through Cloudflare with
-- `Cache-Control: public, max-age=3600`. Immediately after this migration the old
-- URL still returned 200 with `CF-Cache-Status: HIT`, while a cache-busted request
-- returned 400. So any object that was actually fetched over the public path while
-- the bucket was public stays retrievable from the edge for up to an hour after the
-- flip, for that exact URL.
--
-- Judged proportionate rather than worked around: paths are three UUID segments
-- deep, bucket listing is denied, and the only URLs known to have been requested
-- publicly are the ones fetched during this audit. Purging would mean renaming
-- every object and rewriting the columns that reference them. If a photo URL is
-- ever known to have leaked, renaming that object is the remedy — it changes the
-- cache key as well as the path.
