import { redirect } from 'next/navigation'
import { getBlogPost, getBlogCategories } from '@/lib/actions/vezvision/blog'
import PostEditor from './PostEditor'
import { requireVezVisionPermission, hasVezVisionPermission } from '@/lib/auth/vezvision-permissions'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'

interface BlogPostPageProps {
  params: Promise<{ id: string }>
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { id } = await params
  const state = await requireVezVisionPermission(VEZVISION_PERMISSIONS.BLOG_VIEW)
  const canManage = hasVezVisionPermission(state, VEZVISION_PERMISSIONS.BLOG_MANAGE)
  const canPublish = hasVezVisionPermission(state, VEZVISION_PERMISSIONS.BLOG_PUBLISH)

  if (!canManage) redirect('/vezvision/blog')

  const categoriesResult = await getBlogCategories()
  const categories = categoriesResult.success ? categoriesResult.data : []

  if (id === 'new') {
    return <PostEditor post={null} categories={categories} canManage={canManage} canPublish={canPublish} />
  }

  const postResult = await getBlogPost(id)
  if (!postResult.success) redirect('/vezvision/blog')

  return <PostEditor post={postResult.data} categories={categories} canManage={canManage} canPublish={canPublish} />
}
