-- Harden RPC function grants: revoke EXECUTE from anon/public on sensitive functions
-- This reduces the attack surface for unauthenticated access

-- Main DB (vezcore)
revoke execute on function public.get_my_role() from anon;
revoke execute on function public.is_super_admin() from anon;
revoke execute on function public.is_super_admin() from public;
revoke execute on function public.consume_rate_limit() from anon;

-- VezVision DB
revoke execute on function public.vv_is_admin() from anon;
revoke execute on function public.vv_is_admin() from public;
revoke execute on function public.vv_has_files_permission(text) from anon;
revoke execute on function public.vv_has_files_permission(text) from public;
revoke execute on function public.vv_has_root_files_permission(text) from anon;
revoke execute on function public.vv_has_root_files_permission(text) from public;
revoke execute on function public.vv_has_folder_manage_access(uuid) from anon;
revoke execute on function public.vv_has_folder_manage_access(uuid) from public;
revoke execute on function public.vv_blog_set_published_at() from anon;
revoke execute on function public.vv_blog_set_published_at() from public;
revoke execute on function public.vv_set_updated_at() from anon;
revoke execute on function public.vv_set_updated_at() from public;
revoke execute on function public.vv_validate_folder_acl_write() from anon;
revoke execute on function public.vv_validate_folder_acl_write() from public;
