\set ON_ERROR_STOP on

-- Required psql variables:
-- database_name, runtime_role, authenticator_role, authenticator_password,
-- app_role, app_password, api_key_sha256

select format('create role %I nologin noinherit', :'runtime_role')
where not exists (select 1 from pg_roles where rolname = :'runtime_role')
\gexec

select format('create role %I login noinherit password %L', :'authenticator_role', :'authenticator_password')
where not exists (select 1 from pg_roles where rolname = :'authenticator_role')
\gexec
select format('alter role %I password %L', :'authenticator_role', :'authenticator_password')
\gexec

select format('create role %I login noinherit password %L', :'app_role', :'app_password')
where not exists (select 1 from pg_roles where rolname = :'app_role')
\gexec
select format('alter role %I password %L', :'app_role', :'app_password')
\gexec

select format('grant %I to %I', :'runtime_role', :'authenticator_role')
\gexec

select format('create database %I', :'database_name')
where not exists (select 1 from pg_database where datname = :'database_name')
\gexec

select format('revoke connect on database %I from public', :'database_name')
\gexec
select format('grant connect on database %I to %I', :'database_name', :'authenticator_role')
\gexec
select format('grant connect on database %I to %I', :'database_name', :'app_role')
\gexec

\connect :database_name

grant usage on schema public to :runtime_role, :app_role;
grant select, insert, update, delete on all tables in schema public to :runtime_role, :app_role;
grant usage, select on all sequences in schema public to :runtime_role, :app_role;
grant execute on all functions in schema public to :runtime_role, :app_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to :runtime_role, :app_role;
alter default privileges in schema public
  grant usage, select on sequences to :runtime_role, :app_role;
alter default privileges in schema public
  grant execute on functions to :runtime_role, :app_role;

select format('alter database %I set app.vezcore_api_key_sha256 = %L', :'database_name', :'api_key_sha256')
\gexec

grant execute on function public.check_vezcore_internal_api_key() to :runtime_role;
