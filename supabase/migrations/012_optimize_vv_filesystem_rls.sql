create index if not exists vv_file_permissions_user_idx on public.vv_file_permissions(user_id);

drop policy if exists user_permissions_admin_insert on public.user_permissions;
create policy user_permissions_admin_insert
on public.user_permissions
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('admin', 'super_admin')
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
    where p.id = (select auth.uid()) and p.role in ('admin', 'super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('admin', 'super_admin')
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
    where p.id = (select auth.uid()) and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists user_permissions_self_view on public.user_permissions;
create policy user_permissions_self_view
on public.user_permissions
for select
to authenticated
using (user_id = (select auth.uid()));

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
      and fp.user_id = (select auth.uid())
      and fp.can_view = true
  )
);

drop policy if exists vv_folders_files_manage_all on public.vv_folders;
drop policy if exists vv_folders_files_manage_insert on public.vv_folders;
drop policy if exists vv_folders_files_manage_update on public.vv_folders;
drop policy if exists vv_folders_files_manage_delete on public.vv_folders;

create policy vv_folders_files_manage_insert
on public.vv_folders
for insert
to authenticated
with check (public.vv_has_files_permission('vezvision.files.manage'));

create policy vv_folders_files_manage_update
on public.vv_folders
for update
to authenticated
using (public.vv_has_files_permission('vezvision.files.manage'))
with check (public.vv_has_files_permission('vezvision.files.manage'));

create policy vv_folders_files_manage_delete
on public.vv_folders
for delete
to authenticated
using (public.vv_has_files_permission('vezvision.files.manage'));

drop policy if exists vv_files_files_view on public.vv_files;
create policy vv_files_files_view
on public.vv_files
for select
to authenticated
using (
  deleted_at is null
  and (
    public.vv_has_files_permission('vezvision.files.view')
    or owner_user_id = (select auth.uid())
    or exists (
      select 1
      from public.vv_file_permissions fp
      where fp.file_id = vv_files.id
        and fp.user_id = (select auth.uid())
        and fp.can_view = true
    )
    or exists (
      select 1
      from public.vv_file_permissions fp
      where fp.folder_id = vv_files.folder_id
        and fp.user_id = (select auth.uid())
        and fp.can_view = true
    )
  )
);

drop policy if exists vv_files_files_manage_all on public.vv_files;
drop policy if exists vv_files_files_manage_insert on public.vv_files;
drop policy if exists vv_files_files_manage_update on public.vv_files;
drop policy if exists vv_files_files_manage_delete on public.vv_files;

create policy vv_files_files_manage_insert
on public.vv_files
for insert
to authenticated
with check (public.vv_has_files_permission('vezvision.files.manage'));

create policy vv_files_files_manage_update
on public.vv_files
for update
to authenticated
using (public.vv_has_files_permission('vezvision.files.manage'))
with check (public.vv_has_files_permission('vezvision.files.manage'));

create policy vv_files_files_manage_delete
on public.vv_files
for delete
to authenticated
using (public.vv_has_files_permission('vezvision.files.manage'));

drop policy if exists vv_file_events_view on public.vv_file_events;
create policy vv_file_events_view
on public.vv_file_events
for select
to authenticated
using (public.vv_has_files_permission('vezvision.files.view'));

drop policy if exists vv_file_events_manage on public.vv_file_events;
drop policy if exists vv_file_events_manage_insert on public.vv_file_events;
drop policy if exists vv_file_events_manage_update on public.vv_file_events;
drop policy if exists vv_file_events_manage_delete on public.vv_file_events;

create policy vv_file_events_manage_insert
on public.vv_file_events
for insert
to authenticated
with check (public.vv_has_files_permission('vezvision.files.manage'));

create policy vv_file_events_manage_update
on public.vv_file_events
for update
to authenticated
using (public.vv_has_files_permission('vezvision.files.manage'))
with check (public.vv_has_files_permission('vezvision.files.manage'));

create policy vv_file_events_manage_delete
on public.vv_file_events
for delete
to authenticated
using (public.vv_has_files_permission('vezvision.files.manage'));
