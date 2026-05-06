import { Suspense } from 'react'
import { getFaqItems } from '@/lib/actions/vezvision/faq'
import FaqListClient from './FaqListClient'
import { requireVezVisionPermission, hasVezVisionPermission } from '@/lib/auth/vezvision-permissions'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'

export default async function FaqPage() {
  return (
    <Suspense fallback={<FaqSkeleton />}>
      <FaqDataWrapper />
    </Suspense>
  )
}

async function FaqDataWrapper() {
  const state = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FAQ_VIEW)
  const canManage = hasVezVisionPermission(state, VEZVISION_PERMISSIONS.FAQ_MANAGE)
  const result = await getFaqItems()
  const items = result.success ? result.data : []

  return <FaqListClient items={items} canManage={canManage} />
}

function FaqSkeleton() {
  return (
    <div className="w-full space-y-5 px-5 py-4 xl:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="h-5 w-24 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
          <div className="h-3 w-56 animate-pulse rounded-[3px] bg-[#ececf1]" />
        </div>
        <div className="h-8 w-28 animate-pulse rounded-[4px] bg-[#e7e8ee]" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-[6px] border border-[#e7e8ee] bg-white p-4">
            <div className="h-4 w-3/4 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
            <div className="mt-2 h-3 w-full animate-pulse rounded-[3px] bg-[#ececf1]" />
            <div className="mt-1 h-3 w-2/3 animate-pulse rounded-[3px] bg-[#ececf1]" />
          </div>
        ))}
      </div>
    </div>
  )
}
