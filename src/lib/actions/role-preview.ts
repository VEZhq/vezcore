'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { validateCSRFToken } from '@/lib/actions/csrf'
import { createActionClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { getActualAuthenticatedPermissionState } from '@/lib/permissions'
import {
  isRolePreview,
  ROLE_PREVIEW_COOKIE,
  USER_PREVIEW_COOKIE,
  type RolePreview,
} from '@/lib/role-preview'

export async function setRolePreview(
  role: RolePreview,
  csrfToken: string
): Promise<{ success: true } | { error: string }> {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token bezpieczeństwa' }
  }
  if (!isRolePreview(role)) return { error: 'Nieobsługiwany profil podglądu' }

  const authState = await getActualAuthenticatedPermissionState()
  if (!authState) return { error: 'Nie jesteś zalogowany' }
  if (!authState.permissions.canPreviewRoles) return { error: 'Brak uprawnień' }

  const cookieStore = await cookies()
  cookieStore.set(ROLE_PREVIEW_COOKIE, role, {
    httpOnly: true,
    secure: process.env.FORCE_HTTPS === 'true',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60,
  })
  cookieStore.delete(USER_PREVIEW_COOKIE)
  const client = await createActionClient()
  await client.from('audit_log').insert({
    user_id: authState.userId,
    action: 'role_preview_start',
    entity_type: 'role_preview',
    entity_id: role,
    details: { role },
  })
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function setUserPreview(
  targetUserId: string,
  csrfToken: string
): Promise<{ success: true } | { error: string }> {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token bezpieczeństwa' }
  }
  if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) return { error: 'Nieprawidłowe konto' }

  const authState = await getActualAuthenticatedPermissionState()
  if (!authState) return { error: 'Nie jesteś zalogowany' }
  if (!authState.permissions.canPreviewRoles) return { error: 'Brak uprawnień' }

  const admin = getAdminClient()
  const { data: targetProfile } = await admin
    .from('profiles')
    .select('id, tenant_id, deleted_at')
    .eq('id', targetUserId)
    .is('deleted_at', null)
    .maybeSingle()

  const sameTenant = authState.actualRole === 'super_admin'
    || Boolean(authState.tenantId && targetProfile?.tenant_id === authState.tenantId)
  if (!targetProfile || !sameTenant) return { error: 'Konto jest niedostępne' }

  const cookieStore = await cookies()
  cookieStore.set(USER_PREVIEW_COOKIE, targetProfile.id, {
    httpOnly: true,
    secure: process.env.FORCE_HTTPS === 'true',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60,
  })
  cookieStore.delete(ROLE_PREVIEW_COOKIE)

  const client = await createActionClient()
  await client.from('audit_log').insert({
    user_id: authState.userId,
    action: 'user_preview_start',
    entity_type: 'user',
    entity_id: targetProfile.id,
    details: { target_user_id: targetProfile.id },
  })
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function clearRolePreview(
  csrfToken: string
): Promise<{ success: true } | { error: string }> {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token bezpieczeństwa' }
  }

  const client = await createActionClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { error: 'Nie jesteś zalogowany' }

  const cookieStore = await cookies()
  const activeRole = cookieStore.get(ROLE_PREVIEW_COOKIE)?.value ?? null
  const activeUser = cookieStore.get(USER_PREVIEW_COOKIE)?.value ?? null
  cookieStore.delete(ROLE_PREVIEW_COOKIE)
  cookieStore.delete(USER_PREVIEW_COOKIE)
  await client.from('audit_log').insert({
    user_id: user.id,
    action: activeUser ? 'user_preview_end' : 'role_preview_end',
    entity_type: activeUser ? 'user' : 'role_preview',
    entity_id: activeUser ?? activeRole,
    details: { role: activeRole, target_user_id: activeUser },
  })
  revalidatePath('/', 'layout')
  return { success: true }
}
