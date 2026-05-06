import { redirect, notFound } from 'next/navigation'
import KontaDetailClient from './KontaDetailClient'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'
import { getAccountDetailData } from '@/lib/queries/accounts'

export default async function KontaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) redirect('/login')

  const permissions = authState.permissions

  if (!permissions.canAccessKonta) {
    redirect('/dashboard')
  }

  const accountData = await getAccountDetailData(id)
  if (!accountData) notFound()

  return (
    <KontaDetailClient 
      user={accountData.user}
      recentActivity={accountData.recentActivity}
      canDeleteUsers={permissions.canDeleteUsers}
      canEditUsers={permissions.canEditUsers}
      canManagePermissions={permissions.canManagePermissions}
      has2FA={accountData.has2FA}
      canAccessAudit={permissions.canAccessAudit}
      canAccessSettings={permissions.canAccessSettings}
    />
  )
}
