begin;

create extension if not exists pgcrypto;

create table if not exists public.vv_calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default false,
  color text not null default '#3b82f6' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  category text not null default 'Inne',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (end_at is null or end_at >= start_at)
);

create table if not exists public.vv_folders (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.vv_folders(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  slug text not null check (char_length(trim(slug)) > 0),
  full_path text not null unique,
  owner_user_id uuid,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_id, slug)
);

create table if not exists public.vv_files (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.vv_folders(id) on delete set null,
  original_name text not null check (char_length(trim(original_name)) > 0),
  storage_bucket text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  checksum_sha256 text,
  owner_user_id uuid,
  is_public boolean not null default false,
  owner_type text,
  owner_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.vv_file_permissions (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references public.vv_files(id) on delete cascade,
  folder_id uuid references public.vv_folders(id) on delete cascade,
  user_id uuid not null,
  can_view boolean not null default true,
  can_upload boolean not null default false,
  can_manage boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(file_id, folder_id) = 1)
);

create table if not exists public.vv_file_events (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references public.vv_files(id) on delete set null,
  folder_id uuid references public.vv_folders(id) on delete set null,
  actor_user_id uuid,
  event_type text not null,
  ip text,
  user_agent text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.vv_newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  subject_en text,
  content_html text not null,
  content_html_en text,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  recipient_count integer not null default 0 check (recipient_count >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  segment_language text,
  segment_tags text[],
  template_config jsonb,
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vv_newsletter_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text,
  content_html text not null,
  content_html_en text,
  thumbnail_url text,
  is_active boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vv_newsletter_send_logs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.vv_newsletter_campaigns(id) on delete cascade,
  subscriber_id uuid not null references public.vv_newsletter_subscribers(id) on delete cascade,
  subscriber_email text not null,
  status text not null,
  provider text not null default 'resend',
  provider_message_id text,
  error_message text,
  attempt_no integer not null default 1 check (attempt_no > 0),
  created_at timestamptz not null default now()
);

create unique index if not exists vv_file_permissions_file_user_uidx on public.vv_file_permissions(file_id, user_id) where file_id is not null;
create unique index if not exists vv_file_permissions_folder_user_uidx on public.vv_file_permissions(folder_id, user_id) where folder_id is not null;
create index if not exists vv_folders_parent_idx on public.vv_folders(parent_id);
create index if not exists vv_files_folder_active_idx on public.vv_files(folder_id, created_at desc) where deleted_at is null;
create index if not exists vv_files_deleted_idx on public.vv_files(deleted_at) where deleted_at is not null;
create index if not exists vv_file_events_file_idx on public.vv_file_events(file_id, created_at desc);
create index if not exists vv_file_events_folder_idx on public.vv_file_events(folder_id, created_at desc);
create index if not exists vv_calendar_events_start_idx on public.vv_calendar_events(start_at) where deleted_at is null;
create index if not exists vv_newsletter_campaigns_status_idx on public.vv_newsletter_campaigns(status, created_at desc);
create index if not exists vv_newsletter_send_logs_campaign_idx on public.vv_newsletter_send_logs(campaign_id, created_at desc);

create or replace function public.vv_set_updated_at()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'vv_calendar_events', 'vv_folders', 'vv_files', 'vv_file_permissions',
    'vv_newsletter_campaigns', 'vv_newsletter_templates'
  ] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.vv_set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

insert into public.vv_folders (id, parent_id, name, slug, full_path, is_system)
values ('00000000-0000-0000-0000-000000000001', null, 'Root', 'root', '/root', true)
on conflict (id) do nothing;

create or replace function public.get_folder_chain(start_folder_id uuid)
returns table (
  id uuid, parent_id uuid, name text, slug text, full_path text,
  owner_user_id uuid, is_system boolean, created_at timestamptz, updated_at timestamptz
)
language sql stable set search_path = pg_catalog, public as $$
  with recursive chain as (
    select f.*, 0 as depth from public.vv_folders f where f.id = start_folder_id
    union all
    select p.*, c.depth + 1 from public.vv_folders p join chain c on p.id = c.parent_id
  )
  select c.id, c.parent_id, c.name, c.slug, c.full_path, c.owner_user_id,
         c.is_system, c.created_at, c.updated_at
  from chain c order by c.depth desc;
$$;

create or replace function public.get_active_storage_used_bytes()
returns bigint language sql stable set search_path = pg_catalog, public as $$
  select coalesce(sum(size_bytes), 0)::bigint from public.vv_files where deleted_at is null;
$$;

create or replace function public.vv_dashboard_stats()
returns table (
  blog_total bigint, blog_published bigint,
  portfolio_total bigint, portfolio_published bigint,
  services_total bigint, services_active bigint,
  faq_total bigint, faq_active bigint,
  newsletter_total bigint, newsletter_active bigint,
  files_total bigint, files_public bigint
)
language sql stable set search_path = pg_catalog, public as $$
  select
    (select count(*) from public.vv_blog_posts),
    (select count(*) from public.vv_blog_posts where status = 'published'),
    (select count(*) from public.vv_projects),
    (select count(*) from public.vv_projects where status = 'published'),
    (select count(*) from public.vv_services),
    (select count(*) from public.vv_services where status = 'active'),
    (select count(*) from public.vv_faq_items),
    (select count(*) from public.vv_faq_items where is_active = true),
    (select count(*) from public.vv_newsletter_subscribers),
    (select count(*) from public.vv_newsletter_subscribers where is_active = true),
    (select count(*) from public.vv_files where deleted_at is null),
    (select count(*) from public.vv_files where deleted_at is null and is_public = true);
$$;

grant select, insert, update, delete on public.vv_calendar_events,
  public.vv_folders, public.vv_files, public.vv_file_permissions, public.vv_file_events,
  public.vv_newsletter_campaigns, public.vv_newsletter_templates, public.vv_newsletter_send_logs
  to vezvision_lab_api;
grant execute on function public.get_folder_chain(uuid) to vezvision_lab_api;
grant execute on function public.get_active_storage_used_bytes() to vezvision_lab_api;
grant execute on function public.vv_dashboard_stats() to vezvision_lab_api;

commit;
