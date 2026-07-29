'use client'

import Link from 'next/link'
import Image from 'next/image'
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
		<div className="min-h-screen bg-[#f1f3f2] text-[#252927] dark:bg-[#070807] dark:text-[#eef0ef]">
			<MobileNav currentPath="/konta" showKonta showAudit={canAccessAudit} showSettings={canAccessSettings} />
			<header className="border-b border-black/[0.07] bg-white/45 dark:border-white/[0.08] dark:bg-[#090a09]">
				<div className="mx-auto flex h-12 w-full max-w-[1180px] items-center px-4 sm:px-6">
					<Image src="/logo/vezcore_logo_black_full.svg" alt="VEZcore" width={104} height={42} className="h-auto w-[104px] dark:hidden" priority />
					<Image src="/logo/vezcore_logo_white_full.svg" alt="VEZcore" width={104} height={42} className="hidden h-auto w-[104px] dark:block" priority />
					<span className="mx-3 h-4 w-px bg-black/[0.08] dark:bg-white/[0.1]" />
					<span className="text-[10px] text-[#747b78] dark:text-[#8f9692]">Aktywność konta</span>
					<div className="ml-auto flex items-center gap-1.5">
						<ThemeToggle />
						<Link href={`/konta/${user.id}`} className="flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[10px] text-[#626966] hover:bg-black/[0.04] dark:text-[#aab0ad] dark:hover:bg-white/[0.07]">
							<ArrowLeft className="h-3.5 w-3.5" /> Konto
						</Link>
					</div>
				</div>
			</header>

			<main className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
				<section className="border-b border-black/[0.1] pb-6 dark:border-white/[0.09]">
					<p className="text-[9px] font-semibold uppercase text-[#808783] dark:text-[#8f9692]">Historia bezpieczeństwa</p>
					<h1 className="mt-1 text-[28px] font-semibold">Aktywność użytkownika</h1>
					<p className="mt-1.5 font-mono text-[10px] text-[#777e7a] dark:text-[#8e9591]">{user.email}</p>
					<div className="mt-6 grid grid-cols-3 border-y border-black/[0.07] py-4 dark:border-white/[0.07]">
						{[['Zdarzenia', auditLog.length], ['Aktywne sesje', sessions.length], ['Adresy IP', ipHistory.length]].map(([label, value], index) => (
							<div key={String(label)} className={`px-4 first:pl-0 ${index > 0 ? 'border-l border-black/[0.07] dark:border-white/[0.07]' : ''}`}>
								<p className="text-[9px] uppercase text-[#969c99]">{label}</p>
								<p className="mt-1 font-mono text-[18px] font-semibold">{value}</p>
							</div>
						))}
					</div>
				</section>

				<div className="grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_370px]">
					<section>
						<div className="border-b border-black/[0.09] pb-3 dark:border-white/[0.09]">
							<h2 className="text-[14px] font-semibold">Dziennik aktywności</h2>
							<p className="mt-1 text-[10px] text-[#858c88]">Zdarzenia zapisane dla tego użytkownika</p>
						</div>
						{auditLog.length === 0 ? (
							<p className="py-10 text-center text-[10px] text-[#929895]">Brak zapisanej aktywności</p>
						) : auditLog.map((entry) => {
							const ip = typeof entry.details?.ip === 'string' ? entry.details.ip : null
							const actionMeta = ACTION_META[entry.action] ?? { label: entry.action, Icon: ClipboardList, iconClassName: 'text-[#777e7a]' }
							const ActivityIcon = actionMeta.Icon
							return (
								<div key={entry.id} className="grid grid-cols-[30px_minmax(0,1fr)_auto] gap-3 border-b border-black/[0.07] py-3.5 dark:border-white/[0.07]">
									<span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-black/[0.035] dark:bg-white/[0.05]">
										<ActivityIcon className={`h-3.5 w-3.5 ${actionMeta.iconClassName}`} />
									</span>
									<div className="min-w-0">
										<p className="truncate text-[11px] font-medium">{actionMeta.label}</p>
										<p className="mt-1 truncate font-mono text-[9px] text-[#8b918e]">
											{entry.entity_type || 'konto'}{entry.entity_id ? ` · ${entry.entity_id}` : ''}{ip ? ` · IP ${ip}` : ''}
										</p>
									</div>
									<time className="font-mono text-[9px] text-[#8b918e]">{formatDate(entry.created_at)}</time>
								</div>
							)
						})}
					</section>

					<aside className="space-y-7">
						<section>
							<div className="border-b border-black/[0.09] pb-3 dark:border-white/[0.09]">
								<h2 className="text-[14px] font-semibold">Aktywne sesje</h2>
								<p className="mt-1 text-[10px] text-[#858c88]">Urządzenia z ważnym dostępem</p>
							</div>
							{sessions.length === 0 ? (
								<p className="py-6 text-[10px] text-[#929895]">Brak aktywnych sesji</p>
							) : sessions.map((session) => {
								const DeviceIcon = isMobile(session.user_agent) ? Smartphone : Laptop
								return (
									<div key={session.id} className="flex gap-3 border-b border-black/[0.07] py-3.5 dark:border-white/[0.07]">
										<DeviceIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#838a86]" />
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<p className="truncate text-[11px] font-medium">{parseDeviceLabel(session.user_agent)}</p>
												{session.is_current && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Bieżąca sesja" />}
												{session.aal === 'aal2' && <span className="text-[8px] font-medium text-[#806b86] dark:text-[#c5adc9]">2FA</span>}
											</div>
											<p className="mt-1 flex items-center gap-1 font-mono text-[9px] text-[#8b918e]"><Globe className="h-2.5 w-2.5" /> {session.ip}</p>
											<p className="mt-1 flex items-center gap-1 text-[9px] text-[#8b918e]"><Clock className="h-2.5 w-2.5" /> {formatDate(session.updated_at)}</p>
										</div>
									</div>
								)
							})}
						</section>

						<section>
							<div className="border-b border-black/[0.09] pb-3 dark:border-white/[0.09]">
								<h2 className="text-[14px] font-semibold">Historia IP</h2>
							</div>
							{ipHistory.length === 0 ? <p className="py-6 text-[10px] text-[#929895]">Brak danych IP</p> : ipHistory.map((entry) => (
								<div key={entry.ip} className="flex items-center justify-between border-b border-black/[0.07] py-3 dark:border-white/[0.07]">
									<div>
										<p className="font-mono text-[10px]">{entry.ip}</p>
										<p className="mt-0.5 text-[9px] text-[#8b918e]">{entry.count} zdarzeń</p>
									</div>
									<time className="font-mono text-[9px] text-[#8b918e]">{formatDate(entry.last_seen)}</time>
								</div>
							))}
						</section>
					</aside>
				</div>
			</main>
		</div>
	)
}
