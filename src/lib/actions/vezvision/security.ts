'use server'

import { rateLimitByIP } from '@/lib/rate-limit'
import { validateCSRFToken } from '@/lib/actions/csrf'
import { sendAuditLog, sendSecurityAlert } from '@/lib/discord'
import { getClientIP } from '@/lib/server-utils'
import { createActionClient } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

interface MutationGuardConfig {
  action: string
  csrfToken: string
  maxRequests: number
  windowMs: number
}

type MutationGuardResult =
  | { ok: true }
  | { ok: false; error: string }

async function resolveCurrentUserEmail(): Promise<string> {
  const supabase = await createActionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.email ?? 'unknown'
}

export async function guardVezVisionMutation(config: MutationGuardConfig): Promise<MutationGuardResult> {
  const ip = await getClientIP()
  const email = await resolveCurrentUserEmail()

  if (!(await validateCSRFToken(config.csrfToken))) {
    await sendSecurityAlert('suspicious', {
      email,
      ip,
      reason: `VezVision CSRF validation failed: ${config.action}`,
    }).catch((error) => logError('security.guardVezVisionMutation.sendSecurityAlert.csrf', error))

    await sendAuditLog('vezvision_csrf_rejected', {
      email,
      ip,
      action: config.action,
    }).catch((error) => logError('security.guardVezVisionMutation.sendAuditLog.csrf', error))

    return { ok: false, error: 'Nieprawidłowy token CSRF' }
  }

  const rate = await rateLimitByIP(`vezvision:${config.action}`, {
    maxRequests: config.maxRequests,
    windowMs: config.windowMs,
  })
  if (!rate.allowed) {
    await sendSecurityAlert('suspicious', {
      email,
      ip,
      reason: `VezVision rate limit exceeded: ${config.action}`,
      attempts: String(config.maxRequests),
    }).catch((error) => logError('security.guardVezVisionMutation.sendSecurityAlert.rateLimit', error))

    await sendAuditLog('vezvision_rate_limit_rejected', {
      email,
      ip,
      action: config.action,
    }).catch((error) => logError('security.guardVezVisionMutation.sendAuditLog.rateLimit', error))

    return { ok: false, error: rate.error ?? 'Za dużo prób. Spróbuj ponownie później.' }
  }

  return { ok: true }
}
