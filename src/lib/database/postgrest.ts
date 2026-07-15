import 'server-only'

import { PostgrestClient } from '@supabase/postgrest-js'
import type { Database as CoreDatabase } from '@/types/database.types'
import type { Database as VezVisionDatabase } from '@/types/vezvision-db'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not configured`)
  return value.replace(/\/$/, '')
}

let coreClient: PostgrestClient<CoreDatabase> | null = null
let vezVisionClient: PostgrestClient<VezVisionDatabase> | null = null

export function getCoreDatabaseClient(): PostgrestClient<CoreDatabase> {
  if (!coreClient) {
    coreClient = new PostgrestClient<CoreDatabase>(required('VEZCORE_DATABASE_API_URL'), {
      schema: 'public',
      headers: { 'X-Client-Info': 'vezcore/1.0' },
    })
  }
  return coreClient
}

export function getVezVisionDatabaseClient(): PostgrestClient<VezVisionDatabase> {
  if (!vezVisionClient) {
    vezVisionClient = new PostgrestClient<VezVisionDatabase>(required('VEZVISION_DATABASE_API_URL'), {
      schema: 'public',
      headers: { 'X-Client-Info': 'vezcore-vezvision/1.0' },
    })
  }
  return vezVisionClient
}
