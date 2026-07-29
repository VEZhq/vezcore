import { redirect } from 'next/navigation'
import { getActualAuthenticatedPermissionState, getAuthenticatedUserPermissionState } from '@/lib/permissions'
import { getOperationsOverview, getPreviewableUsers, getSecurityAccountReport } from '@/lib/operations/queries'
import OperationsClient from './OperationsClient'

export default async function OperationsPage() {
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) redirect('/login')
  if (!authState.permissions.canAccessOperations) redirect('/dashboard')
  const actualState = await getActualAuthenticatedPermissionState()

  const [overview, securityReport, previewUsers] = await Promise.all([
    getOperationsOverview(
      authState.userId,
      authState.permissions.canRevealOperationsShortcuts
    ),
    authState.permissions.canViewSecurityReport
      ? getSecurityAccountReport(authState.userId, authState.actualRole)
      : Promise.resolve([]),
    actualState?.permissions.canPreviewRoles
      ? getPreviewableUsers(actualState.userId, actualState.actualRole)
      : Promise.resolve([]),
  ])

  return (
    <OperationsClient
      overview={overview}
      securityReport={securityReport}
      canManage={authState.permissions.canManageOperations}
      canPreviewRoles={authState.permissions.canPreviewRoles}
      canViewSecurityReport={authState.permissions.canViewSecurityReport}
      previewUsers={previewUsers}
    />
  )
}
