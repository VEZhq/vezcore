create or replace function public.vv_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.vv_set_updated_at() from anon, authenticated, public;
