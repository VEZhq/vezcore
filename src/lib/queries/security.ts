import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { getIPLists, type IPEntry } from '@/lib/actions/ip-lists'

export interface SecurityStats {
  usersWith2FA: number
  totalUsers: number
  failedLogins24h: number
  blockedIPs: number
  recentAlerts: Array<{
    id: string
    type: string
    message: string
    timestamp: string
  }>
}

interface SecurityAlertRow {
  id: string
  action: string
  details: Record<string, unknown> | null
  created_at: string
}

export async function getSecurityPageData(): Promise<{
  stats: SecurityStats
  ipLists: { whitelist: IPEntry[]; blacklist: IPEntry[] }
}> {
  const supabase = await createClient()
  const adminClient = getAdminClient()

  const yesterdayDate = new Date()
  yesterdayDate.setHours(yesterdayDate.getHours() - 24)
  const yesterday = yesterdayDate.toISOString()

  const [
    { count: totalUsers },
    { count: usersWith2FA },
    { count: failedLogins24h },
    { data: recentAlerts },
    ipLists,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    adminClient
      .from('mfa_factors')
      .select('user_id', { count: 'exact', head: true })
      .eq('factor_type', 'totp')
      .eq('status', 'verified'),
    supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .in('action', ['failed_login', 'ip_blocked'])
      .gte('created_at', yesterday),
    supabase
      .from('audit_log')
      .select('id, action, details, created_at')
      .in('action', ['failed_login', 'ip_blocked', 'password_change'])
      .order('created_at', { ascending: false })
      .limit(10),
    getIPLists(),
  ])

  const alertRows = (recentAlerts ?? []) as SecurityAlertRow[]

  return {
    ipLists,
    stats: {
      usersWith2FA: usersWith2FA ?? 0,
      totalUsers: totalUsers ?? 0,
      failedLogins24h: failedLogins24h ?? 0,
      blockedIPs: ipLists.blacklist.length,
      recentAlerts: alertRows.map((alert) => ({
        id: alert.id,
        type: alert.action,
        message: getAlertMessage(alert.action, alert.details),
        timestamp: alert.created_at,
      })),
    },
  }
}

function getAlertMessage(action: string, details: Record<string, unknown> | null) {
  switch (action) {
    case 'failed_login':
      return `Nieudane logowanie z IP: ${typeof details?.ip === 'string' ? details.ip : 'unknown'}`
    case 'ip_blocked':
      return `IP zablokowane: ${typeof details?.ip === 'string' ? details.ip : 'unknown'}`
    case 'password_change':
      return 'Hasło zostało zmienione'
    default:
      return action
  }
}
