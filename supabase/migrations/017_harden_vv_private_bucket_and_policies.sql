insert into storage.buckets (id, name, public, file_size_limit)
values ('vv-files-private', 'vv-files-private', false, 26214400)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists vv_files_private_manage_insert on storage.objects;
create policy vv_files_private_manage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vv-files-private'
  and public.vv_has_files_permission('vezvision.files.manage')
);

drop policy if exists vv_files_private_manage_update on storage.objects;
create policy vv_files_private_manage_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'vv-files-private'
  and public.vv_has_files_permission('vezvision.files.manage')
)
with check (
  bucket_id = 'vv-files-private'
  and public.vv_has_files_permission('vezvision.files.manage')
);

drop policy if exists vv_files_private_manage_delete on storage.objects;
create policy vv_files_private_manage_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vv-files-private'
  and public.vv_has_files_permission('vezvision.files.manage')
);

drop policy if exists vv_files_private_view_select on storage.objects;
create policy vv_files_private_view_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'vv-files-private'
  and public.vv_has_files_permission('vezvision.files.view')
);

drop policy if exists vv_file_permissions_manage_select on public.vv_file_permissions;
create policy vv_file_permissions_manage_select
on public.vv_file_permissions
for select
to authenticated
using (
  public.vv_has_root_files_permission('vezvision.files.permissions.manage')
  or user_id = (select auth.uid())
);
