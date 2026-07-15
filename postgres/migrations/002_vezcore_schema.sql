begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id text primary key references public."user"(id) on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin', 'super_admin')),
  tenant_id uuid,
  discord_thread_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  permission_key text not null,
  granted_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, permission_key)
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.profiles(id) on delete set null,
  tenant_id uuid,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ip_lists (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  type text not null check (type in ('allow', 'block')),
  reason text,
  expires_at timestamptz,
  created_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (ip, type)
);

create table if not exists public.login_attempts (
  ip text primary key,
  count integer not null default 0 check (count >= 0),
  last_attempt timestamptz not null default now(),
  blocked_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0 check (count >= 0),
  reset_time timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_user_id_created_at_idx on public.audit_log (user_id, created_at desc);
create index if not exists audit_log_action_created_at_idx on public.audit_log (action, created_at desc);
create index if not exists profiles_role_idx on public.profiles (role) where deleted_at is null;
create index if not exists user_permissions_user_id_idx on public.user_permissions (user_id);
create index if not exists ip_lists_type_expires_at_idx on public.ip_lists (type, expires_at);
create index if not exists rate_limits_reset_time_idx on public.rate_limits (reset_time);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists user_permissions_set_updated_at on public.user_permissions;
create trigger user_permissions_set_updated_at
before update on public.user_permissions
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, nullif(new.name, ''), case when new.role = 'admin' then 'admin' else 'user' end)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists auth_user_create_profile on public."user";
create trigger auth_user_create_profile
after insert on public."user"
for each row execute function public.create_profile_for_auth_user();

create or replace function public.consume_rate_limit(
  p_key text,
  p_max_requests integer,
  p_window_ms integer
)
returns table (allowed boolean, remaining integer, reset_time timestamptz)
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_reset timestamptz := v_now + make_interval(secs => p_window_ms::double precision / 1000.0);
  v_count integer;
begin
  if p_max_requests < 1 or p_window_ms < 1 or length(p_key) > 500 then
    raise exception 'invalid rate limit parameters';
  end if;

  insert into public.rate_limits as rl (key, count, reset_time, updated_at)
  values (p_key, 1, v_reset, v_now)
  on conflict (key) do update
  set count = case when rl.reset_time <= v_now then 1 else rl.count + 1 end,
      reset_time = case when rl.reset_time <= v_now then v_reset else rl.reset_time end,
      updated_at = v_now
  returning rl.count, rl.reset_time into v_count, v_reset;

  return query select v_count <= p_max_requests, greatest(p_max_requests - v_count, 0), v_reset;
end;
$$;

create or replace function public.cleanup_rate_limits()
returns void
language sql
set search_path = pg_catalog, public
as $$
  delete from public.rate_limits where reset_time < now() - interval '1 day';
$$;

create or replace function public.get_dashboard_stats(p_since timestamptz)
returns table (
  total_users bigint,
  active_sessions bigint,
  recent_logins bigint,
  errors_24h bigint
)
language sql
stable
set search_path = pg_catalog, public
as $$
  select
    (select count(*) from public."user" where coalesce(banned, false) = false),
    (select count(*) from public."session" where "expiresAt" > now()),
    (select count(*) from public.audit_log where action = 'login' and created_at >= p_since),
    (select count(*) from public.audit_log where action in ('error', 'failed_login', '2fa_failed') and created_at >= p_since);
$$;

create or replace function public.get_user_sessions(target_user_id text)
returns table (
  id text,
  ip text,
  user_agent text,
  aal text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
set search_path = pg_catalog, public
as $$
  select s.id, coalesce(s."ipAddress", ''), coalesce(s."userAgent", ''),
         case when coalesce(u."twoFactorEnabled", false) then 'aal2' else 'aal1' end,
         s."createdAt", s."updatedAt"
  from public."session" s
  join public."user" u on u.id = s."userId"
  where s."userId" = target_user_id and s."expiresAt" > now()
  order by s."updatedAt" desc;
$$;

create or replace function public.delete_user_session(session_id text, owner_user_id text)
returns boolean
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_deleted integer;
begin
  delete from public."session" where id = session_id and "userId" = owner_user_id;
  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$$;

revoke all on all tables in schema public from public;
revoke all on all sequences in schema public from public;
revoke all on all functions in schema public from public;

grant usage on schema public to vezcore_runtime;
grant select, insert, update, delete on all tables in schema public to vezcore_runtime;
grant usage, select on all sequences in schema public to vezcore_runtime;
grant execute on function public.consume_rate_limit(text, integer, integer) to vezcore_runtime;
grant execute on function public.cleanup_rate_limits() to vezcore_runtime;
grant execute on function public.get_dashboard_stats(timestamptz) to vezcore_runtime;
grant execute on function public.get_user_sessions(text) to vezcore_runtime;
grant execute on function public.delete_user_session(text, text) to vezcore_runtime;

alter default privileges in schema public revoke all on tables from public;
alter default privileges in schema public revoke all on sequences from public;
alter default privileges in schema public revoke all on functions from public;
alter default privileges in schema public grant select, insert, update, delete on tables to vezcore_runtime;
alter default privileges in schema public grant usage, select on sequences to vezcore_runtime;

commit;
