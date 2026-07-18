import 'server-only'

import { PostgrestClient } from '@supabase/postgrest-js'
import type { Database as CoreDatabase } from '@/types/database.types'
import type { Database as VezVisionDatabase } from '@/types/vezvision-db'

function required(name: string, buildFallback: string): string {
  const value = process.env[name]
  const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build'
    || process.env.npm_lifecycle_event === 'build'
  if (!value && isProductionBuild) return buildFallback
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

let coreClient: PostgrestClient<CoreDatabase> | null = null
let coreModulesClient: PostgrestClient<VezVisionDatabase> | null = null
let vezVisionClient: PostgrestClient<VezVisionDatabase> | null = null

export function getCoreDatabaseClient(): PostgrestClient<CoreDatabase> {
  if (!coreClient) {
    coreClient = new PostgrestClient<CoreDatabase>(required('VEZCORE_DATABASE_API_URL', 'http://127.0.0.1:3001').replace(/\/$/, ''), {
      schema: 'public',
      headers: {
        'X-Client-Info': 'vezcore/1.0',
        'X-Internal-API-Key': required('VEZCORE_DATABASE_API_KEY', 'build-placeholder'),
      },
    })
  }
  return coreClient
}

/**
 * Internal VEZcore modules historically use the `vv_*` table names and their
 * generated row types. They now live in the VEZcore database; this dedicated
 * client prevents them from ever being routed to VEZvision production.
 */
export function getCoreModulesDatabaseClient(): PostgrestClient<VezVisionDatabase> {
  if (!coreModulesClient) {
    coreModulesClient = new PostgrestClient<VezVisionDatabase>(required('VEZCORE_DATABASE_API_URL', 'http://127.0.0.1:3001').replace(/\/$/, ''), {
      schema: 'public',
      headers: {
        'X-Client-Info': 'vezcore-modules/1.0',
        'X-Internal-API-Key': required('VEZCORE_DATABASE_API_KEY', 'build-placeholder'),
      },
    })
  }
  return coreModulesClient
}

export function getVezVisionDatabaseClient(): PostgrestClient<VezVisionDatabase> {
  if (!vezVisionClient) {
    vezVisionClient = new PostgrestClient<VezVisionDatabase>(required('VEZVISION_DATABASE_API_URL', 'http://127.0.0.1:3001').replace(/\/$/, ''), {
      schema: 'public',
      headers: {
        'X-Client-Info': 'vezcore-vezvision/1.0',
        'X-Internal-API-Key': required('VEZVISION_DATABASE_API_KEY', 'build-placeholder'),
      },
    })
  }
  return vezVisionClient
}
