# Secrets management

VEZcore reads runtime secrets from Coolify. Local development uses an ignored
`.env.local`; only empty variable names and safe defaults belong in
`.env.example`.

Required secret groups:

- `DATABASE_URL` - least-privileged VEZcore role on the primary PostgreSQL.
- `DATABASE_SSL_CA_BASE64` - public CA certificate used to verify the private
  PostgreSQL server when `DATABASE_SSL=require`.
- `DATABASE_SSL_SERVERNAME` - a DNS name or IP address from the PostgreSQL
  certificate SAN, used even when `DATABASE_URL` connects through a different
  private address.
- `BETTER_AUTH_SECRET` and `HEALTH_CHECK_TOKEN` — independent random values.
- `S3_ACCESS_KEY` and `S3_SECRET_KEY` — scoped to the selected VEZcore bucket.
- `VEZVISION_S3_ACCESS_KEY` and `VEZVISION_S3_SECRET_KEY` — scoped to the
  VEZvision develop bucket.
- Discord and Resend tokens only when their integrations are enabled.

The VEZcore PostgREST endpoint stays on the private lab network. The VEZvision
administration gateway is public only because VEZcore production calls it in
one direction from the lab; it must use HTTPS and a separate internal API key.

Do not put secrets in Dockerfiles, build arguments, GitHub Actions variables,
logs or repository files. Rotate a credential immediately after accidental
disclosure and redeploy the affected service.
