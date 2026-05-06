alter table if exists public.rate_limits
  add column if not exists updated_at timestamptz not null default now();

create index if not exists rate_limits_updated_at_idx on public.rate_limits(updated_at);
