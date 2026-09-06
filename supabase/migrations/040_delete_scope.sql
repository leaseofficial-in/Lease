-- Make the shared record undeletable by one side, and give the tenant back the
-- one delete the UI offers them.
--
-- What was wrong
-- --------------
-- 1. `proof_photos` has an INSERT policy and a SELECT policy and no DELETE policy.
--    The move-in proof screen has a remove-photo control (dashboard handleDelete,
--    guarded by `if (isApproved) return`). It has never deleted anything; since
--    assertAffected it toasts "Failed to delete photo". Third button of this class
--    after the two in 039.
--
-- 2. `rentals` and `properties` are each covered by a single FOR ALL policy —
--    "Landlords manage their rentals" / "...their properties", USING
--    landlord_id = auth.uid(). FOR ALL includes DELETE, and everything hangs off
--    rentals with ON DELETE CASCADE: rent_payments, deposit_transactions, proofs,
--    proof_photos (via proofs), repair_requests, messages, rental_events. One
--    DELETE over PostgREST erases a tenant's entire payment history — the receipts
--    this product exists to keep — with no trace and no copy on the tenant's side.
--    `properties` is worse: rentals cascade from properties, and RLS is NOT
--    evaluated for cascaded deletes, so deleting a property destroys its rentals
--    and their ledgers regardless of any policy on rentals.
--
--    The product's own model for a tenancy ending is a soft one: the dashboard
--    writes `status = 'ended'` (there are already rows in that state). Nothing in
--    the client deletes a rental or a property. So DELETE is an API-only path that
--    contradicts how the product works.
--
-- 3. The FOR ALL policy also had no WITH CHECK, so a landlord could UPDATE
--    `landlord_id` to another account, or move a rental to a property they do not
--    own -- handing over or stealing a tenancy. Same defect as 038/039.
--
-- The rule
-- --------
-- A landlord may delete a rental nobody else is part of and that has no financial
-- history: `tenant_id is null`, no rent_payments, no deposit_transactions. That
-- keeps the real cleanup case (an invite created by mistake, never claimed --
-- 43 of the 52 rentals today) and removes the destructive one. Once a tenant has
-- joined, the record is shared and ending it is `status = 'ended'`.
--
-- A property is deletable only when every rental under it is. Written as an
-- explicit NOT EXISTS so the cascade cannot outflank the rental rule.
--
-- Nothing here deletes data or changes an existing row.

-- == proof_photos ==============================================================
-- Mirrors the INSERT policy: the uploader, on a proof still open for editing.
-- Once the landlord approves, the evidence is frozen for both sides -- which is
-- what the client's `isApproved` guard was already trying to express.

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
        and p.status = 'pending'
    )
  );

-- == rentals ===================================================================

drop policy if exists "Landlords manage their rentals" on public.rentals;

create policy "Landlords view their rentals"
  on public.rentals for select to authenticated
  using (landlord_id = auth.uid());

create policy "Landlords create their own rentals"
  on public.rentals for insert to authenticated
  with check (
    landlord_id = auth.uid()
    and exists (
      select 1 from public.properties p
      where p.id = rentals.property_id and p.landlord_id = auth.uid()
    )
  );

create policy "Landlords update their rentals"
  on public.rentals for update to authenticated
  using (landlord_id = auth.uid())
  with check (
    landlord_id = auth.uid()
    and exists (
      select 1 from public.properties p
      where p.id = rentals.property_id and p.landlord_id = auth.uid()
    )
  );

create policy "Landlords delete only empty rentals"
  on public.rentals for delete to authenticated
  using (
    landlord_id = auth.uid()
    and tenant_id is null
    and not exists (select 1 from public.rent_payments p where p.rental_id = rentals.id)
    and not exists (select 1 from public.deposit_transactions d where d.rental_id = rentals.id)
  );

-- == properties ================================================================

drop policy if exists "Landlords manage their properties" on public.properties;

create policy "Landlords view their properties"
  on public.properties for select to authenticated
  using (landlord_id = auth.uid());

create policy "Landlords create their own properties"
  on public.properties for insert to authenticated
  with check (landlord_id = auth.uid());

create policy "Landlords update their properties"
  on public.properties for update to authenticated
  using (landlord_id = auth.uid())
  with check (landlord_id = auth.uid());

create policy "Landlords delete only properties with nothing to lose"
  on public.properties for delete to authenticated
  using (
    landlord_id = auth.uid()
    -- The cascade would take these rentals with it, unseen by the rental policy.
    and not exists (
      select 1 from public.rentals r
      where r.property_id = properties.id
        and (
          r.tenant_id is not null
          or exists (select 1 from public.rent_payments p where p.rental_id = r.id)
          or exists (select 1 from public.deposit_transactions d where d.rental_id = r.id)
        )
    )
  );

-- == Verification ==============================================================
--   As a landlord with a live tenancy:
--     delete from rentals where id = <rental with a tenant>       -> 0 rows
--     delete from properties where id = <its property>            -> 0 rows
--     delete from rentals where id = <own unclaimed invite>       -> 1 row
--     update rentals set landlord_id = <other> where id = <own>   -> 42501
--   As the tenant:
--     delete from proof_photos where id = <own, proof pending>    -> 1 row
--     delete from proof_photos where id = <own, proof approved>   -> 0 rows
--   scripts/verify-security.sh covers the rental/property cases with the probe pair.
