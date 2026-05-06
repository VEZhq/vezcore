import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

type CheckStatus = 'pass' | 'fail'

export interface HealthRouteStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks?: {
    database: { status: CheckStatus; responseTime: number }
    auth: { status: CheckStatus; responseTime: number }
  }
}

export async function getHealthRouteStatus(): Promise<HealthRouteStatus> {
  const checks = {
    database: { status: 'fail' as CheckStatus, responseTime: 0 },
    auth: { status: 'fail' as CheckStatus, responseTime: 0 },
  }

  try {
    const supabase = await createClient()
    const dbStart = Date.now()
    const { error: dbError } = await supabase.from('profiles').select('count').limit(1)
    checks.database.responseTime = Date.now() - dbStart
    checks.database.status = dbError ? 'fail' : 'pass'
  } catch (error) {
    logError('health.getHealthRouteStatus.database', error)
  }

  try {
    const supabase = await createClient()
    const authStart = Date.now()
    await supabase.auth.getSession()
    checks.auth.responseTime = Date.now() - authStart
    checks.auth.status = 'pass'
  } catch (error) {
    logError('health.getHealthRouteStatus.auth', error)
  }

  const status: HealthRouteStatus['status'] =
    checks.database.status === 'pass' && checks.auth.status === 'pass'
      ? 'healthy'
      : checks.database.status === 'fail' && checks.auth.status === 'fail'
        ? 'unhealthy'
        : 'degraded'

  return {
    status,
    timestamp: new Date().toISOString(),
  }
}

export async function isApiRequestAuthenticated(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return Boolean(user)
}

export async function isDevelopmentDiscordTester(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' || profile?.role === 'super_admin'
}
