import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Clock3, User, ClipboardList, Settings, UserCog } from 'lucide-react'
import { NeuralBackground } from '@/components/NeuralBackground'
import { SystemHealth } from '@/components/SystemHealth'
import { getDashboardAuthUser } from '@/lib/queries/auth'
import { DashboardModules } from './DashboardModules'
import { DashboardCommandCenter } from './DashboardCommandCenter'
import { VezCoreStatusBadge } from './VezCoreStatusBadge'
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
      {permissions.canAccessInfrastructure && <VezCoreStatusBadge />}

      <div
        className="fixed inset-0 pointer-events-none opacity-20 light:opacity-10 transition-opacity duration-300"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px',
          color: 'rgba(100, 100, 100, 0.3)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="mb-12">
          <Image
            src="/logo/vezcore_logo_white_full.svg"
            alt="vezCore"
            width={280}
            height={78}
            className="h-auto w-[280px] max-w-[72vw] opacity-80 light:opacity-0 light:hidden transition-opacity duration-300"
            priority
          />
          <Image
            src="/logo/vezcore_logo_black_full.svg"
            alt="vezCore"
            width={280}
            height={78}
            className="h-auto w-[280px] max-w-[72vw] opacity-0 light:opacity-80 dark:hidden transition-opacity duration-300"
            priority
          />
        </div>

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

        {permissions.canAccessInfrastructure && (
          <div id="infrastructure" className="w-full max-w-5xl mb-8 scroll-mt-8">
            <SystemHealth />
          </div>
        )}

        <DashboardModules
          canAccessVezVision={permissions.canAccessVezVision}
          canAccessInfrastructure={permissions.canAccessInfrastructure}
        />

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {quickLinks.map((link) => (
            <Link
              key={`${link.href}-${link.name}`}
              href={link.href}
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] hover:text-emerald-500 light:hover:text-emerald-600 transition-colors duration-300"
            >
              <link.icon className="h-3 w-3" />
              {link.name}
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
