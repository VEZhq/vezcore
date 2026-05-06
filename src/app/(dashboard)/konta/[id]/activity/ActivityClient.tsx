'use client'

import Link from 'next/link'
import {
	Home, User, Settings, ArrowLeft, Shield, Clock, Globe, Smartphone, Laptop,
	LogIn, LogOut, UserCog, KeyRound, ShieldCheck, ShieldPlus, ShieldOff,
	RotateCcw, Eye, UserPlus, UserX, Mail, ClipboardList
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'
import { MobileNav } from '@/components/MobileNav'

interface AuditLogEntry {
	id: string
	action: string
	details: Record<string, unknown> | null
	entity_type: string | null
	entity_id: string | null
	created_at: string
}

interface SessionEntry {
	id: string
	ip: string
	user_agent: string
	created_at: string
	updated_at: string
	aal: string
	is_current: boolean
}

interface UserData {
	id: string
	full_name: string | null
	email: string
}

interface ActivityClientProps {
	user: UserData
	auditLog: AuditLogEntry[]
	sessions: SessionEntry[]
	canAccessAudit: boolean
	canAccessSettings: boolean
}

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

interface ActionMeta {
	label: string
	Icon: LucideIcon
	iconClassName: string
}

const ACTION_META: Record<string, ActionMeta> = {
	login: { label: 'Logowanie', Icon: LogIn, iconClassName: 'text-emerald-500' },
	logout: { label: 'Wylogowanie', Icon: LogOut, iconClassName: 'text-red-500' },
	profile_update: { label: 'Aktualizacja profilu', Icon: UserCog, iconClassName: 'text-blue-400' },
	password_change: { label: 'Zmiana hasła', Icon: KeyRound, iconClassName: 'text-yellow-400' },
	'2fa_verify': { label: 'Weryfikacja 2FA', Icon: ShieldCheck, iconClassName: 'text-violet-400' },
	'2fa_enable': { label: 'Włączenie 2FA', Icon: ShieldPlus, iconClassName: 'text-violet-400' },
	'2fa_disable': { label: 'Wyłączenie 2FA', Icon: ShieldOff, iconClassName: 'text-orange-400' },
	session_revoke: { label: 'Odwołanie sesji', Icon: RotateCcw, iconClassName: 'text-red-500' },
	all_sessions_revoked: { label: 'Odwołanie wszystkich sesji', Icon: RotateCcw, iconClassName: 'text-red-500' },
	admin_sessions_view: { label: 'Podgląd sesji (admin)', Icon: Eye, iconClassName: 'text-[#888888] light:text-[#666666]' },
	admin_session_revoke: { label: 'Odwołanie sesji (admin)', Icon: RotateCcw, iconClassName: 'text-red-500' },
	user_update: { label: 'Aktualizacja użytkownika', Icon: UserCog, iconClassName: 'text-blue-400' },
	user_delete: { label: 'Usunięcie użytkownika', Icon: UserX, iconClassName: 'text-red-500' },
	user_create: { label: 'Utworzenie użytkownika', Icon: UserPlus, iconClassName: 'text-emerald-500' },
	role_change: { label: 'Zmiana roli', Icon: Shield, iconClassName: 'text-yellow-400' },
	email_change: { label: 'Zmiana emaila', Icon: Mail, iconClassName: 'text-yellow-400' },
}

export default function ActivityClient({ user, auditLog, sessions, canAccessAudit, canAccessSettings }: ActivityClientProps) {
	const { preferences } = useUserPreferences()

	const formatDate = (dateStr: string | null) => {
		if (!dateStr) return 'Nigdy'
		const date = new Date(dateStr)
		return date.toLocaleDateString('pl-PL', {
			timeZone: preferences.timezone,
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	const ipMap = new Map<string, { count: number; last_seen: string }>()
	for (const entry of auditLog) {
		const ip = typeof entry.details?.ip === 'string' ? entry.details.ip : null
		if (!ip) continue
		const existing = ipMap.get(ip)
		if (existing) {
			existing.count++
			if (new Date(entry.created_at).getTime() > new Date(existing.last_seen).getTime()) {
				existing.last_seen = entry.created_at
			}
		} else {
			ipMap.set(ip, { count: 1, last_seen: entry.created_at })
		}
	}
	const ipHistory = Array.from(ipMap.entries())
		.map(([ip, data]) => ({ ip, count: data.count, last_seen: data.last_seen }))
		.sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime())

	return (
		<div className="min-h-screen bg-[#0a0a0a] light:bg-[#f5f5f5] transition-colors duration-300">
			<MobileNav currentPath="/konta" showKonta={true} showAudit={canAccessAudit} showSettings={canAccessSettings} />

			<div className="hidden lg:flex fixed top-6 left-6 right-6 z-50 items-center justify-between">
				<div className="flex items-center gap-6">
					<Link
						href="/dashboard"
						className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
					>
						<Home className="h-3 w-3" />
						Dashboard
					</Link>
					<Link
						href="/profile"
						className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
					>
						<User className="h-3 w-3" />
						Profil
					</Link>
					<Link
						href="/konta"
						className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
					>
						Konta
					</Link>
					{canAccessAudit && (
						<Link
							href="/audit"
							className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
						>
							Audit Log
						</Link>
					)}
					{canAccessSettings && (
						<Link
							href="/settings"
							className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
						>
							<Settings className="h-3 w-3" />
							Ustawienia
						</Link>
					)}
				</div>
			</div>

			<div className="p-4 lg:p-8 pt-20 lg:pt-24">
				<div className="max-w-2xl mx-auto space-y-6 lg:space-y-8">
					<div className="flex items-center gap-4">
						<Link
							href={`/konta/${user.id}`}
							className="text-[#444444] hover:text-white light:hover:text-black transition-colors"
						>
							<ArrowLeft className="h-5 w-5" />
						</Link>
						<div>
							<h1 className="text-2xl font-medium text-white light:text-black transition-colors duration-300">
								Aktywność użytkownika
							</h1>
							<p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mt-1 transition-colors duration-300">
								{user.email}
							</p>
						</div>
					</div>

					<div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-colors duration-300">
						<div className="p-6">
							<p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mb-4">
								Dziennik aktywności
							</p>
							{auditLog.length === 0 ? (
								<p className="text-xs text-[#444444] light:text-[#888888] py-4 text-center">
									Brak aktywności
								</p>
							) : (
								<div className="divide-y divide-white/[0.04] light:divide-black/[0.04]">
									{auditLog.map((entry) => {
										const ip = typeof entry.details?.ip === 'string' ? entry.details.ip : null
										const actionMeta = ACTION_META[entry.action] ?? {
											label: entry.action,
											Icon: ClipboardList,
											iconClassName: 'text-[#666666] light:text-[#999999]',
										}
										const ActivityIcon = actionMeta.Icon
										return (
											<div key={entry.id} className="py-3">
												<div className="flex items-center justify-between gap-4">
													<div className="flex min-w-0 items-start gap-2">
														<ActivityIcon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${actionMeta.iconClassName}`} />
														<div className="min-w-0">
															<p className="text-xs text-white light:text-black truncate">
																{actionMeta.label}
															</p>
															{entry.entity_type && (
																<p className="text-[10px] text-[#444444] light:text-[#888888] mt-0.5">
																	{entry.entity_type}{entry.entity_id ? ` · ${entry.entity_id}` : ''}
																</p>
															)}
															{ip && (
																<p className="text-[10px] text-[#444444] light:text-[#888888] font-mono mt-0.5">
																	IP: {ip}
																</p>
															)}
														</div>
													</div>
													<span className="text-[10px] text-[#444444] light:text-[#888888] font-mono shrink-0">
														{formatDate(entry.created_at)}
													</span>
												</div>
											</div>
										)
									})}
								</div>
							)}
						</div>
					</div>

					<div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-colors duration-300">
						<div className="p-6 border-b border-white/[0.06] light:border-black/[0.06]">
							<div className="flex items-center gap-2">
								<Shield className="h-4 w-4 text-[#444444] light:text-[#888888]" />
								<p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
									Aktywne sesje
								</p>
							</div>
						</div>
						{sessions.length === 0 ? (
							<div className="p-8 text-center">
								<p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
									Brak aktywnych sesji
								</p>
							</div>
						) : (
							<div className="divide-y divide-white/[0.04] light:divide-black/[0.04]">
								{sessions.map((session) => {
									const DeviceIcon = isMobile(session.user_agent) ? Smartphone : Laptop
									const deviceLabel = parseDeviceLabel(session.user_agent)
									const isAal2 = session.aal === 'aal2'

									return (
										<div
											key={session.id}
											className="p-4 hover:bg-white/[0.02] light:hover:bg-black/[0.02] transition-colors"
										>
											<div className="flex items-center gap-3">
												<DeviceIcon className="h-4 w-4 text-[#666666] light:text-[#999999] shrink-0" />
												<div>
													<div className="flex items-center gap-2 flex-wrap">
														<p className="text-sm text-white light:text-black">
															{deviceLabel}
														</p>
														{session.is_current && (
															<span className="text-[9px] uppercase tracking-[0.2em] text-emerald-400 border border-emerald-400/30 px-1.5 py-0.5">
																Bieżąca
															</span>
														)}
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
										</div>
									)
								})}
							</div>
						)}
					</div>

					<div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-colors duration-300">
						<div className="p-6">
							<div className="flex items-center gap-2 mb-4">
								<Globe className="h-4 w-4 text-[#444444] light:text-[#888888]" />
								<p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
									Historia IP
								</p>
							</div>
							{ipHistory.length === 0 ? (
								<p className="text-xs text-[#444444] light:text-[#888888] py-4 text-center">
									Brak danych IP
								</p>
							) : (
								<div className="divide-y divide-white/[0.04] light:divide-black/[0.04]">
									{ipHistory.map((entry) => (
										<div key={entry.ip} className="flex items-center justify-between py-3">
											<div>
												<p className="text-xs text-white light:text-black font-mono">
													{entry.ip}
												</p>
												<p className="text-[10px] text-[#444444] light:text-[#888888] mt-0.5">
													{entry.count} {entry.count === 1 ? 'zdarzenie' : entry.count < 5 ? 'zdarzenia' : 'zdarzeń'}
												</p>
											</div>
											<span className="text-[10px] text-[#444444] light:text-[#888888] font-mono shrink-0">
												{formatDate(entry.last_seen)}
											</span>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
