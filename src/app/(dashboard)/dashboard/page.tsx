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
import { getUserPermissions } from '@/lib/permissions'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'

export default async function DashboardPage() {
  // Next.js can render a page in parallel with its parent layout. Guard the
  // page itself before querying stats so a layout redirect cannot serialize
  // sensitive dashboard data into an unauthenticated RSC response.
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) redirect('/login')

  const user = await getDashboardAuthUser()
  if (!user) redirect('/login')

  const permissions = await getUserPermissions()

  const quickLinks = [
    { name: 'Profil', href: '/profile', icon: User },
    ...(permissions.canAccessKonta ? [{ name: 'Konta', href: '/konta', icon: UserCog }] : []),
    ...(permissions.canAccessAudit ? [{ name: 'Audit Log', href: '/audit', icon: ClipboardList }] : []),
    ...(permissions.canAccessAudit ? [{ name: 'Ostatnia aktywność', href: '/audit', icon: Clock3 }] : []),
    ...(permissions.canAccessSettings ? [{ name: 'Ustawienia', href: '/settings', icon: Settings }] : []),
  ]
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
          <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

            <nav className="flex flex-wrap items-center gap-2">
              {quickLinks.map((link) => (
                <Link
                  key={`${link.href}-${link.name}`}
                  href={link.href}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-white/[0.06] light:border-black/[0.08] bg-[#0a0a0a]/50 light:bg-white/80 px-3 text-[10px] uppercase tracking-[0.18em] text-[#777777] light:text-[#777777] hover:border-emerald-400/25 light:hover:border-emerald-600/25 hover:text-emerald-400 light:hover:text-emerald-600 transition-colors duration-300"
                >
                  <link.icon className="h-3.5 w-3.5" />
                  {link.name}
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
