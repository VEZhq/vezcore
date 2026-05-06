-- Preserve RPC contract for the app while moving SECURITY DEFINER session access into app_private.

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated, service_role;

create or replace function app_private.get_user_sessions(target_user_id uuid)
returns table(
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
set search_path to 'public', 'auth', 'app_private'
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
    and app_private.can_access_managed_user(target_user_id)
  order by s.updated_at desc, s.created_at desc;
$$;

create or replace function app_private.delete_user_session(session_id uuid, owner_user_id uuid)
returns boolean
language sql
security definer
set search_path to 'public', 'auth', 'app_private'
as $$
  with deleted as (
    delete from auth.sessions s
    where s.id = session_id
      and s.user_id = owner_user_id
      and app_private.can_access_managed_user(owner_user_id)
    returning 1
  )
  select exists(select 1 from deleted);
$$;

grant execute on function app_private.get_user_sessions(uuid) to authenticated, service_role;
grant execute on function app_private.delete_user_session(uuid, uuid) to authenticated, service_role;

create or replace function public.get_user_sessions(target_user_id uuid)
returns table(
  id uuid,
  ip text,
  user_agent text,
  created_at timestamptz,
  updated_at timestamptz,
  aal text
)
language sql
stable
security invoker
set search_path to 'public', 'app_private'
as $$
  select * from app_private.get_user_sessions(target_user_id);
$$;

create or replace function public.delete_user_session(session_id uuid, owner_user_id uuid)
returns boolean
language sql
security invoker
set search_path to 'public', 'app_private'
as $$
  select app_private.delete_user_session(session_id, owner_user_id);
$$;

grant execute on function public.get_user_sessions(uuid) to authenticated;
grant execute on function public.delete_user_session(uuid, uuid) to authenticated;
