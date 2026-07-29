import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'
import { createActionClient } from '@/lib/supabase/server'
import type { OperationsOverview } from './types'

export async function getOperationsOverview(
  userId: string,
  canRevealShortcuts: boolean
): Promise<OperationsOverview> {
  const admin = getAdminClient()
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const [
    { data: uptimeRows },
    { data: incidents },
    { data: deployments },
    { data: notifications },
    { data: reads },
    { data: maintenance },
    { data: snapshots },
    { data: dependencies },
    shortcutResult,
  ] = await Promise.all([
    admin.rpc('get_operations_uptime', { p_since: since.toISOString() }),
    admin
      .from('operations_incidents')
      .select('id, service_key, module_key, severity, status, title, detail, started_at, last_seen_at, resolved_at')
      .order('started_at', { ascending: false })
      .limit(100),
    admin
      .from('operations_deployments')
      .select('id, module_key, sha, short_sha, status, message, url, deployed_at, recorded_at')
      .order('recorded_at', { ascending: false })
      .limit(50),
    admin
      .from('operations_notifications')
      .select('id, kind, severity, title, body, module_key, href, created_at')
      .order('created_at', { ascending: false })
      .limit(75),
    admin
      .from('operations_notification_reads')
      .select('notification_id')
      .eq('user_id', userId),
    admin
      .from('operations_maintenance_windows')
      .select('id, module_key, title, reason, status, scheduled_start, scheduled_end, started_at, ended_at')
      .order('scheduled_start', { ascending: false })
      .limit(50),
    admin
      .from('operations_snapshots')
      .select('id, name, created_at, captured_by')
      .order('created_at', { ascending: false })
      .limit(30),
    admin
      .from('operations_dependencies')
      .select('id, parent_key, child_key, relation, description')
      .order('parent_key'),
    canRevealShortcuts
      ? admin
          .from('operations_shortcuts')
          .select('id, module_key, label, description, href')
          .eq('enabled', true)
          .order('sort_order')
      : Promise.resolve({ data: [] }),
  ])

  const readIds = new Set((reads ?? []).map((read) => read.notification_id))

  return {
    generatedAt: new Date().toISOString(),
    uptime: (uptimeRows ?? []).map((row) => ({
      serviceKey: row.service_key,
      healthy: row.healthy_count,
      total: row.total_count,
      percentage: row.total_count > 0
        ? Math.round((row.healthy_count / row.total_count) * 10000) / 100
        : null,
      lastCheckedAt: row.last_checked_at,
    })),
    incidents: incidents ?? [],
    deployments: deployments ?? [],
    notifications: (notifications ?? []).map((notification) => ({
      ...notification,
      read: readIds.has(notification.id),
    })),
    maintenance: maintenance ?? [],
    snapshots: snapshots ?? [],
    dependencies: dependencies ?? [],
    shortcuts: (shortcutResult.data ?? []).map((shortcut) => ({
      ...shortcut,
      canReveal: true,
    })),
  }
}

export async function getOperationsNotificationSummary(userId: string) {
  const admin = getAdminClient()
  const [{ data: notifications }, { data: reads }] = await Promise.all([
    admin
      .from('operations_notifications')
      .select('id, severity')
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('operations_notification_reads')
      .select('notification_id')
      .eq('user_id', userId),
  ])
  const readIds = new Set((reads ?? []).map((read) => read.notification_id))
  const unread = (notifications ?? []).filter((notification) => !readIds.has(notification.id))
  return {
    unreadCount: unread.length,
    hasError: unread.some((notification) => notification.severity === 'error'),
  }
}

export type SecurityAccountFinding = {
  userId: string
  email: string
  role: string
  severity: 'info' | 'warning' | 'error'
  issues: string[]
  lastSignInAt: string | null
  activeSessions: number
  permissionsCount: number
}

export async function getSecurityAccountReport(
  callerUserId: string,
  callerRole: string | null
): Promise<SecurityAccountFinding[]> {
  const client = await createActionClient()
  const admin = getAdminClient()
  const { data: callerProfile } = await client
    .from('profiles')
    .select('tenant_id')
    .eq('id', callerUserId)
    .single()

  let profileQuery = admin
    .from('profiles')
    .select('id, role, tenant_id, deleted_at')
    .is('deleted_at', null)

  if (callerRole !== 'super_admin' && callerProfile?.tenant_id) {
    profileQuery = profileQuery.eq('tenant_id', callerProfile.tenant_id)
  }

  const [{ data: profiles }, { data: authUsers }, { data: permissions }] = await Promise.all([
    profileQuery,
    admin.rpc('get_security_account_report_data'),
    admin.from('user_permissions').select('user_id, permission_key'),
  ])

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const permissionCounts = new Map<string, number>()
  for (const permission of permissions ?? []) {
    permissionCounts.set(permission.user_id, (permissionCounts.get(permission.user_id) ?? 0) + 1)
  }

  const visibleUsers = (authUsers ?? [])
    .filter((user) => profileMap.has(user.user_id))
    .slice(0, 100)
  const inactiveThreshold = Date.now() - (90 * 24 * 60 * 60 * 1000)

  return visibleUsers.map((user) => {
    const profile = profileMap.get(user.user_id)
    const role = profile?.role ?? 'client'
    const issues: string[] = []
    const permissionCount = permissionCounts.get(user.user_id) ?? 0
    const lastSignInAt = user.last_sign_in_at ?? null

    if (!user.email_verified) issues.push('Adres e-mail nie jest potwierdzony')
    if (!user.two_factor_enabled) {
      issues.push(role === 'admin' || role === 'super_admin'
        ? 'Konto administracyjne bez 2FA'
        : '2FA nie jest włączone')
    }
    if (!lastSignInAt || new Date(lastSignInAt).getTime() < inactiveThreshold) {
      issues.push('Brak aktywności od ponad 90 dni')
    }
    if (role === 'client' && permissionCount > 12) {
      issues.push('Nietypowo szeroki zakres uprawnień')
    }
    if (user.active_sessions > 5) {
      issues.push('Więcej niż 5 aktywnych sesji')
    }

    const severity: SecurityAccountFinding['severity'] =
      issues.some((issue) => issue.includes('administracyjne') || issue.includes('Nietypowo'))
        ? 'error'
        : issues.length > 0
          ? 'warning'
          : 'info'

    return {
      userId: user.user_id,
      email: user.email,
      role,
      severity,
      issues,
      lastSignInAt,
      activeSessions: user.active_sessions,
      permissionsCount: permissionCount,
    }
  }).sort((a, b) => {
    const rank = { error: 2, warning: 1, info: 0 }
    return rank[b.severity] - rank[a.severity] || b.issues.length - a.issues.length
  })
}
