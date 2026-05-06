import { redirect } from 'next/navigation'
import KontaClient from './KontaClient'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'
import { getAccountsPageData } from '@/lib/queries/accounts'

export default async function KontaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string; search?: string }>
}) {
  const params = await searchParams
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) redirect('/login')

  const permissions = authState.permissions

  if (!permissions.canAccessKonta) {
    redirect('/dashboard')
  }

  const page = parseInt(params.page || '1')
  const limit = parseInt(params.limit || '20')
  const search = params.search?.trim() || ''
  const { users, total } = await getAccountsPageData({ page, limit, search })

  return (
    <KontaClient
      users={users}
      total={total}
      page={page}
      limit={limit}
      userRole={permissions.role}
      canAddUsers={permissions.canAddUsers}
      canDeleteUsers={permissions.canDeleteUsers}
      canEditUsers={permissions.canEditUsers}
      canAccessAudit={permissions.canAccessAudit}
      canAccessSettings={permissions.canAccessSettings}
    />
  )
}
