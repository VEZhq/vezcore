import { redirect } from 'next/navigation'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'
import AuditPageClient from './AuditPageClient'

export default async function AuditPage() {
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) redirect('/login')

  const permissions = authState.permissions

  if (!permissions.canAccessAudit) {
    redirect('/dashboard')
  }

  return <AuditPageClient canAccessSettings={permissions.canAccessSettings} />
}
