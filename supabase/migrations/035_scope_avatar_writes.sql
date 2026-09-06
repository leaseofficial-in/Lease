-- Scope avatar writes to the caller's own folder.
--
-- The avatars bucket is public on purpose: a profile picture is shown next to a
-- name. Its WRITE policies, though, were the same shape the photo buckets had
-- before 026:
--
--   "Owner write avatars"  INSERT with check (bucket_id = 'avatars' and auth.role() = 'authenticated')
--   "Owner update avatars" UPDATE using      (bucket_id = 'avatars' and auth.role() = 'authenticated')
--
-- "Owner" is in the name and nowhere in the predicate. Any signed-in user could
-- upload to, or overwrite, any object path in the bucket — including the path
-- another user's picture lives at, which is public and shown beside their name.
--
-- Dormant, not live: the Next.js app has no avatar upload at all (avatar_url comes
-- from Google), and the bucket holds zero objects. The policies are still reachable
-- through the storage API by anyone with a session, so they are tightened now,
-- while it costs nothing, rather than after an upload feature ships on top of them.
--
-- Convention enforced: objects live under <user id>/... . An upload elsewhere is
-- refused. This is the same first-folder rule the photo buckets use.

drop policy if exists "Owner write avatars"  on storage.objects;
drop policy if exists "Owner update avatars" on storage.objects;

create policy "Users write their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read is unchanged and intended.

-- == Verification ==============================================================
--   As user A: PUT avatars/<A>/pic.jpg -> 200; PUT avatars/<B>/pic.jpg -> denied.
--   select policyname from pg_policies where tablename='objects' and policyname ilike '%avatar%';
