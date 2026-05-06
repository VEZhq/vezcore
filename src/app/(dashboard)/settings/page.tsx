import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'
import { isAdminRole } from '@/lib/roles'

export default async function SettingsPage() {
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) redirect('/login')

  const permissions = authState.permissions

  if (!permissions.canAccessSettings) {
    redirect('/dashboard')
  }

  return <SettingsClient canAccessAudit={permissions.canAccessAudit} canManageDiscordMaintenance={isAdminRole(permissions.role)} canManageCache={permissions.role === 'super_admin'} />
}
