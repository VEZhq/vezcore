create extension if not exists pgcrypto;

create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, permission_key)
);

alter table public.user_permissions enable row level security;

drop policy if exists user_permissions_admin_insert on public.user_permissions;
create policy user_permissions_admin_insert
on public.user_permissions
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists user_permissions_admin_update on public.user_permissions;
create policy user_permissions_admin_update
on public.user_permissions
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists user_permissions_admin_delete on public.user_permissions;
create policy user_permissions_admin_delete
on public.user_permissions
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists user_permissions_self_view on public.user_permissions;
create policy user_permissions_self_view
on public.user_permissions
for select
to authenticated
using (user_id = auth.uid());

create table if not exists public.vv_folders (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.vv_folders(id) on delete cascade,
  name text not null,
  slug text not null,
  full_path text not null unique,
  owner_user_id uuid references auth.users(id) on delete set null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vv_folders_name_check check (char_length(trim(name)) > 0),
  constraint vv_folders_slug_check check (char_length(trim(slug)) > 0)
);

create unique index if not exists vv_folders_parent_slug_uidx
  on public.vv_folders(parent_id, slug);

create index if not exists vv_folders_parent_idx on public.vv_folders(parent_id);
create index if not exists vv_folders_owner_idx on public.vv_folders(owner_user_id);

create table if not exists public.vv_files (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.vv_folders(id) on delete set null,
  original_name text not null,
  storage_bucket text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  checksum_sha256 text,
  owner_user_id uuid references auth.users(id) on delete set null,
  is_public boolean not null default false,
  owner_type text,
  owner_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint vv_files_name_check check (char_length(trim(original_name)) > 0),
  constraint vv_files_size_check check (size_bytes >= 0)
);

create index if not exists vv_files_folder_idx on public.vv_files(folder_id);
create index if not exists vv_files_owner_idx on public.vv_files(owner_user_id);
create index if not exists vv_files_owner_entity_idx on public.vv_files(owner_type, owner_id);
create index if not exists vv_files_active_idx on public.vv_files(deleted_at) where deleted_at is null;

create table if not exists public.vv_file_permissions (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references public.vv_files(id) on delete cascade,
  folder_id uuid references public.vv_folders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  can_view boolean not null default true,
  can_upload boolean not null default false,
  can_manage boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vv_file_permissions_target_check check (
    (case when file_id is null then 0 else 1 end) +
    (case when folder_id is null then 0 else 1 end) = 1
  )
);

create unique index if not exists vv_file_permissions_file_user_uidx
  on public.vv_file_permissions(file_id, user_id)
  where file_id is not null;

create unique index if not exists vv_file_permissions_folder_user_uidx
  on public.vv_file_permissions(folder_id, user_id)
  where folder_id is not null;

create table if not exists public.vv_file_events (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references public.vv_files(id) on delete set null,
  folder_id uuid references public.vv_folders(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  ip text,
  user_agent text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists vv_file_events_file_idx on public.vv_file_events(file_id, created_at desc);
create index if not exists vv_file_events_folder_idx on public.vv_file_events(folder_id, created_at desc);
create index if not exists vv_file_events_actor_idx on public.vv_file_events(actor_user_id, created_at desc);

create or replace function public.vv_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists vv_folders_set_updated_at on public.vv_folders;
create trigger vv_folders_set_updated_at
before update on public.vv_folders
for each row
execute function public.vv_set_updated_at();

drop trigger if exists vv_files_set_updated_at on public.vv_files;
create trigger vv_files_set_updated_at
before update on public.vv_files
for each row
execute function public.vv_set_updated_at();

drop trigger if exists vv_file_permissions_set_updated_at on public.vv_file_permissions;
create trigger vv_file_permissions_set_updated_at
before update on public.vv_file_permissions
for each row
execute function public.vv_set_updated_at();

create or replace function public.vv_has_files_permission(required_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
  or exists (
    select 1
    from public.user_permissions up
    where up.user_id = auth.uid() and up.permission_key = required_key
  )
  or exists (
    select 1
    from public.user_permissions up
    where up.user_id = auth.uid() and up.permission_key = 'vezvision.access'
  );
$$;

grant execute on function public.vv_has_files_permission(text) to authenticated;

alter table public.vv_folders enable row level security;
alter table public.vv_files enable row level security;
alter table public.vv_file_permissions enable row level security;
alter table public.vv_file_events enable row level security;

drop policy if exists vv_folders_files_view on public.vv_folders;
create policy vv_folders_files_view
on public.vv_folders
for select
to authenticated
using (
  public.vv_has_files_permission('vezvision.files.view')
  or exists (
    select 1
    from public.vv_file_permissions fp
    where fp.folder_id = vv_folders.id
      and fp.user_id = auth.uid()
      and fp.can_view = true
  )
);

drop policy if exists vv_folders_files_manage_all on public.vv_folders;
create policy vv_folders_files_manage_all
on public.vv_folders
for all
to authenticated
using (public.vv_has_files_permission('vezvision.files.manage'))
with check (public.vv_has_files_permission('vezvision.files.manage'));

drop policy if exists vv_files_files_view on public.vv_files;
create policy vv_files_files_view
on public.vv_files
for select
to authenticated
using (
  deleted_at is null
  and (
    public.vv_has_files_permission('vezvision.files.view')
    or owner_user_id = auth.uid()
    or exists (
      select 1
      from public.vv_file_permissions fp
      where fp.file_id = vv_files.id
        and fp.user_id = auth.uid()
        and fp.can_view = true
    )
    or exists (
      select 1
      from public.vv_file_permissions fp
      where fp.folder_id = vv_files.folder_id
        and fp.user_id = auth.uid()
        and fp.can_view = true
    )
  )
);

drop policy if exists vv_files_files_manage_all on public.vv_files;
create policy vv_files_files_manage_all
on public.vv_files
for all
to authenticated
using (public.vv_has_files_permission('vezvision.files.manage'))
with check (public.vv_has_files_permission('vezvision.files.manage'));

drop policy if exists vv_file_permissions_manage_all on public.vv_file_permissions;
create policy vv_file_permissions_manage_all
on public.vv_file_permissions
for all
to authenticated
using (public.vv_has_files_permission('vezvision.files.manage'))
with check (public.vv_has_files_permission('vezvision.files.manage'));

drop policy if exists vv_file_events_view on public.vv_file_events;
create policy vv_file_events_view
on public.vv_file_events
for select
to authenticated
using (public.vv_has_files_permission('vezvision.files.view'));

drop policy if exists vv_file_events_manage on public.vv_file_events;
create policy vv_file_events_manage
on public.vv_file_events
for all
to authenticated
using (public.vv_has_files_permission('vezvision.files.manage'))
with check (public.vv_has_files_permission('vezvision.files.manage'));

insert into public.vv_folders (id, parent_id, name, slug, full_path, owner_user_id, is_system)
select
  '00000000-0000-0000-0000-000000000001'::uuid,
  null,
  'Root',
  'root',
  '/root',
  null,
  true
where not exists (
  select 1 from public.vv_folders where id = '00000000-0000-0000-0000-000000000001'::uuid
);
