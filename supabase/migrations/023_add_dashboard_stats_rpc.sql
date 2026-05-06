create or replace function public.get_dashboard_stats(p_since timestamptz)
returns table (
  total_users bigint,
  recent_logins bigint,
  active_sessions bigint,
  errors_24h bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with visible_profiles as (
    select id
    from public.profiles
  ),
  recent_login_users as (
    select distinct user_id
    from public.audit_log
    where action = 'login'
      and created_at >= p_since
      and user_id is not null
  )
  select
    (select count(*) from visible_profiles) as total_users,
    (select count(*) from public.audit_log where action = 'login' and created_at >= p_since) as recent_logins,
    (select count(*) from recent_login_users) as active_sessions,
    (
      select count(*)
      from public.audit_log
      where action in ('failed_login', 'ip_blocked', '2fa_failed')
        and created_at >= p_since
    ) as errors_24h;
$$;

revoke all on function public.get_dashboard_stats(timestamptz) from public;
revoke all on function public.get_dashboard_stats(timestamptz) from anon;
grant execute on function public.get_dashboard_stats(timestamptz) to authenticated;
