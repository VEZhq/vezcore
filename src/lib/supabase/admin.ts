import 'server-only'

import { getCoreDatabaseClient } from '@/lib/database/postgrest'
import { createAdminAuthFacade } from '@/lib/auth/compat'
import { getCoreStorage } from '@/lib/storage/s3'

export function getAdminClient() {
  return Object.assign(getCoreDatabaseClient(), {
    auth: { admin: createAdminAuthFacade() },
    storage: getCoreStorage(),
  })
}
