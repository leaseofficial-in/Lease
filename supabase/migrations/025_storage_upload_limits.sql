-- Constrain what can be uploaded to each storage bucket.
--
-- Every bucket was created with file_size_limit = null and allowed_mime_types =
-- null, which means any authenticated user could upload a file of any type and any
-- size. That is three separate problems:
--
--   1. Cost and denial of service. Storage is billed, and nothing stopped a single
--      account from uploading arbitrarily large files until the quota was gone.
--   2. Content-hosting abuse. proof-photos and repair-photos are public buckets, so
--      an uploaded HTML or SVG file is served back over HTTPS from a Supabase
--      origin — a free, credible-looking host for phishing pages, with RentyBase's
--      project id in the URL.
--   3. Nothing here is meant to be anything but an image or a PDF, so the
--      permissive default bought no flexibility anyone wanted.
--
-- SVG is deliberately excluded from the image lists: it is an executable document
-- format (it can carry <script>), not merely a picture, and no camera produces one.
--
-- Limits are generous enough for real phone photos — a modern handset shoots
-- 4-8 MB, and proof photos are the tenant's deposit evidence, so rejecting a
-- legitimate upload is worse than accepting a large one.
--
-- This is bucket configuration rather than a schema change, but it lives here so
-- the state of the storage layer is reproducible from the repository.

-- ── Photo buckets ─────────────────────────────────────────────────────────────
update storage.buckets
set file_size_limit    = 15 * 1024 * 1024,   -- 15 MB
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif']
where id in ('proof-photos', 'repair-photos');

-- ── Avatars ───────────────────────────────────────────────────────────────────
-- Genuinely public by design (they appear next to a name), and small.
update storage.buckets
set file_size_limit    = 5 * 1024 * 1024,    -- 5 MB
    allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'avatars';

-- ── Agreements ────────────────────────────────────────────────────────────────
-- Already private (public = false), which is what makes text/html acceptable here
-- and nowhere else: the product GENERATES agreements as HTML documents, and all 15
-- stored today are text/html. An earlier draft of this migration allowed only PDF
-- and images and would have silently blocked every future agreement upload — the
-- existing objects were checked precisely to catch that.
--
-- text/html is only tolerable because the bucket is private and reachable solely
-- through a signed URL issued to a party on the rental. If this bucket is ever made
-- public, this entry must be revisited, since HTML served from the origin is the
-- content-hosting vector the photo buckets are protected against below.
update storage.buckets
set file_size_limit    = 25 * 1024 * 1024,   -- 25 MB
    allowed_mime_types = array[
      -- Both spellings are present in the existing objects. Supabase matches these
      -- as exact strings, so 'text/html; charset=utf-8' is NOT covered by
      -- 'text/html' and one stored agreement would have been rejected on re-upload.
      'text/html',
      'text/html; charset=utf-8',
      'application/pdf',
      'image/jpeg','image/png','image/webp'
    ]
where id = 'agreements';

-- ── Verification ──────────────────────────────────────────────────────────────
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets;
--
-- Note: proof-photos and repair-photos remain PUBLIC after this migration. That is
-- tracked separately as P1-1 in docs/ENGINEERING_BACKLOG.md — closing it requires a
-- client change to signed URLs and must ship in that order, or every already-stored
-- photo stops rendering.
