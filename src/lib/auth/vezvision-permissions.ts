import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createActionClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { isAdminRole } from '@/lib/roles'
import {
  VEZVISION_ACCESS_FALLBACK_KEYS,
  VEZVISION_PERMISSIONS,
  type VezVisionPermissionKey,
} from '@/lib/vezvision-permissions'

export interface VezVisionPermissionState {
  userId: string
  role: string | null
  isAdmin: boolean
  permissions: Set<string>
}

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createActionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export const getVezVisionPermissionState = cache(async (): Promise<VezVisionPermissionState | null> => {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const supabase = await createActionClient()
  const adminClient = getAdminClient()

  const [{ data: profile }, permissionsResult] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', userId).single(),
    adminClient.from('user_permissions').select('permission_key').eq('user_id', userId),
  ])

  const role = profile?.role ?? null
  const isAdmin = isAdminRole(role)

  if (isAdmin) {
    return { userId, role, isAdmin, permissions: new Set<string>() }
  }

  const permissionRows = (permissionsResult.data ?? []) as Array<{ permission_key: string }>
  return {
    userId,
    role,
    isAdmin,
    permissions: new Set(permissionRows.map((row) => row.permission_key)),
  }
})

export function hasVezVisionPermission(
  state: VezVisionPermissionState,
  key: VezVisionPermissionKey
): boolean {
  if (state.isAdmin) return true

  if (key === VEZVISION_PERMISSIONS.ACCESS && state.permissions.has(VEZVISION_PERMISSIONS.ACCESS)) {
    return true
  }

  if (
    key === VEZVISION_PERMISSIONS.ACCESS &&
    VEZVISION_ACCESS_FALLBACK_KEYS.some((fallback) => state.permissions.has(fallback))
  ) {
    return true
  }

  return state.permissions.has(key)
}

export async function requireVezVisionPermission(
  key: VezVisionPermissionKey
): Promise<VezVisionPermissionState> {
  const state = await getVezVisionPermissionState()
  if (!state) {
    redirect('/login')
  }

  if (!hasVezVisionPermission(state, key)) {
    redirect('/dashboard')
  }

  return state
}

export async function requireAnyVezVisionPermission(
  keys: readonly VezVisionPermissionKey[]
): Promise<VezVisionPermissionState> {
  const state = await getVezVisionPermissionState()
  if (!state) {
    redirect('/login')
  }

  const allowed = keys.some((key) => hasVezVisionPermission(state, key))
  if (!allowed) {
    redirect('/dashboard')
  }

  return state
}
