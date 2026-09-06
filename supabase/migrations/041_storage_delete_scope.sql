-- Let people delete the files they uploaded. Nobody could, ever.
--
-- What was wrong
-- --------------
-- `storage.objects` has five policies: read avatars, read rental photos, upload
-- rental photos, write own avatar, update own avatar. There is no DELETE policy
-- for any bucket, so no signed-in user has ever been able to remove a file.
-- Consequences, all live today:
--
--   * 040 gave the tenant back the remove-photo button on move-in proof. It
--     deletes the `proof_photos` row; the image itself stays in the bucket
--     forever. The DB says the photo is gone and the storage bill says otherwise.
--   * The upload path is `upload()` then `insert()`. If the insert fails -- and
--     until 040 several writes in this app failed silently -- the blob is stranded
--     with nothing pointing at it. There is one such orphan in `proof-photos`
--     right now (10 objects, 9 rows).
--   * A user cannot replace-and-remove their own avatar, only overwrite it.
--
-- The rule
-- --------
-- You may delete a file you uploaded (`owner = auth.uid()`, which Supabase sets
-- on upload and which is populated on every object in these buckets), if you are
-- still a party to the rental it belongs to, and if it is not frozen evidence.
--
-- "Frozen" for proof-photos means the proof has been approved: 040 stops the row
-- being deleted then, and this stops the file being deleted then, so both halves
-- of the record agree. An object with no `proof_photos` row is by definition not
-- evidence of anything -- that is the orphan case, and letting the uploader clear
-- it is the only cleanup path that does not need the service key.
--
-- `agreements` stays untouched: 15 files from the retired Expo Edge Function,
-- service_role only, nothing in the app reads or writes them.

create policy "Uploaders delete their own rental photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('proof-photos', 'repair-photos')
    and owner = auth.uid()
    and exists (
      select 1 from public.rentals r
      where r.id = public.storage_rental_id(objects.name)
        and (r.landlord_id = auth.uid() or r.tenant_id = auth.uid())
    )
    and not exists (
      -- Approved proof is evidence both sides rely on. Matches the row-level rule
      -- in 040 so the file and its record can never disagree.
      select 1
      from public.proof_photos pp
      join public.proofs p on p.id = pp.proof_id
      where pp.storage_path = objects.name
        and p.status <> 'pending'
    )
  );

create policy "Users delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

-- == Verification ==============================================================
--   As the tenant who uploaded it:
--     delete from storage.objects where name = <own pending proof photo>  -> 1 row
--     delete from storage.objects where name = <own approved proof photo> -> 0 rows
--     delete from storage.objects where name = <another party's upload>   -> 0 rows
--   As anyone: delete an object in `agreements`                           -> 0 rows
--   Then: storage.objects count in proof-photos == proof_photos count + orphans
--   still awaiting their uploader.
