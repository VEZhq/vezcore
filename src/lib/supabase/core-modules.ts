import 'server-only'

import { getCoreModulesDatabaseClient } from '@/lib/database/postgrest'
import { getCoreStorage } from '@/lib/storage/s3'

export function getCoreModulesPrivilegedClient() {
  return Object.assign(getCoreModulesDatabaseClient(), {
    storage: getCoreStorage(),
  })
}
