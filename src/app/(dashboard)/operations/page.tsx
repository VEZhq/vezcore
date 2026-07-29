import { redirect } from 'next/navigation'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'
import { getOperationsOverview, getSecurityAccountReport } from '@/lib/operations/queries'
import OperationsClient from './OperationsClient'

export default async function OperationsPage() {
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) redirect('/login')
  if (!authState.permissions.canAccessOperations) redirect('/dashboard')

  const [overview, securityReport] = await Promise.all([
    getOperationsOverview(
      authState.userId,
      authState.permissions.canRevealOperationsShortcuts
    ),
    authState.permissions.canViewSecurityReport
      ? getSecurityAccountReport(authState.userId, authState.actualRole)
      : Promise.resolve([]),
  ])

  return (
    <OperationsClient
      overview={overview}
      securityReport={securityReport}
      canManage={authState.permissions.canManageOperations}
      canPreviewRoles={authState.permissions.canPreviewRoles}
      canViewSecurityReport={authState.permissions.canViewSecurityReport}
    />
  )
}
