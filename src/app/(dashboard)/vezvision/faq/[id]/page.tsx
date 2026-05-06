import { redirect } from 'next/navigation'
import { hasVezVisionPermission, requireVezVisionPermission } from '@/lib/auth/vezvision-permissions'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { getFaqItem } from '@/lib/actions/vezvision/faq'
import FaqEditor from './FaqEditor'

interface FaqPageProps {
  params: Promise<{ id: string }>
}

export default async function FaqItemPage({ params }: FaqPageProps) {
  const { id } = await params
  const state = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FAQ_VIEW)
  const canManage = hasVezVisionPermission(state, VEZVISION_PERMISSIONS.FAQ_MANAGE)

  if (!canManage) redirect('/vezvision/faq')

  if (id === 'new') {
    return <FaqEditor item={null} canManage={canManage} />
  }

  const itemResult = await getFaqItem(id)
  if (!itemResult.success) redirect('/vezvision/faq')

  return <FaqEditor item={itemResult.data} canManage={canManage} />
}
