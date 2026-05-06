import { Suspense } from 'react'
import { getServices } from '@/lib/actions/vezvision/services'
import ServicesListClient from './ServicesListClient'
import { requireVezVisionPermission, hasVezVisionPermission } from '@/lib/auth/vezvision-permissions'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'

export default async function ServicesPage() {
  return (
    <Suspense fallback={<ServicesSkeleton />}>
      <ServicesDataWrapper />
    </Suspense>
  )
}

async function ServicesDataWrapper() {
  const state = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SERVICES_VIEW)
  const canManage = hasVezVisionPermission(state, VEZVISION_PERMISSIONS.SERVICES_MANAGE)
  const result = await getServices()
  const services = result.success ? result.data : []

  return <ServicesListClient services={services} canManage={canManage} />
}

function ServicesSkeleton() {
  return (
    <div className="w-full space-y-5 px-5 py-4 xl:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="h-5 w-36 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
          <div className="h-3 w-56 animate-pulse rounded-[3px] bg-[#ececf1]" />
        </div>
        <div className="h-8 w-28 animate-pulse rounded-[4px] bg-[#e7e8ee]" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-[6px] border border-[#e7e8ee] bg-white p-4">
            <div className="h-10 w-10 animate-pulse rounded-[4px] bg-[#ececf1]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
              <div className="h-3 w-1/4 animate-pulse rounded-[3px] bg-[#ececf1]" />
            </div>
            <div className="h-8 w-20 animate-pulse rounded-[3px] bg-[#ececf1]" />
          </div>
        ))}
      </div>
    </div>
  )
}
