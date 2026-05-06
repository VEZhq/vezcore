import { timingSafeEqual } from 'node:crypto'
import { logError } from '@/lib/logger'
import {
  UPLOAD_PRIVATE_MAX_SIZE,
  STORAGE_QUOTA_MANAGER,
  STORAGE_QUOTA_EDITOR,
  STORAGE_QUOTA_USER,
  STORAGE_QUOTA_DEFAULT,
} from '@/lib/constants/file-limits'
import { getVezVisionPrivilegedClient } from '@/lib/supabase/vezvision'
import { createActionClient } from '@/lib/supabase/server'
import { getVezVisionPermissionState, hasVezVisionPermission } from '@/lib/auth/vezvision-permissions'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import type { VezVisionPermissionKey } from '@/lib/vezvision-permissions'
import { getClientIP, validateUUID } from '@/lib/server-utils'
import type {
  VVFile,
  VVFileAssignableUser,
  VVFileEvent,
  VVFileEventType,
  VVFolderAclEntry,
  VVFolder,
} from './types'
import type { Json } from '@/types/vezvision-db'

export const ALLOWED_FILE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
])

export const MAX_FILE_SIZE_BYTES = UPLOAD_PRIVATE_MAX_SIZE

export const ROLE_STORAGE_QUOTA_BYTES: Record<string, number> = {
  super_admin: Number.POSITIVE_INFINITY,
  admin: Number.POSITIVE_INFINITY,
  manager: STORAGE_QUOTA_MANAGER,
  editor: STORAGE_QUOTA_EDITOR,
  user: STORAGE_QUOTA_USER,
}

export const DEFAULT_STORAGE_QUOTA_BYTES = STORAGE_QUOTA_DEFAULT
export const DEFAULT_RETENTION_DAYS = 30
export const ROOT_FOLDER_ID = '00000000-0000-0000-0000-000000000001'

export type FileSortBy = 'created_at' | 'original_name' | 'size_bytes'
export type SortDirection = 'asc' | 'desc'

export interface ListFilesOptions {
  folderId?: string | null
  includeDeleted?: boolean
  deletedOnly?: boolean
  query?: string
  mimePrefix?: string | null
  sortBy?: FileSortBy
  sortDirection?: SortDirection
  limit?: number
}

export interface CleanupRetentionResult {
  deletedCount: number
  failedCount: number
}

export function isAdminRole(role: string | null): boolean {
  return role === 'admin' || role === 'super_admin'
}

export async function getFolderChain(folderId: string): Promise<VVFolder[] | null> {
  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv.rpc('get_folder_chain', { start_folder_id: folderId })

  if (error) {
    logError('files-internal.getFolderChain', error)
    return null
  }

  return (data as VVFolder[] | null) ?? null
}

export async function canViewFolder(
  userId: string,
  role: string | null,
  _: Set<string>,
  folderId: string | null
): Promise<boolean> {
  const targetFolderId = folderId ?? ROOT_FOLDER_ID
  if (targetFolderId === ROOT_FOLDER_ID) return true
  if (isAdminRole(role)) return true

  const vv = getVezVisionPrivilegedClient()
  const { data: direct, error: directError } = await vv
    .from('vv_file_permissions')
    .select('id')
    .eq('folder_id', targetFolderId)
    .eq('user_id', userId)
    .or('can_view.eq.true,can_upload.eq.true,can_manage.eq.true')
    .maybeSingle()

  if (directError) {
    logError('files-internal.canViewFolder.direct', directError)
    return false
  }

  if (direct) return true

  const chain = await getFolderChain(targetFolderId)
  if (!chain) return false

  const ancestorIds = chain.map((item) => item.id)
  if (ancestorIds.length === 0) return false

  const { data: inherited, error: inheritedError } = await vv
    .from('vv_file_permissions')
    .select('id')
    .in('folder_id', ancestorIds)
    .eq('user_id', userId)
    .eq('can_view', true)
    .limit(1)

  if (inheritedError) {
    logError('files-internal.canViewFolder.inherited', inheritedError)
    return false
  }

  return (inherited ?? []).length > 0
}

export async function canViewFoldersBatch(
  userId: string,
  role: string | null,
  _: Set<string>,
  folderIds: string[]
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>()
  const uniqueIds = Array.from(new Set(folderIds))

  if (isAdminRole(role)) {
    for (const id of uniqueIds) result.set(id, true)
    return result
  }

  const nonRootIds = uniqueIds.filter((id) => id !== ROOT_FOLDER_ID)
  for (const id of uniqueIds) {
    if (id === ROOT_FOLDER_ID) result.set(id, true)
  }

  if (nonRootIds.length === 0) return result

  const vv = getVezVisionPrivilegedClient()

  const { data: allFolders, error: foldersError } = await vv.from('vv_folders').select('id, parent_id')
  if (foldersError || !allFolders) {
    logError('files-internal.canViewFoldersBatch.folders', foldersError)
    for (const id of nonRootIds) result.set(id, false)
    return result
  }

  const parentMap = new Map<string, string | null>()
  for (const f of allFolders) {
    parentMap.set(f.id, f.parent_id)
  }

  const chains = new Map<string, string[]>()
  for (const folderId of nonRootIds) {
    const chain: string[] = []
    let current: string | null = folderId
    const visited = new Set<string>()
    while (current && current !== ROOT_FOLDER_ID && !visited.has(current)) {
      visited.add(current)
      chain.push(current)
      current = parentMap.get(current) ?? null
    }
    if (current === ROOT_FOLDER_ID) chain.push(ROOT_FOLDER_ID)
    chains.set(folderId, chain)
  }

  const { data: directPerms, error: directError } = await vv
    .from('vv_file_permissions')
    .select('folder_id')
    .in('folder_id', nonRootIds)
    .eq('user_id', userId)
    .or('can_view.eq.true,can_upload.eq.true,can_manage.eq.true')

  if (directError) {
    logError('files-internal.canViewFoldersBatch.direct', directError)
    for (const id of nonRootIds) result.set(id, false)
    return result
  }

  const directSet = new Set((directPerms ?? []).map((p) => p.folder_id))

  const needsInheritance = nonRootIds.filter((id) => !directSet.has(id))
  for (const id of nonRootIds) {
    if (directSet.has(id)) result.set(id, true)
  }

  if (needsInheritance.length === 0) return result

  const allAncestorIds = new Set<string>()
  for (const folderId of needsInheritance) {
    for (const id of chains.get(folderId) ?? []) allAncestorIds.add(id)
  }

  const { data: inheritedPerms, error: inheritedError } = await vv
    .from('vv_file_permissions')
    .select('folder_id')
    .in('folder_id', Array.from(allAncestorIds))
    .eq('user_id', userId)
    .eq('can_view', true)

  if (inheritedError) {
    logError('files-internal.canViewFoldersBatch.inherited', inheritedError)
    for (const id of needsInheritance) result.set(id, false)
    return result
  }

  const inheritedSet = new Set((inheritedPerms ?? []).map((p) => p.folder_id))
  for (const folderId of needsInheritance) {
    const chain = chains.get(folderId) ?? []
    result.set(folderId, chain.some((id) => inheritedSet.has(id)))
  }

  return result
}

export async function canManageFolder(
  userId: string,
  role: string | null,
  permissions: Set<string>,
  folderId: string | null
): Promise<boolean> {
  const targetFolderId = folderId ?? ROOT_FOLDER_ID
  if (targetFolderId === ROOT_FOLDER_ID) return isAdminRole(role) || permissions.has(VEZVISION_PERMISSIONS.FILES_MANAGE)
  if (isAdminRole(role)) return true
  if (!permissions.has(VEZVISION_PERMISSIONS.FILES_MANAGE)) return false

  const vv = getVezVisionPrivilegedClient()
  const chain = await getFolderChain(targetFolderId)
  if (!chain) return false

  const ancestorIds = chain.map((item) => item.id)
  if (ancestorIds.length === 0) return false

  const { data, error } = await vv
    .from('vv_file_permissions')
    .select('id')
    .in('folder_id', ancestorIds)
    .eq('user_id', userId)
    .eq('can_manage', true)
    .limit(1)

  if (error) {
    logError('files-internal.canManageFolder', error)
    return false
  }

  return (data ?? []).length > 0
}

export async function canUploadToFolder(
  userId: string,
  role: string | null,
  permissions: Set<string>,
  folderId: string | null
): Promise<boolean> {
  const targetFolderId = folderId ?? ROOT_FOLDER_ID
  if (targetFolderId === ROOT_FOLDER_ID) return isAdminRole(role) || permissions.has(VEZVISION_PERMISSIONS.FILES_MANAGE)
  if (isAdminRole(role)) return true
  if (!permissions.has(VEZVISION_PERMISSIONS.FILES_MANAGE)) return false

  const vv = getVezVisionPrivilegedClient()
  const chain = await getFolderChain(targetFolderId)
  if (!chain) return false

  const ancestorIds = chain.map((item) => item.id)
  if (ancestorIds.length === 0) return false

  const { data, error } = await vv
    .from('vv_file_permissions')
    .select('id')
    .in('folder_id', ancestorIds)
    .eq('user_id', userId)
    .eq('can_upload', true)
    .limit(1)

  if (error) {
    logError('files-internal.canUploadToFolder', error)
    return false
  }

  return (data ?? []).length > 0
}

export function resolveStorageQuota(role: string | null): number {
  if (!role) return DEFAULT_STORAGE_QUOTA_BYTES
  return ROLE_STORAGE_QUOTA_BYTES[role] ?? DEFAULT_STORAGE_QUOTA_BYTES
}

export function parseRetentionDays(rawValue: string | undefined): number {
  if (!rawValue) return DEFAULT_RETENTION_DAYS
  const parsed = Number.parseInt(rawValue, 10)
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 3650) return DEFAULT_RETENTION_DAYS
  return parsed
}

export async function getUserRole(userId: string): Promise<string | null> {
  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv.from('profiles').select('role').eq('id', userId).single()
  if (error) {
    logError('files-internal.getUserRole', error)
    return null
  }
  return data?.role ?? null
}

export async function getFilesPermissionContext(): Promise<
  | { error: string }
  | { userId: string; role: string | null; permissions: Set<string> }
> {
  const state = await getVezVisionPermissionState()
  if (!state) return { error: 'Brak autoryzacji' }

  const canView = hasVezVisionPermission(state, VEZVISION_PERMISSIONS.FILES_VIEW)
  const canManage = hasVezVisionPermission(state, VEZVISION_PERMISSIONS.FILES_MANAGE)
  const canManageAcl = hasVezVisionPermission(state, VEZVISION_PERMISSIONS.FILES_PERMISSIONS_MANAGE)
  if (!canView && !canManage && !canManageAcl) return { error: 'Brak uprawnień' }

  return { userId: state.userId, role: state.role, permissions: state.permissions }
}

export async function requireAnyVezVisionActionPermission(
  keys: readonly VezVisionPermissionKey[]
): Promise<{ error: string } | { userId: string }> {
  const state = await getVezVisionPermissionState()
  if (!state) return { error: 'Brak autoryzacji' }

  const allowed = keys.some((key) => hasVezVisionPermission(state, key))
  if (!allowed) return { error: 'Brak uprawnień' }

  return { userId: state.userId }
}

export async function getActiveStorageUsedBytes(): Promise<number> {
  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv.rpc('get_active_storage_used_bytes')
  if (error) {
    logError('files-internal.getActiveStorageUsedBytes', error)
    throw new Error('Nie udało się pobrać zużycia przestrzeni plików')
  }

  return Number(data ?? 0)
}

export async function insertVezVisionAuditLog(action: string, entityType: string, entityId: string, details: Record<string, unknown>) {
  const supabase = await createActionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const ip = await getClientIP()
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: {
      ip,
      ...details,
    },
  })
}

export async function getCurrentActorEmail(): Promise<string | null> {
  const supabase = await createActionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.email ?? null
}

export async function getFolderSummary(folderId: string): Promise<{ id: string; name: string; full_path: string } | null> {
  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv.from('vv_folders').select('id, name, full_path').eq('id', folderId).single()
  if (error || !data) {
    logError('files-internal.getFolderSummary', error)
    return null
  }
  return data
}

export async function getFilesForManagedMutation(
  fileIds: string[],
  context: { userId: string; role: string | null; permissions: Set<string> },
  actionLabel: string
): Promise<{ ok: true; files: Array<{ id: string; folder_id: string | null; storage_path: string; deleted_at: string | null }> } | { ok: false; error: string }> {
  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_files')
    .select('id, folder_id, storage_path, deleted_at')
    .in('id', fileIds)

  if (error) {
    logError('files-internal.getFilesForManagedMutation.files', error)
    return { ok: false, error: 'Nie udało się pobrać plików do operacji' }
  }

  const files = (data ?? []) as Array<{ id: string; folder_id: string | null; storage_path: string; deleted_at: string | null }>
  if (files.length !== fileIds.length) {
    return { ok: false, error: 'Część plików nie istnieje' }
  }

  for (const file of files) {
    const canManage = await canManageFolder(context.userId, context.role, context.permissions, file.folder_id)
    if (!canManage) {
      return { ok: false, error: 'Brak uprawnień do jednego lub więcej wybranych plików' }
    }
  }

  return { ok: true, files }
}

export async function getResolvedFolderAclEntries(folderId: string): Promise<VVFolderAclEntry[]> {
  const vv = getVezVisionPrivilegedClient()
  const actionClient = await createActionClient()
  const chain = await getFolderChain(folderId)
  if (!chain) return []

  const chainMap = new Map(chain.map((folder) => [folder.id, folder]))
  const chainIds = chain.map((folder) => folder.id)
  const localFolderId = chain.at(-1)?.id
  if (!localFolderId) return []

  const { data: aclRowsRaw, error: aclError } = await vv
    .from('vv_file_permissions')
    .select('folder_id, user_id, can_view, can_upload, can_manage, created_at')
    .in('folder_id', chainIds)
    .is('file_id', null)
    .order('created_at', { ascending: true })

  if (aclError) {
    logError('files-internal.getResolvedFolderAclEntries.aclRows', aclError)
    return []
  }

  const aclRows = (aclRowsRaw ?? []) as Array<{
    folder_id: string
    user_id: string
    can_view: boolean
    can_upload: boolean
    can_manage: boolean
    created_at: string
  }>

  if (aclRows.length === 0) return []

  const userIds = Array.from(new Set(aclRows.map((row) => row.user_id)))
  const { data: profilesRaw } = await actionClient.from('profiles').select('id').in('id', userIds)
  const profileRows = (profilesRaw ?? []) as Array<{ id: string }>
  const profileIdSet = new Set(profileRows.map((row) => row.id))
  const { data: userEmails, error: emailsError } = await vv.rpc('get_user_emails_by_ids', { user_ids: userIds })
  if (emailsError) {
    logError('files-internal.getResolvedFolderAclEntries.get_user_emails_by_ids', emailsError)
  }
  const emailMap = new Map((userEmails ?? []).map((row: { id: string; email: string | null }) => [row.id, row.email]))

  const resolvedMap = new Map<string, VVFolderAclEntry>()
  for (const row of aclRows) {
    const sourceFolder = chainMap.get(row.folder_id)
    if (!sourceFolder) continue
    const nextEntry: VVFolderAclEntry = {
      user_id: row.user_id,
      user_email: emailMap.get(row.user_id) ?? null,
      user_name: profileIdSet.has(row.user_id) ? row.user_id : null,
      can_view: row.can_view,
      can_upload: row.can_upload,
      can_manage: row.can_manage,
      is_inherited: row.folder_id !== localFolderId,
      source_folder_id: sourceFolder.id,
      source_folder_name: sourceFolder.name,
      source_folder_path: sourceFolder.full_path,
    }

    const existing = resolvedMap.get(row.user_id)
    if (!existing || (!nextEntry.is_inherited && existing.is_inherited)) {
      resolvedMap.set(row.user_id, nextEntry)
    }
  }

  return Array.from(resolvedMap.values()).sort((a, b) => {
    if (a.is_inherited !== b.is_inherited) return a.is_inherited ? 1 : -1
    const left = (a.user_email ?? a.user_name ?? a.user_id).toLowerCase()
    const right = (b.user_email ?? b.user_name ?? b.user_id).toLowerCase()
    return left.localeCompare(right)
  })
}

export function sanitizeSegment(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-_]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function buildChildPath(parentPath: string, slug: string): string {
  if (!parentPath || parentPath === '/' || parentPath === '/root') return `/root/${slug}`
  const normalized = parentPath.endsWith('/') ? parentPath.slice(0, -1) : parentPath
  return `${normalized}/${slug}`
}

export function isValidPrivateFileStoragePath(path: string): boolean {
  const trimmed = path.trim()
  if (!trimmed.startsWith('root/')) return false
  if (trimmed.includes('..')) return false
  if (trimmed.endsWith('/')) return false
  return /^[a-zA-Z0-9/_\-.]+$/.test(trimmed)
}

export function isUserPrivateUploadPath(path: string, userId: string): boolean {
  return path.startsWith(`root/uploads/${userId}/`)
}

export function sanitizeFileName(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_') || 'plik'
}

export async function privateStorageObjectExists(path: string): Promise<boolean> {
  const vv = getVezVisionPrivilegedClient()
  const parts = path.split('/')
  const name = parts.at(-1)
  const folderPath = parts.slice(0, -1).join('/')
  if (!name || !folderPath) return false

  const { data, error } = await vv.storage.from('vv-files-private').list(folderPath, {
    limit: 1,
    search: name,
  })

  if (error) {
    logError('files-internal.privateStorageObjectExists', error)
    return false
  }

  return (data ?? []).some((item) => item.name === name)
}

export async function writeFileEvent(args: {
  fileId?: string | null
  folderId?: string | null
  actorUserId?: string | null
  eventType: VVFileEventType
  payload: Json
}): Promise<void> {
  const vv = getVezVisionPrivilegedClient()
  await vv.from('vv_file_events').insert({
    file_id: args.fileId ?? null,
    folder_id: args.folderId ?? null,
    actor_user_id: args.actorUserId ?? null,
    event_type: args.eventType,
    payload: args.payload,
  })
}

export async function updateFolderPathWithDescendants(folderId: string, newFullPath: string): Promise<void> {
  const vv = getVezVisionPrivilegedClient()
  const { data: folder, error: folderError } = await vv
    .from('vv_folders')
    .select('full_path')
    .eq('id', folderId)
    .single()

  if (folderError || !folder) {
    logError('files-internal.updateFolderPathWithDescendants.folder', folderError)
    throw new Error('Folder nie istnieje')
  }

  const oldFullPath = folder.full_path

  const { data: descendants, error: descendantsError } = await vv
    .from('vv_folders')
    .select('id, full_path')
    .ilike('full_path', `${oldFullPath}/%`)

  if (descendantsError) {
    logError('files-internal.updateFolderPathWithDescendants.descendants', descendantsError)
    throw new Error('Nie udało się pobrać podfolderów do aktualizacji')
  }

  const updates = [
    vv.from('vv_folders').update({ full_path: newFullPath }).eq('id', folderId),
    ...(descendants ?? []).map((desc) => {
      const suffix = desc.full_path.slice(oldFullPath.length)
      const updatedPath = `${newFullPath}${suffix}`
      return vv.from('vv_folders').update({ full_path: updatedPath }).eq('id', desc.id)
    }),
  ]

  const results = await Promise.all(updates)
  const failed = results.find((result) => result.error)
  if (failed?.error) {
    logError('files-internal.updateFolderPathWithDescendants.update', failed.error)
    throw new Error('Nie udało się zaktualizować ścieżek folderów')
  }
}

export async function permanentlyDeleteFileById(fileId: string, actorUserId: string | null): Promise<boolean> {
  const vv = getVezVisionPrivilegedClient()
  const { data: file, error: fileError } = await vv
    .from('vv_files')
    .select('id, folder_id, storage_bucket, storage_path, deleted_at')
    .eq('id', fileId)
    .single()

  if (fileError || !file) {
    logError('files-internal.permanentlyDeleteFileById.file', fileError)
    return false
  }

  if (!file.deleted_at) {
    return false
  }

  const { error: storageError } = await vv.storage.from(file.storage_bucket).remove([file.storage_path])
  if (storageError) {
    logError('files-internal.permanentlyDeleteFileById.storage', storageError)
    return false
  }

  const { error: dbError } = await vv.from('vv_files').delete().eq('id', file.id)
  if (dbError) {
    logError('files-internal.permanentlyDeleteFileById.db', dbError)
    return false
  }

  await writeFileEvent({
    fileId: file.id,
    folderId: file.folder_id,
    actorUserId,
    eventType: 'file.permanently_deleted',
    payload: { storage_path: file.storage_path, deleted_at: file.deleted_at } as Json,
  })

  return true
}
