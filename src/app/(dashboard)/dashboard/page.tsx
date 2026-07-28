import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Bell, Bookmark, Clock3, Search, Settings, User, UserCog } from 'lucide-react'
import { getDashboardAuthUser } from '@/lib/queries/auth'
import { DashboardModules } from './DashboardModules'
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

  const dotClass = {
    ok: 'bg-emerald-400 light:bg-emerald-600',
    warning: 'bg-amber-300 light:bg-amber-500',
    danger: 'bg-red-400 light:bg-red-600',
    neutral: 'bg-[#5f5f5f] light:bg-[#999999]',
  } as const

  return (
    <div className="min-h-screen bg-[#c8d0cf] px-4 py-6 text-[#202020] transition-colors duration-300 sm:px-6 lg:px-10">
      <div className="mx-auto min-h-[calc(100vh-48px)] w-full max-w-[1780px] overflow-hidden rounded-[24px] bg-[#eef4f3] shadow-[0_30px_90px_rgba(75,85,85,0.22)]">
        <div className="relative min-h-[calc(100vh-48px)] px-7 py-7 sm:px-10 lg:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_32%_12%,rgba(255,255,255,0.75),transparent_28%),radial-gradient(circle_at_72%_78%,rgba(218,228,226,0.9),transparent_34%)]" />
          <div className="relative z-10">
            <header className="flex items-start justify-between gap-6">
              <div className="flex min-w-[170px] items-center gap-3">
                <Image
                  src="/logo/vezcore_logo_black_full.svg"
                  alt="vezCore"
                  width={156}
                  height={48}
                  className="h-auto w-[156px]"
                  priority
                />
              </div>

              <nav className="hidden items-center gap-2 rounded-[14px] bg-white/35 p-1.5 shadow-[0_12px_30px_rgba(105,116,116,0.08)] backdrop-blur-xl lg:flex">
                {quickLinks.map((link, index) => (
                  <Link
                    key={`${link.href}-${link.label}`}
                    href={link.href}
                    className={`group flex h-11 items-center gap-2 rounded-[12px] px-5 text-sm font-medium transition-all duration-200 ${
                      index === 0
                        ? 'bg-white text-[#202020] shadow-[0_10px_24px_rgba(105,116,116,0.12)]'
                        : 'bg-[#e6eceb]/70 text-[#5e6664] hover:bg-white hover:text-[#202020]'
                    }`}
                  >
                    <span>{link.label}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${dotClass[link.tone as keyof typeof dotClass]}`} />
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-3">
                <button className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#e3e9e8] text-[#5e6664] transition-colors hover:bg-white hover:text-[#202020]" aria-label="Szukaj">
                  <Search className="h-5 w-5" />
                </button>
                <button className="relative flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#e3e9e8] text-[#5e6664] transition-colors hover:bg-white hover:text-[#202020]" aria-label="Powiadomienia">
                  <Bell className="h-5 w-5" />
                  {errors24h > 0 && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#ff4d4d]" />}
                </button>
                <Link href="/profile" className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#e3e9e8] text-[#5e6664] transition-colors hover:bg-white hover:text-[#202020]" aria-label="Profil">
                  <User className="h-5 w-5" />
                </Link>
              </div>
            </header>

            <div className="mt-16 grid gap-8 lg:grid-cols-[440px_minmax(0,1fr)_320px] lg:items-start">
              <div className="flex items-start gap-5">
                <Link href="/dashboard" className="mt-1 flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#e3e9e8] text-[#5e6664] transition-colors hover:bg-white hover:text-[#202020]">
                  <span className="text-xl leading-none">←</span>
                </Link>
                <div>
                  <h1 className="text-[42px] font-medium leading-none tracking-[-0.03em] text-[#202020]">
                    VEZcore
                  </h1>
                  <p className="mt-3 text-sm text-[#707a78]">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                {[
                  { value: dashboardStats?.total_users ?? 0, label: 'Konta', tone: 'ok' as QuickCardTone },
                  { value: dashboardStats?.recent_logins ?? 0, label: 'Logowania', tone: 'ok' as QuickCardTone },
                  { value: errors24h, label: 'Alerty', tone: auditTone },
                ].map((metric) => (
                  <div key={metric.label} className="flex items-end gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[38px] font-medium leading-none tracking-[-0.03em] text-[#202020]">{metric.value}</p>
                        <span className={`mt-1 flex h-4 w-4 items-center justify-center rounded-[5px] text-[10px] text-white ${dotClass[metric.tone as keyof typeof dotClass]}`}>↗</span>
                      </div>
                      <p className="mt-2 text-sm text-[#707a78]">{metric.label}</p>
                    </div>
                    <div className="mb-1 hidden h-12 w-24 items-end gap-1 md:flex">
                      {Array.from({ length: 18 }).map((_, index) => (
                        <span
                          key={index}
                          className={`w-1 rounded-full ${index % 7 === 0 ? dotClass[metric.tone as keyof typeof dotClass] : 'bg-[#d4dcda]'}`}
                          style={{ height: `${14 + ((index * 11) % 34)}px` }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3">
                <div className="rounded-[14px] bg-[#e3e9e8] px-4 py-3 text-sm text-[#707a78]">
                  Core <span className="mx-2 text-[#a0aaa8]">↔</span> Produkcja
                </div>
                {permissions.canAccessSettings && (
                  <Link href="/settings" className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#e3e9e8] text-[#5e6664] transition-colors hover:bg-white hover:text-[#202020]" aria-label="Ustawienia">
                    <Settings className="h-5 w-5" />
                  </Link>
                )}
                <Link href="/audit" className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white text-[#5e6664] transition-colors hover:text-[#202020]" aria-label="Aktywność">
                  <Bookmark className="h-5 w-5" />
                </Link>
              </div>
            </div>

            <DashboardModules
              canAccessVezVision={permissions.canAccessVezVision}
              canAccessInfrastructure={permissions.canAccessInfrastructure}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
