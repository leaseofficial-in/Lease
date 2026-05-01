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

create or replace function public.accept_rental_invite(invite_token_input text)
returns public.rentals
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.rentals;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.rentals
  set
    tenant_id = auth.uid(),
    status = 'pending_proof',
    updated_at = now()
  where invite_token = invite_token_input
    and invite_expires_at > now()
    and tenant_id is null
  returning * into claimed;

  if claimed.id is null then
    raise exception 'Invite not found or already used';
  end if;

  return claimed;
end;
$$;

grant execute on function public.accept_rental_invite(text) to authenticated;
