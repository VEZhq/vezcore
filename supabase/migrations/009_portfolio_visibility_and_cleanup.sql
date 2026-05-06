alter table public.vv_projects
  add column if not exists show_cover_image boolean not null default true,
  add column if not exists show_demo_url boolean not null default true,
  add column if not exists show_challenge boolean not null default true,
  add column if not exists show_result boolean not null default false;

alter table public.vv_projects
  drop column if exists result_pl,
  drop column if exists result_en;
