-- Run once in Supabase SQL editor.
-- Adds agent invitation codes so dealer owners can invite workers as agents
-- without needing SUPABASE_SERVICE_ROLE_KEY. Each code is unique and carries
-- the owner's user id, which becomes the agent's dealer_owner_id upon redeem
-- (forward-compatible with future multi-owner support).

-- ---------- table ----------
create table if not exists public.agent_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  revoked_at timestamptz
);

grant select, insert, update, delete on public.agent_invites to authenticated;
grant all on public.agent_invites to service_role;

alter table public.agent_invites enable row level security;

drop policy if exists "invites: dealer reads own" on public.agent_invites;
create policy "invites: dealer reads own"
  on public.agent_invites for select to authenticated
  using (created_by = auth.uid() and public.has_role(auth.uid(), 'dealer_admin'));

drop policy if exists "invites: dealer inserts own" on public.agent_invites;
create policy "invites: dealer inserts own"
  on public.agent_invites for insert to authenticated
  with check (created_by = auth.uid() and public.has_role(auth.uid(), 'dealer_admin'));

drop policy if exists "invites: dealer revokes own" on public.agent_invites;
create policy "invites: dealer revokes own"
  on public.agent_invites for update to authenticated
  using (created_by = auth.uid() and public.has_role(auth.uid(), 'dealer_admin'))
  with check (created_by = auth.uid());

-- Optional: track which dealer owns each agent (future multi-owner ready).
create table if not exists public.agent_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
grant select on public.agent_owners to authenticated;
grant all on public.agent_owners to service_role;
alter table public.agent_owners enable row level security;

drop policy if exists "agent_owners: self or owner reads" on public.agent_owners;
create policy "agent_owners: self or owner reads"
  on public.agent_owners for select to authenticated
  using (user_id = auth.uid() or owner_id = auth.uid());

-- ---------- dealer_exists (SECURITY DEFINER) ----------
create or replace function public.dealer_exists()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.user_roles where role = 'dealer_admin');
$$;
revoke all on function public.dealer_exists() from public;
grant execute on function public.dealer_exists() to authenticated;

-- ---------- create_agent_invite ----------
create or replace function public.create_agent_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_try int := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.has_role(v_uid, 'dealer_admin') then
    raise exception 'Forbidden';
  end if;

  loop
    v_try := v_try + 1;
    -- 10-char uppercase alphanumeric, unambiguous
    v_code := upper(translate(
      substr(encode(gen_random_bytes(8), 'base64'), 1, 10),
      '+/=OIl01',
      'ABCDEFGH'
    ));
    begin
      insert into public.agent_invites(code, created_by) values (v_code, v_uid);
      return v_code;
    exception when unique_violation then
      if v_try > 5 then raise; end if;
    end;
  end loop;
end;
$$;
revoke all on function public.create_agent_invite() from public;
grant execute on function public.create_agent_invite() to authenticated;

-- ---------- revoke_agent_invite ----------
create or replace function public.revoke_agent_invite(_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  update public.agent_invites
     set revoked_at = now()
   where code = _code and created_by = v_uid and used_at is null;
end;
$$;
revoke all on function public.revoke_agent_invite(text) from public;
grant execute on function public.revoke_agent_invite(text) to authenticated;

-- ---------- redeem_agent_invite ----------
create or replace function public.redeem_agent_invite(_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select created_by into v_owner
    from public.agent_invites
   where code = _code
     and used_at is null
     and revoked_at is null
   for update;

  if v_owner is null then
    raise exception 'Invalid or already used invitation code';
  end if;

  if v_owner = v_uid then
    raise exception 'Cannot redeem your own invitation code';
  end if;

  insert into public.user_roles(user_id, role)
    values (v_uid, 'agent')
    on conflict do nothing;

  insert into public.agent_owners(user_id, owner_id)
    values (v_uid, v_owner)
    on conflict (user_id) do update set owner_id = excluded.owner_id;

  update public.agent_invites
     set used_by = v_uid, used_at = now()
   where code = _code;
end;
$$;
revoke all on function public.redeem_agent_invite(text) from public;
grant execute on function public.redeem_agent_invite(text) to authenticated;

notify pgrst, 'reload schema';
