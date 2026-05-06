'use server'

import { hasVezVisionPermission } from '@/lib/auth/vezvision-permissions'
import type { VezVisionPermissionKey } from '@/lib/vezvision-permissions'
import { getVezVisionPermissionState } from '@/lib/auth/vezvision-permissions'
import { sendAuditLog, sendSecurityAlert } from '@/lib/discord'
import { getClientIP } from '@/lib/server-utils'
import { logError } from '@/lib/logger'

export type VezVisionAuthResult =
  | { error: string }
  | { userId: string }

export async function requireVezVisionPermission(
  key: VezVisionPermissionKey
): Promise<VezVisionAuthResult> {
  const state = await getVezVisionPermissionState()
  if (!state) {
    const ip = await getClientIP()
    await sendSecurityAlert('suspicious', {
      email: 'anonymous',
      ip,
      reason: `VezVision unauthorized access attempt: ${key}`,
    }).catch((error) => logError('auth.vezvision.async_operation', error))
    await sendAuditLog('vezvision_auth_rejected', {
      email: 'anonymous',
      ip,
      permission: key,
      reason: 'not_authenticated',
    }).catch((error) => logError('auth.vezvision.async_operation', error))
    return { error: 'Brak autoryzacji' }
  }

  if (!hasVezVisionPermission(state, key)) {
    const ip = await getClientIP()
    await sendSecurityAlert('suspicious', {
      email: state.userId,
      ip,
      reason: `VezVision permission denied: ${key}`,
    }).catch((error) => logError('auth.vezvision.async_operation', error))
    await sendAuditLog('vezvision_permission_rejected', {
      email: state.userId,
      ip,
      permission: key,
      reason: 'missing_permission',
    }).catch((error) => logError('auth.vezvision.async_operation', error))
    return { error: 'Brak uprawnień' }
  }
  return { userId: state.userId }
}
