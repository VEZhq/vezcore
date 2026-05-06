'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createActionClient } from '@/lib/supabase/server'
import { sendSecurityAlert, sendAuditLog } from '@/lib/discord'
import { getClientIP } from '@/lib/server-utils'
import { rateLimitByIP } from '@/lib/rate-limit'
import { reportAuthFailure, maskEmail } from '@/lib/monitoring'
import { validateCSRFToken } from '@/lib/actions/csrf'
import { FIVE_MINUTES, FIFTEEN_MINUTES } from '@/lib/constants/time'
import { logError } from '@/lib/logger'

type LoginResult =
  | { error: string; success?: never; requires2FA?: never; factorId?: never; challengeId?: never }
  | { success: true; error?: never; requires2FA?: never; factorId?: never; challengeId?: never }
  | { requires2FA: true; factorId: string; challengeId: string; error?: never; success?: never }

export async function login(formData: FormData): Promise<LoginResult> {
  const csrfToken = String(formData.get('csrfToken') ?? '')
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token bezpieczeństwa' }
  }

  const supabase = await createActionClient()

	const email = String(formData.get('email') ?? '')
	const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Nieprawidłowe dane logowania' }
  }

  const loginRateLimit = await rateLimitByIP('login', { maxRequests: 5, windowMs: FIVE_MINUTES })
  if (!loginRateLimit.allowed) {
    return { error: loginRateLimit.error || 'Za dużo prób logowania. Spróbuj ponownie później.' }
  }

	const ip = await getClientIP()
	const headersList = await headers()
	const userAgent = (headersList.get('user-agent') || 'unknown').substring(0, 200)

	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password,
	})

  if (error) {
    await reportAuthFailure('Login attempt failed', {
      email,
      ip,
      reason: error.message,
    }).catch(() => logError('[AUTH] Failed to report auth failure', new Error('Failed to report auth failure')))

    try {
      await sendSecurityAlert('failed_login', {
        email,
				ip,
				reason: error.message,
				user_agent: userAgent
			})
		} catch {
			await logError('[AUTH] Failed to send Discord alert', new Error('Failed to send Discord alert'))
		}

		return { error: 'Nieprawidłowe dane logowania' }
	}

	if (!data.user) {
		return { error: 'Błąd logowania' }
	}

	const { data: factors } = await supabase.auth.mfa.listFactors()

	if (factors?.totp && factors.totp.length > 0) {
		const factor = factors.totp[0]

		const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
			factorId: factor.id,
		})

		if (challengeError || !challenge?.id) {
			await supabase.auth.signOut()
			return { error: 'Błąd weryfikacji 2FA. Spróbuj ponownie.' }
		}

		return { requires2FA: true, factorId: factor.id, challengeId: challenge.id }
	}

	await supabase.auth.refreshSession()

	const { data: profile } = await supabase
		.from('profiles')
		.select('tenant_id')
		.eq('id', data.user.id)
		.single()

	await supabase
		.from('audit_log')
		.insert({
			user_id: data.user.id,
			tenant_id: profile?.tenant_id || null,
			action: 'login',
			entity_type: 'session',
			entity_id: data.user.id,
				details: {
					ip,
					user_agent: userAgent,
					email: maskEmail(data.user.email || email),
				},
		})

	try {
		await sendAuditLog('login', {
			email: data.user.email || email,
			ip,
			user_agent: userAgent,
		})
	} catch {
		await logError('[AUTH] Discord error', new Error('Discord error'))
	}

	revalidatePath('/', 'layout')
	return { success: true }
}

export async function verify2FALogin(factorId: string, challengeId: string, code: string, csrfToken: string) {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token bezpieczeństwa' }
  }

  const rateLimitResult = await rateLimitByIP('verify2FA', { maxRequests: 5, windowMs: FIFTEEN_MINUTES })
  if (!rateLimitResult.allowed) {
    return { error: rateLimitResult.error }
  }

  try {
    const supabase = await createActionClient()

    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    })

    if (error) {
      await reportAuthFailure('2FA verification failed', {
        factorId,
        challengeId,
        reason: error.message,
      }).catch(() => logError('[AUTH] Failed to report 2FA failure', new Error('Failed to report 2FA failure')))

      try {
        const ip = await getClientIP()
        const headersList = await headers()
        const userAgent = (headersList.get('user-agent') || 'unknown').substring(0, 200)
        const { data: { user } } = await supabase.auth.getUser()

        await sendSecurityAlert('failed_login', {
          email: user?.email || 'unknown',
          ip,
          reason: 'Nieprawidłowy kod 2FA',
          user_agent: userAgent,
        })
      } catch {
        await logError('[AUTH] Discord error on 2FA failure', new Error('Discord error on 2FA failure'))
      }

      return { error: 'Nieprawidłowy kod 2FA' }
    }

    try {
      const ip = await getClientIP()
      const headersList = await headers()
      const userAgent = (headersList.get('user-agent') || 'unknown').substring(0, 200)
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
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
            entity_type: 'session',
            entity_id: user.id,
            details: {
              ip,
              user_agent: userAgent,
              email: maskEmail(user.email || 'unknown'),
            },
          })

        await supabase
          .from('audit_log')
          .insert({
            user_id: user.id,
            tenant_id: profile?.tenant_id || null,
            action: 'login',
            entity_type: 'session',
            entity_id: user.id,
            details: {
              ip,
              user_agent: userAgent,
              email: maskEmail(user.email || 'unknown'),
              method: '2fa',
            },
          })

        await sendAuditLog('2fa_verify', {
          email: user.email || 'unknown',
          ip,
          user_agent: userAgent,
        })

        await sendAuditLog('login', {
          email: user.email || 'unknown',
          ip,
          user_agent: userAgent,
          method: '2fa',
        })
      }
    } catch {
      await logError('[AUTH] Discord error', new Error('Discord error'))
    }

    revalidatePath('/', 'layout')
    return { success: true }
  } catch {
    await logError('[AUTH] 2FA verification error', new Error('2FA verification error'))
    return { error: 'Błąd weryfikacji 2FA' }
  }
}

export async function logout(csrfToken: string) {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token bezpieczeństwa' }
  }

  const supabase = await createActionClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
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
        action: 'logout',
        entity_type: 'session',
        entity_id: user.id,
        details: {
          ip,
          email: maskEmail(user.email || 'unknown'),
        },
      })

    try {
      await sendAuditLog('logout', {
        email: user.email || 'unknown',
        ip,
      })
    } catch {
      await logError('[AUTH] Discord error', new Error('Discord error'))
    }
  }

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  return { success: true }
}


