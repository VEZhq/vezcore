-- Require a server-side shared secret before PostgREST executes VEZcore queries.
-- Configure the environment-specific SHA-256 digest separately with:
-- ALTER DATABASE vezcore SET app.vezcore_api_key_sha256 = '<sha256>';

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.check_vezcore_internal_api_key()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  request_headers jsonb;
  provided_key text;
  expected_digest text;
BEGIN
  request_headers := COALESCE(current_setting('request.headers', true), '{}')::jsonb;
  provided_key := request_headers ->> 'x-internal-api-key';
  expected_digest := current_setting('app.vezcore_api_key_sha256', true);

  IF provided_key IS NULL
     OR expected_digest IS NULL
     OR encode(public.digest(provided_key, 'sha256'), 'hex') <> expected_digest THEN
    RAISE insufficient_privilege USING MESSAGE = 'Unauthorized';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_vezcore_internal_api_key() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_vezcore_internal_api_key() TO vezcore_runtime;
