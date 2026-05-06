import { redirect } from 'next/navigation'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'
import TestDiscordClient from './TestDiscordClient'

export default async function TestDiscordPage() {
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) redirect('/login')

  const permissions = authState.permissions

  if (!permissions.canAccessKonta) {
    redirect('/dashboard')
  }

  return <TestDiscordClient />
}
