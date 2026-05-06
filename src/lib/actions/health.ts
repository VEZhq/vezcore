'use server'

import { createActionClient } from '@/lib/supabase/server'
import { isAdminRole } from '@/lib/roles'
import { ONE_DAY } from '@/lib/constants/time'

export interface SystemHealthData {
  database: {
    status: 'healthy' | 'degraded' | 'down'
    latency: number
  }
  users: {
    total: number
    active_24h: number
  }
  errors: {
    total_24h: number
    recent: Array<{ action: string; created_at: string }>
  }
  uptime: {
    status: 'operational' | 'degraded' | 'outage'
  }
}

export async function getSystemHealth(): Promise<SystemHealthData | { error: string }> {
  const supabase = await createActionClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nie jesteś zalogowany' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isAdminRole(profile?.role)) return { error: 'Brak uprawnień' }

  const start = Date.now()
  await supabase.from('profiles').select('id', { count: 'exact', head: true })
  const latency = Date.now() - start

  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)

  const yesterday = new Date(Date.now() - ONE_DAY).toISOString()
  const { count: activeUsers } = await supabase
    .from('audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('action', 'login')
    .gte('created_at', yesterday)

  const { count: errorCount } = await supabase
    .from('audit_log')
    .select('*', { count: 'exact', head: true })
    .in('action', ['failed_login', 'ip_blocked'])
    .gte('created_at', yesterday)

  return {
    database: {
      status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'down',
      latency,
    },
    users: {
      total: totalUsers || 0,
      active_24h: activeUsers || 0,
    },
    errors: {
      total_24h: errorCount || 0,
      recent: [],
    },
    uptime: {
      status: 'operational',
    },
  }
}
