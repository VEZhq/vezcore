create extension if not exists pgcrypto;

create table if not exists public.vv_faq_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_pl text not null,
  name_en text,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vv_faq_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.vv_faq_categories(id) on delete set null,
  question_pl text not null,
  question_en text,
  answer_pl text not null,
  answer_en text,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vv_faq_items_category_id_idx on public.vv_faq_items(category_id);
create index if not exists vv_faq_items_active_order_idx on public.vv_faq_items(is_active, order_index);

create table if not exists public.vv_newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text,
  last_name text,
  source text not null default 'newsletter',
  tags text[] not null default '{}',
  token text not null default encode(gen_random_bytes(24), 'hex'),
  is_active boolean not null default true,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vv_newsletter_subscribers_source_check check (
    source in ('manual', 'newsletter', 'client', 'lead', 'candidate')
  )
);

create index if not exists vv_newsletter_subscribers_active_idx on public.vv_newsletter_subscribers(is_active, subscribed_at desc);

create table if not exists public.vv_newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  content_html text not null,
  status text not null default 'draft',
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vv_newsletter_campaigns_status_check check (
    status in ('draft', 'scheduled', 'sent')
  )
);

create index if not exists vv_newsletter_campaigns_status_idx on public.vv_newsletter_campaigns(status, created_at desc);

create or replace function public.vv_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists vv_faq_items_set_updated_at on public.vv_faq_items;
create trigger vv_faq_items_set_updated_at
before update on public.vv_faq_items
for each row
execute function public.vv_set_updated_at();

drop trigger if exists vv_newsletter_subscribers_set_updated_at on public.vv_newsletter_subscribers;
create trigger vv_newsletter_subscribers_set_updated_at
before update on public.vv_newsletter_subscribers
for each row
execute function public.vv_set_updated_at();

drop trigger if exists vv_newsletter_campaigns_set_updated_at on public.vv_newsletter_campaigns;
create trigger vv_newsletter_campaigns_set_updated_at
before update on public.vv_newsletter_campaigns
for each row
execute function public.vv_set_updated_at();

alter table public.vv_faq_categories enable row level security;
alter table public.vv_faq_items enable row level security;
alter table public.vv_newsletter_subscribers enable row level security;
alter table public.vv_newsletter_campaigns enable row level security;

drop policy if exists vv_faq_categories_public_select on public.vv_faq_categories;
create policy vv_faq_categories_public_select
on public.vv_faq_categories
for select
to anon, authenticated
using (is_active = true);

drop policy if exists vv_faq_categories_admin_all on public.vv_faq_categories;
create policy vv_faq_categories_admin_all
on public.vv_faq_categories
for all
to authenticated
using ((select public.vv_is_admin()))
with check ((select public.vv_is_admin()));

drop policy if exists vv_faq_items_public_select on public.vv_faq_items;
create policy vv_faq_items_public_select
on public.vv_faq_items
for select
to anon, authenticated
using (is_active = true);

drop policy if exists vv_faq_items_admin_all on public.vv_faq_items;
create policy vv_faq_items_admin_all
on public.vv_faq_items
for all
to authenticated
using ((select public.vv_is_admin()))
with check ((select public.vv_is_admin()));

drop policy if exists vv_newsletter_subscribers_admin_all on public.vv_newsletter_subscribers;
create policy vv_newsletter_subscribers_admin_all
on public.vv_newsletter_subscribers
for all
to authenticated
using ((select public.vv_is_admin()))
with check ((select public.vv_is_admin()));

drop policy if exists vv_newsletter_campaigns_admin_all on public.vv_newsletter_campaigns;
create policy vv_newsletter_campaigns_admin_all
on public.vv_newsletter_campaigns
for all
to authenticated
using ((select public.vv_is_admin()))
with check ((select public.vv_is_admin()));
