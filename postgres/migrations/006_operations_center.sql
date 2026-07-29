begin;

create extension if not exists pgcrypto;

create table if not exists public.user_preferences (
  user_id text primary key references public.profiles(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(preferences) = 'object')
);

create table if not exists public.operations_status_samples (
  id bigint generated always as identity primary key,
  service_key text not null check (char_length(service_key) between 1 and 80),
  module_key text not null check (char_length(module_key) between 1 and 80),
  status text not null check (status in ('healthy', 'warning', 'error', 'unknown')),
  detail text not null check (char_length(detail) <= 500),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  checked_at timestamptz not null default now()
);

create table if not exists public.operations_incidents (
  id uuid primary key default gen_random_uuid(),
  service_key text not null check (char_length(service_key) between 1 and 80),
  module_key text not null check (char_length(module_key) between 1 and 80),
  severity text not null check (severity in ('warning', 'error')),
  status text not null default 'open'
    check (status in ('open', 'acknowledged', 'resolved')),
  title text not null check (char_length(title) between 1 and 200),
  detail text not null check (char_length(detail) <= 1000),
  source text not null default 'health_check',
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by text references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(metadata) = 'object'),
  check (last_seen_at >= started_at),
  check (resolved_at is null or resolved_at >= started_at)
);

create table if not exists public.operations_deployments (
  id uuid primary key default gen_random_uuid(),
  module_key text not null check (char_length(module_key) between 1 and 80),
  sha text not null check (sha ~ '^[0-9a-fA-F]{7,64}$'),
  short_sha text not null check (short_sha ~ '^[0-9a-fA-F]{7,16}$'),
  status text not null check (status in ('success', 'failure', 'pending', 'unknown')),
  message text not null check (char_length(message) <= 500),
  url text check (url is null or char_length(url) <= 2000),
  deployed_at timestamptz,
  recorded_at timestamptz not null default now(),
  unique (module_key, sha)
);

create table if not exists public.operations_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (char_length(kind) between 1 and 80),
  severity text not null check (severity in ('info', 'warning', 'error')),
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) <= 500),
  module_key text check (module_key is null or char_length(module_key) <= 80),
  href text check (href is null or char_length(href) <= 2000),
  dedupe_key text check (dedupe_key is null or char_length(dedupe_key) <= 200),
  created_at timestamptz not null default now()
);

create table if not exists public.operations_notification_reads (
  notification_id uuid not null
    references public.operations_notifications(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create table if not exists public.operations_maintenance_windows (
  id uuid primary key default gen_random_uuid(),
  module_key text not null check (char_length(module_key) between 1 and 80),
  title text not null check (char_length(title) between 3 and 120),
  reason text not null check (char_length(reason) between 3 and 1000),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'active', 'completed', 'cancelled')),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  started_at timestamptz,
  ended_at timestamptz,
  created_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end > scheduled_start)
);

create table if not exists public.operations_shortcuts (
  id uuid primary key default gen_random_uuid(),
  module_key text not null check (char_length(module_key) between 1 and 80),
  label text not null check (char_length(label) between 1 and 120),
  description text not null check (char_length(description) <= 500),
  href text check (href is null or char_length(href) <= 2000),
  alias_key text not null unique check (alias_key ~ '^[a-z0-9_]{2,80}$'),
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.operations_shortcuts.alias_key is
  'Allow-listed server-side key. SSH aliases and credentials are never stored here.';

create table if not exists public.operations_snapshots (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 120),
  data jsonb not null,
  captured_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(data) = 'object')
);

create table if not exists public.operations_dependencies (
  id uuid primary key default gen_random_uuid(),
  parent_key text not null check (char_length(parent_key) between 1 and 80),
  child_key text not null check (char_length(child_key) between 1 and 80),
  relation text not null default 'depends_on'
    check (char_length(relation) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  created_at timestamptz not null default now(),
  unique (parent_key, child_key),
  check (parent_key <> child_key)
);

create index if not exists operations_status_samples_service_time_idx
  on public.operations_status_samples(service_key, checked_at desc);
create index if not exists operations_status_samples_checked_at_idx
  on public.operations_status_samples(checked_at desc);
create unique index if not exists operations_incidents_one_active_per_service_idx
  on public.operations_incidents(service_key)
  where status in ('open', 'acknowledged');
create index if not exists operations_incidents_started_at_idx
  on public.operations_incidents(started_at desc);
create index if not exists operations_deployments_time_idx
  on public.operations_deployments(recorded_at desc);
create unique index if not exists operations_notifications_dedupe_idx
  on public.operations_notifications(dedupe_key)
  where dedupe_key is not null;
create index if not exists operations_notifications_created_at_idx
  on public.operations_notifications(created_at desc);
create index if not exists operations_maintenance_windows_time_idx
  on public.operations_maintenance_windows(scheduled_start desc);
create index if not exists operations_snapshots_created_at_idx
  on public.operations_snapshots(created_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'user_preferences',
    'operations_incidents',
    'operations_maintenance_windows',
    'operations_shortcuts'
  ] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

create or replace function public.get_security_account_report_data()
returns table (
  user_id text,
  email text,
  email_verified boolean,
  two_factor_enabled boolean,
  last_sign_in_at timestamptz,
  active_sessions bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    u.id,
    u.email,
    u."emailVerified",
    coalesce(u."twoFactorEnabled", false),
    max(s."updatedAt"),
    count(s.id) filter (where s."expiresAt" > now())
  from public."user" u
  left join public."session" s on s."userId" = u.id
  group by u.id, u.email, u."emailVerified", u."twoFactorEnabled";
$$;

revoke all on function public.get_security_account_report_data() from public;
grant execute on function public.get_security_account_report_data()
  to vezcore_runtime;

create or replace function public.get_operations_uptime(p_since timestamptz)
returns table (
  service_key text,
  healthy_count bigint,
  total_count bigint,
  last_checked_at timestamptz
)
language sql
stable
set search_path = pg_catalog, public
as $$
  select
    samples.service_key,
    count(*) filter (where samples.status = 'healthy'),
    count(*),
    max(samples.checked_at)
  from public.operations_status_samples samples
  where samples.checked_at >= p_since
  group by samples.service_key
  order by samples.service_key;
$$;

revoke all on function public.get_operations_uptime(timestamptz) from public;
grant execute on function public.get_operations_uptime(timestamptz)
  to vezcore_runtime;

insert into public.operations_dependencies (parent_key, child_key, description)
values
  ('vez', 'vezVision', 'VEZvision jest usługą ekosystemu VEZ'),
  ('vez', 'vezLabs', 'VEZlabs zapewnia zaplecze usług wewnętrznych'),
  ('vezLabs', 'nably', 'Nably korzysta z infrastruktury VEZlabs'),
  ('vezLabs', 'vezWork', 'VEZwork korzysta z infrastruktury VEZlabs'),
  ('vezLabs', 'vezRent', 'VEZrent korzysta z infrastruktury VEZlabs'),
  ('vezLabs', 'vezStudio', 'VEZstudio korzysta z infrastruktury VEZlabs'),
  ('vezVision', 'prodApi', 'VEZvision korzysta z produkcyjnego API'),
  ('vez', 'database', 'VEZcore korzysta z głównej bazy danych'),
  ('vezLabs', 'labApi', 'VEZlabs korzysta z API laboratoryjnego'),
  ('vezLabs', 'minio', 'VEZlabs korzysta z magazynu MinIO'),
  ('vezLabs', 'monitor', 'VEZlabs korzysta z usługi monitoringu')
on conflict (parent_key, child_key) do update
set description = excluded.description;

insert into public.operations_shortcuts
  (module_key, label, description, href, alias_key, sort_order)
values
  ('vez', 'VEZcore', 'Dashboard produkcyjny', 'https://vezcore.vezlabs.dev', 'vezcore', 10),
  ('vezVision', 'Hetzner Cloud', 'Panel produkcyjnej chmury', 'https://console.hetzner.cloud/projects', 'vez_prod', 20),
  ('vezVision', 'DB tunnel', 'Tunel do bazy PostgreSQL', null, 'vezvision_db_tunnel', 30),
  ('vezLabs', 'Proxmox', 'Maszyny wirtualne', 'https://10.77.40.2:8006/', 'vezlabs_pve', 40),
  ('vezLabs', 'Coolify', 'Deploy i aplikacje', 'https://10.77.30.35:8000/', 'vezlabs_coolify', 50),
  ('vezLabs', 'Router', 'Sieć i VLAN', 'https://192.168.2.1/', 'vezlabs_router', 60),
  ('vezLabs', 'Monitor', 'Panel monitoringu', 'https://monitor.vezlabs.dev', 'vezlabs_monitor', 70),
  ('vezLabs', 'MinIO', 'Storage obiektowy', 'https://s3-dev.vezlabs.dev', 'vezlabs_minio', 80)
on conflict (alias_key) do update
set module_key = excluded.module_key,
    label = excluded.label,
    description = excluded.description,
    href = excluded.href,
    sort_order = excluded.sort_order;

grant select, insert, update, delete on
  public.user_preferences,
  public.operations_status_samples,
  public.operations_incidents,
  public.operations_deployments,
  public.operations_notifications,
  public.operations_notification_reads,
  public.operations_maintenance_windows,
  public.operations_shortcuts,
  public.operations_snapshots,
  public.operations_dependencies
to vezcore_runtime;

grant usage, select on sequence public.operations_status_samples_id_seq
  to vezcore_runtime;

commit;
