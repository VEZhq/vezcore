import { redirect } from 'next/navigation'
import SystemHealthClient from './SystemHealthClient'
import { getSystemHealth } from '@/lib/actions/health'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'

export default async function SystemHealthPage() {
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) redirect('/login')

  const permissions = authState.permissions

  if (!permissions.canAccessKonta) {
    redirect('/dashboard')
  }

  const healthData = await getSystemHealth()

  if ('error' in healthData) {
    redirect('/dashboard')
  }

  return <SystemHealthClient data={healthData} canAccessKonta={permissions.canAccessKonta} />
}
