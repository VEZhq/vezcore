alter table public.vv_projects
  add column if not exists show_solution boolean not null default true;
