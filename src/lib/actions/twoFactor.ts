'use server'

import QRCode from 'qrcode'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth as betterAuth } from '@/lib/auth'
import { createActionClient } from '@/lib/supabase/server'
import { sendAuditLog, sendUserEvent } from '@/lib/discord'
import { validateCSRFToken } from '@/lib/actions/csrf'
import { rateLimitByIP } from '@/lib/rate-limit'
import { getClientIP } from '@/lib/server-utils'
import { ONE_MINUTE } from '@/lib/constants/time'
import { logError } from '@/lib/logger'

async function currentUser() {
  const client = await createActionClient()
  const { data: { user } } = await client.auth.getUser()
  return { client, user }
}

export async function enroll2FA(csrfToken: string, password: string) {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) return { error: 'Nieprawidłowy token CSRF' }
  const limit = await rateLimitByIP('2fa_enroll', { maxRequests: 5, windowMs: ONE_MINUTE })
  if (!limit.allowed) return { error: limit.error || 'Przekroczono limit prób' }
  if (!password) return { error: 'Wprowadź aktualne hasło' }

  const { user } = await currentUser()
  if (!user) return { error: 'Nie jesteś zalogowany' }
  if (user.two_factor_enabled) return { error: '2FA jest już włączone' }

  try {
    const data = await betterAuth.api.enableTwoFactor({
      headers: await headers(),
      body: { password, issuer: 'VEZcore' },
    })
    const uri = data.totpURI
    const secret = new URL(uri).searchParams.get('secret') ?? ''
    return {
      id: 'totp',
      qr_code: await QRCode.toDataURL(uri, { errorCorrectionLevel: 'M', margin: 1, width: 320 }),
      secret,
      uri,
    }
  } catch {
    return { error: 'Nie udało się włączyć 2FA. Sprawdź aktualne hasło.' }
  }
}

export async function verify2FA(_factorId: string, code: string, csrfToken: string) {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) return { error: 'Nieprawidłowy token CSRF' }
  const limit = await rateLimitByIP('2fa_verify', { maxRequests: 8, windowMs: ONE_MINUTE })
  if (!limit.allowed) return { error: limit.error || 'Przekroczono limit prób' }

  try {
    await betterAuth.api.verifyTOTP({ headers: await headers(), body: { code, trustDevice: false } })
  } catch {
    return { error: 'Nieprawidłowy kod 2FA' }
  }

  const { client, user } = await currentUser()
  if (user) {
    const requestHeaders = await headers()
    const ip = await getClientIP()
    const { data: profile } = await client.from('profiles').select('tenant_id').eq('id', user.id).single()
    await client.from('audit_log').insert({
      user_id: user.id,
      tenant_id: profile?.tenant_id || null,
      action: '2fa_verify',
      entity_type: 'auth',
      entity_id: user.id,
      details: { ip, user_agent: (requestHeaders.get('user-agent') || 'unknown').substring(0, 200), email: user.email },
    })
    sendAuditLog('2fa_verify', { email: user.email, ip }).catch(() => logError('two_factor.audit', new Error('Audit delivery failed')))
    sendUserEvent(user.email || user.id, user.id, '2fa_enable', { ip }).catch(() => logError('two_factor.user_event', new Error('User event delivery failed')))
  }

  revalidatePath('/profile')
  return { success: true }
}

export async function unenroll2FA(_factorId: string, verificationCode: string, password: string, csrfToken: string) {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) return { error: 'Nieprawidłowy token CSRF' }
  const limit = await rateLimitByIP('2fa_unenroll', { maxRequests: 5, windowMs: ONE_MINUTE })
  if (!limit.allowed) return { error: limit.error || 'Przekroczono limit prób' }
  if (!password) return { error: 'Wprowadź aktualne hasło' }

  const { client, user } = await currentUser()
  if (!user) return { error: 'Nie jesteś zalogowany' }
  if (!user.two_factor_enabled) return { error: '2FA nie jest włączone' }

  const requestHeaders = await headers()
  try {
    await betterAuth.api.verifyTOTP({ headers: requestHeaders, body: { code: verificationCode, trustDevice: false } })
    await betterAuth.api.disableTwoFactor({ headers: requestHeaders, body: { password } })
  } catch {
    return { error: 'Nieprawidłowy kod 2FA lub hasło' }
  }

  const ip = await getClientIP()
  const { data: profile } = await client.from('profiles').select('tenant_id').eq('id', user.id).single()
  await client.from('audit_log').insert({
    user_id: user.id,
    tenant_id: profile?.tenant_id || null,
    action: '2fa_disable',
    entity_type: 'auth',
    entity_id: user.id,
    details: { ip, user_agent: (requestHeaders.get('user-agent') || 'unknown').substring(0, 200), email: user.email },
  })
  sendAuditLog('2fa_disable', { email: user.email, ip }).catch(() => logError('two_factor.audit', new Error('Audit delivery failed')))
  sendUserEvent(user.email || user.id, user.id, '2fa_disable', { ip }).catch(() => logError('two_factor.user_event', new Error('User event delivery failed')))

  revalidatePath('/profile')
  return { success: true }
}

export async function get2FAFactors() {
  const { user } = await currentUser()
  if (!user) return { error: 'Nie udało się pobrać czynników 2FA', factors: [] }
  return {
    factors: user.two_factor_enabled ? [{ id: 'totp', factor_type: 'totp', status: 'verified' }] : [],
  }
}
