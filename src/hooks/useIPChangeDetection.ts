'use client'

import { useEffect, useRef } from 'react'
import { logout } from '@/lib/actions/auth'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'
import { ONE_MINUTE } from '@/lib/constants/time'
import { useCSRFToken } from '@/hooks/useCSRFToken'

async function getClientIP(): Promise<string | null> {
	try {
		const response = await fetch('/api/client-ip')
		const data = await response.json()
		return data.ip || null
	} catch {
		return null
	}
}

export function useIPChangeDetection() {
	const { preferences } = useUserPreferences()
	const lastIPRef = useRef<string | null>(null)
	const intervalRef = useRef<NodeJS.Timeout | null>(null)
	const { token: csrfToken } = useCSRFToken()

	useEffect(() => {
		if (!preferences.autoLogoutOnIpChange || !csrfToken) {
			if (intervalRef.current) {
				clearInterval(intervalRef.current)
				intervalRef.current = null
			}
			return
		}

		const checkIP = async () => {
			const currentIP = await getClientIP()

			if (currentIP && lastIPRef.current && currentIP !== lastIPRef.current) {
				await logout(csrfToken)
				window.location.href = '/login'
			}

			lastIPRef.current = currentIP
		}

		checkIP()

		intervalRef.current = setInterval(checkIP, ONE_MINUTE)

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current)
			}
		}
	}, [preferences.autoLogoutOnIpChange, csrfToken])
}
