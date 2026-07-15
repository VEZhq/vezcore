import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { User, ClipboardList, Settings, UserCog } from 'lucide-react'
import { NeuralBackground } from '@/components/NeuralBackground'
import { ActivityFeed } from '@/components/ActivityFeed'
import { SystemHealth } from '@/components/SystemHealth'
import { DashboardModules } from './DashboardModules'
import { getUserPermissions } from '@/lib/permissions'
import { getDashboardStats, getRecentDashboardActivity } from '@/lib/queries/dashboard'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'

export default async function DashboardPage() {
  // Next.js can render a page in parallel with its parent layout. Guard the
  // page itself before querying stats so a layout redirect cannot serialize
  // sensitive dashboard data into an unauthenticated RSC response.
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) redirect('/login')

  const permissions = await getUserPermissions()

  const yesterdayDate = new Date()
  yesterdayDate.setHours(yesterdayDate.getHours() - 24)
  const yesterday = yesterdayDate.toISOString()

  const [stats, recentActivity] = await Promise.all([
    getDashboardStats(yesterday),
    getRecentDashboardActivity(permissions.canAccessAudit),
  ])

  const systemStatus: 'healthy' | 'warning' | 'error' = 
    stats.errors_24h > 10 ? 'error' : 
    stats.errors_24h > 3 ? 'warning' : 'healthy'

  const quickLinks = [
    { name: 'Profil', href: '/profile', icon: User },
    ...(permissions.canAccessKonta ? [{ name: 'Konta', href: '/konta', icon: UserCog }] : []),
    ...(permissions.canAccessAudit ? [{ name: 'Audit Log', href: '/audit', icon: ClipboardList }] : []),
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

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="mb-12">
          <Image
            src="/logo/vezcore_logo_white_full.svg"
            alt="vezCore"
            width={180}
            height={50}
            className="opacity-80 light:opacity-0 light:hidden transition-opacity duration-300"
            style={{ width: 'auto' }}
            priority
          />
          <Image
            src="/logo/vezcore_logo_black_full.svg"
            alt="vezCore"
            width={180}
            height={50}
            className="opacity-0 light:opacity-80 dark:hidden transition-opacity duration-300"
            style={{ width: 'auto' }}
            priority
          />
          <p className="text-center text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mt-3 transition-colors duration-300">
            Ekosystem VEZ
          </p>
        </div>

        <div className="w-full max-w-5xl mb-8">
      <SystemHealth
        totalUsers={stats.total_users}
        recentLogins={stats.recent_logins}
        activeSessions={stats.active_sessions}
        systemStatus={systemStatus}
        errorsCount={stats.errors_24h}
      />
        </div>

        <DashboardModules canAccessVezVision={permissions.canAccessVezVision} />

        <div className="flex items-center gap-6">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] hover:text-emerald-500 light:hover:text-emerald-600 transition-colors duration-300"
            >
              <link.icon className="h-3 w-3" />
              {link.name}
            </Link>
          ))}
        </div>

        {recentActivity && recentActivity.length > 0 && (
          <div className="w-full max-w-2xl mt-8">
            <ActivityFeed entries={recentActivity} canViewAll={permissions.canAccessAudit} />
          </div>
        )}

        <p className="mt-8 text-[9px] uppercase tracking-[0.4em] text-[#333333] light:text-[#cccccc] transition-colors duration-300">
          NEURAL INTERFACE ACTIVE
        </p>
      </div>
    </div>
  )
}
