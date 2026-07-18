'use server'

import { revalidatePath } from 'next/cache'
import { createActionClient } from '@/lib/supabase/server'
import { sendSecurityAlert, sendAuditLog } from '@/lib/discord'
import { validateName, validatePassword, sanitizeString } from '@/lib/validation'
import { rateLimitByIP } from '@/lib/rate-limit'
import { getClientIP } from '@/lib/server-utils'
import { validateCSRFToken } from '@/lib/actions/csrf'
import { ONE_MINUTE } from '@/lib/constants/time'
import { logError } from '@/lib/logger'
import { headers } from 'next/headers'
import { auth as betterAuth } from '@/lib/auth'

export async function updateProfile(formData: FormData) {
	const csrfToken = formData.get('csrfToken')
	if (typeof csrfToken !== 'string' || !(await validateCSRFToken(csrfToken))) {
		return { error: 'Nieprawidłowy token CSRF' }
	}

	const supabase = await createActionClient()

	const { data: { user } } = await supabase.auth.getUser()

	if (!user) {
		return { error: 'Nie jesteś zalogowany' }
	}

	const fullName = formData.get('fullName') as string

	if (fullName) {
		const nameValidation = validateName(fullName)
		if (!nameValidation.valid) {
			return { error: nameValidation.error }
		}
	}

	const { error } = await supabase
		.from('profiles')
		.update({ full_name: fullName ? sanitizeString(fullName) : null, updated_at: new Date().toISOString() })
		.eq('id', user.id)

	if (error) {
		return { error: 'Nie udało się zaktualizować profilu' }
	}

	const ip = await getClientIP()

	await supabase
		.from('audit_log')
		.insert({
			user_id: user.id,
			action: 'profile_update',
			entity_type: 'profile',
			entity_id: user.id,
			details: {
				ip,
				full_name: fullName
			}
		})

  sendAuditLog('profile_update', {
		email: user.email,
		ip,
		full_name: fullName,
	}).catch(() => logError('Async operation failed', new Error('Async operation failed')))

	revalidatePath('/profile')
	return { success: true }
}

export async function changePassword(formData: FormData) {
	const csrfToken = formData.get('csrfToken')
	if (typeof csrfToken !== 'string' || !(await validateCSRFToken(csrfToken))) {
		return { error: 'Nieprawidłowy token CSRF' }
	}

  const rateLimitResult = await rateLimitByIP('changePassword', { maxRequests: 3, windowMs: ONE_MINUTE })
	if (!rateLimitResult.allowed) {
		return { error: rateLimitResult.error }
	}

	const supabase = await createActionClient()

	const currentPassword = formData.get('currentPassword') as string
	const newPassword = formData.get('newPassword') as string
	const confirmPassword = formData.get('confirmPassword') as string
	const code2FA = formData.get('code2FA') as string

	if (newPassword !== confirmPassword) {
		return { error: 'Hasła nie są identyczne' }
	}

	const passwordValidation = validatePassword(newPassword)
	if (!passwordValidation.valid) {
		return { error: passwordValidation.error }
	}

	const { data: { user } } = await supabase.auth.getUser()

	if (!user?.email) {
		return { error: 'Nie jesteś zalogowany' }
	}

	const requestHeaders = await headers()
	if (user.two_factor_enabled) {
		if (!code2FA) {
			return { error: 'Wprowadź kod 2FA' }
		}

		try {
			await betterAuth.api.verifyTOTP({ headers: requestHeaders, body: { code: code2FA, trustDevice: false } })
		} catch {
			return { error: 'Nieprawidłowy kod 2FA' }
		}
	}

	try {
		await betterAuth.api.changePassword({
			headers: requestHeaders,
			body: { currentPassword, newPassword, revokeOtherSessions: true },
		})
	} catch {
		return { error: 'Nie udało się zmienić hasła' }
	}

	const ip = await getClientIP()

	await supabase
		.from('audit_log')
		.insert({
			user_id: user.id,
			action: 'password_change',
			entity_type: 'auth',
			entity_id: user.id,
			details: {
				ip,
				email: user.email
			}
		})

  sendSecurityAlert('password_change', {
		email: user.email,
		ip,
	}).catch(() => logError('Async operation failed', new Error('Async operation failed')))

  sendAuditLog('password_change', {
		email: user.email,
		ip,
	}).catch(() => logError('Async operation failed', new Error('Async operation failed')))

	return { success: true }
}
