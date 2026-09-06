-- Let a landlord act on payments for their own rentals.
--
-- The bug
-- -------
-- `rent_payments` has policies for landlords to SELECT, and for tenants to INSERT
-- and UPDATE. It has never had a policy letting a LANDLORD update a payment.
--
-- The dashboard's "Reject" button on a submitted payment does:
--
--   const { error } = await sb.from('rent_payments')
--     .update({ status: 'pending' }).eq('id', currentPmt.id)
--   if (error) throw error
--
-- With no policy matching, PostgREST updates zero rows and returns 200 with an
-- empty array. `error` is null. So the landlord sees "success", and the payment
-- stays in `pending_verification` forever. A landlord who receives a false payment
-- claim has no way to reject it.
--
-- Confirmed live: that exact PATCH as the rental's own landlord returns `[]`.
--
-- Confirming a payment works only because it goes through confirm_rent_payment(),
-- a SECURITY DEFINER function that bypasses RLS entirely. Reject was never given
-- the same treatment, and the missing policy went unnoticed because the failure is
-- silent.
--
-- Every other child table already grants the landlord write access to rows on
-- their own rentals — `repair_requests` has "Landlords update repair status",
-- `proofs` has "Landlords review proofs". `rent_payments` is the omission, and it
-- is the one that carries money.

create policy "Landlords manage payments on their rentals"
  on public.rent_payments for update
  using (
    exists (
      select 1 from public.rentals r
      where r.id = rent_payments.rental_id
        and r.landlord_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.rentals r
      where r.id = rent_payments.rental_id
        and r.landlord_id = auth.uid()
    )
  );

-- Deliberately unrestricted as to status and amount, unlike the tenant policy in
-- 030. This is the landlord's own ledger for their own property: recording that
-- rent was received, rejecting a claim that was not, adjusting a fee they chose to
-- waive. The asymmetry is the point — 030 stops a tenant marking their own rent
-- paid precisely so that this confirmation means something.
--
-- The 031 trigger still applies and is unaffected: it exempts landlords, so
-- adjusting a late fee on their own rental continues to work while a tenant
-- changing it does not.

comment on policy "Landlords manage payments on their rentals" on public.rent_payments is
  'Landlords may update payments on rentals they own. Without this the dashboard''s Reject button silently updated zero rows and reported success.';

-- == Verification ==============================================================
--   As the landlord of a rental, PATCH one of its payments to status 'pending'
--   -> returns the updated row rather than [].
--   As any other authenticated user -> still [] (030's tenant policy is unchanged).
