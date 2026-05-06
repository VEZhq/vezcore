import { createClient } from '@/lib/supabase/server'

export interface DashboardStats {
  total_users: number
  recent_logins: number
  active_sessions: number
  errors_24h: number
}

export interface DashboardActivityEntry {
  id: string
  action: string
  details: Record<string, unknown> | null
  created_at: string
}

interface DashboardStatsRpcResult {
  total_users: number
  recent_logins: number
  active_sessions: number
  errors_24h: number
}

interface ActiveSessionLoginRow {
  user_id: string | null
}

export async function getDashboardStats(since: string): Promise<DashboardStats> {
  const supabase = await createClient()

  const { data: stats } = await supabase
    .rpc('get_dashboard_stats', { p_since: since })
    .single()

  if (stats) return stats as DashboardStatsRpcResult

  const [
    { count: totalUsers },
    { count: recentLogins },
    { data: activeSessionsData },
    { count: errors24h },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'login')
      .gte('created_at', since),
    supabase
      .from('audit_log')
      .select('user_id')
      .eq('action', 'login')
      .gte('created_at', since)
      .not('user_id', 'is', null),
    supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .in('action', ['failed_login', 'ip_blocked', '2fa_failed'])
      .gte('created_at', since),
  ])

  const activeSessionRows = (activeSessionsData ?? []) as ActiveSessionLoginRow[]

  return {
    total_users: totalUsers || 0,
    recent_logins: recentLogins || 0,
    active_sessions: new Set(activeSessionRows.map((row) => row.user_id).filter(Boolean)).size,
    errors_24h: errors24h || 0,
  }
}

export async function getRecentDashboardActivity(canAccessAudit: boolean): Promise<DashboardActivityEntry[] | null> {
  if (!canAccessAudit) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('audit_log')
    .select('id, action, details, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return (data ?? []) as DashboardActivityEntry[]
}
