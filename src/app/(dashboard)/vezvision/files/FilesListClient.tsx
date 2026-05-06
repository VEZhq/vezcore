'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  File,
  FileArchive,
  FileImage,
  FileText,
  Folder,
  FolderPlus,
  MoreHorizontal,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { useConfirm } from '@/components/ConfirmDialog'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import {
  getFileDownloadUrl,
  moveFile,
  permanentlyDeleteFile,
  restoreFile,
  softDeleteFile,
  uploadPrivateFile,
} from '@/lib/actions/vezvision/files'
import {
  createFolder,
  deleteFolder,
  moveFolder,
} from '@/lib/actions/vezvision/files-folders'
import {
  listFolderAcl,
  listAssignableFileUsers,
  removeFolderAcl,
  upsertFolderAcl,
} from '@/lib/actions/vezvision/files-acl'
import type { VVFile, VVFileAssignableUser, VVFolder, VVFolderAclEntry } from '@/lib/actions/vezvision/types'
import {
  ROOT_FOLDER_ID,
  inputCls,
  mutedLabelCls,
  subtleBtnCls,
  primaryBtnCls,
  dangerBtnCls,
  normalizeFolderPath,
  isRootFolder,
  formatBytes,
  updateSearchParams,
  buildFolderTree,
  canPreviewFile,
  getFileIcon,
  type FolderTreeNode,
  type DragItemState,
} from './files-utils'

interface FilesListClientProps {
  folders: VVFolder[]
  allFolders: VVFolder[]
  files: VVFile[]
  canManage: boolean
  currentFolderId: string | null
  breadcrumbs: VVFolder[]
  activeTab: 'active' | 'trash'
  initialQuery: string
  initialSort: 'created_at' | 'original_name' | 'size_bytes'
  initialDirection: 'asc' | 'desc'
  initialMime: string
  canManageAcl: boolean
}

type ViewMode = 'list' | 'grid'

export default function FilesListClient({
  folders: initialFolders,
  allFolders: initialAllFolders,
  files: initialFiles,
  canManage,
  currentFolderId,
  breadcrumbs: initialBreadcrumbs,
  activeTab,
  initialQuery,
  initialSort,
  initialDirection,
  initialMime,
  canManageAcl,
}: FilesListClientProps) {
  const folders = initialFolders
  const allFolders = initialAllFolders
  const files = initialFiles
  const breadcrumbs = initialBreadcrumbs

  const [, startTransition] = useTransition()
  const [viewMode] = useState<ViewMode>('list')
  const [newFolderName, setNewFolderName] = useState('')
  const [folderLoading, setFolderLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
        const [aclUserId, setAclUserId] = useState('')
  const [aclUserQuery, setAclUserQuery] = useState('')
  const [aclCanView, setAclCanView] = useState(true)
  const [aclCanUpload, setAclCanUpload] = useState(false)
  const [aclCanManage, setAclCanManage] = useState(false)
  const [aclDrawerOpen, setAclDrawerOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<VVFile | null>(initialFiles[0] ?? null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [openFolderMenuId, setOpenFolderMenuId] = useState<string | null>(null)
  const [openFileMenuId, setOpenFileMenuId] = useState<string | null>(null)
  const [dragItem, setDragItem] = useState<DragItemState | null>(null)
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set())
  const [isUploadHovering, setIsUploadHovering] = useState(false)

  const [queryInput, setQueryInput] = useState(initialQuery)
  const [mimeInput] = useState(initialMime)
  const [sortInput] = useState<'created_at' | 'original_name' | 'size_bytes'>(initialSort)
  const [directionInput] = useState<'asc' | 'desc'>(initialDirection)

  const [page, setPage] = useState(1)
  const PAGE_SIZE = 25
      const [folderAcl, setFolderAcl] = useState<VVFolderAclEntry[]>([])
  const [aclLoading, setAclLoading] = useState(false)
  const [assignableUsers, setAssignableUsers] = useState<VVFileAssignableUser[]>([])
  
  const nonRootFolders = useMemo(() => folders.filter((folder) => !isRootFolder(folder)), [folders])
  const nonRootAllFolders = useMemo(() => allFolders.filter((folder) => !isRootFolder(folder)), [allFolders])
  const folderTree = useMemo(() => buildFolderTree(nonRootAllFolders), [nonRootAllFolders])
    const selectedAclUser = useMemo(() => assignableUsers.find((user) => user.id === aclUserId) ?? null, [assignableUsers, aclUserId])
  const localAclEntries = useMemo(() => folderAcl.filter((entry) => !entry.is_inherited), [folderAcl])
  const inheritedAclEntries = useMemo(() => folderAcl.filter((entry) => entry.is_inherited), [folderAcl])
  const filteredAssignableUsers = useMemo(() => {
    const normalizedQuery = aclUserQuery.trim().toLowerCase()
    if (!normalizedQuery) return assignableUsers.slice(0, 12)

    return assignableUsers
      .filter((user) => `${user.email ?? ''} ${user.name ?? ''} ${user.id}`.toLowerCase().includes(normalizedQuery))
      .slice(0, 12)
  }, [assignableUsers, aclUserQuery])

  const visibleBreadcrumbs = useMemo(() => breadcrumbs.filter((crumb) => !isRootFolder(crumb)), [breadcrumbs])
  const breadcrumbItems = useMemo(
    () => [
      { label: 'Główna', href: '/vezvision/files' },
      ...visibleBreadcrumbs.map((crumb) => ({ label: crumb.name, href: `/vezvision/files?folder=${crumb.id}` })),
    ],
    [visibleBreadcrumbs]
  )
  const currentFolder = breadcrumbs.at(-1) ?? null
  const currentFolderPath = normalizeFolderPath(currentFolder?.full_path)
          const currentPathExpandedIds = useMemo(() => new Set(breadcrumbs.filter((crumb) => !isRootFolder(crumb)).map((crumb) => crumb.id)), [breadcrumbs])
  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + file.size_bytes, 0), [files])
    
  const totalPages = Math.max(1, Math.ceil(files.length / PAGE_SIZE))
  const paginatedFiles = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return files.slice(start, start + PAGE_SIZE)
  }, [files, page])
          
  const router = useRouter()
  const { confirm } = useConfirm()
  const { token: csrfToken, refreshToken } = useCSRFToken()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const resolveCsrfToken = async (): Promise<string | null> => {
    if (csrfToken) return csrfToken
    return refreshToken()
  }

  const loadAcl = async () => {
    if (!currentFolderId || !canManageAcl || aclLoading) return
    setAclLoading(true)
    const [aclResult, usersResult] = await Promise.all([
      listFolderAcl(currentFolderId),
      listAssignableFileUsers(),
    ])
    if (aclResult.success) setFolderAcl(aclResult.data)
    if (usersResult.success) setAssignableUsers(usersResult.data)
    setAclLoading(false)
  }

  const handleOpenAcl = () => {
    setAclDrawerOpen(true)
    if (folderAcl.length === 0 && !aclLoading) void loadAcl()
  }

  const handleCreateFolder = async () => {
    if (!canManage) return
    const token = await resolveCsrfToken()
    if (!token) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }
    if (!newFolderName.trim()) {
      toast.error('Podaj nazwę folderu')
      return
    }

    setFolderLoading(true)
    const result = await createFolder({ name: newFolderName.trim(), parent_id: currentFolderId }, token)
    if (result.success) {
      toast.success('Folder utworzony')
      setNewFolderName('')
      if (result.data) {
        router.push(window.location.pathname + window.location.search)
      }
    } else {
      toast.error(result.error)
    }
    setFolderLoading(false)
  }

  const uploadOneFile = async (file: globalThis.File, token: string): Promise<boolean> => {
    const uploaded = await uploadPrivateFile(
      {
        folder_id: currentFolderId,
        original_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        file: await file.arrayBuffer(),
      },
      token
    )

    if (!uploaded.success) {
      toast.error(uploaded.error)
      return false
    }

    return true
  }

  const handleUploadFiles = async (fileList: FileList | globalThis.File[]) => {
    if (!canManage) return
    const incomingFiles = Array.from(fileList)
    if (incomingFiles.length === 0) return

    const token = await resolveCsrfToken()
    if (!token) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    setUploadLoading(true)
    setUploadProgress({ done: 0, total: incomingFiles.length })

    let successCount = 0
    for (const [index, file] of incomingFiles.entries()) {
      const success = await uploadOneFile(file, token)
      if (success) successCount += 1
      setUploadProgress({ done: index + 1, total: incomingFiles.length })
    }

    if (successCount === incomingFiles.length) {
      toast.success(incomingFiles.length === 1 ? 'Plik przesłany' : `Przesłano pliki: ${successCount}`)
    } else {
      toast.error(`Przesłano ${successCount}/${incomingFiles.length} plików`)
    }

    setUploadLoading(false)
    setUploadProgress(null)
    router.push(window.location.pathname + window.location.search)
  }

  const handleDownload = async (file: VVFile) => {
    const result = await getFileDownloadUrl(file.id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    window.open(result.data, '_blank', 'noopener,noreferrer')
  }

  const handleDelete = async (file: VVFile) => {
    if (!canManage) return
    const approved = await confirm({
      title: 'Usunąć plik?',
      message: `Plik „${file.original_name}” zostanie przeniesiony do kosza.`,
      confirmText: 'Usuń',
      cancelText: 'Anuluj',
      variant: 'danger',
    })
    if (!approved) return

    const token = await resolveCsrfToken()
    if (!token) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }
      const result = await softDeleteFile(file.id, token)
    if (result.success) {
      toast.success('Plik przeniesiony do kosza')
      router.push(window.location.pathname + window.location.search)
    } else {
      toast.error(result.error)
    }
  }

  const handleRestore = async (fileId: string) => {
    if (!canManage) return
    const token = await resolveCsrfToken()
    if (!token) return
      const result = await restoreFile(fileId, token)
    if (result.success) {
      toast.success('Plik przywrócony')
      router.push(window.location.pathname + window.location.search)
    } else {
      toast.error(result.error)
    }
  }

  const handlePermanentDelete = async (fileId: string) => {
    if (!canManage) return
    const approved = await confirm({
      title: 'Usunąć plik trwale?',
      message: 'Ta operacja jest nieodwracalna.',
      confirmText: 'Usuń trwale',
      cancelText: 'Anuluj',
      variant: 'danger',
    })
    if (!approved) return

    const token = await resolveCsrfToken()
    if (!token) return
      const result = await permanentlyDeleteFile(fileId, token)
    if (result.success) {
      toast.success('Plik usunięty trwale')
      router.push(window.location.pathname + window.location.search)
    } else {
      toast.error(result.error)
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!canManage) return
    const targetFolder = nonRootFolders.find((folder) => folder.id === folderId)
    const approved = await confirm({
      title: 'Usunąć folder?',
      message: `Folder „${targetFolder?.name ?? 'folder'}” zostanie usunięty, jeśli jest pusty.`,
      confirmText: 'Usuń folder',
      cancelText: 'Anuluj',
      variant: 'danger',
    })
    if (!approved) return

    const token = await resolveCsrfToken()
    if (!token) return

    const result = await deleteFolder(folderId, token)
    if (result.success) {
      toast.success('Folder usunięty')
      if (currentFolderId === folderId) {
        router.push('/vezvision/files')
      } else {
        router.push(window.location.pathname + window.location.search)
      }
    } else {
      toast.error(result.error)
    }
  }

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds((prev) => (prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]))
  }

  const applyFilters = () => {
    setSelectedFileIds([])
    startTransition(() => {
      const current = new URLSearchParams(window.location.search)
      const next = updateSearchParams(current, {
        q: queryInput.trim() || null,
        mime: mimeInput.trim() || null,
        sort: sortInput,
        direction: directionInput,
      })
      router.push(`/vezvision/files${next}`)
    })
  }

  const handleTabChange = (tab: 'active' | 'trash') => {
    setSelectedFileIds([])
    startTransition(() => {
      const current = new URLSearchParams(window.location.search)
      const next = updateSearchParams(current, { tab: tab === 'active' ? null : tab })
      router.push(`/vezvision/files${next}`)
    })
  }

  const handleUpsertAcl = async () => {
    if (!canManageAcl || !currentFolderId) return
    const token = await resolveCsrfToken()
    if (!token) return
    if (!aclUserId.trim()) {
      toast.error('Wybierz użytkownika dla ACL')
      return
    }

    const result = await upsertFolderAcl(
      {
        folderId: currentFolderId,
        userId: aclUserId.trim(),
        canView: aclCanView,
        canUpload: aclCanUpload,
        canManage: aclCanManage,
      },
      token
    )

    if (result.success) {
      toast.success('Uprawnienia folderu zapisane')
      setAclUserId('')
      setAclUserQuery('')
      setAclCanView(true)
      setAclCanUpload(false)
      setAclCanManage(false)
      void loadAcl()
    } else {
      toast.error(result.error)
    }
  }

  const handleRemoveAcl = async (userId: string) => {
    if (!canManageAcl || !currentFolderId) return
    const token = await resolveCsrfToken()
    if (!token) return
    const result = await removeFolderAcl(currentFolderId, userId, token)
    if (result.success) {
      toast.success('Uprawnienie usunięte')
      setFolderAcl((prev) => prev.filter((e) => e.user_id !== userId))
    } else {
      toast.error(result.error)
    }
  }

  const handleEditAclEntry = (entry: VVFolderAclEntry) => {
    if (entry.is_inherited) return
    setAclUserId(entry.user_id)
    setAclUserQuery(entry.user_email ?? entry.user_name ?? entry.user_id)
    setAclCanView(entry.can_view)
    setAclCanUpload(entry.can_upload)
    setAclCanManage(entry.can_manage)
  }

  const toggleFolderExpanded = (folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const handleDropOnFolder = async (targetFolderId: string | null) => {
    if (!dragItem || !canManage) return
    const token = await resolveCsrfToken()
    if (!token) return

    if (dragItem.type === 'file') {
      const result = await moveFile(dragItem.id, targetFolderId, token)
      if (result.success) {
        toast.success('Plik przeniesiony')
        router.push(window.location.pathname + window.location.search)
      } else {
        toast.error(result.error)
      }
    }

    if (dragItem.type === 'folder') {
      if (dragItem.id === targetFolderId) {
        setDragItem(null)
        return
      }
      const result = await moveFolder(dragItem.id, targetFolderId, token)
      if (result.success) {
        toast.success('Folder przeniesiony')
        router.push(window.location.pathname + window.location.search)
      } else {
        toast.error(result.error)
      }
    }

    setDragItem(null)
  }

  const renderFolderTree = (nodes: FolderTreeNode[]) => {
    return nodes.map((node) => {
      const isCurrent = currentFolderId === node.folder.id
      const isExpanded = expandedFolderIds.has(node.folder.id) || currentPathExpandedIds.has(node.folder.id)
      const hasChildren = node.children.length > 0

      return (
        <div key={node.folder.id} className="min-w-0">
          <div
            className={`group flex min-w-0 items-center gap-2 rounded-[4px] px-2 py-2 transition-colors ${
              isCurrent ? 'bg-[#ececf1] font-medium text-[#111111]' : 'text-[#656b76] hover:bg-[#f7f7f9] hover:text-[#111111]'
            }`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={async (event) => {
              event.preventDefault()
              await handleDropOnFolder(node.folder.id)
            }}
          >
            <button type="button" onClick={() => (hasChildren ? toggleFolderExpanded(node.folder.id) : undefined)} className="shrink-0 text-[#8b9098]" aria-label="Rozwiń folder">
              {hasChildren ? (isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : <span className="block h-3.5 w-3.5" />}
            </button>

            <Link
              href={`/vezvision/files?folder=${node.folder.id}`}
              draggable={canManage}
              onDragStart={() => setDragItem({ type: 'folder', id: node.folder.id })}
              className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden"
            >
              <Folder className="h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-[13px]">{node.folder.name}</p>
                <p className="truncate text-[10px] text-[#8b9098]">{normalizeFolderPath(node.folder.full_path)}</p>
              </div>
            </Link>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setOpenFolderMenuId((prev) => (prev === node.folder.id ? null : node.folder.id))}
                className="rounded-[4px] p-1.5 text-[#8b9098] opacity-0 transition-colors hover:bg-[#fbfbfc] hover:text-[#111111] group-hover:opacity-100"
                aria-label="Akcje folderu"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>

              {openFolderMenuId === node.folder.id && (
                <div className="absolute right-0 top-8 z-20 min-w-40 rounded-[6px] border border-[#e7e8ee] bg-white p-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenFolderMenuId(null)
                      router.push(`/vezvision/files?folder=${node.folder.id}`)
                    }}
                    className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-left text-[13px] text-[#111111] hover:bg-[#f7f7f9]"
                  >
                    <Folder className="h-3.5 w-3.5" />
                    Otwórz
                  </button>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenFolderMenuId(null)
                        void handleDeleteFolder(node.folder.id)
                      }}
                      className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Usuń
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {hasChildren && isExpanded ? <div className="ml-4 border-l border-[#ececf1] pl-2">{renderFolderTree(node.children)}</div> : null}
        </div>
      )
    })
  }

  const renderFileActions = (file: VVFile) => (
    <div className="relative flex items-center justify-end gap-1">
      {activeTab === 'active' && canPreviewFile(file) && (
        <button type="button" onClick={() => void handleOpenPreviewDrawer(file)} className="rounded-[4px] p-1.5 text-[#8b9098] transition-colors hover:bg-[#f7f7f9] hover:text-[#111111]" aria-label="Pokaż podgląd">
          <Eye className="h-3.5 w-3.5" />
        </button>
      )}
      {activeTab === 'active' && (
        <button type="button" onClick={() => void handleDownload(file)} className="rounded-[4px] p-1.5 text-[#8b9098] transition-colors hover:bg-[#f7f7f9] hover:text-[#111111]" aria-label="Pobierz plik">
          <Download className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={() => setOpenFileMenuId((prev) => (prev === file.id ? null : file.id))}
        className="rounded-[4px] p-1.5 text-[#8b9098] transition-colors hover:bg-[#f7f7f9] hover:text-[#111111]"
        aria-label="Więcej akcji"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>

      {openFileMenuId === file.id && (
        <div className="absolute right-0 top-9 z-20 min-w-44 rounded-[6px] border border-[#e7e8ee] bg-white p-1 shadow-xl">
          {activeTab === 'active' && canPreviewFile(file) && (
            <button
              type="button"
              onClick={() => {
                setOpenFileMenuId(null)
                void handleOpenPreviewDrawer(file)
              }}
              className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-left text-[13px] text-[#111111] hover:bg-[#f7f7f9]"
            >
              <Eye className="h-3.5 w-3.5" />
              Podgląd
            </button>
          )}
          {activeTab === 'active' && (
            <button
              type="button"
              onClick={() => {
                setOpenFileMenuId(null)
                void handleDownload(file)
              }}
              className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-left text-[13px] text-[#111111] hover:bg-[#f7f7f9]"
            >
              <Download className="h-3.5 w-3.5" />
              Pobierz
            </button>
          )}
          {canManage && activeTab === 'active' && (
            <button
              type="button"
              onClick={() => {
                setOpenFileMenuId(null)
                void handleDelete(file)
              }}
              className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Do kosza
            </button>
          )}
          {canManage && activeTab === 'trash' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setOpenFileMenuId(null)
                  void handleRestore(file.id)
                }}
                className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-left text-[13px] text-[#111111] hover:bg-[#f7f7f9]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Przywróć
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenFileMenuId(null)
                  void handlePermanentDelete(file.id)
                }}
                className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Usuń trwale
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )

  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false)

  const handleOpenPreviewDrawer = async (file: VVFile) => {
    setPreviewFile(file)
    setPreviewDrawerOpen(true)
    setPreviewUrl(null)

    if (activeTab === 'trash') return
    if (!canPreviewFile(file)) return

    setPreviewLoading(true)
    const result = await getFileDownloadUrl(file.id)
    if (result.success) {
      setPreviewUrl(result.data)
    } else {
      toast.error(result.error)
    }
    setPreviewLoading(false)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#ececf1] px-5 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[11px] text-[#8b9098]">
            {breadcrumbItems.map((item, index) => (
              <span key={`${item.href}-${index}`} className="flex items-center gap-2">
                {index > 0 && <span className="text-[#d7d9e2]">/</span>}
                <Link href={item.href} className="transition-colors hover:text-[#111111]">
                  {item.label}
                </Link>
              </span>
            ))}
          </div>
          <span className="text-[12px] text-[#656b76]">
            {files.length} plików · {formatBytes(totalBytes)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
            <input
              type="text"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Szukaj..."
              className="h-8 w-48 rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc] pl-8 pr-3 text-[12px] text-[#111111] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#d7d9e2] focus:bg-white"
              onKeyDown={(e) => { if (e.key === 'Enter') applyFilters() }}
            />
          </div>
          <button type="button" onClick={() => handleTabChange('active')} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] px-3 text-[11px] transition-colors ${activeTab === 'active' ? 'bg-[#111111] font-medium text-white shadow-sm' : 'border border-[#e7e8ee] bg-white text-[#656b76] hover:border-[#d7d9e2]'}`}>
            Aktywne
          </button>
          <button type="button" onClick={() => handleTabChange('trash')} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] px-3 text-[11px] transition-colors ${activeTab === 'trash' ? 'border border-red-200 bg-red-50 font-medium text-red-600' : 'border border-[#e7e8ee] bg-white text-[#656b76] hover:border-[#d7d9e2]'}`}>
            Kosz
          </button>
          {currentFolderId && canManageAcl && (
            <button type="button" onClick={handleOpenAcl} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] border border-[#e7e8ee] bg-white px-3 text-[11px] text-[#656b76] transition-colors hover:border-[#d7d9e2]">
              <Shield className="h-3.5 w-3.5" />
            </button>
          )}
          {canManage && (
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadLoading} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] bg-[#111111] px-3 text-[11px] font-medium text-white shadow-sm transition-colors hover:bg-[#262626] disabled:opacity-50">
              <Upload className="h-3.5 w-3.5" />
              Dodaj
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={async (event) => {
              const input = event.currentTarget
              if (input.files) await handleUploadFiles(input.files)
              input.value = ''
            }}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 border-r border-[#ececf1] bg-[#fafafa]">
          <div className="p-3">
            <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b9098]">Foldery</p>
            <div className="mt-1 space-y-0.5">
              <Link
                href="/vezvision/files"
                onDragOver={(event) => event.preventDefault()}
                onDrop={async (event) => {
                  event.preventDefault()
                  await handleDropOnFolder(null)
                }}
                className={`flex items-center gap-2 rounded-[4px] px-2 py-1.5 text-[12px] transition-colors ${currentFolderId === null ? 'bg-[#ececf1] font-medium text-[#111111]' : 'text-[#656b76] hover:bg-[#f0f0f4]'}`}
              >
                <Folder className="h-3.5 w-3.5" />
                Główna
              </Link>
              {folderTree.length === 0 ? <p className="px-2 py-3 text-[11px] text-[#656b76]">Brak folderów.</p> : renderFolderTree(folderTree)}
            </div>
          </div>

          {canManage && (
            <div className="border-t border-[#ececf1] p-3">
              <div className="flex gap-2">
                <input type="text" value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="Nowy folder" className="h-8 flex-1 rounded-[4px] border border-[#e7e8ee] bg-white px-2 text-[11px] outline-none focus:border-[#d7d9e2]" />
                <button type="button" onClick={handleCreateFolder} disabled={folderLoading} className="inline-flex h-8 items-center rounded-[4px] bg-[#111111] px-2.5 text-[11px] text-white transition-colors hover:bg-[#262626] disabled:opacity-50">
                  <FolderPlus className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 overflow-auto bg-white">
          {canManage && activeTab === 'active' && (
            <div
              className={`m-4 rounded-[6px] border-2 border-dashed p-4 transition-colors ${isUploadHovering ? 'border-[#111111] bg-[#f7f7f9]' : 'border-[#ececf1] bg-[#fafafa]'}`}
              onDragEnter={(event) => { event.preventDefault(); setIsUploadHovering(true) }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsUploadHovering(false)}
              onDrop={async (event) => { event.preventDefault(); setIsUploadHovering(false); await handleUploadFiles(Array.from(event.dataTransfer.files)) }}
            >
              <div className="flex items-center justify-center gap-2 text-[12px] text-[#656b76]">
                <Upload className="h-4 w-4" />
                <span>Przeciągnij pliki lub</span>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadLoading} className="font-medium text-[#111111] underline">
                  wybierz z dysku
                </button>
              </div>
            </div>
          )}

          {files.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <File className="h-10 w-10 text-[#d7d9e2]" />
              <p className="mt-3 text-[13px] text-[#656b76]">{activeTab === 'trash' ? 'Kosz jest pusty' : 'Brak plików'}</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="divide-y divide-[#ececf1]">
              {paginatedFiles.map((file) => {
                const Icon = getFileIcon(file)
                const isSelected = selectedFileIds.includes(file.id)
                return (
                  <div
                    key={file.id}
                    draggable={canManage && activeTab === 'active'}
                    onDragStart={() => setDragItem({ type: 'file', id: file.id })}
                    className={`group flex items-center gap-3 px-5 py-3 transition-colors ${isSelected ? 'bg-[#f7f7f9]' : 'hover:bg-[#fafafa]'}`}
                  >
                    {canManage && <Checkbox checked={isSelected} onChange={() => toggleFileSelection(file.id)} aria-label={`Zaznacz ${file.original_name}`} />}
                    <button type="button" onClick={() => void handleOpenPreviewDrawer(file)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <Icon className="h-5 w-5 shrink-0 text-[#8b9098]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-[#111111]">{file.original_name}</span>
                      </span>
                    </button>
                    <span className="hidden w-32 truncate text-[11px] text-[#8b9098] sm:block">{file.mime_type}</span>
                    <span className="w-20 text-right text-[11px] text-[#656b76]">{formatBytes(file.size_bytes)}</span>
                    <div className="opacity-0 transition-opacity group-hover:opacity-100">
                      {renderFileActions(file)}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 lg:grid-cols-4">
              {paginatedFiles.map((file) => {
                const Icon = getFileIcon(file)
                const isSelected = selectedFileIds.includes(file.id)
                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => void handleOpenPreviewDrawer(file)}
                    draggable={canManage && activeTab === 'active'}
                    onDragStart={() => setDragItem({ type: 'file', id: file.id })}
                    className={`flex flex-col items-center rounded-[6px] border border-[#ececf1] p-4 text-center transition-colors hover:border-[#d7d9e2] hover:bg-[#fafafa] ${isSelected ? 'bg-[#f7f7f9] ring-1 ring-[#d7d9e2]' : ''}`}
                  >
                    <Icon className="h-10 w-10 text-[#8b9098]" />
                    <span className="mt-2 block w-full truncate text-[12px] text-[#111111]">{file.original_name}</span>
                    <span className="mt-0.5 text-[10px] text-[#656b76]">{formatBytes(file.size_bytes)}</span>
                  </button>
                )
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 border-t border-[#ececf1] px-4 py-3">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="inline-flex h-7 items-center rounded-[4px] border border-[#e7e8ee] px-2.5 text-[11px] text-[#656b76] disabled:opacity-40">Poprzednia</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i
                return (
                  <button key={pageNum} type="button" onClick={() => setPage(pageNum)} className={`inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[11px] ${pageNum === page ? 'bg-[#111111] font-medium text-white' : 'border border-[#e7e8ee] text-[#656b76]'}`}>
                    {pageNum}
                  </button>
                )
              })}
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="inline-flex h-7 items-center rounded-[4px] border border-[#e7e8ee] px-2.5 text-[11px] text-[#656b76] disabled:opacity-40">Następna</button>
            </div>
          )}
        </main>
      </div>

      {aclDrawerOpen && currentFolderId && canManageAcl && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#fbfbfc]/70 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-3xl flex-col border-l border-[#e7e8ee] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#ececf1] px-5 py-4">
              <div className="min-w-0">
                <p className={mutedLabelCls}>Uprawnienia folderu</p>
                <h2 className="mt-1 truncate text-[16px] font-medium text-[#111111]">{currentFolder?.name ?? 'Folder'}</h2>
                <p className="mt-0.5 break-all text-[12px] text-[#656b76]">{currentFolderPath}</p>
              </div>
              <button type="button" onClick={() => setAclDrawerOpen(false)} className={subtleBtnCls}>
                <X className="h-3.5 w-3.5" />
                Zamknij
              </button>
            </div>

            <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)]">
              <div className="space-y-4 overflow-auto border-b border-[#ececf1] p-5 lg:border-b-0 lg:border-r">
                <div>
                  <p className={mutedLabelCls}>Nadaj dostęp</p>
                  <p className="mt-1 text-[12px] text-[#656b76]">Wybierz użytkownika i zakres dostępu.</p>
                </div>

                <input type="text" value={aclUserQuery} onChange={(event) => setAclUserQuery(event.target.value)} placeholder="Szukaj użytkownika" className={inputCls} />

                <div className="max-h-56 overflow-auto rounded-[4px] border border-[#e7e8ee]">
                  {filteredAssignableUsers.length === 0 ? (
                    <div className="px-3 py-3 text-[12px] text-[#656b76]">Brak wyników</div>
                  ) : (
                    filteredAssignableUsers.map((user) => {
                      const isSelected = user.id === aclUserId

                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => setAclUserId(user.id)}
                          className={`flex w-full items-start justify-between gap-3 border-b border-[#ececf1] px-3 py-3 text-left transition-colors last:border-b-0 ${isSelected ? 'bg-[#ececf1]' : 'hover:bg-[#f7f7f9]'}`}
                        >
                          <span className="min-w-0 pr-2">
                            <span className="block truncate text-[12px] text-[#111111]">{user.email ?? user.name ?? user.id}</span>
                            <span className="mt-0.5 block truncate text-[10px] text-[#656b76]">{user.name ?? user.id}</span>
                          </span>
                          {isSelected && <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#111111]">Wybrany</span>}
                        </button>
                      )
                    })
                  )}
                </div>

                {selectedAclUser && (
                  <div className="rounded-[4px] border border-[#e7e8ee] p-3">
                    <p className="text-[11px] text-[#111111]">{selectedAclUser.email ?? selectedAclUser.name ?? selectedAclUser.id}</p>
                    <p className="mt-0.5 break-all text-[10px] text-[#656b76]">{selectedAclUser.id}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="flex items-center justify-between rounded-[4px] border border-[#e7e8ee] px-3 py-2 text-[13px]">
                    <span className="text-[#111111]">Wyświetlanie</span>
                    <Checkbox checked={aclCanView} onChange={(event) => setAclCanView(event.target.checked)} aria-label="Uprawnienie wyświetlania" />
                  </label>
                  <label className="flex items-center justify-between rounded-[4px] border border-[#e7e8ee] px-3 py-2 text-[13px]">
                    <span className="text-[#111111]">Wysyłanie</span>
                    <Checkbox checked={aclCanUpload} onChange={(event) => setAclCanUpload(event.target.checked)} aria-label="Uprawnienie wysyłania" />
                  </label>
                  <label className="flex items-center justify-between rounded-[4px] border border-[#e7e8ee] px-3 py-2 text-[13px]">
                    <span className="text-[#111111]">Zarządzanie</span>
                    <Checkbox checked={aclCanManage} onChange={(event) => setAclCanManage(event.target.checked)} aria-label="Uprawnienie zarządzania" />
                  </label>
                </div>

                <button type="button" onClick={handleUpsertAcl} className={`${primaryBtnCls} w-full`}>
                  Zapisz dostęp
                </button>
              </div>

              <div className="overflow-auto p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className={mutedLabelCls}>Aktualne przypisania</p>
                    <p className="mt-1 text-[12px] text-[#656b76]">Lokalne wpisy można edytować. Odziedziczone pochodzą z folderów nadrzędnych.</p>
                  </div>
                  <span className="rounded-[4px] border border-[#e7e8ee] px-3 py-1.5 text-[10px] text-[#656b76]">{folderAcl.length}</span>
                </div>

                <div className="space-y-5">
                  <AclEntriesGroup title="Lokalne" entries={localAclEntries} editable onEdit={handleEditAclEntry} onRemove={handleRemoveAcl} />
                  <AclEntriesGroup title="Odziedziczone" entries={inheritedAclEntries} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={() => setPreviewDrawerOpen(false)}>
          <div className="flex h-full w-full max-w-md flex-col border-l border-[#ececf1] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#ececf1] px-4 py-3">
              <h2 className="truncate text-[13px] font-medium text-[#111111]">{previewFile?.original_name ?? 'Podgląd'}</h2>
              <button type="button" onClick={() => setPreviewDrawerOpen(false)} className="rounded-[4px] p-1.5 text-[#8b9098] hover:bg-[#f0f0f4] hover:text-[#111111]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {!previewFile ? (
                <p className="text-center text-[12px] text-[#656b76]">Wybierz plik</p>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc] p-2">
                    {previewLoading ? (
                      <div className="flex h-48 items-center justify-center text-[12px] text-[#656b76]">Ładowanie…</div>
                    ) : previewUrl && previewFile.mime_type.startsWith('image/') ? (
                      <Image src={previewUrl} alt={previewFile.original_name} width={600} height={400} unoptimized className="w-full rounded-[4px] object-contain" />
                    ) : previewUrl && (previewFile.mime_type === 'application/pdf' || previewFile.mime_type.startsWith('text/')) ? (
                      <iframe src={previewUrl} title={previewFile.original_name} className="h-64 w-full rounded-[4px] border border-[#e7e8ee]" />
                    ) : (
                      <div className="flex h-48 flex-col items-center justify-center gap-2 text-[12px] text-[#656b76]">
                        <File className="h-8 w-8 text-[#8b9098]" />
                        Brak podglądu
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-[4px] border border-[#e7e8ee] p-3">
                      <p className={mutedLabelCls}>Rozmiar</p>
                      <p className="mt-1 text-[13px] text-[#111111]">{formatBytes(previewFile.size_bytes)}</p>
                    </div>
                    <div className="rounded-[4px] border border-[#e7e8ee] p-3">
                      <p className={mutedLabelCls}>Dostęp</p>
                      <p className="mt-1 text-[13px] text-[#111111]">{previewFile.is_public ? 'Publiczny' : 'Prywatny'}</p>
                    </div>
                  </div>
                  <div className="rounded-[4px] border border-[#e7e8ee] p-3">
                    <p className={mutedLabelCls}>Typ MIME</p>
                    <p className="mt-1 text-[11px] text-[#656b76]">{previewFile.mime_type}</p>
                  </div>
                  {activeTab === 'active' && (
                    <button type="button" onClick={() => void handleDownload(previewFile)} className={`${subtleBtnCls} w-full`}>
                      <Download className="h-3.5 w-3.5" />
                      Pobierz
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AclEntriesGroup({
  title,
  entries,
  editable = false,
  onEdit,
  onRemove,
}: {
  title: string
  entries: VVFolderAclEntry[]
  editable?: boolean
  onEdit?: (entry: VVFolderAclEntry) => void
  onRemove?: (userId: string) => void
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className={mutedLabelCls}>{title}</p>
        <span className="text-[10px] text-[#656b76]">{entries.length}</span>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-[4px] border border-dashed border-[#e7e8ee] px-4 py-6 text-center text-[12px] text-[#656b76]">Brak wpisów.</div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={`${title}-${entry.user_id}-${entry.source_folder_id}`} className="rounded-[6px] border border-[#e7e8ee] bg-[#fbfbfc] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 pr-2">
                  <p className="truncate text-[12px] font-medium text-[#111111]">{entry.user_email ?? entry.user_name ?? entry.user_id}</p>
                  <p className="mt-0.5 break-all text-[10px] text-[#656b76]">{entry.user_id}</p>
                  {entry.is_inherited && (
                    <p className="mt-2 text-[11px] text-[#656b76]">
                      Źródło: <span className="text-[#111111]">{entry.source_folder_name}</span> · {normalizeFolderPath(entry.source_folder_path)}
                    </p>
                  )}
                </div>
                {editable && onEdit && onRemove && (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onEdit(entry)} className={subtleBtnCls}>
                      Edytuj
                    </button>
                    <button type="button" onClick={() => onRemove(entry.user_id)} className={dangerBtnCls}>
                      Usuń
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
                <AclPill enabled={entry.can_view} label="Widok" />
                <AclPill enabled={entry.can_upload} label="Wysyłanie" />
                <AclPill enabled={entry.can_manage} label="Zarządzanie" />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function AclPill({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div className={`rounded-[4px] border px-2 py-2 text-center ${enabled ? 'border-[#d7d9e2] bg-[#ececf1] text-[#111111]' : 'border-[#e7e8ee] text-[#656b76]'}`}>
      {label}
    </div>
  )
}
