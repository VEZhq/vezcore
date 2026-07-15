import 'server-only'

import { getVezVisionDatabaseClient } from '@/lib/database/postgrest'
import { getVezVisionStorage } from '@/lib/storage/s3'

export function getVezVisionPrivilegedClient() {
  return Object.assign(getVezVisionDatabaseClient(), {
    storage: getVezVisionStorage(),
  })
}
