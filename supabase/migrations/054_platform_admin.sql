-- Platform admin: a read-only, cross-tenant view of every user for the operator.
--
-- Everything in the product is scoped to one landlord or one tenant by RLS, which
-- is correct and must stay that way. The operator still needs to see the whole
-- platform: who signed up, who got stuck before their first property, which
-- emails are failing. The two options were the service_role key in the web app or
-- SECURITY DEFINER functions gated in the database. service_role in a request path
-- turns one missed check into every row of every table, so this uses functions:
--
--   platform_admins        who is an operator. No policies, no grants -- only the
--                          definer functions below can read it.
--   is_platform_admin()    the one gate. Every admin_* function calls
--                          assert_platform_admin() before touching data.
--   admin_audit_log        every time an operator opens a user's detail or reveals
--                          their payout details. Lease holds phone numbers, rent
--                          amounts and bank instructions; looking at them leaves a
--                          trace.
--
-- Read-only by design. Nothing here writes to user data. PAN and Aadhaar are never
-- returned -- only whether they are set. Message bodies are never returned.

create table if not exists public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;

create table if not exists public.admin_audit_log (
  id             bigint generated always as identity primary key,
  admin_id       uuid references auth.users(id) on delete set null,
  action         text not null check (action in ('view_user', 'reveal_payout')),
  target_user_id uuid,
  created_at     timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
create index if not exists admin_audit_log_target_idx on public.admin_audit_log (target_user_id, created_at desc);

-- Seed the owner. A no-op if the account does not exist.
insert into public.platform_admins (user_id)
select id from auth.users where email = 'akhilchintu93@gmail.com'
on conflict do nothing;

-- ─── Gate ────────────────────────────────────────────────────────────────────

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create or replace function public.assert_platform_admin()
returns void
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
end;
$$;

-- ─── Overview ────────────────────────────────────────────────────────────────

create or replace function public.admin_overview()
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
begin
  perform public.assert_platform_admin();
  return jsonb_build_object(
    'users',           (select count(*) from profiles),
    'landlords',       (select count(*) from profiles where role = 'landlord'),
    'tenants',         (select count(*) from profiles where role = 'tenant'),
    'no_role',         (select count(*) from profiles where role is null),
    'new_7d',          (select count(*) from profiles where created_at > now() - interval '7 days'),
    'new_30d',         (select count(*) from profiles where created_at > now() - interval '30 days'),
    'signed_in_7d',    (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'signed_in_30d',   (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    'properties',      (select count(*) from properties where archived_at is null),
    'rentals_active',  (select count(*) from rentals where status = 'active'),
    'rentals_pending', (select count(*) from rentals where status in ('pending_tenant', 'pending_proof')),
    'managed_tenants', (select count(*) from rentals where tenant_id is null and tenant_name is not null and status <> 'ended'),
    'errors_24h',      (select count(*) from client_errors where created_at > now() - interval '24 hours'),
    'emails_failed_7d',(select count(*) from email_logs where status = 'failed' and created_at > now() - interval '7 days'),
    -- Rent is denominated in the property's country, so it is grouped by that and
    -- never summed across currencies.
    'rent_this_month', (
      select coalesce(jsonb_agg(t order by t.due desc), '[]'::jsonb) from (
        select coalesce(p.country_code, 'IN') as country_code,
               sum(rp.amount) as due,
               coalesce(sum(rp.amount) filter (where rp.status = 'paid'), 0) as paid,
               count(*) as rows,
               count(*) filter (where rp.status = 'overdue') as overdue
          from rent_payments rp
          join rentals r    on r.id = rp.rental_id
          join properties p on p.id = r.property_id
         where date_trunc('month', rp.month) = date_trunc('month', now())
         group by 1
      ) t
    ),
    'signups_by_week', (
      select jsonb_agg(jsonb_build_object(
               'week', w::date,
               'count', (select count(*) from profiles where created_at >= w and created_at < w + interval '7 days')
             ) order by w)
        from generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') w
    )
  );
end;
$$;

-- ─── Users ───────────────────────────────────────────────────────────────────
-- Raw counts per user. The activation stage is derived from these in
-- lib/admin/activation.ts, where it can be unit tested.

create or replace function public.admin_users()
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
begin
  perform public.assert_platform_admin();
  return (
    with
    props as (
      select landlord_id as uid, count(*) filter (where archived_at is null) as n
        from properties group by 1
    ),
    owned as (
      select landlord_id as uid,
             count(*) as rentals,
             count(*) filter (where status = 'active') as active,
             count(*) filter (where tenant_id is not null or tenant_name is not null) as with_tenant
        from rentals group by 1
    ),
    owned_paid as (
      select r.landlord_id as uid, count(*) as n
        from rent_payments rp join rentals r on r.id = rp.rental_id
       where rp.status = 'paid' group by 1
    ),
    tenancy as (
      select tenant_id as uid, count(*) as n from rentals where tenant_id is not null group by 1
    ),
    tenant_paid as (
      select tenant_id as uid, count(*) as n from rent_payments where status = 'paid' group by 1
    ),
    seen as (
      select uid, max(at) as at from (
        select user_id as uid, max(created_at) as at from product_events where user_id is not null group by 1
        union all
        select actor_id, max(created_at) from rental_events where actor_id is not null group by 1
        union all
        select sender_id, max(created_at) from messages group by 1
      ) s group by 1
    )
    select coalesce(jsonb_agg(row_to_json(x) order by x.created_at desc), '[]'::jsonb) from (
      select pr.id,
             pr.full_name,
             coalesce(pr.email, u.email) as email,
             pr.phone,
             pr.role,
             pr.country_code,
             pr.avatar_url,
             pr.created_at,
             u.last_sign_in_at,
             greatest(u.last_sign_in_at, seen.at) as last_active_at,
             coalesce(u.raw_app_meta_data->>'provider', 'email') as provider,
             coalesce(props.n, 0)       as properties,
             coalesce(owned.rentals, 0) as rentals,
             coalesce(owned.active, 0)  as active_rentals,
             coalesce(owned.with_tenant, 0) as rentals_with_tenant,
             coalesce(owned_paid.n, 0)  as landlord_paid_payments,
             coalesce(tenancy.n, 0)     as tenancies,
             coalesce(tenant_paid.n, 0) as tenant_paid_payments,
             exists (select 1 from platform_admins pa where pa.user_id = pr.id) as is_admin
        from profiles pr
        left join auth.users u   on u.id = pr.id
        left join props          on props.uid = pr.id
        left join owned          on owned.uid = pr.id
        left join owned_paid     on owned_paid.uid = pr.id
        left join tenancy        on tenancy.uid = pr.id
        left join tenant_paid    on tenant_paid.uid = pr.id
        left join seen           on seen.uid = pr.id
    ) x
  );
end;
$$;

-- ─── One user ────────────────────────────────────────────────────────────────

create or replace function public.admin_user_detail(target uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  perform public.assert_platform_admin();
  if not exists (select 1 from profiles where id = target) then
    return null;
  end if;

  insert into admin_audit_log (admin_id, action, target_user_id) values (auth.uid(), 'view_user', target);

  select jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'id', p.id, 'full_name', p.full_name, 'email', coalesce(p.email, u.email), 'phone', p.phone,
        'role', p.role, 'avatar_url', p.avatar_url,
        'country_code', p.country_code, 'currency_code', p.currency_code, 'timezone', p.timezone, 'locale', p.locale,
        'created_at', p.created_at, 'updated_at', p.updated_at,
        'has_pan', p.pan_number is not null and p.pan_number <> '',
        'has_aadhaar', p.aadhaar_last4 is not null and p.aadhaar_last4 <> '',
        'has_upi', p.upi_id is not null and p.upi_id <> '',
        'has_payout_details', p.payout_details is not null and p.payout_details <> '',
        'push_enabled', p.push_token is not null,
        'email_notifications', p.email_notifications,
        'provider', coalesce(u.raw_app_meta_data->>'provider', 'email'),
        'last_sign_in_at', u.last_sign_in_at,
        'email_confirmed_at', u.email_confirmed_at,
        'banned_until', u.banned_until,
        'is_admin', exists (select 1 from platform_admins pa where pa.user_id = p.id)
      )
      from profiles p left join auth.users u on u.id = p.id
      where p.id = target
    ),
    'properties', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', pp.id, 'name', pp.name, 'city', pp.city, 'country_code', pp.country_code,
        'property_type', pp.property_type, 'archived_at', pp.archived_at, 'created_at', pp.created_at,
        'rentals', (select count(*) from rentals r where r.property_id = pp.id)
      ) order by pp.created_at desc), '[]'::jsonb)
      from properties pp where pp.landlord_id = target
    ),
    'rentals', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'side', case when r.landlord_id = target then 'landlord' else 'tenant' end,
        'property_name', pp.name, 'city', pp.city, 'country_code', coalesce(pp.country_code, 'IN'),
        'status', r.status, 'monthly_rent', r.monthly_rent, 'security_deposit', r.security_deposit,
        'start_date', r.start_date, 'end_date', r.end_date, 'agreement_status', r.agreement_status,
        'landlord_id', r.landlord_id, 'landlord_name', lp.full_name,
        'tenant_id', r.tenant_id, 'tenant_name', coalesce(tp.full_name, r.tenant_name),
        'managed', r.tenant_id is null and r.tenant_name is not null,
        'created_at', r.created_at,
        'paid', (select count(*) from rent_payments x where x.rental_id = r.id and x.status = 'paid'),
        'pending', (select count(*) from rent_payments x where x.rental_id = r.id and x.status in ('pending', 'partial')),
        'overdue', (select count(*) from rent_payments x where x.rental_id = r.id and x.status = 'overdue')
      ) order by r.created_at desc), '[]'::jsonb)
      from rentals r
      join properties pp      on pp.id = r.property_id
      left join profiles lp   on lp.id = r.landlord_id
      left join profiles tp   on tp.id = r.tenant_id
      where r.landlord_id = target or r.tenant_id = target
    ),
    'payments', (
      select coalesce(jsonb_agg(t order by t.month desc, t.created_at desc), '[]'::jsonb) from (
        select rp.id, rp.month, rp.amount, rp.late_fee, rp.status, rp.payment_method, rp.paid_at, rp.created_at,
               pp.name as property_name, coalesce(pp.country_code, 'IN') as country_code
          from rent_payments rp
          join rentals r    on r.id = rp.rental_id
          join properties pp on pp.id = r.property_id
         where r.landlord_id = target or r.tenant_id = target or rp.tenant_id = target
         order by rp.month desc, rp.created_at desc
         limit 60
      ) t
    ),
    'activity', (
      select coalesce(jsonb_agg(t order by t.at desc), '[]'::jsonb) from (
        (select 'product' as source, pe.event as name, pe.props as detail, pe.created_at as at
           from product_events pe where pe.user_id = target order by pe.created_at desc limit 100)
        union all
        (select 'rental', re.event_type, jsonb_build_object('actor_type', re.actor_type, 'rental_id', re.rental_id), re.created_at
           from rental_events re where re.actor_id = target order by re.created_at desc limit 100)
        order by at desc
        limit 120
      ) t
    ),
    'emails', (
      select coalesce(jsonb_agg(t order by t.created_at desc), '[]'::jsonb) from (
        select e.email_type, e.subject, e.status, e.skip_reason, e.error, e.created_at
          from email_logs e where e.recipient_id = target order by e.created_at desc limit 50
      ) t
    ),
    'errors', (
      select coalesce(jsonb_agg(t order by t.created_at desc), '[]'::jsonb) from (
        select c.message, c.context, c.created_at
          from client_errors c where c.user_id = target order by c.created_at desc limit 30
      ) t
    ),
    'referrals', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'side', case when tr.tenant_id = target then 'tenant' else 'landlord' end,
        'other_name', case when tr.tenant_id = target then lp.full_name else tp.full_name end,
        'status', tr.status, 'created_at', tr.created_at, 'activated_at', tr.activated_at
      ) order by tr.created_at desc), '[]'::jsonb)
      from tenant_referrals tr
      left join profiles lp on lp.id = tr.landlord_id
      left join profiles tp on tp.id = tr.tenant_id
      where tr.tenant_id = target or tr.landlord_id = target
    ),
    'counts', jsonb_build_object(
      'messages_sent', (select count(*) from messages m where m.sender_id = target),
      'repairs_raised', (select count(*) from repair_requests rr where rr.raised_by = target),
      'notifications_unread', (select count(*) from notifications n where n.user_id = target and not n.read)
    ),
    'recent_views', (
      select coalesce(jsonb_agg(t order by t.created_at desc), '[]'::jsonb) from (
        select a.action, a.created_at, ap.full_name as admin_name
          from admin_audit_log a left join profiles ap on ap.id = a.admin_id
         where a.target_user_id = target order by a.created_at desc limit 10
      ) t
    )
  ) into result;

  return result;
end;
$$;

-- Payout instructions (UPI id, bank text) are hidden until explicitly revealed,
-- and every reveal is logged.
create or replace function public.admin_reveal_payout(target uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  perform public.assert_platform_admin();
  insert into admin_audit_log (admin_id, action, target_user_id) values (auth.uid(), 'reveal_payout', target);
  select jsonb_build_object('upi_id', p.upi_id, 'payout_details', p.payout_details)
    into result from profiles p where p.id = target;
  return result;
end;
$$;

-- ─── Health ──────────────────────────────────────────────────────────────────

create or replace function public.admin_health()
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  cron_runs jsonb;
begin
  perform public.assert_platform_admin();

  -- pg_cron's history is not guaranteed to be readable; the page should still render.
  begin
    select coalesce(jsonb_agg(t order by t.jobname), '[]'::jsonb) into cron_runs from (
      select j.jobname, j.schedule, j.active,
             d.status as last_status, d.start_time as last_run_at, left(d.return_message, 200) as last_message,
             (select count(*) from cron.job_run_details f
               where f.jobid = j.jobid and f.status = 'failed' and f.start_time > now() - interval '7 days') as failed_7d
        from cron.job j
        left join lateral (
          select status, start_time, return_message from cron.job_run_details r
           where r.jobid = j.jobid order by r.start_time desc limit 1
        ) d on true
    ) t;
  exception when others then
    cron_runs := null;
  end;

  return jsonb_build_object(
    'error_groups', (
      select coalesce(jsonb_agg(t order by t.count desc), '[]'::jsonb) from (
        select left(c.message, 240) as message, c.context, count(*) as count,
               count(distinct c.user_id) as users, max(c.created_at) as last_seen
          from client_errors c where c.created_at > now() - interval '7 days'
         group by 1, 2 order by count(*) desc limit 25
      ) t
    ),
    'errors_by_day', (
      select jsonb_agg(jsonb_build_object(
               'day', d::date,
               'count', (select count(*) from client_errors c where c.created_at >= d and c.created_at < d + interval '1 day')
             ) order by d)
        from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
    ),
    'email_summary', (
      select coalesce(jsonb_agg(t order by t.email_type, t.status), '[]'::jsonb) from (
        select email_type, status, count(*) as count
          from email_logs where created_at > now() - interval '7 days' group by 1, 2
      ) t
    ),
    'email_problems', (
      select coalesce(jsonb_agg(t order by t.created_at desc), '[]'::jsonb) from (
        select e.recipient_id, e.email_type, e.status, e.skip_reason, left(e.error, 240) as error, e.created_at
          from email_logs e where e.status <> 'sent' order by e.created_at desc limit 25
      ) t
    ),
    'agent_summary', (
      select coalesce(jsonb_agg(t order by t.agent_type, t.status), '[]'::jsonb) from (
        select agent_type, status, count(*) as count, max(created_at) as last_at
          from agent_runs where created_at > now() - interval '7 days' group by 1, 2
      ) t
    ),
    'agent_failures', (
      select coalesce(jsonb_agg(t order by t.created_at desc), '[]'::jsonb) from (
        select a.agent_type, a.status, left(a.error, 240) as error, a.created_at
          from agent_runs a where a.status = 'failed' order by a.created_at desc limit 15
      ) t
    ),
    'cron', cron_runs
  );
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────
-- 036 revoked default EXECUTE from public; each function is granted explicitly.
-- The functions themselves refuse non-admins, so granting to authenticated only
-- lets the check run.

revoke execute on function public.is_platform_admin()            from public, anon;
revoke execute on function public.assert_platform_admin()        from public, anon;
revoke execute on function public.admin_overview()               from public, anon;
revoke execute on function public.admin_users()                  from public, anon;
revoke execute on function public.admin_user_detail(uuid)        from public, anon;
revoke execute on function public.admin_reveal_payout(uuid)      from public, anon;
revoke execute on function public.admin_health()                 from public, anon;

grant execute on function public.is_platform_admin()             to authenticated;
grant execute on function public.assert_platform_admin()         to authenticated;
grant execute on function public.admin_overview()                to authenticated;
grant execute on function public.admin_users()                   to authenticated;
grant execute on function public.admin_user_detail(uuid)         to authenticated;
grant execute on function public.admin_reveal_payout(uuid)       to authenticated;
grant execute on function public.admin_health()                  to authenticated;
