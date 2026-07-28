import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Activity, Bell, Clock3, Server, Settings, User, UserCog, Users } from 'lucide-react'
import { getAuthenticatedUserPermissionState, getUserPermissions } from '@/lib/permissions'
import { getDashboardAuthUser } from '@/lib/queries/auth'
import { getDashboardStatsForLast24Hours } from '@/lib/queries/dashboard'
import { DashboardModules } from './DashboardModules'

type Tone = 'ok' | 'warning' | 'danger' | 'neutral'

export default async function DashboardPage() {
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) redirect('/login')

  const user = await getDashboardAuthUser()
  if (!user) redirect('/login')

  const permissions = await getUserPermissions()
  const dashboardStats = permissions.canAccessKonta || permissions.canAccessAudit
    ? await getDashboardStatsForLast24Hours()
    : null
  const errors24h = dashboardStats?.errors_24h ?? 0
  const auditTone: Tone = errors24h > 4 ? 'danger' : errors24h > 0 ? 'warning' : 'ok'
  const profileTone: Tone = user.email_confirmed_at ? 'neutral' : 'warning'

  const quickLinks = [
    { label: 'Profil', tone: profileTone, href: '/profile', icon: User },
    ...(permissions.canAccessKonta
      ? [{ label: 'Konta', tone: 'neutral' as Tone, href: '/konta', icon: UserCog }]
      : []),
    ...(permissions.canAccessAudit
      ? [{ label: 'Aktywność', tone: auditTone, href: '/audit', icon: Clock3 }]
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
    <div className="h-screen overflow-hidden bg-[#c8d0cf] text-[#202020]">
      <main className="relative h-full w-full overflow-hidden bg-[#eef4f3]">
        <div className="relative flex h-full flex-col px-5 py-4 sm:px-7 lg:px-9">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_32%_12%,rgba(255,255,255,0.75),transparent_28%),radial-gradient(circle_at_72%_78%,rgba(218,228,226,0.9),transparent_34%)]" />

          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <header className="flex shrink-0 items-center gap-6 border-b border-[#d7e0de] pb-3">
              <div className="flex min-w-[210px] items-center gap-4">
                <Image
                  src="/logo/vezcore_logo_black_full.svg"
                  alt="VEZcore"
                  width={144}
                  height={48}
                  className="h-auto w-[144px]"
                  priority
                />
                <span className="hidden h-7 w-px bg-[#d1dbd9] xl:block" />
                <span className="hidden text-xs font-medium uppercase tracking-[0.12em] text-[#78827f] xl:block">
                  Centrum operacyjne
                </span>
              </div>

              <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Główna nawigacja">
                {quickLinks.map((link, index) => {
                  const Icon = link.icon
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`group flex h-9 items-center gap-2 rounded-[10px] px-3.5 text-sm font-medium transition-colors ${
                        index === 0
                          ? 'bg-white/80 text-[#202020] shadow-[0_7px_18px_rgba(105,116,116,0.10)]'
                          : 'text-[#67716f] hover:bg-white/60 hover:text-[#202020]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{link.label}</span>
                      <span className={`h-1.5 w-1.5 rounded-full ${dotClass[link.tone]}`} />
                    </Link>
                  )
                })}
              </nav>

              <div className="ml-auto flex items-center gap-2">
                {permissions.canAccessAudit && (
                  <Link
                    href="/audit"
                    className="relative flex h-10 w-10 items-center justify-center rounded-[11px] bg-white/45 text-[#5e6664] transition-colors hover:bg-white hover:text-[#202020]"
                    aria-label="Powiadomienia"
                  >
                    <Bell className="h-5 w-5" />
                    {errors24h > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500" />}
                  </Link>
                )}
                <Link
                  href="/profile"
                  className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-white/70 text-[#5e6664] transition-colors hover:bg-white hover:text-[#202020]"
                  aria-label="Profil"
                >
                  <User className="h-5 w-5" />
                </Link>
              </div>
            </header>

            <section className="mt-4 grid shrink-0 gap-5 lg:grid-cols-[minmax(260px,0.8fr)_minmax(520px,1.5fr)_auto] lg:items-center">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#dfe8e6] text-[#66716e]">
                  <Server className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-[25px] font-semibold leading-none text-[#202020]">Ekosystem</h1>
                  <p className="mt-1.5 text-xs text-[#707a78]">Produkcja · {user.email}</p>
                </div>
              </div>

              <div className="hidden grid-cols-3 divide-x divide-[#d4dedc] sm:grid">
                {metrics.map((metric) => {
                  const Icon = metric.icon
                  return (
                    <div key={metric.label} className="flex items-center justify-center gap-3 px-4">
                      <Icon className="h-4 w-4 text-[#87918f]" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xl font-semibold leading-none text-[#202020]">{metric.value}</p>
                          <span className={`h-1.5 w-1.5 rounded-full ${dotClass[metric.tone]}`} />
                        </div>
                        <p className="mt-1 text-[11px] text-[#77817f]">{metric.label}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-end gap-2">
                <div className="flex h-10 items-center gap-2 rounded-[11px] bg-[#e2eae8] px-3.5 text-xs font-medium text-[#626c6a]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Core online
                </div>
                {permissions.canAccessSettings && (
                  <Link
                    href="/settings"
                    className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-white/55 text-[#5e6664] transition-colors hover:bg-white hover:text-[#202020]"
                    aria-label="Ustawienia"
                  >
                    <Settings className="h-5 w-5" />
                  </Link>
                )}
              </div>
            </section>

            <DashboardModules
              canAccessVezVision={permissions.canAccessVezVision}
              canAccessInfrastructure={permissions.canAccessInfrastructure}
              navigationAccess={{
                canAccessKonta: permissions.canAccessKonta,
                canAccessAudit: permissions.canAccessAudit,
                canAccessSettings: permissions.canAccessSettings,
                canViewVezVisionBlog: permissions.canViewVezVisionBlog,
                canViewVezVisionPortfolio: permissions.canViewVezVisionPortfolio,
                canViewVezVisionServices: permissions.canViewVezVisionServices,
                canViewVezVisionFaq: permissions.canViewVezVisionFaq,
                canViewVezVisionNewsletter: permissions.canViewVezVisionNewsletter,
                canViewVezVisionFiles: permissions.canViewVezVisionFiles,
                canViewVezVisionSettings: permissions.canViewVezVisionSettings,
                canViewVezVisionCalendar: permissions.canViewVezVisionCalendar,
              }}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
