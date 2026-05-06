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
  );
$$;

grant execute on function public.vv_has_files_permission(text) to authenticated;
