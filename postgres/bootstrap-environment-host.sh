#!/bin/sh
set -eu

environment=${1:?environment is required}
database_name=${2:?database name is required}
runtime_role=${3:?runtime role is required}
authenticator_role=${4:?authenticator role is required}
app_role=${5:?app role is required}

case "$environment:$database_name:$runtime_role:$authenticator_role:$app_role" in
  *[!a-zA-Z0-9_:]*) echo "Invalid identifier" >&2; exit 2 ;;
esac

secret_prefix="/root/.codex-vezcore-${environment}"
umask 077
for suffix in app-password auth-password api-key; do
  file="${secret_prefix}-${suffix}"
  if [ ! -s "$file" ]; then
    openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 48 > "$file"
  fi
done

app_password=$(cat "${secret_prefix}-app-password")
authenticator_password=$(cat "${secret_prefix}-auth-password")

role_exists() {
  runuser -u postgres -- psql -Atqc "select 1 from pg_roles where rolname='$1'" | grep -q '^1$'
}

if ! role_exists "$runtime_role"; then
  runuser -u postgres -- createuser --no-login --no-inherit "$runtime_role"
fi
if ! role_exists "$authenticator_role"; then
  runuser -u postgres -- createuser --login --no-inherit "$authenticator_role"
fi
if ! role_exists "$app_role"; then
  runuser -u postgres -- createuser --login --no-inherit "$app_role"
fi

runuser -u postgres -- psql -q -v ON_ERROR_STOP=1 -d postgres <<SQL
alter role $authenticator_role password '$authenticator_password';
alter role $app_role password '$app_password';
SQL

if ! runuser -u postgres -- psql -Atqc "select 1 from pg_database where datname='$database_name'" | grep -q '^1$'; then
  runuser -u postgres -- createdb "$database_name"
fi
