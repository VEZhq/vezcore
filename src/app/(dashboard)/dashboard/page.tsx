import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Clock3, User, Settings, UserCog } from 'lucide-react'
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
      label: 'Profil',
      meta: formatCardDate(user.last_sign_in_at),
      tone: profileTone,
      href: '/profile',
      icon: User,
    },
    ...(permissions.canAccessKonta ? [{
      label: 'Konta',
      meta: `${dashboardStats?.total_users ?? 0} kont`,
      tone: 'neutral' as QuickCardTone,
      href: '/konta',
      icon: UserCog,
    }] : []),
    ...(permissions.canAccessAudit ? [{
      label: 'Aktywność',
      meta: errors24h > 0
        ? errors24h === 1 ? '1 błąd / 24h' : `${errors24h} błędów / 24h`
        : `${dashboardStats?.recent_logins ?? 0} logowań / 24h`,
      tone: auditTone,
      href: '/audit',
      icon: Clock3,
    }] : []),
    ...(permissions.canAccessSettings ? [{
      label: 'Ustawienia',
      meta: permissions.canAccessInfrastructure ? 'Core + Infra' : 'Core',
      tone: 'neutral' as QuickCardTone,
      href: '/settings',
      icon: Settings,
    }] : []),
  ]

  const toneClass = {
    ok: 'text-emerald-400 light:text-emerald-600',
    warning: 'text-amber-300 light:text-amber-600',
    danger: 'text-red-300 light:text-red-600',
    neutral: 'text-[#8a8a8a] light:text-[#666666]',
  } as const
  const dotClass = {
    ok: 'bg-emerald-400 light:bg-emerald-600',
    warning: 'bg-amber-300 light:bg-amber-500',
    danger: 'bg-red-400 light:bg-red-600',
    neutral: 'bg-[#5f5f5f] light:bg-[#999999]',
  } as const

  return (
    <div className="relative min-h-screen bg-[#080808] light:bg-[#f6f6f6] transition-colors duration-300">
      <div className="relative z-10 min-h-screen px-4 py-8 sm:py-10">
        <div className="mx-auto w-full max-w-6xl">
          <header className="mb-5">
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

            <nav className="mt-5 flex flex-wrap items-center gap-1 border-y border-white/[0.07] light:border-black/[0.08] bg-[#0d0d0d]/80 light:bg-white/80 px-1 py-1 backdrop-blur-xl">
              {quickLinks.map((link) => (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  className="group flex h-11 min-w-0 items-center gap-2 rounded-md px-3 text-[#b5b5b5] light:text-[#444444] transition-colors duration-200 hover:bg-white/[0.05] hover:text-white light:hover:bg-black/[0.04] light:hover:text-black"
                >
                  <link.icon className="h-4 w-4 shrink-0 text-[#777777] light:text-[#777777] transition-colors duration-200 group-hover:text-emerald-400 light:group-hover:text-emerald-600" />
                  <span className="text-sm font-medium">{link.label}</span>
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass[link.tone as keyof typeof dotClass]}`} />
                  <span className={`hidden max-w-[150px] truncate text-[11px] sm:inline ${toneClass[link.tone as keyof typeof toneClass]}`}>
                    {link.meta}
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
