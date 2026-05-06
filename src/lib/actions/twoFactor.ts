'use server'

import { createActionClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { sendAuditLog, sendUserEvent } from '@/lib/discord'
import { validateCSRFToken } from '@/lib/actions/csrf'
import { rateLimitByIP } from '@/lib/rate-limit'
import { getClientIP } from '@/lib/server-utils'
import { ONE_MINUTE } from '@/lib/constants/time'
import { logError } from '@/lib/logger'

export async function enroll2FA(csrfToken: string) {
	if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
		return { error: 'Nieprawidłowy token CSRF' }
	}

  const rateLimitResult = await rateLimitByIP('2fa_enroll', { maxRequests: 5, windowMs: ONE_MINUTE })
	if (!rateLimitResult.allowed) {
		return { error: rateLimitResult.error || 'Przekroczono limit prób' }
	}

  const supabase = await createActionClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Nie jesteś zalogowany' }
  }

  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
  if (factorsError) {
    return { error: 'Nie udało się sprawdzić konfiguracji 2FA' }
  }

  const totpFactors = factors.totp || []
  if (totpFactors.some((factor) => factor.status === 'verified')) {
    return { error: '2FA jest już włączone' }
  }

  const unverifiedFactors = totpFactors.filter((factor) => factor.status !== 'verified')
  for (const factor of unverifiedFactors) {
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
    if (unenrollError) {
      return { error: 'Nie udało się przygotować nowej konfiguracji 2FA' }
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'vezCore',
  })

  if (error) {
    return { error: 'Nie udało się zarejestrować 2FA. Sprawdź konfigurację MFA w Supabase Auth.' }
  }

  return {
    id: data.id,
    qr_code: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  }
}

export async function verify2FA(factorId: string, code: string, csrfToken: string) {
	if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
		return { error: 'Nieprawidłowy token CSRF' }
	}

  const rateLimitResult = await rateLimitByIP('2fa_verify', { maxRequests: 8, windowMs: ONE_MINUTE })
	if (!rateLimitResult.allowed) {
		return { error: rateLimitResult.error || 'Przekroczono limit prób' }
	}

  const supabase = await createActionClient()

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  })

  if (challengeError) {
    return { error: 'Błąd weryfikacji 2FA' }
  }

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  })

  if (error) {
    return { error: 'Nieprawidłowy kod 2FA' }
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const headersList = await headers()
    const ip = await getClientIP()

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        tenant_id: profile?.tenant_id || null,
        action: '2fa_verify',
        entity_type: 'auth',
        entity_id: user.id,
        details: {
          ip,
          user_agent: (headersList.get('user-agent') || 'unknown').substring(0, 200),
          email: user.email,
          factor_id: factorId,
        },
      })

		sendAuditLog('2fa_verify', {
			email: user.email,
			ip,
		}).catch(() => logError('Async operation failed', new Error('Async operation failed')))

		sendUserEvent(user.email || user.id, user.id, '2fa_enable', {
			ip,
		}).catch(() => logError('Async operation failed', new Error('Async operation failed')))
	}

  revalidatePath('/profile')
  return { success: true }
}

export async function unenroll2FA(factorId: string, verificationCode: string, csrfToken: string) {
	if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
		return { error: 'Nieprawidłowy token CSRF' }
	}

  const rateLimitResult = await rateLimitByIP('2fa_unenroll', { maxRequests: 5, windowMs: ONE_MINUTE })
	if (!rateLimitResult.allowed) {
		return { error: rateLimitResult.error || 'Przekroczono limit prób' }
	}

  const supabase = await createActionClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Nie jesteś zalogowany' }
  }

  const { data: factors } = await supabase.auth.mfa.listFactors()
  const factor = factors?.totp?.find(f => f.id === factorId)

  if (!factor) {
    return { error: 'Nie znaleziono czynnika 2FA' }
  }

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  })

  if (challengeError) {
    return { error: 'Błąd weryfikacji 2FA' }
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: verificationCode,
  })

  if (verifyError) {
    return { error: 'Nieprawidłowy kod 2FA' }
  }

  const { error } = await supabase.auth.mfa.unenroll({
    factorId,
  })

  if (error) {
    return { error: 'Nie udało się wyłączyć 2FA' }
  }

  const headersList = await headers()
  const ip = await getClientIP()

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  await supabase
    .from('audit_log')
    .insert({
      user_id: user.id,
      tenant_id: profile?.tenant_id || null,
      action: '2fa_disable',
      entity_type: 'auth',
      entity_id: user.id,
      details: {
        ip,
        user_agent: (headersList.get('user-agent') || 'unknown').substring(0, 200),
        email: user.email,
        factor_id: factorId,
      },
    })

	sendAuditLog('2fa_disable', {
		email: user.email,
		ip,
	}).catch(() => logError('Async operation failed', new Error('Async operation failed')))

	sendUserEvent(user.email || user.id, user.id, '2fa_disable', {
		ip,
	}).catch(() => logError('Async operation failed', new Error('Async operation failed')))

	revalidatePath('/profile')
  return { success: true }
}

export async function get2FAFactors() {
  const supabase = await createActionClient()

  const { data, error } = await supabase.auth.mfa.listFactors()

  if (error) {
    return { error: 'Nie udało się pobrać czynników 2FA', factors: [] }
  }

  return { factors: data.totp || [] }
}
