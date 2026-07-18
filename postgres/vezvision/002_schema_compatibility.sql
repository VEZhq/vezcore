begin;

alter table public.vv_blog_posts add column if not exists created_by uuid;
alter table public.vv_projects add column if not exists created_by uuid;
alter table public.vv_services add column if not exists created_by uuid;
alter table public.vv_newsletter_subscribers add column if not exists first_name text;
alter table public.vv_newsletter_subscribers add column if not exists last_name text;
alter table public.vv_newsletter_subscribers add column if not exists created_at timestamptz not null default now();
alter table public.vv_site_settings add column if not exists created_at timestamptz not null default now();

create index if not exists vv_blog_posts_created_by_idx on public.vv_blog_posts(created_by);
create index if not exists vv_projects_created_by_idx on public.vv_projects(created_by);
create index if not exists vv_services_created_by_idx on public.vv_services(created_by);

commit;
