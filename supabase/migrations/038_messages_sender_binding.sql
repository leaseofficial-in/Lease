-- Bind a message to the account that wrote it; take TRUNCATE away from the API.
--
-- What was wrong
-- --------------
-- messages had one policy, FOR ALL, with a USING clause and no WITH CHECK:
--
--   using (exists (select 1 from rentals r where r.id = messages.rental_id
--                    and (r.landlord_id = auth.uid() or r.tenant_id = auth.uid())))
--
-- With no WITH CHECK, Postgres reuses USING for inserts and updates. USING says
-- "the caller is a party to this rental". It says nothing about sender_id. So:
--
--   * A tenant could INSERT a message with sender_id = the landlord's id. The
--     thread renders it as the landlord's words -- "you can skip this month",
--     "pay to this account instead" -- with the landlord's name on it.
--   * Either party could UPDATE the other's messages (change body, reassign
--     sender) or DELETE them. A dispute over what was said in-thread, which is
--     the one thing a written channel is for, could be rewritten by either side.
--
-- The client always sends sender_id = user.id. The server never checked.
--
-- The fix
-- -------
-- Four policies in place of one, each saying exactly what it permits:
--   SELECT  parties to the rental.
--   INSERT  parties, and sender_id must be the caller.
--   UPDATE  the sender only; sender_id and rental membership re-checked on the
--           new row so a message cannot be handed to someone else or moved.
--   DELETE  the sender only.
--
-- read_at: the client never writes it today. When "mark as read" is built, the
-- recipient (not the sender) needs to set that one column, and these policies
-- will block that with a zero-row update -- which supabase-js reports as
-- error: null (see lib/supabase/write.ts). The right shape then is a BEFORE
-- UPDATE trigger allowing a non-sender party to change read_at and nothing
-- else, in the style of enforce_tenant_rental_scope (030). Not built now
-- because nothing calls it.
--
-- Roles: `to authenticated`. Anon never has a rental. Also revoked outright
-- from anon below so the table is not even in its grant list.
--
-- TRUNCATE
-- --------
-- Supabase's default privileges grant ALL on new tables to anon and
-- authenticated, and ALL includes TRUNCATE. Row-level security does not apply
-- to TRUNCATE at all. PostgREST exposes no verb for it, so today it is not
-- reachable from the API -- but a grant that would empty a table the moment
-- anything exposes it is not one to keep. Every table in public had it. Revoked
-- everywhere, and removed from the defaults so the next table does not get it.
-- service_role is untouched.

-- == messages ==================================================================

drop policy if exists "Rental parties can send and read messages" on public.messages;

create policy "Rental parties read messages"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.rentals r
      where r.id = messages.rental_id
        and (r.landlord_id = auth.uid() or r.tenant_id = auth.uid())
    )
  );

create policy "Rental parties send messages as themselves"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.rentals r
      where r.id = messages.rental_id
        and (r.landlord_id = auth.uid() or r.tenant_id = auth.uid())
    )
  );

create policy "Senders edit their own messages"
  on public.messages for update to authenticated
  using (sender_id = auth.uid())
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.rentals r
      where r.id = messages.rental_id
        and (r.landlord_id = auth.uid() or r.tenant_id = auth.uid())
    )
  );

create policy "Senders delete their own messages"
  on public.messages for delete to authenticated
  using (sender_id = auth.uid());

revoke all on public.messages from anon;

-- == TRUNCATE ==================================================================

do $$
declare t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('revoke truncate on public.%I from anon, authenticated', t.tablename);
  end loop;
end $$;

alter default privileges in schema public revoke truncate on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke truncate on tables from anon, authenticated;

-- == Verification ==============================================================
--   select policyname, cmd, with_check is not null as bound
--     from pg_policies where tablename = 'messages';           -> 4 rows, INSERT/UPDATE bound
--   As a tenant (JWT claims simulated): insert with sender_id = landlord -> 42501
--   As the same tenant: insert with sender_id = self -> ok; delete it -> ok
--   select count(*) from information_schema.role_table_grants
--     where table_schema='public' and privilege_type='TRUNCATE'
--       and grantee in ('anon','authenticated');                -> 0
--   scripts/verify-security.sh: probe becomes landlord of a throwaway rental,
--   posts a message as someone else -> 403; as itself -> 201.
