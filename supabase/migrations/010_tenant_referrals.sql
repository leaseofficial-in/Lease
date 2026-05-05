create table if not exists tenant_referrals (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references profiles(id) on delete cascade,
  landlord_id uuid not null references profiles(id) on delete cascade,
  source text not null default 'tenant_referral',
  status text not null default 'signed_up' check (status in ('signed_up', 'activated')),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  unique (tenant_id, landlord_id)
);

alter table tenant_referrals enable row level security;

create policy "Tenants view referrals they sent"
  on tenant_referrals for select using (auth.uid() = tenant_id);

create policy "Landlords view their referral source"
  on tenant_referrals for select using (auth.uid() = landlord_id);

create policy "Invited landlords record their referral"
  on tenant_referrals for insert
  with check (auth.uid() = landlord_id);

create policy "Invited landlords refresh their referral record"
  on tenant_referrals for update
  using (auth.uid() = landlord_id)
  with check (auth.uid() = landlord_id);
