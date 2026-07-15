begin;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tenants_set_updated_at on public.tenants;
create trigger tenants_set_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

alter table public.ip_lists drop constraint if exists ip_lists_type_check;
alter table public.ip_lists add constraint ip_lists_type_check check (type in ('whitelist', 'blacklist'));

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_tenant_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete set null;
  end if;
end;
$$;

grant select, insert, update, delete on public.tenants to vezcore_runtime;

commit;
