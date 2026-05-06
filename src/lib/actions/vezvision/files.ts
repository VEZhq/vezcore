'use server'
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, MIN_PAGE_LIMIT, MAX_TITLE_LENGTH, MAX_SLUG_LENGTH, MAX_EXCERPT_LENGTH, MAX_CONTENT_LENGTH_KB, MAX_QUESTION_LENGTH, MAX_ANSWER_LENGTH_KB, MAX_CATEGORY_LENGTH, MAX_SUBJECT_LENGTH, MAX_EVENT_TITLE_LENGTH } from '@/lib/constants/pagination'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { getVezVisionPrivilegedClient } from '@/lib/supabase/vezvision'
import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { guardVezVisionMutation } from '@/lib/actions/vezvision/security'
import { validateUUID } from '@/lib/server-utils'
import { validateMagicBytes } from '@/lib/file-validation'
import { logError } from '@/lib/logger'
import type { ActionResult, VVFile, VVFileInput } from './types'
import type { Json } from '@/types/vezvision-db'
import { ONE_MINUTE, FIVE_MINUTES, ONE_SECOND } from '@/lib/constants/time'
import {
  getFilesPermissionContext,
  canViewFolder,
  canViewFoldersBatch,
  canManageFolder,
  canUploadToFolder,
  ROOT_FOLDER_ID,
  writeFileEvent,
  getUserRole,
  resolveStorageQuota,
  getActiveStorageUsedBytes,
  sanitizeFileName,
  isValidPrivateFileStoragePath,
  isUserPrivateUploadPath,
  privateStorageObjectExists,
  getFilesForManagedMutation,
  permanentlyDeleteFileById,
  ALLOWED_FILE_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from './files-internal'
import type { ListFilesOptions, CleanupRetentionResult } from './files-internal'

export async function listFiles(options: ListFilesOptions = {}): Promise<ActionResult<VVFile[]>> {
  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const {
    folderId = null,
    includeDeleted = false,
    deletedOnly = false,
    query,
    mimePrefix,
    sortBy = 'created_at',
    sortDirection = 'desc',
    limit = 100,
  } = options

  if (folderId) {
    const allowedFolder = await canViewFolder(context.userId, context.role, context.permissions, folderId)
    if (!allowedFolder) return { success: true, data: [] }
  }

  const vv = getVezVisionPrivilegedClient()
  let dbQuery = vv
    .from('vv_files')
    .select('id, folder_id, original_name, storage_bucket, storage_path, mime_type, size_bytes, checksum_sha256, owner_user_id, is_public, owner_type, owner_id, metadata, created_at, updated_at, deleted_at')
    .order(sortBy, { ascending: sortDirection === 'asc' })
    .limit(Math.min(Math.max(limit, 1), 200))

  if (deletedOnly) {
    dbQuery = dbQuery.not('deleted_at', 'is', null)
  } else if (!includeDeleted) {
    dbQuery = dbQuery.is('deleted_at', null)
  }

  dbQuery = folderId ? dbQuery.eq('folder_id', folderId) : dbQuery.is('folder_id', null)

  if (query && query.trim()) {
    const escaped = query.trim().replace(/[%,]/g, '')
    dbQuery = dbQuery.ilike('original_name', `%${escaped}%`)
  }

  if (mimePrefix && mimePrefix.trim()) {
    const normalized = mimePrefix.trim().replace(/[%,]/g, '')
    dbQuery = dbQuery.ilike('mime_type', `${normalized}%`)
  }

  const { data, error } = await dbQuery
  if (error) {
    logError('files.list', error)
    return { success: false, error: 'Błąd podczas pobierania plików' }
  }

  const filtered = (data ?? []).filter((file) => {
    if (file.folder_id === null) {
      return isAdminRole(context.role) || context.permissions.has(VEZVISION_PERMISSIONS.FILES_VIEW) || context.permissions.has(VEZVISION_PERMISSIONS.FILES_MANAGE)
    }
    return true
  }) as VVFile[]

  if (isAdminRole(context.role) || context.permissions.has(VEZVISION_PERMISSIONS.FILES_VIEW) || context.permissions.has(VEZVISION_PERMISSIONS.FILES_MANAGE)) {
    return { success: true, data: filtered }
  }

  const filesWithFolder = filtered.filter((file) => file.folder_id)
  const folderIds = filesWithFolder.map((file) => file.folder_id!)
  const canViewMap = folderIds.length > 0
    ? await canViewFoldersBatch(context.userId, context.role, context.permissions, folderIds)
    : new Map<string, boolean>()
  const result = filesWithFolder.filter((file) => canViewMap.get(file.folder_id!) ?? false)

  return { success: true, data: result }
}

function isAdminRole(role: string | null): boolean {
  return role === 'admin' || role === 'super_admin'
}

export async function moveFile(fileId: string, targetFolderId: string | null, csrfToken: string): Promise<ActionResult<VVFile>> {
  const guard = await guardVezVisionMutation({ action: 'files.file.move', csrfToken, maxRequests: 30, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FILES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const vv = getVezVisionPrivilegedClient()
  const { data: currentFile, error: currentFileError } = await vv
    .from('vv_files')
    .select('id, folder_id')
    .eq('id', fileId)
    .single()

  if (currentFileError || !currentFile) {
    logError('files.moveFile.currentFile', currentFileError)
    return { success: false, error: 'Plik nie istnieje' }
  }

  const canManageSource = await canManageFolder(context.userId, context.role, context.permissions, currentFile.folder_id)
  const canManageTarget = await canManageFolder(context.userId, context.role, context.permissions, targetFolderId)
  if (!canManageSource || !canManageTarget) {
    return { success: false, error: 'Brak uprawnień do przenoszenia pliku' }
  }

  if (targetFolderId) {
    const { data: targetFolder, error: targetFolderError } = await vv
      .from('vv_folders')
      .select('id')
      .eq('id', targetFolderId)
      .single()

    if (targetFolderError || !targetFolder) {
      logError('files.moveFile.targetFolder', targetFolderError)
      return { success: false, error: 'Folder docelowy nie istnieje' }
    }
  }

  const { data: moved, error } = await vv
    .from('vv_files')
    .update({ folder_id: targetFolderId })
    .eq('id', fileId)
    .is('deleted_at', null)
    .select('id, folder_id, original_name, storage_bucket, storage_path, mime_type, size_bytes, checksum_sha256, owner_user_id, is_public, owner_type, owner_id, metadata, created_at, updated_at, deleted_at')
    .single()

  if (error || !moved) {
    logError('files.moveFile', error)
    return { success: false, error: 'Błąd podczas przenoszenia pliku' }
  }

  await writeFileEvent({
    fileId: moved.id,
    folderId: moved.folder_id,
    actorUserId: auth.userId,
    eventType: 'file.moved',
    payload: { target_folder_id: targetFolderId, storage_path: moved.storage_path } as Json,
  })

  revalidatePath('/vezvision/files')
  return { success: true, data: moved as VVFile }
}

export async function registerFile(input: VVFileInput, csrfToken: string): Promise<ActionResult<VVFile>> {
  const guard = await guardVezVisionMutation({ action: 'files.register', csrfToken, maxRequests: 30, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FILES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const canUpload = await canUploadToFolder(context.userId, context.role, context.permissions, input.folder_id ?? null)
  if (!canUpload) return { success: false, error: 'Brak uprawnień do uploadu w tym folderze' }

  const folderIdParse = z.string().uuid({ message: 'Nieprawidłowy identyfikator folderu' }).nullable().optional().safeParse(input.folder_id)
  if (!folderIdParse.success) {
    return { success: false, error: folderIdParse.error.issues[0].message }
  }

  if (input.folder_id) {
    const vv = getVezVisionPrivilegedClient()
    const { data: folder } = await vv.from('vv_folders').select('id').eq('id', input.folder_id).single()
    if (!folder) {
      return { success: false, error: 'Folder nie istnieje' }
    }
  }

  if (!input.original_name.trim()) return { success: false, error: 'Nazwa pliku jest wymagana' }
  if (!input.storage_path.trim()) return { success: false, error: 'Ścieżka pliku jest wymagana' }
  if (input.storage_bucket !== 'vv-files-private') return { success: false, error: 'Nieprawidłowy bucket pliku prywatnego' }
  if (!isValidPrivateFileStoragePath(input.storage_path)) return { success: false, error: 'Nieprawidłowa ścieżka pliku prywatnego' }
  if (!isUserPrivateUploadPath(input.storage_path, auth.userId)) return { success: false, error: 'Nieprawidłowa ścieżka uploadu użytkownika' }
  if (input.size_bytes < 0) return { success: false, error: 'Nieprawidłowy rozmiar pliku' }
  if (input.size_bytes > MAX_FILE_SIZE_BYTES) return { success: false, error: 'Plik przekracza limit 25 MB' }
  if (!ALLOWED_FILE_MIME_TYPES.has(input.mime_type)) {
    return { success: false, error: 'Niedozwolony typ MIME pliku' }
  }

  const objectExists = await privateStorageObjectExists(input.storage_path)
  if (!objectExists) return { success: false, error: 'Obiekt storage nie istnieje' }

  const role = await getUserRole(auth.userId)
  const quotaBytes = resolveStorageQuota(role)
  if (Number.isFinite(quotaBytes)) {
    const usedBytes = await getActiveStorageUsedBytes()
    if (usedBytes + input.size_bytes > quotaBytes) {
      return { success: false, error: 'Przekroczony limit przestrzeni dyskowej dla Twojej roli' }
    }
  }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_files')
    .insert({
      folder_id: input.folder_id ?? null,
      original_name: input.original_name.trim(),
      storage_bucket: 'vv-files-private',
      storage_path: input.storage_path.trim(),
      mime_type: input.mime_type.trim(),
      size_bytes: input.size_bytes,
      checksum_sha256: input.checksum_sha256 ?? null,
      owner_user_id: null,
      is_public: false,
      owner_type: input.owner_type ?? null,
      owner_id: input.owner_id ?? null,
      metadata: input.metadata ?? {},
    })
    .select()
    .single()

  if (error || !data) {
    logError('files.registerFile', error)
    if (error?.code === '23505') {
      return { success: false, error: 'Plik o tej samej ścieżce już istnieje' }
    }
    return { success: false, error: 'Błąd podczas rejestracji pliku' }
  }

  await writeFileEvent({
    fileId: data.id,
    folderId: data.folder_id,
    actorUserId: auth.userId,
    eventType: 'file.created',
    payload: { storage_path: data.storage_path, size_bytes: data.size_bytes } as Json,
  })

  revalidatePath('/vezvision/files')
  return { success: true, data: data as VVFile }
}

export async function uploadPrivateFile(input: {
  folder_id?: string | null
  original_name: string
  mime_type: string
  size_bytes: number
  file: ArrayBuffer
}, csrfToken: string): Promise<ActionResult<VVFile>> {
  const guard = await guardVezVisionMutation({ action: 'files.upload.private', csrfToken, maxRequests: 25, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FILES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const canUpload = await canUploadToFolder(context.userId, context.role, context.permissions, input.folder_id ?? null)
  if (!canUpload) return { success: false, error: 'Brak uprawnień do uploadu w tym folderze' }

  const normalizedMimeType = input.mime_type.toLowerCase()
  if (!ALLOWED_FILE_MIME_TYPES.has(normalizedMimeType)) return { success: false, error: 'Niedozwolony typ MIME pliku' }
  if (!validateMagicBytes(input.file, Array.from(ALLOWED_FILE_MIME_TYPES))) {
    return { success: false, error: 'Nieprawidłowa zawartość pliku' }
  }
  if (input.size_bytes <= 0 || input.size_bytes > MAX_FILE_SIZE_BYTES) return { success: false, error: 'Nieprawidłowy rozmiar pliku' }
  if (input.file.byteLength !== input.size_bytes) return { success: false, error: 'Rozmiar pliku nie zgadza się z payloadem' }

  const role = await getUserRole(auth.userId)
  const quotaBytes = resolveStorageQuota(role)
  if (Number.isFinite(quotaBytes)) {
    const usedBytes = await getActiveStorageUsedBytes()
    if (usedBytes + input.size_bytes > quotaBytes) return { success: false, error: 'Przekroczony limit przestrzeni dyskowej dla Twojej roli' }
  }

  const safeName = sanitizeFileName(input.original_name)
  const storagePath = `root/uploads/${auth.userId}/${Date.now()}-${randomUUID()}-${safeName}`
  const vv = getVezVisionPrivilegedClient()
  const { error: uploadError } = await vv.storage
    .from('vv-files-private')
    .upload(storagePath, new Blob([input.file], { type: normalizedMimeType }), {
      contentType: normalizedMimeType,
      upsert: false,
    })

  if (uploadError) {
    logError('files.uploadPrivateFile.storage', uploadError)
    return { success: false, error: 'Błąd podczas uploadu pliku' }
  }

  const registered = await registerFile({
    folder_id: input.folder_id ?? null,
    original_name: input.original_name,
    storage_bucket: 'vv-files-private',
    storage_path: storagePath,
    mime_type: normalizedMimeType,
    size_bytes: input.size_bytes,
    is_public: false,
  }, csrfToken)

  if (!registered.success) {
    await vv.storage.from('vv-files-private').remove([storagePath])
    return registered
  }

  return registered
}

export async function softDeleteFile(fileId: string, csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'files.delete', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FILES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const vv = getVezVisionPrivilegedClient()
  const { data: currentFile, error: currentFileError } = await vv
    .from('vv_files')
    .select('folder_id, deleted_at')
    .eq('id', fileId)
    .single()

  if (currentFileError || !currentFile) {
    logError('files.softDeleteFile.currentFile', currentFileError)
    return { success: false, error: 'Plik nie istnieje' }
  }

  const canManage = await canManageFolder(context.userId, context.role, context.permissions, currentFile.folder_id)
  if (!canManage) return { success: false, error: 'Brak uprawnień do usunięcia pliku' }
  const { data, error } = await vv
    .from('vv_files')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', fileId)
    .is('deleted_at', null)
    .select('id, folder_id, storage_path')
    .single()

  if (error || !data) {
    logError('files.softDeleteFile', error)
    return { success: false, error: 'Błąd podczas usuwania pliku' }
  }

  await writeFileEvent({
    fileId: data.id,
    folderId: data.folder_id,
    actorUserId: auth.userId,
    eventType: 'file.deleted',
    payload: { storage_path: data.storage_path } as Json,
  })

  revalidatePath('/vezvision/files')
  return { success: true, data: undefined }
}

export async function restoreFile(fileId: string, csrfToken: string): Promise<ActionResult<VVFile>> {
  const guard = await guardVezVisionMutation({ action: 'files.restore', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FILES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const vv = getVezVisionPrivilegedClient()
  const { data: currentFile, error: currentFileError } = await vv
    .from('vv_files')
    .select('folder_id, deleted_at')
    .eq('id', fileId)
    .single()

  if (currentFileError || !currentFile) {
    logError('files.restoreFile.currentFile', currentFileError)
    return { success: false, error: 'Plik nie istnieje' }
  }

  const canManage = await canManageFolder(context.userId, context.role, context.permissions, currentFile.folder_id)
  if (!canManage) return { success: false, error: 'Brak uprawnień do przywrócenia pliku' }
  const { data, error } = await vv
    .from('vv_files')
    .update({ deleted_at: null })
    .eq('id', fileId)
    .not('deleted_at', 'is', null)
    .select('id, folder_id, original_name, storage_bucket, storage_path, mime_type, size_bytes, checksum_sha256, owner_user_id, is_public, owner_type, owner_id, metadata, created_at, updated_at, deleted_at')
    .single()

  if (error || !data) {
    logError('files.restoreFile', error)
    return { success: false, error: 'Błąd podczas przywracania pliku' }
  }

  await writeFileEvent({
    fileId: data.id,
    folderId: data.folder_id,
    actorUserId: auth.userId,
    eventType: 'file.restored',
    payload: { storage_path: data.storage_path } as Json,
  })

  revalidatePath('/vezvision/files')
  return { success: true, data: data as VVFile }
}

export async function bulkRestoreFiles(fileIds: string[], csrfToken: string): Promise<ActionResult<{ restoredCount: number }>> {
  const guard = await guardVezVisionMutation({ action: 'files.restore.bulk', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FILES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const uniqueIds = Array.from(new Set(fileIds.filter((value) => validateUUID(value.trim()))))
  if (uniqueIds.length === 0) return { success: true, data: { restoredCount: 0 } }

  const manageableFiles = await getFilesForManagedMutation(uniqueIds, context, 'bulkRestoreFiles')
  if (!manageableFiles.ok) return { success: false, error: manageableFiles.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_files')
    .update({ deleted_at: null })
    .in('id', uniqueIds)
    .not('deleted_at', 'is', null)
    .select('id, folder_id, storage_path')

  if (error) {
    logError('files.bulkRestoreFiles', error)
    return { success: false, error: 'Błąd podczas przywracania plików' }
  }

  const restoredRows = data ?? []
  await Promise.all(
    restoredRows.map((row) =>
      writeFileEvent({
        fileId: row.id,
        folderId: row.folder_id,
        actorUserId: auth.userId,
        eventType: 'file.restored',
        payload: { storage_path: row.storage_path, mode: 'bulk' } as Json,
      })
    )
  )

  revalidatePath('/vezvision/files')
  return { success: true, data: { restoredCount: restoredRows.length } }
}

export async function bulkSoftDeleteFiles(fileIds: string[], csrfToken: string): Promise<ActionResult<{ deletedCount: number }>> {
  const guard = await guardVezVisionMutation({ action: 'files.delete.bulk', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FILES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const uniqueIds = Array.from(new Set(fileIds.filter((value) => validateUUID(value.trim()))))
  if (uniqueIds.length === 0) return { success: true, data: { deletedCount: 0 } }

  const manageableFiles = await getFilesForManagedMutation(uniqueIds, context, 'bulkSoftDeleteFiles')
  if (!manageableFiles.ok) return { success: false, error: manageableFiles.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_files')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', uniqueIds)
    .is('deleted_at', null)
    .select('id, folder_id, storage_path')

  if (error) {
    logError('files.bulkSoftDeleteFiles', error)
    return { success: false, error: 'Błąd podczas usuwania plików' }
  }

  const deletedRows = data ?? []
  await Promise.all(
    deletedRows.map((row) =>
      writeFileEvent({
        fileId: row.id,
        folderId: row.folder_id,
        actorUserId: auth.userId,
        eventType: 'file.deleted',
        payload: { storage_path: row.storage_path, mode: 'bulk' } as Json,
      })
    )
  )

  revalidatePath('/vezvision/files')
  return { success: true, data: { deletedCount: deletedRows.length } }
}

export async function permanentlyDeleteFile(fileId: string, csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'files.delete.permanent', csrfToken, maxRequests: 15, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FILES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const vv = getVezVisionPrivilegedClient()
  const { data: currentFile, error: currentFileError } = await vv
    .from('vv_files')
    .select('folder_id, deleted_at')
    .eq('id', fileId)
    .single()

  if (currentFileError || !currentFile) {
    logError('files.permanentlyDeleteFile.currentFile', currentFileError)
    return { success: false, error: 'Plik nie istnieje' }
  }

  const currentFileRow = currentFile as { folder_id: string | null; deleted_at: string | null }
  const canManage = await canManageFolder(context.userId, context.role, context.permissions, currentFileRow.folder_id)
  if (!canManage) return { success: false, error: 'Brak uprawnień do trwałego usunięcia pliku' }
  if (!currentFileRow.deleted_at) return { success: false, error: 'Plik musi najpierw trafić do kosza' }

  const deleted = await permanentlyDeleteFileById(fileId, auth.userId)
  if (!deleted) {
    return { success: false, error: 'Nie udało się trwale usunąć pliku' }
  }

  revalidatePath('/vezvision/files')
  return { success: true, data: undefined }
}

export async function bulkPermanentlyDeleteFiles(
  fileIds: string[],
  csrfToken: string
): Promise<ActionResult<{ deletedCount: number; failedCount: number }>> {
  const guard = await guardVezVisionMutation({ action: 'files.delete.permanent.bulk', csrfToken, maxRequests: 5, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FILES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const uniqueIds = Array.from(new Set(fileIds.filter((value) => validateUUID(value.trim()))))
  if (uniqueIds.length === 0) return { success: true, data: { deletedCount: 0, failedCount: 0 } }

  const manageableFiles = await getFilesForManagedMutation(uniqueIds, context, 'bulkPermanentlyDeleteFiles')
  if (!manageableFiles.ok) return { success: false, error: manageableFiles.error }
  if (manageableFiles.files.some((file) => !file.deleted_at)) {
    return { success: false, error: 'Trwale usuwać można tylko pliki z kosza' }
  }

  const outcomes = await Promise.all(uniqueIds.map((id) => permanentlyDeleteFileById(id, auth.userId)))
  const deletedCount = outcomes.filter(Boolean).length
  const failedCount = outcomes.length - deletedCount

  revalidatePath('/vezvision/files')
  return { success: true, data: { deletedCount, failedCount } }
}

export async function getFileDownloadUrl(fileId: string): Promise<ActionResult<string>> {
  const { requireAnyVezVisionActionPermission } = await import('./files-internal')
  const auth = await requireAnyVezVisionActionPermission([
    VEZVISION_PERMISSIONS.FILES_VIEW,
    VEZVISION_PERMISSIONS.FILES_MANAGE,
  ])
  if ('error' in auth) return { success: false, error: auth.error }

  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const vv = getVezVisionPrivilegedClient()
  const { data: file, error } = await vv
    .from('vv_files')
    .select('id, folder_id, storage_bucket, storage_path')
    .eq('id', fileId)
    .is('deleted_at', null)
    .single()

  if (error || !file) {
    logError('files.getFileDownloadUrl.file', error)
    return { success: false, error: 'Plik nie istnieje' }
  }

  if (file.storage_bucket !== 'vv-files-private' || !isValidPrivateFileStoragePath(file.storage_path)) {
    return { success: false, error: 'Nieprawidłowy rekord pliku prywatnego' }
  }

  const canView = await canViewFolder(context.userId, context.role, context.permissions, file.folder_id)
  if (!canView) {
    return { success: false, error: 'Brak uprawnień do pobrania tego pliku' }
  }

  const { data: signed, error: signedError } = await vv.storage
    .from(file.storage_bucket)
    .createSignedUrl(file.storage_path, FIVE_MINUTES / ONE_SECOND)

  if (signedError || !signed?.signedUrl) {
    logError('files.getFileDownloadUrl.signed', signedError)
    return { success: false, error: 'Nie udało się wygenerować linku pobierania' }
  }

  await writeFileEvent({
    fileId: file.id,
    folderId: file.folder_id,
    actorUserId: auth.userId,
    eventType: 'file.downloaded',
    payload: { storage_path: file.storage_path } as Json,
  })

  return { success: true, data: signed.signedUrl }
}
