'use client'

import { useEffect, useRef } from 'react'
import { useToast } from '@/components/ToastProvider'

interface SecurityAlertsProviderProps {
	children: React.ReactNode
	isAdmin: boolean
}

export function SecurityAlertsProvider({ children, isAdmin }: SecurityAlertsProviderProps) {
	const { addToast } = useToast()
	const lastSeenRef = useRef(new Date().toISOString())

	useEffect(() => {
		if (!isAdmin) {
			return
		}

		let cancelled = false
		const poll = async () => {
			try {
				const response = await fetch(`/api/security/alerts?since=${encodeURIComponent(lastSeenRef.current)}`, { cache: 'no-store' })
				if (!response.ok || cancelled) return
				const payload = await response.json() as { alerts?: Array<{ action: string; details: Record<string, unknown> | null; created_at: string }> }
				for (const event of payload.alerts ?? []) {
					lastSeenRef.current = event.created_at
					if (event.action === 'failed_login') addToast(`Nieudane logowanie z IP: ${event.details?.ip || 'unknown'}`, 'error')
					if (event.action === 'ip_blocked') addToast(`IP zablokowane: ${event.details?.ip || 'unknown'}`, 'error')
					if (event.action === '2fa_failed') addToast('Nieudane 2FA', 'error')
				}
			} catch {
				// A transient monitoring failure must not interrupt the dashboard.
			}
		}
		const timer = window.setInterval(poll, 15_000)

		return () => {
			cancelled = true
			window.clearInterval(timer)
		}
	}, [isAdmin, addToast])

	return <>{children}</>
}
