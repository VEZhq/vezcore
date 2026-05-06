import { hasVezVisionPermission, requireAnyVezVisionPermission } from '@/lib/auth/vezvision-permissions'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { listFiles } from '@/lib/actions/vezvision/files'
import { getFolderBreadcrumbs, listAllFolders, listFolders } from '@/lib/actions/vezvision/files-folders'
import FilesListClient from './FilesListClient'

interface FilesPageProps {
  searchParams: Promise<{
    folder?: string
    q?: string
    sort?: 'created_at' | 'original_name' | 'size_bytes'
    direction?: 'asc' | 'desc'
    mime?: string
    tab?: 'active' | 'trash'
  }>
}

export default async function FilesPage({ searchParams }: FilesPageProps) {
  const state = await requireAnyVezVisionPermission([
    VEZVISION_PERMISSIONS.FILES_VIEW,
    VEZVISION_PERMISSIONS.FILES_MANAGE,
    VEZVISION_PERMISSIONS.FILES_PERMISSIONS_MANAGE,
  ])
  const params = await searchParams
  const folderId = params.folder ?? null
  const tab = params.tab === 'trash' ? 'trash' : 'active'
  const sort = params.sort === 'original_name' || params.sort === 'size_bytes' || params.sort === 'created_at' ? params.sort : 'created_at'
  const direction = params.direction === 'asc' ? 'asc' : 'desc'
  const query = params.q?.trim() ? params.q.trim() : undefined
  const mimeFilter = params.mime?.trim() ? params.mime.trim() : undefined

  const [foldersResult, allFoldersResult, filesResult, breadcrumbsResult] = await Promise.all([
    listFolders(folderId),
    listAllFolders(),
    listFiles({
      folderId,
      deletedOnly: tab === 'trash',
      includeDeleted: false,
      query,
      mimePrefix: mimeFilter,
      sortBy: sort,
      sortDirection: direction,
      limit: 100,
    }),
    folderId ? getFolderBreadcrumbs(folderId) : Promise.resolve({ success: true, data: [] as never[] }),
  ])

  const folders = foldersResult.success ? foldersResult.data : []
  const allFolders = allFoldersResult.success ? allFoldersResult.data : []
  const files = filesResult.success ? filesResult.data : []
  const breadcrumbs = breadcrumbsResult.success ? breadcrumbsResult.data : []

  const canManage = hasVezVisionPermission(state, VEZVISION_PERMISSIONS.FILES_MANAGE)
  const canManageAcl = hasVezVisionPermission(state, VEZVISION_PERMISSIONS.FILES_PERMISSIONS_MANAGE)

  return (
    <div className="w-full space-y-5">
      <FilesListClient
        key="files-list"
        folders={folders}
        allFolders={allFolders}
        files={files}
        canManage={canManage}
        currentFolderId={folderId}
        breadcrumbs={breadcrumbs}
        activeTab={tab}
        initialQuery={query ?? ''}
        initialSort={sort}
        initialDirection={direction}
        initialMime={mimeFilter ?? ''}
        canManageAcl={canManageAcl}
      />
    </div>
  )
}
