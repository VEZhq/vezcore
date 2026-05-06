import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/vezvision-db'

type VezVisionClient = ReturnType<typeof createSupabaseClient<Database>>

let _client: VezVisionClient | null = null

export function getVezVisionPrivilegedClient(): VezVisionClient {
  if (_client) return _client

  const url = process.env.VEZVISION_SUPABASE_URL
  const key = process.env.VEZVISION_SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing VEZVISION_SUPABASE_URL or VEZVISION_SUPABASE_SERVICE_ROLE_KEY')
  }

  _client = createSupabaseClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return _client
}
