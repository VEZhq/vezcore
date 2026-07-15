# Secrets management

VEZcore reads runtime secrets from Coolify. Local development uses an ignored
`.env.local`; only empty variable names and safe defaults belong in
`.env.example`.

Required secret groups:

- `DATABASE_URL` — least-privileged VEZcore role on the primary PostgreSQL.
- `BETTER_AUTH_SECRET` and `HEALTH_CHECK_TOKEN` — independent random values.
- `S3_ACCESS_KEY` and `S3_SECRET_KEY` — scoped to the selected VEZcore bucket.
- `VEZVISION_S3_ACCESS_KEY` and `VEZVISION_S3_SECRET_KEY` — scoped to the
  VEZvision develop bucket.
- Discord and Resend tokens only when their integrations are enabled.

The PostgREST endpoints are private Coolify-network aliases. They do not use
public API keys and must not be published through Traefik.

Do not put secrets in Dockerfiles, build arguments, GitHub Actions variables,
logs or repository files. Rotate a credential immediately after accidental
disclosure and redeploy the affected service.
