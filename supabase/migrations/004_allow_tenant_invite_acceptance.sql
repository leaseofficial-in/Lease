-- Allow an authenticated tenant to claim an unassigned rental using a valid invite.

drop policy if exists "Tenants can accept rental invites" on rentals;

create policy "Tenants can accept rental invites"
  on rentals for update
  using (
    tenant_id is null
    and invite_token is not null
    and invite_expires_at > now()
  )
  with check (
    tenant_id = auth.uid()
    and status = 'pending_proof'
  );
