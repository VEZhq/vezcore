'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, Globe, RefreshCw, X, AlertCircle, Smartphone, Laptop, Users } from 'lucide-react'
import { getAllUserSessions, adminRevokeSession, type GlobalSessionInfo } from '@/lib/actions/sessions'
import { useConfirm } from '@/components/ConfirmDialog'
import { useCSRFToken } from '@/hooks/useCSRFToken'

function parseDeviceLabel(userAgent: string): string {
	if (userAgent === 'unknown' || userAgent === 'node' || !userAgent) return 'Nieznane urządzenie'

	const ua = userAgent.toLowerCase()

	if (ua.includes('iphone')) return 'iPhone'
	if (ua.includes('ipad')) return 'iPad'
	if (ua.includes('android') && ua.includes('mobile')) return 'Android (telefon)'
	if (ua.includes('android')) return 'Android (tablet)'
	if (ua.includes('macintosh') || ua.includes('mac os x')) {
		if (ua.includes('chrome')) return 'Mac — Chrome'
		if (ua.includes('safari')) return 'Mac — Safari'
		if (ua.includes('firefox')) return 'Mac — Firefox'
		return 'Mac'
	}
	if (ua.includes('windows')) {
		if (ua.includes('chrome')) return 'Windows — Chrome'
		if (ua.includes('firefox')) return 'Windows — Firefox'
		if (ua.includes('edge')) return 'Windows — Edge'
		return 'Windows'
	}
	if (ua.includes('linux')) return 'Linux'

	return userAgent.length > 60 ? userAgent.substring(0, 60) + '…' : userAgent
}

function isMobile(userAgent: string): boolean {
	const ua = userAgent.toLowerCase()
	return ua.includes('iphone') || ua.includes('ipad') || (ua.includes('android') && ua.includes('mobile'))
}

function formatDate(dateStr: string) {
	const date = new Date(dateStr)
	return date.toLocaleDateString('pl-PL', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

export function GlobalSessionsManager() {
	const { confirm } = useConfirm()
	const { token: csrfToken } = useCSRFToken()
	const [sessions, setSessions] = useState<GlobalSessionInfo[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [revoking, setRevoking] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await getAllUserSessions()
		if ('error' in result && result.error) {
			setError(result.error)
			setSessions([])
		} else {
			setSessions(result.sessions)
    }
    setLoading(false)
	}, [])

  useEffect(() => {
    let cancelled = false
    getAllUserSessions().then((result) => {
      if (cancelled) return
      if ('error' in result && result.error) {
        setError(result.error)
        setSessions([])
      } else {
        setSessions(result.sessions)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

	const handleRevoke = async (sessionId: string, userEmail: string) => {
		const confirmed = await confirm({
			title: 'Odwołać sesję?',
			message: `Czy na pewno chcesz odwołać sesję użytkownika ${userEmail}? Urządzenie zostanie wylogowane.`,
			confirmText: 'Odwołaj',
			variant: 'danger',
		})

		if (!confirmed) return

		setRevoking(sessionId)
		setError(null)
		const session = sessions.find((s) => s.id === sessionId)
		if (!csrfToken) {
			setError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
			setRevoking(null)
			return
		}

		const result = await adminRevokeSession(sessionId, session?.user_id ?? '', csrfToken)
		if ('error' in result && result.error) {
			setError(result.error)
		} else {
			await loadSessions()
		}
		setRevoking(null)
	}

	if (loading) {
		return (
			<div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 p-6">
				<div className="flex items-center gap-2 mb-4">
					<Users className="h-4 w-4 text-[#444444] light:text-[#888888]" />
					<p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
						Wszystkie sesje
					</p>
				</div>
				<div className="flex items-center justify-center py-8">
					<RefreshCw className="h-6 w-6 text-[#444444] animate-spin" />
				</div>
			</div>
		)
	}

	const sessionsByUser = sessions.reduce<Record<string, GlobalSessionInfo[]>>((acc, session) => {
		const email = session.user_email
		if (!acc[email]) {
			acc[email] = []
		}
		acc[email].push(session)
		return acc
	}, {})

	return (
		<div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 transition-colors duration-300">
			<div className="p-6 border-b border-white/[0.06] light:border-black/[0.06]">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Users className="h-4 w-4 text-[#444444] light:text-[#888888]" />
						<p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
							Wszystkie sesje
						</p>
						<span className="text-[10px] text-[#666666] light:text-[#999999]">
							({sessions.length})
						</span>
					</div>
					<button
						onClick={loadSessions}
						className="text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] hover:text-white light:hover:text-black transition-colors"
					>
						Odśwież
					</button>
				</div>
			</div>

			{error && (
				<div className="p-4 bg-red-500/10 border-b border-red-500/20">
					<div className="flex items-center gap-2">
						<AlertCircle className="h-4 w-4 text-red-400" />
						<p className="text-xs text-red-400">{error}</p>
					</div>
				</div>
			)}

			<div className="divide-y divide-white/[0.04] light:divide-black/[0.04]">
				{sessions.length === 0 ? (
					<div className="p-8 text-center">
						<p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
							Brak aktywnych sesji
						</p>
					</div>
				) : (
					Object.entries(sessionsByUser).map(([userEmail, userSessions]) => (
						<div key={userEmail}>
							<div className="px-4 py-2 bg-white/[0.02] light:bg-black/[0.02] border-b border-white/[0.04] light:border-black/[0.04]">
								<p className="text-xs text-[#666666] light:text-[#999999] truncate">
									{userEmail}
								</p>
							</div>
							{userSessions.map((session) => {
								const DeviceIcon = isMobile(session.user_agent) ? Smartphone : Laptop
								const deviceLabel = parseDeviceLabel(session.user_agent)
								const isAal2 = session.aal === 'aal2'

								return (
									<div
										key={session.id}
										className="p-4 hover:bg-white/[0.02] light:hover:bg-black/[0.02] transition-colors"
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<DeviceIcon className="h-4 w-4 text-[#666666] light:text-[#999999] shrink-0" />
												<div>
													<div className="flex items-center gap-2 flex-wrap">
														<p className="text-sm text-white light:text-black">
															{deviceLabel}
														</p>
														{isAal2 && (
															<span className="text-[9px] uppercase tracking-[0.2em] text-blue-400 border border-blue-400/30 px-1.5 py-0.5">
																2FA
															</span>
														)}
													</div>
													<div className="flex items-center gap-4 mt-1 flex-wrap">
														<div className="flex items-center gap-1">
															<Globe className="h-3 w-3 text-[#444444] light:text-[#888888]" />
															<p className="text-[10px] text-[#666666] light:text-[#999999]">
																{session.ip}
															</p>
														</div>
														<div className="flex items-center gap-1">
															<Clock className="h-3 w-3 text-[#444444] light:text-[#888888]" />
															<p className="text-[10px] text-[#666666] light:text-[#999999]">
																{formatDate(session.updated_at)}
															</p>
														</div>
													</div>
												</div>
											</div>
											<button
												onClick={() => handleRevoke(session.id, userEmail)}
												disabled={revoking === session.id}
												title="Odwołaj sesję"
												className="p-2 text-[#666666] light:text-[#999999] hover:text-red-400 light:hover:text-red-600 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
											>
												{revoking === session.id ? (
													<RefreshCw className="h-4 w-4 animate-spin" />
												) : (
													<X className="h-4 w-4" />
												)}
											</button>
										</div>
									</div>
								)
							})}
						</div>
					))
				)}
			</div>
		</div>
	)
}
