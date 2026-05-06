import { Suspense } from 'react'
import { getBlogPosts } from '@/lib/actions/vezvision/blog'
import BlogListClient from './BlogListClient'
import { requireVezVisionPermission, hasVezVisionPermission } from '@/lib/auth/vezvision-permissions'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'

export default async function BlogPage() {
  return (
    <Suspense fallback={<BlogSkeleton />}>
      <BlogDataWrapper />
    </Suspense>
  )
}

async function BlogDataWrapper() {
  const state = await requireVezVisionPermission(VEZVISION_PERMISSIONS.BLOG_VIEW)
  const canManage = hasVezVisionPermission(state, VEZVISION_PERMISSIONS.BLOG_MANAGE)
  const canPublish = hasVezVisionPermission(state, VEZVISION_PERMISSIONS.BLOG_PUBLISH)
  const result = await getBlogPosts()
  const posts = result.success ? result.data : []

  return (
    <BlogListClient
      posts={posts}
      canCreate={canManage}
      canEdit={canManage}
      canDelete={canManage}
      canPublish={canPublish}
    />
  )
}

function BlogSkeleton() {
  return (
    <div className="w-full space-y-5 px-5 py-4 xl:px-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-36 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
          <div className="h-3 w-56 animate-pulse rounded-[3px] bg-[#ececf1]" />
        </div>
        <div className="h-8 w-24 animate-pulse rounded-[4px] bg-[#e7e8ee]" />
      </div>
      <div className="overflow-hidden rounded-[6px] border border-[#e7e8ee] bg-white shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
        <div className="divide-y divide-[#ececf1]">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[1fr_120px_100px] gap-4 px-3 py-3">
              <div className="h-4 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
              <div className="h-4 animate-pulse rounded-[3px] bg-[#ececf1]" />
              <div className="h-4 animate-pulse rounded-[3px] bg-[#ececf1]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
