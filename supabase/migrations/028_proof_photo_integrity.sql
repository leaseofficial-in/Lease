-- Make move-in proof actually tamper-evident, and undo a hole this session opened.
--
-- The product's central promise is that move-in photos are evidence: "tamper-proof",
-- "sealed", "neither side can edit them". An audit of the code found nothing
-- implementing that — no hashing anywhere in the repository, and the storage object
-- behind a proof photo could be replaced after the fact.
--
-- Two parts.

-- == 1. Remove the UPDATE policy added in 026 ==================================
--
-- 026 granted UPDATE on the photo buckets, reasoning that uploads pass
-- `upsert: true` and would otherwise fail when an object already exists. That
-- reasoning was wrong on both counts.
--
-- Every upload path already carries a timestamp, and the move-in path carries a
-- random suffix on top:
--
--   move-in/<rental>/<room>-<Date.now()>-<random>.jpg
--   payment-receipts/<rental>/<Date.now()>.jpg
--   <rental>/<Date.now()>.jpg
--
-- so a collision essentially cannot happen and the UPDATE path is never exercised
-- legitimately. What the policy DID do is make it possible to overwrite the bytes
-- behind an already-submitted proof photo while the database row — its id, its
-- timestamp, its uploader — stayed exactly the same. That is precisely the
-- substitution the "tamper-proof" claim promises is impossible.
--
-- Before 026 there was no UPDATE policy and such a write simply failed. Restoring
-- that. The client now passes `upsert: false`, so a genuine collision surfaces as
-- an error instead of silently replacing evidence.
--
-- proof_photos (the table) was already correct: it carries only SELECT and INSERT
-- policies, so the metadata rows cannot be edited or deleted by anyone.

drop policy if exists "Rental parties update photos" on storage.objects;

-- == 2. Record a content hash, so alteration is detectable ====================
--
-- SHA-256 of the file bytes, computed in the browser before upload and written
-- alongside the row. It is not a signature — the client supplies it, so it does
-- not prove WHO hashed the file — but it does something useful and checkable: if
-- the stored object ever stops matching the hash recorded at submission time, the
-- photo has been altered, and either party can demonstrate that.
--
-- Nullable on purpose. The ten photos already in the system predate this and have
-- no hash; back-filling one now would be worse than leaving it null, because a
-- hash computed today only attests to today's bytes and would imply a guarantee
-- that does not exist for those rows.

alter table public.proof_photos
  add column if not exists sha256 text;

comment on column public.proof_photos.sha256 is
  'SHA-256 of the file bytes at submission, computed client-side. Null for photos uploaded before this column existed — absence means "unknown", never "verified".';

-- Cheap integrity check for a dispute: does this photo still match what was
-- submitted? Compare against a hash recomputed from the stored object.
create index if not exists idx_proof_photos_sha256 on public.proof_photos (sha256);

-- == What this still does NOT deliver =========================================
--
-- The marketing copy also claims move-in photos are "geotagged" and that "GPS is
-- captured at submit". Nothing in the codebase captures location, and the stored
-- JPEGs carry no GPSInfo EXIF tag either — checked directly during the audit.
-- Implementing it means a location-permission prompt at exactly the moment a
-- tenant is trying to finish a task, which is a product decision rather than an
-- engineering one, so it is left to the owner: either build it, or drop the claim.
-- Tracked as P2-4 in docs/ENGINEERING_BACKLOG.md.

-- == Verification ==============================================================
--   1. select policyname from pg_policies where schemaname='storage'
--        -> no "Rental parties update photos"
--   2. A party re-uploading to an existing object path now fails rather than
--      replacing it.
--   3. New proof photos carry a sha256; pre-existing rows stay null.
