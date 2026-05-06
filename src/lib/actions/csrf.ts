'use server'

import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { timingSafeEqual } from 'node:crypto'
import { ONE_HOUR, ONE_HOUR_SECONDS } from '@/lib/constants/time'

const CSRF_TOKEN_NAME = '__vez_csrf'
const CSRF_TOKEN_EXPIRY = ONE_HOUR
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

interface CSRFToken {
	token: string
	expires: number
}

export async function generateCSRFToken(): Promise<string> {
	const token = randomBytes(32).toString('hex')
	const expires = Date.now() + CSRF_TOKEN_EXPIRY

	const cookieStore = await cookies()
	cookieStore.set(CSRF_TOKEN_NAME, JSON.stringify({ token, expires }), {
		httpOnly: true,
		secure: IS_PRODUCTION,
		sameSite: 'strict',
		maxAge: ONE_HOUR_SECONDS,
		path: '/',
	})

	return token
}

export async function validateCSRFToken(token: string): Promise<boolean> {
	const cookieStore = await cookies()
	const cookie = cookieStore.get(CSRF_TOKEN_NAME)

	if (!cookie?.value) {
		return false
	}

	try {
		const stored: CSRFToken = JSON.parse(cookie.value)

		if (Date.now() > stored.expires) {
			cookieStore.delete(CSRF_TOKEN_NAME)
			return false
		}

		const storedBuffer = Buffer.from(stored.token, 'utf8')
		const tokenBuffer = Buffer.from(token, 'utf8')

		const maxLen = Math.max(storedBuffer.length, tokenBuffer.length)
		const storedPadded = Buffer.alloc(maxLen)
		const tokenPadded = Buffer.alloc(maxLen)
		storedBuffer.copy(storedPadded)
		tokenBuffer.copy(tokenPadded)

		return timingSafeEqual(storedPadded, tokenPadded)
	} catch {
		cookieStore.delete(CSRF_TOKEN_NAME)
		return false
	}
}

export async function getCSRFToken(): Promise<string | null> {
	const cookieStore = await cookies()
	const cookie = cookieStore.get(CSRF_TOKEN_NAME)

	if (!cookie?.value) {
		return generateCSRFToken()
	}

	try {
		const stored: CSRFToken = JSON.parse(cookie.value)

		if (Date.now() > stored.expires) {
			return generateCSRFToken()
		}

		return stored.token
	} catch {
		return generateCSRFToken()
	}
}
