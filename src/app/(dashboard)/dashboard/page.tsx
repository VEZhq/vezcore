import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Clock3, User, ClipboardList, Settings, UserCog } from 'lucide-react'
import { NeuralBackground } from '@/components/NeuralBackground'
import { SystemHealth } from '@/components/SystemHealth'
import { getDashboardAuthUser } from '@/lib/queries/auth'
import { DashboardModules } from './DashboardModules'
import { DashboardCommandCenter } from './DashboardCommandCenter'
import { DashboardHeaderStatus } from './DashboardHeaderStatus'
import { getDashboardStatsForLast24Hours, getRecentDashboardActivity } from '@/lib/queries/dashboard'
import { getUserPermissions } from '@/lib/permissions'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'

type QuickCardTone = 'ok' | 'warning' | 'danger' | 'neutral'

function formatCardDate(value: string | null | undefined) {
  if (!value) return 'Brak danych'
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getAuditLabel(action: string) {
  const labels: Record<string, string> = {
    login: 'Logowanie',
    logout: 'Wylogowanie',
    failed_login: 'Nieudane logowanie',
    ip_blocked: 'IP zablokowane',
    '2fa_verify': '2FA potwierdzone',
    '2fa_failed': 'Błąd 2FA',
    '2fa_disable': '2FA wyłączone',
    profile_update: 'Profil zmieniony',
    password_change: 'Hasło zmienione',
    user_create: 'Użytkownik dodany',
    user_update: 'Użytkownik zmieniony',
    user_delete: 'Użytkownik usunięty',
    email_change: 'Email zmieniony',
    permission_grant: 'Nadano pozwolenie',
    permission_revoke: 'Cofnięto pozwolenie',
    session_revoke: 'Sesja cofnięta',
    all_sessions_revoked: 'Sesje wyczyszczone',
  }

  return labels[action] ?? action.replaceAll('_', ' ')
}

export default async function DashboardPage() {
  // Next.js can render a page in parallel with its parent layout. Guard the
  // page itself before querying stats so a layout redirect cannot serialize
  // sensitive dashboard data into an unauthenticated RSC response.
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) redirect('/login')

  const user = await getDashboardAuthUser()
  if (!user) redirect('/login')

  const permissions = await getUserPermissions()
  const dashboardStats = permissions.canAccessKonta || permissions.canAccessAudit
    ? await getDashboardStatsForLast24Hours()
    : null
  const recentActivity = permissions.canAccessAudit
    ? await getRecentDashboardActivity(true)
    : null
  const latestActivity = recentActivity?.[0] ?? null
  const errors24h = dashboardStats?.errors_24h ?? 0
  const auditTone = errors24h > 4 ? 'danger' : errors24h > 0 ? 'warning' : 'ok'
  const profileStatus = user.email_confirmed_at ? 'Email OK' : 'Potwierdź email'
  const profileTone: QuickCardTone = user.email_confirmed_at ? 'neutral' : 'warning'

  const quickLinks = [
    {
      name: 'Profil',
      value: formatCardDate(user.last_sign_in_at),
      detail: `Ostatni login · ${permissions.role ?? 'user'}`,
      status: profileStatus,
      tone: profileTone,
      href: '/profile',
      icon: User,
    },
    ...(permissions.canAccessKonta ? [{
      name: 'Konta',
      value: `${dashboardStats?.total_users ?? 0}`,
      detail: `${dashboardStats?.active_sessions ?? 0} aktywnych sesji`,
      status: permissions.canManagePermissions ? 'Możesz edytować' : 'Podgląd',
      tone: 'neutral' as QuickCardTone,
      href: '/konta',
      icon: UserCog,
    }] : []),
    ...(permissions.canAccessAudit ? [{
      name: 'Audit Log',
      value: `${errors24h}`,
      detail: errors24h === 1 ? 'błąd bezpieczeństwa / 24h' : 'błędów bezpieczeństwa / 24h',
      status: errors24h > 0 ? 'Sprawdź' : 'Czysto',
      tone: auditTone,
      href: '/audit',
      icon: ClipboardList,
    }] : []),
    ...(permissions.canAccessAudit ? [{
      name: 'Ostatnia aktywność',
      value: latestActivity ? getAuditLabel(latestActivity.action) : 'Brak zdarzeń',
      detail: latestActivity ? formatCardDate(latestActivity.created_at) : `${dashboardStats?.recent_logins ?? 0} logowań / 24h`,
      status: `${dashboardStats?.recent_logins ?? 0} logowań / 24h`,
      tone: 'neutral' as QuickCardTone,
      href: '/audit',
      icon: Clock3,
    }] : []),
    ...(permissions.canAccessSettings ? [{
      name: 'Ustawienia',
      value: permissions.canAccessInfrastructure ? 'Infra + Core' : 'Core',
      detail: permissions.canAccessInfrastructure ? 'Konfiguracja i infrastruktura' : 'Konfiguracja VEZcore',
      status: permissions.canAccessInfrastructure ? 'Infra dostępna' : 'Dostępne',
      tone: 'neutral' as QuickCardTone,
      href: '/settings',
      icon: Settings,
    }] : []),
  ]

  const toneClass = {
    ok: 'text-emerald-400 light:text-emerald-600 bg-emerald-400/10 light:bg-emerald-600/10',
    warning: 'text-amber-300 light:text-amber-600 bg-amber-400/10 light:bg-amber-500/10',
    danger: 'text-red-300 light:text-red-600 bg-red-400/10 light:bg-red-500/10',
    neutral: 'text-[#9a9a9a] light:text-[#666666] bg-white/[0.04] light:bg-black/[0.04]',
  } as const

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] light:bg-[#f5f5f5] transition-colors duration-300">
      <NeuralBackground />

      <div
        className="fixed inset-0 pointer-events-none opacity-20 light:opacity-10 transition-opacity duration-300"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px',
          color: 'rgba(100, 100, 100, 0.3)',
        }}
      />

      <div className="relative z-10 min-h-screen px-4 py-8 sm:py-10">
        <div className="mx-auto w-full max-w-6xl">
          <header className="mb-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Image
                  src="/logo/vezcore_logo_white_full.svg"
                  alt="vezCore"
                  width={190}
                  height={58}
                  className="h-auto w-[190px] max-w-[60vw] opacity-85 light:opacity-0 light:hidden transition-opacity duration-300"
                  priority
                />
                <Image
                  src="/logo/vezcore_logo_black_full.svg"
                  alt="vezCore"
                  width={190}
                  height={58}
                  className="h-auto w-[190px] max-w-[60vw] opacity-0 light:opacity-85 dark:hidden transition-opacity duration-300"
                  priority
                />
                {permissions.canAccessInfrastructure && <DashboardHeaderStatus />}
              </div>
            </div>

            <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
              {quickLinks.map((link) => (
                <Link
                  key={`${link.href}-${link.name}`}
                  href={link.href}
                  className="group min-h-[124px] rounded-lg border border-white/[0.07] light:border-black/[0.08] bg-[#0b0b0b]/70 light:bg-white/90 p-3 backdrop-blur-xl transition-colors duration-300 hover:border-emerald-400/30 light:hover:border-emerald-600/25"
                >
                  <span className="flex h-full flex-col justify-between gap-3">
                    <span className="flex min-w-0 items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/[0.07] light:border-black/[0.08] bg-white/[0.03] light:bg-black/[0.025] text-[#9a9a9a] light:text-[#777777] transition-colors duration-300 group-hover:text-emerald-400 light:group-hover:text-emerald-600">
                        <link.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-white light:text-black">{link.name}</span>
                        <span className="mt-3 block truncate text-2xl font-semibold text-white light:text-black">{link.value}</span>
                        <span className="mt-1 block truncate text-[11px] text-[#777777] light:text-[#777777]">{link.detail}</span>
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2 border-t border-white/[0.05] light:border-black/[0.06] pt-2">
                      <span className="text-[10px] text-[#555555] light:text-[#999999]">Status</span>
                      <span className={`shrink-0 rounded px-2 py-1 text-[10px] font-medium ${toneClass[link.tone as keyof typeof toneClass]}`}>
                        {link.status}
                      </span>
                    </span>
                  </span>
                </Link>
              ))}
            </nav>
          </header>

          <DashboardCommandCenter
            access={{
              canAccessKonta: permissions.canAccessKonta,
              canAccessAudit: permissions.canAccessAudit,
              canAccessSettings: permissions.canAccessSettings,
              canAccessInfrastructure: permissions.canAccessInfrastructure,
              canAccessVezVision: permissions.canAccessVezVision,
              canViewVezVisionBlog: permissions.canViewVezVisionBlog,
              canViewVezVisionPortfolio: permissions.canViewVezVisionPortfolio,
              canViewVezVisionServices: permissions.canViewVezVisionServices,
              canViewVezVisionFaq: permissions.canViewVezVisionFaq,
              canViewVezVisionNewsletter: permissions.canViewVezVisionNewsletter,
              canViewVezVisionFiles: permissions.canViewVezVisionFiles,
              canViewVezVisionSettings: permissions.canViewVezVisionSettings,
              canViewVezVisionCalendar: permissions.canViewVezVisionCalendar,
              role: permissions.role,
            }}
            user={{
              id: user.id,
              email: user.email,
              lastSignInAt: user.last_sign_in_at,
            }}
          />

          <DashboardModules
            canAccessVezVision={permissions.canAccessVezVision}
            canAccessInfrastructure={permissions.canAccessInfrastructure}
          />

          {permissions.canAccessInfrastructure && (
            <div id="infrastructure" className="w-full scroll-mt-8">
              <SystemHealth />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
