'use client'

import Link from 'next/link'
import {
	ArrowLeft, Shield, Clock, Globe, Smartphone, Laptop,
	LogIn, LogOut, UserCog, KeyRound, ShieldCheck, ShieldPlus, ShieldOff,
	RotateCcw, Eye, UserPlus, UserX, Mail, ClipboardList
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'
import { MobileNav } from '@/components/MobileNav'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

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
	profile_update: { label: 'Aktualizacja profilu', Icon: UserCog, iconClassName: 'text-[#d7bfd8]' },
	password_change: { label: 'Zmiana hasła', Icon: KeyRound, iconClassName: 'text-yellow-400' },
	'2fa_verify': { label: 'Weryfikacja 2FA', Icon: ShieldCheck, iconClassName: 'text-[#d7bfd8]' },
	'2fa_enable': { label: 'Włączenie 2FA', Icon: ShieldPlus, iconClassName: 'text-[#d7bfd8]' },
	'2fa_disable': { label: 'Wyłączenie 2FA', Icon: ShieldOff, iconClassName: 'text-orange-400' },
	session_revoke: { label: 'Odwołanie sesji', Icon: RotateCcw, iconClassName: 'text-red-500' },
	all_sessions_revoked: { label: 'Odwołanie wszystkich sesji', Icon: RotateCcw, iconClassName: 'text-red-500' },
	admin_sessions_view: { label: 'Podgląd sesji (admin)', Icon: Eye, iconClassName: 'text-[#888888] light:text-[#666666]' },
	admin_session_revoke: { label: 'Odwołanie sesji (admin)', Icon: RotateCcw, iconClassName: 'text-red-500' },
	user_update: { label: 'Aktualizacja użytkownika', Icon: UserCog, iconClassName: 'text-[#d7bfd8]' },
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

	const eventDate = (dateStr: string) => new Intl.DateTimeFormat('pl-PL', {
		timeZone: preferences.timezone,
		day: '2-digit',
		month: 'long',
		year: 'numeric',
	}).format(new Date(dateStr))

	const eventTime = (dateStr: string) => new Intl.DateTimeFormat('pl-PL', {
		timeZone: preferences.timezone,
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).format(new Date(dateStr))

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
		<div className="min-h-screen bg-white text-[#242725] dark:bg-[#070807] dark:text-[#eceeed] xl:h-screen xl:overflow-hidden">
			<MobileNav currentPath="/konta" showKonta showAudit={canAccessAudit} showSettings={canAccessSettings} />

			<div className="mx-auto grid min-h-screen w-full max-w-[1540px] xl:h-screen xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_370px]">
				<main className="min-w-0 px-5 py-8 sm:px-10 lg:px-14 xl:flex xl:min-h-0 xl:flex-col xl:overflow-hidden">
					<header className="flex shrink-0 items-end justify-between border-b border-black/[0.12] pb-7 dark:border-white/[0.1]">
						<div>
							<Link href={`/konta/${user.id}`} className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase text-[#68706d] hover:text-black dark:text-[#929895] dark:hover:text-white">
								<ArrowLeft className="h-3 w-3" />
								Konto
							</Link>
							<h1 className="mt-1 text-[34px] font-semibold leading-none">Aktywność</h1>
							<p className="mt-2 font-mono text-[10px] text-[#777e7a] dark:text-[#8e9591]">{user.email}</p>
						</div>
						<ThemeToggle />
					</header>

					<section className="audit-log-scroll pt-8 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-4">
						{auditLog.length === 0 ? (
							<div className="flex min-h-[420px] items-center justify-center text-[11px] text-[#929895]">Brak zapisanej aktywności</div>
						) : (
							auditLog.map((entry, index) => {
								const ip = typeof entry.details?.ip === 'string' ? entry.details.ip : null
								const meta = ACTION_META[entry.action] ?? { label: entry.action, Icon: ClipboardList, iconClassName: 'text-[#777e7a]' }
								const ActivityIcon = meta.Icon
								const dateLabel = eventDate(entry.created_at)
								const previousDate = index > 0 ? eventDate(auditLog[index - 1].created_at) : null
								const details = entry.details
									? Object.entries(entry.details).filter(([key]) => key !== 'ip').slice(0, 4)
									: []

								return (
									<div key={entry.id}>
										{dateLabel !== previousDate && (
											<div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 py-2">
												<span />
												<div className="flex items-center">
													<span className="h-px flex-1 bg-black/[0.12] dark:bg-white/[0.1]" />
													<span className="rounded-full border border-black/[0.14] bg-white px-3 py-1 text-[10px] font-semibold shadow-sm dark:border-white/[0.12] dark:bg-[#101211]">{dateLabel}</span>
													<span className="h-px flex-1 bg-black/[0.12] dark:bg-white/[0.1]" />
												</div>
											</div>
										)}

										<article className="grid grid-cols-[72px_26px_minmax(0,1fr)] gap-3">
											<time className="pt-[18px] text-right font-mono text-[11px] text-[#626966]">{eventTime(entry.created_at)}</time>
											<div className="relative flex justify-center">
												<span className="absolute bottom-0 top-0 w-px bg-black/[0.12] dark:bg-white/[0.1]" />
												<span className="relative mt-[15px] flex h-5 w-5 items-center justify-center rounded-full bg-[#edf1ef] ring-4 ring-white dark:bg-[#1a1d1b] dark:ring-[#070807]">
													<ActivityIcon className={`h-2.5 w-2.5 ${meta.iconClassName}`} />
												</span>
											</div>
											<div className="min-w-0 py-3 pb-7">
												<p className="text-[13px] leading-6">
													<strong className="font-semibold text-[#668976]">{user.full_name || user.email}</strong>{' '}
													<strong className="font-semibold text-[#292d2b] dark:text-[#e5e7e6]">{meta.label}</strong>
												</p>
												<p className="mt-0.5 font-mono text-[10px] text-[#737a77] dark:text-[#999f9c]">
													{entry.entity_type || 'konto'}{entry.entity_id ? ` · ${entry.entity_id}` : ''}{ip ? ` · IP ${ip}` : ''}
												</p>
												{details.length > 0 && (
													<div className="mt-2 space-y-1">
														{details.map(([key, value]) => (
															<p key={key} className="flex min-w-0 gap-1 text-[10px] text-[#69706d]">
																<b className="shrink-0 font-medium">{key}:</b>
																<span className="truncate font-mono">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
															</p>
														))}
													</div>
												)}
											</div>
										</article>
									</div>
								)
							})
						)}
					</section>
				</main>

				<aside className="border-l border-black/[0.10] bg-[#f7f8f7] px-6 py-7 dark:border-white/[0.09] dark:bg-[#0c0d0c] xl:flex xl:h-screen xl:flex-col xl:overflow-hidden">
					<div className="flex items-center justify-between border-b border-black/[0.09] pb-5 dark:border-white/[0.08]">
						<div>
							<h2 className="text-[20px] font-semibold leading-none">Sesje</h2>
							<p className="mt-1 text-[9px] text-[#8d9491]">Urządzenia i historia dostępu</p>
						</div>
						<div className="flex gap-4">
							<div className="text-right">
								<p className="font-mono text-[18px] font-semibold">{sessions.length}</p>
								<p className="text-[8px] uppercase text-[#929896]">Aktywne</p>
							</div>
							<div className="border-l border-black/[0.08] pl-4 text-right dark:border-white/[0.08]">
								<p className="font-mono text-[18px] font-semibold">{ipHistory.length}</p>
								<p className="text-[8px] uppercase text-[#929896]">Adresy IP</p>
							</div>
						</div>
					</div>

					<section className="pt-5">
						<h3 className="text-[12px] font-semibold">Aktywne urządzenia</h3>
						<p className="mt-0.5 text-[9px] text-[#929896]">Sesje z ważnym dostępem do panelu</p>
						<div className="mt-3">
							{sessions.length === 0 ? (
								<p className="py-5 text-[10px] text-[#929895]">Brak aktywnych sesji</p>
							) : sessions.slice(0, 5).map((session) => {
								const DeviceIcon = isMobile(session.user_agent) ? Smartphone : Laptop
								return (
									<div key={session.id} className="flex gap-3 border-b border-black/[0.07] py-3.5 dark:border-white/[0.07]">
										<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-white text-[#737b77] ring-1 ring-black/[0.06] dark:bg-white/[0.05] dark:ring-white/[0.08]">
											<DeviceIcon className="h-3.5 w-3.5" />
										</span>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<p className="truncate text-[10px] font-semibold">{parseDeviceLabel(session.user_agent)}</p>
												{session.is_current && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Bieżąca sesja" />}
												{session.aal === 'aal2' && <span className="text-[8px] font-medium text-[#806b86] dark:text-[#c5adc9]">2FA</span>}
											</div>
											<p className="mt-1 flex items-center gap-1 font-mono text-[9px] text-[#8b918e]"><Globe className="h-2.5 w-2.5" /> {session.ip}</p>
											<p className="mt-1 flex items-center gap-1 text-[9px] text-[#8b918e]"><Clock className="h-2.5 w-2.5" /> {formatDate(session.updated_at)}</p>
										</div>
									</div>
								)
							})}
						</div>
					</section>

					<section className="mt-6 border-t border-black/[0.08] pt-5 dark:border-white/[0.08]">
						<h3 className="text-[12px] font-semibold">Historia IP</h3>
						<div className="mt-2">
							{ipHistory.length === 0 ? (
								<p className="py-5 text-[10px] text-[#929895]">Brak danych IP</p>
							) : ipHistory.slice(0, 6).map((entry) => (
								<div key={entry.ip} className="flex items-center justify-between gap-3 border-b border-black/[0.07] py-3 dark:border-white/[0.07]">
									<div className="min-w-0">
										<p className="truncate font-mono text-[10px]">{entry.ip}</p>
										<p className="mt-0.5 text-[9px] text-[#8b918e]">{entry.count} zdarzeń</p>
									</div>
									<time className="shrink-0 font-mono text-[8px] text-[#8b918e]">{formatDate(entry.last_seen)}</time>
								</div>
							))}
						</div>
					</section>
				</aside>
			</div>
		</div>
	)
}
