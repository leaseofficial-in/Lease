-- "Open for editing" means pending OR rejected, not pending alone.
--
-- Why
-- ---
-- Three policies decide whether the tenant may still work on a move-in proof, and
-- all three say `status = 'pending'`:
--
--   proof_photos INSERT   "Tenants upload proof photos"                (001/026)
--   proof_photos DELETE   "Tenants remove their own photos before approval" (040)
--   storage.objects DELETE "Uploaders delete their own rental photos"  (041)
--
-- 044 gave the landlord a review path with `rejected` in it, meaning "this is not
-- enough, please redo". But a rejected proof is frozen by all three rules above,
-- so the tenant cannot add the photos they were just asked for. The only way out
-- would be the landlord moving it back to `pending` — which no screen does. A
-- reject would be a dead end.
--
-- So the line is not pending-versus-everything. It is:
--
--   open for editing   pending, rejected     the tenant is still working on it
--   frozen             approved, dispute     both sides now rely on it
--
-- 040's freeze-on-approval intent is unchanged; this only stops `rejected`
-- landing on the wrong side of it.

drop policy if exists "Tenants upload proof photos" on public.proof_photos;

create policy "Tenants upload proof photos"
  on public.proof_photos for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1
      from public.proofs p
      join public.rentals r on r.id = p.rental_id
      where p.id = proof_photos.proof_id
        and r.tenant_id = auth.uid()
        and p.status in ('pending', 'rejected')
    )
  );

drop policy if exists "Tenants remove their own photos before approval" on public.proof_photos;

create policy "Tenants remove their own photos before approval"
  on public.proof_photos for delete to authenticated
  using (
    uploaded_by = auth.uid()
    and exists (
      select 1
      from public.proofs p
      join public.rentals r on r.id = p.rental_id
      where p.id = proof_photos.proof_id
        and r.tenant_id = auth.uid()
        and p.status in ('pending', 'rejected')
    )
  );

drop policy if exists "Uploaders delete their own rental photos" on storage.objects;

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
      select 1
      from public.proof_photos pp
      join public.proofs p on p.id = pp.proof_id
      where pp.storage_path = objects.name
        and p.status not in ('pending', 'rejected')
    )
  );

-- == Verification ==============================================================
--   Landlord rejects a proof; as the tenant:
--     insert proof_photos on it   -> 1 row
--     delete one of their photos  -> 1 row
--     delete the storage object   -> 200
--   Landlord approves it; the same three -> refused.
