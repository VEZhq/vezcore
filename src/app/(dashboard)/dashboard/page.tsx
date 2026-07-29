import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Activity, Bell, Clock3, Settings, UserCog, Users } from 'lucide-react'
import { ProfileAvatar } from '@/components/ProfileAvatar'
import { getAuthenticatedUserPermissionState, getUserPermissions } from '@/lib/permissions'
import { getDashboardAuthUser } from '@/lib/queries/auth'
import { getDashboardStatsForLast24Hours } from '@/lib/queries/dashboard'
import { getDashboardProfileSummary } from '@/lib/queries/profile'
import { DashboardModules } from './DashboardModules'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

type Tone = 'ok' | 'warning' | 'danger' | 'neutral'

export default async function DashboardPage() {
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) redirect('/login')

  const user = await getDashboardAuthUser()
  if (!user) redirect('/login')

  const [permissions, dashboardProfile] = await Promise.all([
    getUserPermissions(),
    getDashboardProfileSummary(user.id),
  ])
  const dashboardStats = permissions.canAccessKonta || permissions.canAccessAudit
    ? await getDashboardStatsForLast24Hours()
    : null
  const errors24h = dashboardStats?.errors_24h ?? 0
  const auditTone: Tone = errors24h > 4 ? 'danger' : errors24h > 0 ? 'warning' : 'ok'

  const quickLinks = [
    ...(permissions.canAccessKonta
      ? [{ label: 'Konta', tone: 'neutral' as Tone, href: '/konta', icon: UserCog }]
      : []),
    ...(permissions.canAccessSettings
      ? [{ label: 'Ustawienia', tone: 'neutral' as Tone, href: '/settings', icon: Settings }]
      : []),
  ]

  const dotClass = {
    ok: 'bg-emerald-500',
    warning: 'bg-amber-400',
    danger: 'bg-red-500',
    neutral: 'bg-[#9ca5a3]',
  } as const

  const metrics = [
    {
      value: dashboardStats?.total_users ?? 0,
      label: 'Konta',
      tone: 'neutral' as Tone,
      icon: Users,
    },
    {
      value: dashboardStats?.recent_logins ?? 0,
      label: 'Logowania / 24h',
      tone: 'ok' as Tone,
      icon: Activity,
    },
    {
      value: errors24h,
      label: 'Alerty / 24h',
      tone: auditTone,
      icon: Bell,
    },
  ]

  return (
    <div className="h-screen overflow-hidden bg-[#c8d0cf] text-[#202020] dark:bg-black dark:text-[#ededed]">
      <main className="relative h-full w-full overflow-hidden bg-[#f1f3f2] dark:bg-[#070807]">
        <div className="relative flex h-full flex-col px-2.5 py-2 sm:px-3.5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_8%,rgba(255,255,255,0.82),transparent_30%)] dark:bg-none" />

          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <header className="flex h-11 shrink-0 items-center gap-4 border-b border-black/[0.06] pb-1.5 dark:border-white/[0.08]">
              <div className="flex shrink-0 items-center gap-3">
                <Image
                  src="/logo/vezcore_logo_black_full.svg"
                  alt="VEZcore"
                  width={118}
                  height={48}
                  className="h-auto w-[118px] dark:hidden"
                  priority
                />
                <Image
                  src="/logo/vezcore_logo_white_full.svg"
                  alt="VEZcore"
                  width={118}
                  height={48}
                  className="hidden h-auto w-[118px] dark:block"
                  priority
                />
                <span className="hidden h-5 w-px bg-black/[0.08] sm:block dark:bg-white/[0.09]" />
                <span className="hidden items-center gap-1.5 text-[10px] font-medium text-[#737a78] sm:flex dark:text-[#929895]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Produkcja
                </span>
              </div>

              <nav className="hidden flex-1 items-center justify-center gap-0.5 lg:flex" aria-label="Główna nawigacja">
                {quickLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="group flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[11px] font-medium text-[#69706e] transition-colors hover:bg-white/70 hover:text-[#202020] dark:text-[#949a97] dark:hover:bg-white/[0.06] dark:hover:text-white"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{link.label}</span>
                      <span className={`h-1 w-1 rounded-full ${dotClass[link.tone]}`} />
                    </Link>
                  )
                })}
              </nav>

              <div className="ml-auto hidden items-center gap-3 xl:flex">
                {metrics.map((metric) => {
                  const Icon = metric.icon
                  return (
                    <div key={metric.label} className="flex items-center gap-1.5 border-l border-black/[0.06] pl-3 text-[10px] text-[#727977] dark:border-white/[0.08] dark:text-[#8e9491]">
                      <Icon className="h-3.5 w-3.5 text-[#929895]" />
                      <span>{metric.label}</span>
                      <strong className="font-semibold text-[#2b2e2d] dark:text-[#e5e7e6]">{metric.value}</strong>
                      <span className={`h-1 w-1 rounded-full ${dotClass[metric.tone]}`} />
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-1.5">
                <ThemeToggle />
                {permissions.canAccessAudit && (
                  <Link
                    href="/audit"
                    className="relative flex h-8 w-8 items-center justify-center rounded-[8px] text-[#69706e] transition-colors hover:bg-white hover:text-[#202020] dark:text-[#a7adaa] dark:hover:bg-white/[0.08] dark:hover:text-white"
                    aria-label="Aktywność"
                    title="Aktywność"
                  >
                    <Clock3 className="h-4 w-4" />
                    {errors24h > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />}
                  </Link>
                )}
                <Link
                  href="/profile"
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] ring-1 ring-black/[0.07] transition-opacity hover:opacity-80 dark:ring-white/[0.1]"
                  aria-label="Profil"
                  title="Profil"
                >
                  <ProfileAvatar
                    url={dashboardProfile?.avatar_url}
                    label={dashboardProfile?.full_name || user.email || 'Profil'}
                    className="h-8 w-8 rounded-[8px]"
                    fallbackClassName="text-[9px]"
                  />
                </Link>
              </div>
            </header>

            <DashboardModules
              canAccessVezVision={permissions.canAccessVezVision}
              canAccessInfrastructure={permissions.canAccessInfrastructure}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
