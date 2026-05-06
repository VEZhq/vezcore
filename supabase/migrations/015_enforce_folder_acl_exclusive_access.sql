create or replace function public.vv_has_root_files_permission(required_key text)
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
  );
$$;

grant execute on function public.vv_has_root_files_permission(text) to authenticated;

drop policy if exists vv_file_permissions_manage_insert on public.vv_file_permissions;
drop policy if exists vv_file_permissions_manage_update on public.vv_file_permissions;
drop policy if exists vv_file_permissions_manage_delete on public.vv_file_permissions;
drop policy if exists vv_file_permissions_manage_select on public.vv_file_permissions;

create policy vv_file_permissions_manage_insert
on public.vv_file_permissions
for insert
to authenticated
with check (public.vv_has_root_files_permission('vezvision.files.permissions.manage'));

create policy vv_file_permissions_manage_update
on public.vv_file_permissions
for update
to authenticated
using (public.vv_has_root_files_permission('vezvision.files.permissions.manage'))
with check (public.vv_has_root_files_permission('vezvision.files.permissions.manage'));

create policy vv_file_permissions_manage_delete
on public.vv_file_permissions
for delete
to authenticated
using (public.vv_has_root_files_permission('vezvision.files.permissions.manage'));

create policy vv_file_permissions_manage_select
on public.vv_file_permissions
for select
to authenticated
using (
  public.vv_has_root_files_permission('vezvision.files.permissions.manage')
  or user_id = auth.uid()
);
