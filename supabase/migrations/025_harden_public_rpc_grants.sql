-- Close direct REST execution for helper RPCs that are only used by triggers or service-role server code.

revoke execute on function public.cleanup_rate_limits() from anon, authenticated, public;
revoke execute on function public.consume_rate_limit(text, integer, integer) from anon, authenticated, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

grant execute on function public.cleanup_rate_limits() to service_role;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.handle_new_user() to service_role;

revoke execute on function public.update_avatar_url(text) from anon, authenticated, public;
grant execute on function public.update_avatar_url(text) to service_role;
