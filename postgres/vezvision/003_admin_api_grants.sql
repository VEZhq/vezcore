begin;

-- This role is used only by the private VEZcore PostgREST container on the
-- Coolify network. It is intentionally privileged across the VEZvision CMS
-- schema; the public website uses a separate, read-limited API role.
alter role vezvision_lab_api bypassrls;
grant usage on schema public to vezvision_lab_api;
grant select, insert, update, delete on all tables in schema public to vezvision_lab_api;
grant usage, select on all sequences in schema public to vezvision_lab_api;
grant execute on all functions in schema public to vezvision_lab_api;

alter default privileges in schema public
  grant select, insert, update, delete on tables to vezvision_lab_api;
alter default privileges in schema public
  grant usage, select on sequences to vezvision_lab_api;
alter default privileges in schema public
  grant execute on functions to vezvision_lab_api;

commit;
