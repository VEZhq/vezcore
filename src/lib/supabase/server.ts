import 'server-only'

import { getCoreDatabaseClient } from '@/lib/database/postgrest'
import { createAuthFacade } from '@/lib/auth/compat'
import { getCoreStorage } from '@/lib/storage/s3'

export async function createClient() {
  return Object.assign(getCoreDatabaseClient(), {
    auth: createAuthFacade(),
    storage: getCoreStorage(),
  })
}

export async function createActionClient() {
  return createClient()
}
