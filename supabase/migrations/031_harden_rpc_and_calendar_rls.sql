do $$
begin
  if to_regprocedure('public.get_active_storage_used_bytes()') is not null then
    revoke execute on function public.get_active_storage_used_bytes() from anon, authenticated, public;
    grant execute on function public.get_active_storage_used_bytes() to service_role;
  end if;

  if to_regprocedure('public.get_folder_chain(uuid)') is not null then
    revoke execute on function public.get_folder_chain(uuid) from anon, authenticated, public;
    grant execute on function public.get_folder_chain(uuid) to service_role;
  end if;

  if to_regprocedure('public.vv_set_updated_at()') is not null then
    revoke execute on function public.vv_set_updated_at() from anon, authenticated, public;
  end if;
end $$;

drop policy if exists "Users can manage own calendar events" on public.vv_calendar_events;
drop policy if exists "Users can view own calendar events" on public.vv_calendar_events;
drop policy if exists vv_calendar_events_select_authenticated on public.vv_calendar_events;
drop policy if exists vv_calendar_events_insert_manage on public.vv_calendar_events;
drop policy if exists vv_calendar_events_update_manage on public.vv_calendar_events;
drop policy if exists vv_calendar_events_delete_manage on public.vv_calendar_events;

create policy vv_calendar_events_select_own
on public.vv_calendar_events
for select
to authenticated
using (created_by = (select auth.uid()) and deleted_at is null);

create policy vv_calendar_events_insert_own
on public.vv_calendar_events
for insert
to authenticated
with check (created_by = (select auth.uid()));

create policy vv_calendar_events_update_own
on public.vv_calendar_events
for update
to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

create policy vv_calendar_events_delete_own
on public.vv_calendar_events
for delete
to authenticated
using (created_by = (select auth.uid()));
