import { redirect } from 'next/navigation'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'
import { isAdminRole } from '@/lib/roles'
import DiscordSettingsClient from './DiscordSettingsClient'

export default async function DiscordSettingsPage() {
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) redirect('/login')

  const permissions = authState.permissions

  if (!permissions.canAccessSettings || !isAdminRole(permissions.role)) {
    redirect('/dashboard')
  }

  return <DiscordSettingsClient canAccessAudit={permissions.canAccessAudit} />
}
