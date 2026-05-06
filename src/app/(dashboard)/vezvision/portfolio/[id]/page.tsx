import { redirect } from 'next/navigation'
import { getProject } from '@/lib/actions/vezvision/portfolio'
import ProjectEditor from './ProjectEditor'
import { requireVezVisionPermission, hasVezVisionPermission } from '@/lib/auth/vezvision-permissions'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params
  const state = await requireVezVisionPermission(VEZVISION_PERMISSIONS.PORTFOLIO_VIEW)
  const canManage = hasVezVisionPermission(state, VEZVISION_PERMISSIONS.PORTFOLIO_MANAGE)

  if (!canManage) redirect('/vezvision/portfolio')

  if (id === 'new') {
    return <ProjectEditor project={null} canManage={canManage} />
  }

  const projectResult = await getProject(id)
  if (!projectResult.success) redirect('/vezvision/portfolio')

  return <ProjectEditor project={projectResult.data} canManage={canManage} />
}
