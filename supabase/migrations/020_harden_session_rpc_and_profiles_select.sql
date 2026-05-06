create or replace function public.can_access_managed_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and target_user_id is not null
    and (
      auth.uid() = target_user_id
      or exists (
        select 1
        from public.profiles caller
        join public.profiles target on target.id = target_user_id
        where caller.id = auth.uid()
          and caller.role in ('admin', 'super_admin')
          and (
            caller.role = 'super_admin'
            or caller.tenant_id is null
            or caller.tenant_id = target.tenant_id
          )
      )
    );
$$;

revoke all on function public.can_access_managed_user(uuid) from public;
revoke all on function public.can_access_managed_user(uuid) from anon;
revoke all on function public.can_access_managed_user(uuid) from authenticated;
grant execute on function public.can_access_managed_user(uuid) to authenticated;

drop function if exists public.get_user_sessions(uuid);
create function public.get_user_sessions(target_user_id uuid)
returns table (
  id uuid,
  ip text,
  user_agent text,
  created_at timestamptz,
  updated_at timestamptz,
  aal text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.ip::text as ip,
    s.user_agent,
    s.created_at,
    s.updated_at,
    s.aal::text as aal
  from auth.sessions s
  where s.user_id = target_user_id
    and public.can_access_managed_user(target_user_id)
  order by s.updated_at desc, s.created_at desc;
$$;

revoke all on function public.get_user_sessions(uuid) from public;
revoke all on function public.get_user_sessions(uuid) from anon;
revoke all on function public.get_user_sessions(uuid) from authenticated;
grant execute on function public.get_user_sessions(uuid) to authenticated;

drop function if exists public.delete_user_session(uuid, uuid);
create function public.delete_user_session(session_id uuid, owner_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from auth.sessions s
    where s.id = session_id
      and s.user_id = owner_user_id
      and public.can_access_managed_user(owner_user_id)
    returning 1
  )
  select exists(select 1 from deleted);
$$;

revoke all on function public.delete_user_session(uuid, uuid) from public;
revoke all on function public.delete_user_session(uuid, uuid) from anon;
revoke all on function public.delete_user_session(uuid, uuid) from authenticated;
grant execute on function public.delete_user_session(uuid, uuid) to authenticated;

drop policy if exists "Authenticated users can view all profiles" on public.profiles;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_self_or_admin_tenant_select on public.profiles;

create policy profiles_self_or_admin_tenant_select
on public.profiles
for select
to authenticated
using (public.can_access_managed_user(id));
