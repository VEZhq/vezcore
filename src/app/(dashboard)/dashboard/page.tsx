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
import { getDashboardStatsForLast24Hours } from '@/lib/queries/dashboard'
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
  const errors24h = dashboardStats?.errors_24h ?? 0
  const auditTone = errors24h > 4 ? 'danger' : errors24h > 0 ? 'warning' : 'ok'
  const profileTone: QuickCardTone = user.email_confirmed_at ? 'neutral' : 'warning'

  const quickLinks = [
    {
      name: 'Profil',
      eyebrow: 'Twoje konto',
      description: 'Dane konta, hasło, 2FA i sesja.',
      meta: `Login: ${formatCardDate(user.last_sign_in_at)}`,
      action: user.email_confirmed_at ? 'Otwórz' : 'Email',
      tone: profileTone,
      href: '/profile',
      icon: User,
    },
    ...(permissions.canAccessKonta ? [{
      name: 'Konta',
      eyebrow: 'Użytkownicy',
      description: 'Role, dostępy i pozwolenia w VEZcore.',
      meta: `${dashboardStats?.total_users ?? 0} kont · ${dashboardStats?.active_sessions ?? 0} sesji`,
      action: permissions.canManagePermissions ? 'Zarządzaj' : 'Podgląd',
      tone: 'neutral' as QuickCardTone,
      href: '/konta',
      icon: UserCog,
    }] : []),
    ...(permissions.canAccessAudit ? [{
      name: 'Audit Log',
      eyebrow: 'Bezpieczeństwo',
      description: errors24h > 0 ? 'Są zdarzenia, które warto sprawdzić.' : 'Logowania i zdarzenia systemowe.',
      meta: errors24h === 1 ? '1 błąd / 24h' : `${errors24h} błędów / 24h`,
      action: errors24h > 0 ? 'Sprawdź' : 'Czysto',
      tone: auditTone,
      href: '/audit',
      icon: ClipboardList,
    }] : []),
    ...(permissions.canAccessAudit ? [{
      name: 'Ostatnia aktywność',
      eyebrow: 'Historia',
      description: 'Ostatnie wejścia i działania w panelu.',
      meta: `${dashboardStats?.recent_logins ?? 0} logowań / 24h`,
      action: 'Zobacz',
      tone: 'neutral' as QuickCardTone,
      href: '/audit',
      icon: Clock3,
    }] : []),
    ...(permissions.canAccessSettings ? [{
      name: 'Ustawienia',
      eyebrow: 'Konfiguracja',
      description: permissions.canAccessInfrastructure ? 'Core, infrastruktura i integracje.' : 'Podstawowe ustawienia VEZcore.',
      meta: permissions.canAccessInfrastructure ? 'Core + Infra' : 'Core',
      action: 'Otwórz',
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
  const dotClass = {
    ok: 'bg-emerald-400 light:bg-emerald-600',
    warning: 'bg-amber-300 light:bg-amber-500',
    danger: 'bg-red-400 light:bg-red-600',
    neutral: 'bg-[#5f5f5f] light:bg-[#999999]',
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

            <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(205px,1fr))]">
              {quickLinks.map((link) => (
                <Link
                  key={`${link.href}-${link.name}`}
                  href={link.href}
                  className="group min-h-[118px] rounded-lg border border-white/[0.07] light:border-black/[0.08] bg-[#0b0b0b]/70 light:bg-white/90 p-4 backdrop-blur-xl transition-colors duration-300 hover:border-emerald-400/30 light:hover:border-emerald-600/25"
                >
                  <span className="flex h-full flex-col justify-between gap-3">
                    <span className="space-y-3">
                      <span className="flex items-start justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/[0.07] light:border-black/[0.08] bg-white/[0.03] light:bg-black/[0.025] text-[#9a9a9a] light:text-[#777777] transition-colors duration-300 group-hover:text-emerald-400 light:group-hover:text-emerald-600">
                            <link.icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[9px] uppercase tracking-[0.18em] text-[#666666] light:text-[#999999]">{link.eyebrow}</span>
                            <span className="mt-0.5 block truncate text-sm font-semibold text-white light:text-black">{link.name}</span>
                          </span>
                        </span>
                        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotClass[link.tone as keyof typeof dotClass]}`} />
                      </span>
                      <span className="block text-sm leading-relaxed text-[#a9a9a9] light:text-[#555555]">
                        {link.description}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2 border-t border-white/[0.05] light:border-black/[0.06] pt-2">
                      <span className="truncate text-[11px] text-[#666666] light:text-[#888888]">{link.meta}</span>
                      <span className={`shrink-0 rounded px-2 py-1 text-[10px] font-medium ${toneClass[link.tone as keyof typeof toneClass]}`}>
                        {link.action}
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
