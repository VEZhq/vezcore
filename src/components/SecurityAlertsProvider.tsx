'use client'

import { useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useToast } from '@/components/ToastProvider'

interface SecurityAlertsProviderProps {
	children: React.ReactNode
	isAdmin: boolean
}

export function SecurityAlertsProvider({ children, isAdmin }: SecurityAlertsProviderProps) {
	const { addToast } = useToast()
	const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null>(null)

	useEffect(() => {
		if (!isAdmin) {
			return
		}

		const supabase = createBrowserClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
		)

		const channel = supabase
			.channel('security-alerts')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'audit_log',
					filter: 'action=in.(failed_login,ip_blocked,2fa_failed)',
				},
				(payload) => {
					const event = payload.new as {
						action: string
						details: Record<string, unknown> | null
					}

					let message: string

					switch (event.action) {
						case 'failed_login':
							message = `Nieudane logowanie z IP: ${event.details?.ip || 'unknown'}`
							break
						case 'ip_blocked':
							message = `IP zablokowane: ${event.details?.ip || 'unknown'}`
							break
						case '2fa_failed':
							message = 'Nieudane 2FA'
							break
						default:
							return
					}

					addToast(message, 'error')
				}
			)
			.subscribe()

		channelRef.current = channel

		return () => {
			supabase.removeChannel(channel)
			channelRef.current = null
		}
	}, [isAdmin, addToast])

	return <>{children}</>
}
