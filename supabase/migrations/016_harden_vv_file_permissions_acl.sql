create or replace function public.vv_has_folder_manage_access(target_folder_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with recursive folder_chain as (
    select f.id, f.parent_id
    from public.vv_folders f
    where f.id = target_folder_id

    union all

    select parent.id, parent.parent_id
    from public.vv_folders parent
    inner join folder_chain child on child.parent_id = parent.id
  )
  select
    target_folder_id is not null
    and target_folder_id <> '00000000-0000-0000-0000-000000000001'::uuid
    and (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'super_admin')
      )
      or (
        public.vv_has_files_permission('vezvision.files.manage')
        and exists (
          select 1
          from public.vv_file_permissions fp
          where fp.user_id = auth.uid()
            and fp.folder_id in (select id from folder_chain)
            and fp.can_manage = true
        )
      )
    );
$$;

grant execute on function public.vv_has_folder_manage_access(uuid) to authenticated;

create or replace function public.vv_validate_folder_acl_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.folder_id is null then
    return new;
  end if;

  if new.folder_id = '00000000-0000-0000-0000-000000000001'::uuid then
    raise exception 'ACL for root folder is forbidden';
  end if;

  if not public.vv_has_root_files_permission('vezvision.files.permissions.manage') then
    raise exception 'Missing global files ACL permission';
  end if;

  if not public.vv_has_folder_manage_access(new.folder_id) then
    raise exception 'Missing folder manage access for ACL mutation';
  end if;

  return new;
end;
$$;

drop trigger if exists vv_validate_folder_acl_write on public.vv_file_permissions;
create trigger vv_validate_folder_acl_write
before insert or update on public.vv_file_permissions
for each row
when (new.folder_id is not null)
execute function public.vv_validate_folder_acl_write();

drop policy if exists vv_file_permissions_manage_insert on public.vv_file_permissions;
drop policy if exists vv_file_permissions_manage_update on public.vv_file_permissions;
drop policy if exists vv_file_permissions_manage_delete on public.vv_file_permissions;

create policy vv_file_permissions_manage_insert
on public.vv_file_permissions
for insert
to authenticated
with check (
  public.vv_has_root_files_permission('vezvision.files.permissions.manage')
  and public.vv_has_folder_manage_access(folder_id)
);

create policy vv_file_permissions_manage_update
on public.vv_file_permissions
for update
to authenticated
using (
  public.vv_has_root_files_permission('vezvision.files.permissions.manage')
  and public.vv_has_folder_manage_access(folder_id)
)
with check (
  public.vv_has_root_files_permission('vezvision.files.permissions.manage')
  and public.vv_has_folder_manage_access(folder_id)
);

create policy vv_file_permissions_manage_delete
on public.vv_file_permissions
for delete
to authenticated
using (
  public.vv_has_root_files_permission('vezvision.files.permissions.manage')
  and public.vv_has_folder_manage_access(folder_id)
);
