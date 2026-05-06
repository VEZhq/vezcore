import { Suspense } from 'react'
import { getProjects } from '@/lib/actions/vezvision/portfolio'
import PortfolioListClient from './PortfolioListClient'
import { requireVezVisionPermission, hasVezVisionPermission } from '@/lib/auth/vezvision-permissions'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'

export default async function PortfolioPage() {
  return (
    <Suspense fallback={<PortfolioSkeleton />}>
      <PortfolioDataWrapper />
    </Suspense>
  )
}

async function PortfolioDataWrapper() {
  const state = await requireVezVisionPermission(VEZVISION_PERMISSIONS.PORTFOLIO_VIEW)
  const canManage = hasVezVisionPermission(state, VEZVISION_PERMISSIONS.PORTFOLIO_MANAGE)
  const result = await getProjects()
  const projects = result.success ? result.data : []

  return <PortfolioListClient projects={projects} canManage={canManage} />
}

function PortfolioSkeleton() {
  return (
    <div className="w-full space-y-5 px-5 py-4 xl:px-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-36 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
          <div className="h-3 w-56 animate-pulse rounded-[3px] bg-[#ececf1]" />
        </div>
        <div className="h-8 w-28 animate-pulse rounded-[4px] bg-[#e7e8ee]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-[6px] border border-[#e7e8ee] bg-white p-4">
            <div className="aspect-video animate-pulse rounded-[4px] bg-[#ececf1]" />
            <div className="mt-3 h-4 w-3/4 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded-[3px] bg-[#ececf1]" />
          </div>
        ))}
      </div>
    </div>
  )
}
