# Security rotation record

Historical local configuration contained credentials that must not be reused.
VEZcore no longer reads Supabase keys; its Lab runtime now uses PostgreSQL,
Better Auth and scoped MinIO accounts.

The historical `.env.local` has been replaced with an empty local template.

---

## Remaining operator actions

- Revoke the keys of decommissioned Supabase projects after confirming that no
  other application still depends on them.
- Rotate any Discord bot token that existed in the historical local file before
  enabling the integration again.
- Keep the current PostgreSQL, Better Auth and S3 credentials only in their
  server-side secret stores.

---

## Prevention

Add to `.gitignore`:
```gitignore
# Environment files
.env
.env.*
.env.local
.env.*.local
!.env.example
```

---

**Created:** 2025-03-26  
**Updated:** 2026-07-15  
**Status:** VEZcore migration completed; legacy-provider revocation remains an
operator task.
