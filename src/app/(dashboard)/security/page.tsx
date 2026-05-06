import { redirect } from 'next/navigation'
import SecurityClient from './SecurityClient'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'
import { isAdminRole } from '@/lib/roles'
import { getSecurityPageData } from '@/lib/queries/security'

export default async function SecurityPage() {
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) redirect('/login')

  const permissions = authState.permissions

  if (!isAdminRole(permissions.role)) {
    redirect('/dashboard')
  }

  const { stats, ipLists } = await getSecurityPageData()

  return <SecurityClient stats={stats} ipLists={ipLists} canAccessKonta={permissions.canAccessKonta} />
}
