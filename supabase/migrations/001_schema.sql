-- ============================================================
-- Flatvio — Initial Schema
-- Run: supabase db push  OR  paste into Supabase SQL Editor
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── ENUMS ────────────────────────────────────────────────────────────────────

create type user_role          as enum ('landlord', 'tenant');
create type rental_status      as enum ('active', 'pending_tenant', 'pending_proof', 'ended');
create type payment_status     as enum ('paid', 'pending', 'overdue', 'partial');
create type proof_status       as enum ('pending', 'approved', 'rejected', 'dispute');
create type proof_type         as enum ('move_in', 'move_out');
create type repair_status      as enum ('open', 'in_progress', 'resolved', 'closed');
create type repair_priority    as enum ('low', 'medium', 'high', 'urgent');
create type deposit_txn_type   as enum ('received', 'deduction', 'refund');
create type notification_type  as enum ('rent_due', 'payment_received', 'proof_submitted', 'repair_update', 'general');
create type property_type      as enum ('apartment', 'house', 'pg', 'commercial');

-- ─── TABLES (all created before any policies) ─────────────────────────────────

create table profiles (
  id              uuid primary key references auth.users on delete cascade,
  phone           text unique,
  full_name       text not null default '',
  avatar_url      text,
  role            user_role,
  email           text,
  pan_number      text,
  aadhaar_last4   text,
  push_token      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table properties (
  id              uuid primary key default uuid_generate_v4(),
  landlord_id     uuid not null references profiles(id) on delete cascade,
  name            text not null,
  address_line1   text not null,
  address_line2   text,
  city            text not null,
  state           text not null,
  pincode         text not null,
  property_type   property_type not null default 'apartment',
  created_at      timestamptz not null default now()
);

create table rentals (
  id                    uuid primary key default uuid_generate_v4(),
  property_id           uuid not null references properties(id) on delete cascade,
  landlord_id           uuid not null references profiles(id),
  tenant_id             uuid references profiles(id),
  status                rental_status not null default 'pending_tenant',
  monthly_rent          numeric(12, 2) not null,
  security_deposit      numeric(12, 2) not null default 0,
  rent_due_day          smallint not null default 1 check (rent_due_day between 1 and 28),
  start_date            date not null,
  end_date              date,
  invite_token          text not null unique default encode(gen_random_bytes(16), 'hex'),
  invite_expires_at     timestamptz not null default now() + interval '72 hours',
  agreement_url         text,
  agreement_signed_at   timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table rent_payments (
  id                    uuid primary key default uuid_generate_v4(),
  rental_id             uuid not null references rentals(id) on delete cascade,
  tenant_id             uuid not null references profiles(id),
  amount                numeric(12, 2) not null,
  month                 date not null,
  status                payment_status not null default 'pending',
  razorpay_order_id     text,
  razorpay_payment_id   text,
  late_fee              numeric(12, 2) not null default 0,
  receipt_url           text,
  paid_at               timestamptz,
  created_at            timestamptz not null default now(),
  unique (rental_id, month)
);

create table deposit_transactions (
  id          uuid primary key default uuid_generate_v4(),
  rental_id   uuid not null references rentals(id) on delete cascade,
  type        deposit_txn_type not null,
  amount      numeric(12, 2) not null,
  note        text not null default '',
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now()
);

create table proofs (
  id              uuid primary key default uuid_generate_v4(),
  rental_id       uuid not null references rentals(id) on delete cascade,
  type            proof_type not null,
  status          proof_status not null default 'pending',
  submitted_by    uuid not null references profiles(id),
  reviewed_by     uuid references profiles(id),
  dispute_note    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (rental_id, type)
);

create table proof_photos (
  id              uuid primary key default uuid_generate_v4(),
  proof_id        uuid not null references proofs(id) on delete cascade,
  room_label      text not null,
  storage_path    text not null,
  public_url      text not null,
  annotation      text,
  uploaded_by     uuid not null references profiles(id),
  created_at      timestamptz not null default now()
);

create table repair_requests (
  id              uuid primary key default uuid_generate_v4(),
  rental_id       uuid not null references rentals(id) on delete cascade,
  raised_by       uuid not null references profiles(id),
  title           text not null,
  description     text not null,
  priority        repair_priority not null default 'medium',
  status          repair_status not null default 'open',
  photos          text[] not null default '{}',
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  title       text not null,
  body        text not null,
  type        notification_type not null default 'general',
  read        boolean not null default false,
  data        jsonb,
  created_at  timestamptz not null default now()
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

alter table profiles            enable row level security;
alter table properties          enable row level security;
alter table rentals             enable row level security;
alter table rent_payments       enable row level security;
alter table deposit_transactions enable row level security;
alter table proofs              enable row level security;
alter table proof_photos        enable row level security;
alter table repair_requests     enable row level security;
alter table notifications       enable row level security;

-- profiles
create policy "Users can view their own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

create policy "Landlords can view tenant profiles"
  on profiles for select using (
    exists (
      select 1 from rentals
      where rentals.landlord_id = auth.uid()
        and rentals.tenant_id = profiles.id
    )
  );

create policy "Tenants can view landlord profiles"
  on profiles for select using (
    exists (
      select 1 from rentals
      where rentals.tenant_id = auth.uid()
        and rentals.landlord_id = profiles.id
    )
  );

-- properties
create policy "Landlords manage their properties"
  on properties for all using (auth.uid() = landlord_id);

create policy "Tenants can view their rented property"
  on properties for select using (
    exists (
      select 1 from rentals
      where rentals.tenant_id = auth.uid()
        and rentals.property_id = properties.id
    )
  );

-- rentals
create policy "Landlords manage their rentals"
  on rentals for all using (auth.uid() = landlord_id);

create policy "Tenants can view their rental"
  on rentals for select using (auth.uid() = tenant_id);

create policy "Tenants can update their rental (sign agreement)"
  on rentals for update using (auth.uid() = tenant_id)
  with check (auth.uid() = tenant_id);

create policy "Public invite token lookup"
  on rentals for select using (
    invite_token is not null
    and invite_expires_at > now()
  );

-- rent_payments
create policy "Landlords view payments for their rentals"
  on rent_payments for select using (
    exists (select 1 from rentals where rentals.id = rent_payments.rental_id and rentals.landlord_id = auth.uid())
  );

create policy "Tenants view their own payments"
  on rent_payments for select using (auth.uid() = tenant_id);

create policy "Tenants create payment records"
  on rent_payments for insert with check (auth.uid() = tenant_id);

create policy "Tenants update their own payments"
  on rent_payments for update using (auth.uid() = tenant_id);

-- deposit_transactions
create policy "Parties view deposit transactions"
  on deposit_transactions for select using (
    exists (
      select 1 from rentals
      where rentals.id = deposit_transactions.rental_id
        and (rentals.landlord_id = auth.uid() or rentals.tenant_id = auth.uid())
    )
  );

create policy "Landlords create deposit transactions"
  on deposit_transactions for insert with check (
    exists (select 1 from rentals where rentals.id = deposit_transactions.rental_id and rentals.landlord_id = auth.uid())
    and auth.uid() = created_by
  );

-- proofs
create policy "Parties view proofs"
  on proofs for select using (
    exists (
      select 1 from rentals
      where rentals.id = proofs.rental_id
        and (rentals.landlord_id = auth.uid() or rentals.tenant_id = auth.uid())
    )
  );

create policy "Tenants submit proofs"
  on proofs for insert with check (
    auth.uid() = submitted_by
    and exists (select 1 from rentals where rentals.id = proofs.rental_id and rentals.tenant_id = auth.uid())
  );

create policy "Landlords review proofs"
  on proofs for update using (
    exists (select 1 from rentals where rentals.id = proofs.rental_id and rentals.landlord_id = auth.uid())
  );

-- proof_photos
create policy "Parties view proof photos"
  on proof_photos for select using (
    exists (
      select 1 from proofs
      join rentals on rentals.id = proofs.rental_id
      where proofs.id = proof_photos.proof_id
        and (rentals.landlord_id = auth.uid() or rentals.tenant_id = auth.uid())
    )
  );

create policy "Tenants upload proof photos"
  on proof_photos for insert with check (
    auth.uid() = uploaded_by
    and exists (
      select 1 from proofs
      join rentals on rentals.id = proofs.rental_id
      where proofs.id = proof_photos.proof_id
        and rentals.tenant_id = auth.uid()
        and proofs.status = 'pending'
    )
  );

-- repair_requests
create policy "Parties view repair requests"
  on repair_requests for select using (
    exists (
      select 1 from rentals
      where rentals.id = repair_requests.rental_id
        and (rentals.landlord_id = auth.uid() or rentals.tenant_id = auth.uid())
    )
  );

create policy "Tenants raise repair requests"
  on repair_requests for insert with check (
    auth.uid() = raised_by
    and exists (select 1 from rentals where rentals.id = repair_requests.rental_id and rentals.tenant_id = auth.uid())
  );

create policy "Landlords update repair status"
  on repair_requests for update using (
    exists (select 1 from rentals where rentals.id = repair_requests.rental_id and rentals.landlord_id = auth.uid())
  );

-- notifications
create policy "Users view their own notifications"
  on notifications for select using (auth.uid() = user_id);

create policy "Users mark notifications read"
  on notifications for update using (auth.uid() = user_id);

-- ─── STORAGE BUCKETS ──────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public) values
  ('proof-photos',   'proof-photos',   true),
  ('repair-photos',  'repair-photos',  true),
  ('avatars',        'avatars',        true),
  ('agreements',     'agreements',     false)
on conflict (id) do nothing;

create policy "Authenticated read proof photos"
  on storage.objects for select using (
    bucket_id = 'proof-photos' and auth.role() = 'authenticated'
  );

create policy "Tenants upload proof photos"
  on storage.objects for insert with check (
    bucket_id = 'proof-photos' and auth.role() = 'authenticated'
  );

create policy "Public read avatars"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Owner write avatars"
  on storage.objects for insert with check (
    bucket_id = 'avatars' and auth.role() = 'authenticated'
  );

create policy "Owner update avatars"
  on storage.objects for update using (
    bucket_id = 'avatars' and auth.role() = 'authenticated'
  );

create policy "Authenticated read repair photos"
  on storage.objects for select using (
    bucket_id = 'repair-photos' and auth.role() = 'authenticated'
  );

create policy "Authenticated upload repair photos"
  on storage.objects for insert with check (
    bucket_id = 'repair-photos' and auth.role() = 'authenticated'
  );

-- ─── FUNCTIONS & TRIGGERS ─────────────────────────────────────────────────────

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, phone, full_name, email)
  values (
    new.id,
    nullif(coalesce(new.phone, new.raw_user_meta_data->>'phone', ''), ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger rentals_updated_at
  before update on rentals
  for each row execute procedure set_updated_at();

create trigger proofs_updated_at
  before update on proofs
  for each row execute procedure set_updated_at();

create trigger repair_requests_updated_at
  before update on repair_requests
  for each row execute procedure set_updated_at();

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure set_updated_at();

create or replace function generate_monthly_payment()
returns trigger language plpgsql security definer as $$
declare
  payment_month date;
begin
  if new.status = 'active' and old.status != 'active' and new.tenant_id is not null then
    payment_month := date_trunc('month', new.start_date::date);
    insert into rent_payments (rental_id, tenant_id, amount, month, status)
    values (new.id, new.tenant_id, new.monthly_rent, payment_month, 'pending')
    on conflict (rental_id, month) do nothing;
  end if;
  return new;
end;
$$;

create trigger rental_activated
  after update on rentals
  for each row execute procedure generate_monthly_payment();

-- ─── INDEXES ──────────────────────────────────────────────────────────────────

create index idx_rentals_landlord on rentals(landlord_id);
create index idx_rentals_tenant   on rentals(tenant_id);
create index idx_rentals_token    on rentals(invite_token);
create index idx_payments_rental  on rent_payments(rental_id);
create index idx_payments_month   on rent_payments(month);
create index idx_proofs_rental    on proofs(rental_id);
create index idx_repairs_rental   on repair_requests(rental_id);
create index idx_notifs_user      on notifications(user_id, read, created_at desc);
