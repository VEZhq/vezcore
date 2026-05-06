-- Keep RLS helper behavior, but remove SECURITY DEFINER functions from the exposed public API surface.

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated, service_role;

create or replace function app_private.get_my_role()
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function app_private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $$
  select exists(
    select 1
    from public.profiles
    where id = (select auth.uid()) and role = 'super_admin'
  );
$$;

create or replace function app_private.can_access_managed_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    auth.uid() is not null
    and target_user_id is not null
    and (
      auth.uid() = target_user_id
      or exists (
        select 1
        from public.profiles caller
        join public.profiles target on target.id = target_user_id
        where caller.id = auth.uid()
          and caller.role in ('admin', 'super_admin')
          and (
            caller.role = 'super_admin'
            or caller.tenant_id is null
            or caller.tenant_id = target.tenant_id
          )
      )
    );
$$;

grant execute on function app_private.get_my_role() to authenticated, service_role;
grant execute on function app_private.is_super_admin() to authenticated, service_role;
grant execute on function app_private.can_access_managed_user(uuid) to authenticated, service_role;

create or replace function public.get_my_role()
returns text
language sql
stable
security invoker
set search_path to 'public', 'app_private'
as $$
  select app_private.get_my_role();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security invoker
set search_path to 'public', 'app_private', 'pg_catalog'
as $$
  select app_private.is_super_admin();
$$;

create or replace function public.can_access_managed_user(target_user_id uuid)
returns boolean
language sql
stable
security invoker
set search_path to 'public', 'app_private'
as $$
  select app_private.can_access_managed_user(target_user_id);
$$;

grant execute on function public.get_my_role() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.can_access_managed_user(uuid) to authenticated;
