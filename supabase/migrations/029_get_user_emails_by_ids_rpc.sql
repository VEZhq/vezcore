create or replace function public.get_user_emails_by_ids(user_ids uuid[])
returns table (
  id uuid,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select id, email from auth.users where id = any(user_ids);
$$;

revoke all on function public.get_user_emails_by_ids(uuid[]) from public;
revoke all on function public.get_user_emails_by_ids(uuid[]) from anon;
revoke all on function public.get_user_emails_by_ids(uuid[]) from authenticated;
grant execute on function public.get_user_emails_by_ids(uuid[]) to service_role;
