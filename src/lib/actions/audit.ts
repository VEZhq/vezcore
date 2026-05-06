'use server'

import { createActionClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { isAdminRole } from '@/lib/roles'
import { ERRORS } from '@/lib/constants'

export interface AuditLogFilters {
  action?: string
  userId?: string
  startDate?: string
  endDate?: string
  search?: string
  page?: number
  limit?: number
}

export interface AuditLog {
  id: string
  user_id: string | null
  tenant_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string | null
  user_email?: string
}

const ALLOWED_ACTIONS = [
  'login', 'logout', 'failed_login',
  'user_create', 'user_update', 'user_delete', 'user_deactivate', 'user_activate',
  'email_change', 'password_change',
  'profile_update', 'avatar_upload', 'avatar_remove',
  'ip_blocked',
  '2fa_enable', '2fa_disable', '2fa_verify', '2fa_failed',
  'session_revoke', 'all_sessions_revoked',
  'permission_grant', 'permission_revoke',
  'vezvision_folder_acl_grant', 'vezvision_folder_acl_revoke', 'vezvision_folder_acl_update',
]

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const supabase = await createActionClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: ERRORS.NOT_LOGGED_IN, logs: [], total: 0 }
  }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!isAdminRole(callerProfile?.role)) {
    return { error: ERRORS.NO_PERMISSIONS, logs: [], total: 0 }
  }

  // Tenant isolation: if filtering by userId, verify that user belongs to same tenant
  if (filters.userId && callerProfile?.tenant_id) {
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', filters.userId)
      .single()

    if (targetProfile?.tenant_id !== callerProfile.tenant_id) {
      return { error: ERRORS.NO_PERMISSIONS, logs: [], total: 0 }
    }
  }

  const page = filters.page || 1
  const limit = Math.min(filters.limit || 20, 100)
  const offset = (page - 1) * limit

  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })

  if (filters.action) {
    if (ALLOWED_ACTIONS.includes(filters.action)) {
      query = query.eq('action', filters.action)
    }
  }

  if (filters.userId) {
    query = query.eq('user_id', filters.userId)
  }

  if (filters.startDate) {
    const startDate = new Date(filters.startDate)
    if (!isNaN(startDate.getTime())) {
      query = query.gte('created_at', startDate.toISOString())
    }
  }

  if (filters.endDate) {
    const endDate = new Date(filters.endDate)
    if (!isNaN(endDate.getTime())) {
      query = query.lte('created_at', endDate.toISOString())
    }
  }

  if (filters.search) {
    const sanitizedSearch = filters.search
      .replace(/[%_\\]/g, '\\$&')
      .substring(0, 100)

    query = query.or(`action.ilike.%${sanitizedSearch}%,entity_type.ilike.%${sanitizedSearch}%`)
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data: logs, error, count } = await query

  if (error) {
    return { error: 'Błąd pobierania logów', logs: [], total: 0 }
  }

  const userIds = [...new Set((logs || []).map(l => l.user_id).filter(Boolean))]

  let userEmails: Record<string, string> = {}
  if (userIds.length > 0) {
    const adminClient = getAdminClient()
    const { data: authUsers } = await adminClient.auth.admin.listUsers()
    if (authUsers) {
      userEmails = authUsers.users.reduce((acc, u) => {
        acc[u.id] = u.email || ''
        return acc
      }, {} as Record<string, string>)
    }
  }

  const logsWithEmail: AuditLog[] = (logs || []).map(log => ({
    ...log,
    details: (log.details !== null && typeof log.details === 'object' && !Array.isArray(log.details))
      ? (log.details as Record<string, unknown>)
      : null,
    user_email: log.user_id ? (userEmails[log.user_id] || log.user_id.substring(0, 8)) : 'system'
  }))

  return { logs: logsWithEmail, total: count || 0 }
}

export async function getAuditLogActions() {
  const supabase = await createActionClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isAdminRole(profile?.role)) return []

  return ALLOWED_ACTIONS
}


