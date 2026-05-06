import { redirect, notFound } from 'next/navigation'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'
import ActivityClient from './ActivityClient'
import { getAccountActivityData } from '@/lib/queries/accounts'

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) redirect('/login')

  const permissions = authState.permissions

  if (!permissions.canAccessKonta) {
    redirect('/dashboard')
  }

  const accountActivity = await getAccountActivityData(id)
  if (!accountActivity) notFound()

  return (
    <ActivityClient
      user={accountActivity.user}
      auditLog={accountActivity.auditLog}
      sessions={accountActivity.sessions}
      canAccessAudit={permissions.canAccessAudit}
      canAccessSettings={permissions.canAccessSettings}
    />
  )
}
