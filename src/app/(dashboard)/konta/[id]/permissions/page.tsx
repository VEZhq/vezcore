import { redirect, notFound } from 'next/navigation'
import PermissionsClient from './PermissionsClient'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'
import { isAdminRole } from '@/lib/roles'
import { getAccountPermissionsUserData } from '@/lib/queries/accounts'

export default async function PermissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) redirect('/login')

  const permissions = authState.permissions

  if (!permissions.canAccessKonta) {
    redirect('/dashboard')
  }

  const userData = await getAccountPermissionsUserData(id)
  if (!userData) notFound()

  return (
    <PermissionsClient 
      user={userData}
      canEditUsers={permissions.canManagePermissions}
      isAdminUser={isAdminRole(userData.role)}
      canAccessAudit={permissions.canAccessAudit}
      canAccessSettings={permissions.canAccessSettings}
    />
  )
}
