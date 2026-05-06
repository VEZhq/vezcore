'use server'

import { createActionClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendAuditLog } from '@/lib/discord'
import { isAdminRole } from '@/lib/roles'
import { ERRORS } from '@/lib/constants'
import { validateCSRFToken } from '@/lib/actions/csrf'
import { getClientIP } from '@/lib/server-utils'
import { logError } from '@/lib/logger'

export interface Permission {
  id: string
  user_id: string
  permission_key: string
  granted_by: string | null
  created_at: string
}

async function requireAdmin(supabase: Awaited<ReturnType<typeof createActionClient>>): Promise<
  { error: string } | { user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] & object; tenantId: string | null }
> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: ERRORS.NOT_LOGGED_IN }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!isAdminRole(profile?.role)) return { error: ERRORS.NO_PERMISSIONS }

  return { user, tenantId: (profile?.tenant_id ?? null) as string | null }
}

async function verifyTenantIsolation(
  supabase: Awaited<ReturnType<typeof createActionClient>>,
  callerTenantId: string | null,
  targetUserId: string
): Promise<boolean> {
  if (!callerTenantId) return true

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', targetUserId)
    .single()

  return targetProfile?.tenant_id === callerTenantId
}

export async function getUserPermissionsList(userId: string): Promise<Permission[] | { error: string }> {
  const supabase = await createActionClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return { error: auth.error }

  if (!(await verifyTenantIsolation(supabase, auth.tenantId, userId))) {
    return { error: ERRORS.NO_PERMISSIONS }
  }

  const adminClient = getAdminClient()

  const { data: permissions } = await adminClient
    .from('user_permissions')
    .select('id, user_id, permission_key, granted_by, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return permissions || []
}

export async function grantPermission(userId: string, permissionKey: string, csrfToken: string): Promise<{ error: string } | { success: true }> {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token CSRF' }
  }

  const supabase = await createActionClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  if (!(await verifyTenantIsolation(supabase, auth.tenantId, userId))) {
    return { error: ERRORS.NO_PERMISSIONS }
  }

  const adminClient = getAdminClient()

  const permissionData = {
    user_id: userId,
    permission_key: permissionKey,
    granted_by: auth.user.id,
    updated_at: new Date().toISOString(),
  }

  const { error } = await adminClient
    .from('user_permissions')
    .upsert(permissionData as unknown as never, { onConflict: 'user_id,permission_key' })

  if (error) {
    return { error: ERRORS.PERMISSION_GRANT_FAILED }
  }

  const ip = await getClientIP()

  await supabase
    .from('audit_log')
    .insert({
      user_id: auth.user.id,
      action: 'permission_grant',
      entity_type: 'permission',
      entity_id: userId,
      details: {
        ip,
        permission_key: permissionKey,
      }
    })

  sendAuditLog('permission_grant', {
    admin_email: auth.user.email,
    target_user_id: userId,
    permission_key: permissionKey,
  }).catch(() => logError('Async operation failed', new Error('Async operation failed')))

  revalidatePath('/konta')
  return { success: true as const }
}

export async function revokePermission(userId: string, permissionKey: string, csrfToken: string): Promise<{ error: string } | { success: true }> {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token CSRF' }
  }

  const supabase = await createActionClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  if (!(await verifyTenantIsolation(supabase, auth.tenantId, userId))) {
    return { error: ERRORS.NO_PERMISSIONS }
  }

  const adminClient = getAdminClient()

  const { error } = await adminClient
    .from('user_permissions')
    .delete()
    .eq('user_id', userId)
    .eq('permission_key', permissionKey)

  if (error) {
    return { error: ERRORS.PERMISSION_REVOKE_FAILED }
  }

  const ip = await getClientIP()

  await supabase
    .from('audit_log')
    .insert({
      user_id: auth.user.id,
      action: 'permission_revoke',
      entity_type: 'permission',
      entity_id: userId,
      details: {
        ip,
        permission_key: permissionKey,
      }
    })

  sendAuditLog('permission_revoke', {
    admin_email: auth.user.email,
    target_user_id: userId,
    permission_key: permissionKey,
  }).catch(() => logError('Async operation failed', new Error('Async operation failed')))

  revalidatePath('/konta')
  return { success: true as const }
}

export async function hasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const supabase = await createActionClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (isAdminRole(profile?.role)) {
    return true
  }

  const adminClient = getAdminClient()

  const { data: permission } = await adminClient
    .from('user_permissions')
    .select('id')
    .eq('user_id', userId)
    .eq('permission_key', permissionKey)
    .single()

  return !!permission
}


