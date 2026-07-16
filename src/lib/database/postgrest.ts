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
