'use server'

import { createActionClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendAuditLog, sendUserEvent } from '@/lib/discord'
import { validateEmail, validatePassword, validateName, sanitizeString, validateUUID } from '@/lib/validation'
import { rateLimitByIP } from '@/lib/rate-limit'
import { isAdminRole } from '@/lib/roles'
import { ERRORS } from '@/lib/constants'
import { validateCSRFToken } from '@/lib/actions/csrf'
import { getClientIP } from '@/lib/server-utils'
import { ONE_MINUTE } from '@/lib/constants/time'
import { logError } from '@/lib/logger'

const PROFILE_ROLES = ['super_admin', 'admin', 'client', 'viewer'] as const
type ProfileRole = (typeof PROFILE_ROLES)[number]

function normalizeProfileRole(role?: string): ProfileRole {
  if (!role) return 'client'
  if (role === 'user') return 'client'
  return (PROFILE_ROLES as readonly string[]).includes(role) ? (role as ProfileRole) : 'client'
}

function ensureValidUserId(userId: string): { error: string } | null {
  const validation = validateUUID(userId)
  if (!validation.valid) {
    return { error: ERRORS.NO_PERMISSIONS }
  }

  return null
}

type ActionResult = { success?: true; error?: string }

async function requireAdmin(supabase: Awaited<ReturnType<typeof createActionClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: ERRORS.NOT_LOGGED_IN }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!isAdminRole(profile?.role)) return { error: ERRORS.NO_PERMISSIONS }

  return { user, tenantId: profile?.tenant_id as string | null }
}

async function resolveTargetEmail(adminClient: ReturnType<typeof getAdminClient>, userId: string): Promise<string> {
  const { data: authUser } = await adminClient.auth.admin.getUserById(userId)
  return authUser.user?.email || userId
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

export async function createUser(data: { email: string; password: string; full_name?: string; role?: string; csrfToken: string }): Promise<ActionResult> {
  if (!data.csrfToken || !(await validateCSRFToken(data.csrfToken))) {
    return { error: 'Nieprawidłowy token CSRF' }
  }

  const rateLimitResult = await rateLimitByIP('createUser', { maxRequests: 5, windowMs: ONE_MINUTE })
  if (!rateLimitResult.allowed) {
    return { error: rateLimitResult.error || 'Przekroczono limit prób' }
  }

  const emailValidation = validateEmail(data.email)
  if (!emailValidation.valid) {
    return { error: emailValidation.error }
  }

  const passwordValidation = validatePassword(data.password)
  if (!passwordValidation.valid) {
    return { error: passwordValidation.error }
  }

  if (data.full_name) {
    const nameValidation = validateName(data.full_name)
    if (!nameValidation.valid) {
      return { error: nameValidation.error }
    }
  }

  const normalizedRole = normalizeProfileRole(data.role)

  const supabase = await createActionClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return { error: auth.error }

  const adminClient = getAdminClient()

  const { data: newUser, error } = await adminClient.auth.admin.createUser({
    email: sanitizeString(data.email),
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.full_name ? sanitizeString(data.full_name) : undefined },
    role: normalizedRole,
  })

  if (error) {
    if (error.code === 'email_exists') {
      return { error: 'Użytkownik z tym adresem email już istnieje' }
    }
    return { error: ERRORS.USER_CREATE_FAILED }
  }

  if (!newUser?.user) {
    return { error: ERRORS.USER_CREATE_FAILED }
  }

  const profileData = {
    id: newUser.user.id,
    full_name: data.full_name ? sanitizeString(data.full_name) : null,
    role: normalizedRole,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert(profileData as unknown as never, { onConflict: 'id' })

  if (profileError) {
    await adminClient.auth.admin.deleteUser(newUser.user.id)
    return { error: ERRORS.USER_CREATE_FAILED }
  }

  const ip = await getClientIP()

  await supabase
    .from('audit_log')
    .insert({
      user_id: auth.user.id,
      action: 'user_create',
      entity_type: 'user',
      entity_id: newUser.user.id,
      details: {
        ip,
        email: data.email,
        role: normalizedRole,
      }
    })

  sendAuditLog('user_create', {
    admin_email: auth.user.email,
    target_email: data.email,
    role: normalizedRole,
  }).catch(() => logError('Async operation failed', new Error('Async operation failed')))

  sendUserEvent(data.email, newUser.user.id, 'user_create', {
    admin_email: auth.user.email,
    role: normalizedRole,
  }).catch(() => logError('Async operation failed', new Error('Async operation failed')))

  revalidatePath('/konta')
  return { success: true }
}

export async function updateUser(userId: string, data: { full_name?: string; role?: string }, csrfToken: string): Promise<ActionResult> {
  const userIdValidationError = ensureValidUserId(userId)
  if (userIdValidationError) return userIdValidationError

  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token CSRF' }
  }

  const supabase = await createActionClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return { error: auth.error }

  if (!(await verifyTenantIsolation(supabase, auth.tenantId, userId))) {
    return { error: ERRORS.NO_PERMISSIONS }
  }

  const adminClient = getAdminClient()
  const targetEmail = await resolveTargetEmail(adminClient, userId)

  const updatePayload: { full_name?: string; role?: ProfileRole; updated_at: string } = {
    updated_at: new Date().toISOString(),
  }

  if (typeof data.full_name !== 'undefined') {
    updatePayload.full_name = data.full_name
  }

  if (typeof data.role !== 'undefined') {
    updatePayload.role = normalizeProfileRole(data.role)
  }

  const { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)

  if (error) {
    return { error: ERRORS.USER_UPDATE_FAILED }
  }

  if (typeof data.role !== 'undefined') {
    const { error: authRoleError } = await adminClient.auth.admin.updateUserById(userId, {
      role: updatePayload.role,
    })
    if (authRoleError) return { error: ERRORS.USER_UPDATE_FAILED }
  }

  const ip = await getClientIP()

  await supabase
    .from('audit_log')
    .insert({
      user_id: auth.user.id,
      action: 'user_update',
      entity_type: 'user',
      entity_id: userId,
      details: {
        ip,
        changes: data,
      }
    })

  sendAuditLog('user_update', {
    admin_email: auth.user.email,
    target_user_id: userId,
    changes: JSON.stringify(data),
  }).catch(() => logError('Async operation failed', new Error('Async operation failed')))

  sendUserEvent(targetEmail, userId, 'user_update', {
    admin_email: auth.user.email,
    changes: JSON.stringify(data),
  }).catch(() => logError('Async operation failed', new Error('Async operation failed')))

  revalidatePath('/konta')
  return { success: true }
}

export async function deleteUser(userId: string, csrfToken: string): Promise<ActionResult> {
  const userIdValidationError = ensureValidUserId(userId)
  if (userIdValidationError) return userIdValidationError

  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token CSRF' }
  }

  const supabase = await createActionClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return { error: auth.error }

  if (auth.user.id === userId) {
    return { error: 'Nie możesz usunąć własnego konta' }
  }

  if (!(await verifyTenantIsolation(supabase, auth.tenantId, userId))) {
    return { error: ERRORS.NO_PERMISSIONS }
  }

  const adminClient = getAdminClient()
  const targetEmail = await resolveTargetEmail(adminClient, userId)
  const { data: targetProfileRaw } = await adminClient
    .from('profiles')
    .select('discord_thread_id')
    .eq('id', userId)
    .maybeSingle()
  const targetProfile = targetProfileRaw as { discord_thread_id: string | null } | null

  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId)

  if (authDeleteError) {
    return { error: ERRORS.USER_DELETE_FAILED }
  }

  const { error: profileDeleteError } = await adminClient
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (profileDeleteError) {
    return { error: ERRORS.USER_DELETE_FAILED }
  }

  const ip = await getClientIP()

  await supabase
    .from('audit_log')
    .insert({
      user_id: auth.user.id,
      action: 'user_delete',
      entity_type: 'user',
      entity_id: userId,
      details: { ip }
    })

  sendAuditLog('user_delete', {
    admin_email: auth.user.email,
    target_user_id: userId,
  }).catch(() => logError('Async operation failed', new Error('Async operation failed')))

  sendUserEvent(targetEmail, userId, 'user_delete', {
    admin_email: auth.user.email,
    discord_thread_id: targetProfile?.discord_thread_id ?? null,
  }).catch(() => logError('Async operation failed', new Error('Async operation failed')))

  revalidatePath('/konta')
  return { success: true }
}

export async function changeUserEmail(userId: string, newEmail: string, csrfToken: string): Promise<ActionResult> {
  const userIdValidationError = ensureValidUserId(userId)
  if (userIdValidationError) return userIdValidationError

  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token CSRF' }
  }

  const emailValidation = validateEmail(newEmail)
  if (!emailValidation.valid) {
    return { error: emailValidation.error }
  }

  const supabase = await createActionClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return { error: auth.error }

  if (!(await verifyTenantIsolation(supabase, auth.tenantId, userId))) {
    return { error: ERRORS.NO_PERMISSIONS }
  }

  const adminClient = getAdminClient()
  const oldEmail = await resolveTargetEmail(adminClient, userId)

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    email: sanitizeString(newEmail),
    email_confirm: true,
  })

  if (error) {
    return { error: ERRORS.EMAIL_CHANGE_FAILED }
  }

  const ip = await getClientIP()

  await supabase
    .from('audit_log')
    .insert({
      user_id: auth.user.id,
      action: 'email_change',
      entity_type: 'user',
      entity_id: userId,
      details: {
        ip,
        old_email: oldEmail,
        new_email: newEmail,
      }
    })

  sendAuditLog('email_change', {
    admin_email: auth.user.email,
    target_user_id: userId,
    old_email: oldEmail,
    new_email: newEmail,
  }).catch(() => logError('Async operation failed', new Error('Async operation failed')))

  sendUserEvent(newEmail, userId, 'email_change', {
    admin_email: auth.user.email,
    old_email: oldEmail,
  }).catch(() => logError('Async operation failed', new Error('Async operation failed')))

  revalidatePath('/konta')
  return { success: true }
}
