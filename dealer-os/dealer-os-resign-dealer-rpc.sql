-- Adds resign_dealer RPC (and re-asserts bootstrap_dealer + grant_agent_role).
-- Run once in the Supabase SQL editor. Safe to re-run.

create or replace function public.bootstrap_dealer()
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_count int;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select count(*) into v_count from public.user_roles where role = 'dealer_admin';
  if v_count > 0 then raise exception 'A dealer already exists.'; end if;
  insert into public.user_roles (user_id, role) values (v_uid, 'dealer_admin')
  on conflict do nothing;
end; $$;
revoke all on function public.bootstrap_dealer() from public;
grant execute on function public.bootstrap_dealer() to authenticated;

create or replace function public.resign_dealer()
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  delete from public.user_roles where user_id = v_uid and role = 'dealer_admin';
end; $$;
revoke all on function public.resign_dealer() from public;
grant execute on function public.resign_dealer() to authenticated;

create or replace function public.grant_agent_role(_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.has_role(v_uid, 'dealer_admin') then raise exception 'Forbidden'; end if;
  insert into public.user_roles (user_id, role) values (_user_id, 'agent')
  on conflict do nothing;
end; $$;
revoke all on function public.grant_agent_role(uuid) from public;
grant execute on function public.grant_agent_role(uuid) to authenticated;

-- Force PostgREST to reload its schema cache so the new function is visible immediately.
notify pgrst, 'reload schema';
