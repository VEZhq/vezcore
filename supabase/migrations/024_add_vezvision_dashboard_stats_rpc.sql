create or replace function public.vv_dashboard_stats()
returns table (
  blog_total bigint,
  blog_published bigint,
  portfolio_total bigint,
  portfolio_published bigint,
  services_total bigint,
  services_active bigint,
  faq_total bigint,
  faq_active bigint,
  newsletter_total bigint,
  newsletter_active bigint,
  files_total bigint,
  files_public bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(*) from public.vv_blog_posts) as blog_total,
    (select count(*) from public.vv_blog_posts where status = 'published') as blog_published,
    (select count(*) from public.vv_projects) as portfolio_total,
    (select count(*) from public.vv_projects where status = 'published') as portfolio_published,
    (select count(*) from public.vv_services) as services_total,
    (select count(*) from public.vv_services where status = 'active') as services_active,
    (select count(*) from public.vv_faq_items) as faq_total,
    (select count(*) from public.vv_faq_items where is_active = true) as faq_active,
    (select count(*) from public.vv_newsletter_subscribers) as newsletter_total,
    (select count(*) from public.vv_newsletter_subscribers where is_active = true) as newsletter_active,
    (select count(*) from public.vv_files) as files_total,
    (select count(*) from public.vv_files where is_public = true) as files_public;
$$;

revoke all on function public.vv_dashboard_stats() from public;
revoke all on function public.vv_dashboard_stats() from anon;
revoke all on function public.vv_dashboard_stats() from authenticated;
grant execute on function public.vv_dashboard_stats() to service_role;
