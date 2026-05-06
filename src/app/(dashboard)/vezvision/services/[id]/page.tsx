import { redirect } from 'next/navigation'
import { getService, getServiceCategories } from '@/lib/actions/vezvision/services'
import ServiceEditor from './ServiceEditor'
import { requireVezVisionPermission, hasVezVisionPermission } from '@/lib/auth/vezvision-permissions'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'

interface ServicePageProps {
  params: Promise<{ id: string }>
}

export default async function ServicePage({ params }: ServicePageProps) {
  const { id } = await params
  const state = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SERVICES_VIEW)
  const canManage = hasVezVisionPermission(state, VEZVISION_PERMISSIONS.SERVICES_MANAGE)

  if (!canManage) redirect('/vezvision/services')

  const categoriesResult = await getServiceCategories()
  const categories = categoriesResult.success ? categoriesResult.data : []

  if (id === 'new') {
    return <ServiceEditor service={null} categories={categories} canManage={canManage} />
  }

  const serviceResult = await getService(id)
  if (!serviceResult.success) redirect('/vezvision/services')

  return <ServiceEditor service={serviceResult.data} categories={categories} canManage={canManage} />
}
