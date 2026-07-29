'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { validateCSRFToken } from '@/lib/actions/csrf'
import { createActionClient } from '@/lib/supabase/server'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'
import { isRolePreview, ROLE_PREVIEW_COOKIE, type RolePreview } from '@/lib/role-preview'

export async function setRolePreview(
  role: RolePreview,
  csrfToken: string
): Promise<{ success: true } | { error: string }> {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token bezpieczeństwa' }
  }
  if (!isRolePreview(role)) return { error: 'Nieobsługiwany profil podglądu' }

  const authState = await getAuthenticatedUserPermissionState()
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
  cookieStore.delete(ROLE_PREVIEW_COOKIE)
  await client.from('audit_log').insert({
    user_id: user.id,
    action: 'role_preview_end',
    entity_type: 'role_preview',
    entity_id: activeRole,
    details: { role: activeRole },
  })
  revalidatePath('/', 'layout')
  return { success: true }
}
