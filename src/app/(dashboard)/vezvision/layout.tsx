import VezVisionShell from './VezVisionShell'
import { redirect } from 'next/navigation'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'

export default async function VezVisionLayout({ children }: { children: React.ReactNode }) {
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) redirect('/login')

  const permissions = authState.permissions
  const canAccessDashboard = permissions.canAccessVezVision
  const canViewBlog = permissions.canViewVezVisionBlog
  const canViewPortfolio = permissions.canViewVezVisionPortfolio
  const canViewServices = permissions.canViewVezVisionServices
  const canViewFaq = permissions.canViewVezVisionFaq
  const canViewNewsletter = permissions.canViewVezVisionNewsletter
  const canViewFiles =
    permissions.canViewVezVisionFiles ||
    permissions.canManageVezVisionFiles ||
    permissions.canManageVezVisionFilesAcl
  const canViewSettings = permissions.canViewVezVisionSettings
  const canViewCalendar = permissions.canViewVezVisionCalendar

  if (!canAccessDashboard && !canViewBlog && !canViewPortfolio && !canViewServices && !canViewFaq && !canViewNewsletter && !canViewFiles && !canViewSettings && !canViewCalendar) {
    redirect('/dashboard')
  }

  return (
    <VezVisionShell
      canAccessDashboard={canAccessDashboard}
      canViewBlog={canViewBlog}
      canViewPortfolio={canViewPortfolio}
      canViewServices={canViewServices}
      canViewFaq={canViewFaq}
      canViewNewsletter={canViewNewsletter}
      canViewSettings={canViewSettings}
      canViewCalendar={canViewCalendar}
    >
      {children}
    </VezVisionShell>
  )
}
