'use server'
import { ONE_MINUTE } from '@/lib/constants/time'

import { revalidatePath } from 'next/cache'
import { getCoreModulesPrivilegedClient } from '@/lib/supabase/core-modules'
import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { guardVezVisionMutation } from '@/lib/actions/vezvision/security'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { logError } from '@/lib/logger'
import type { ActionResult, VVFolder, VVFolderInput } from './types'
import type { Json } from '@/types/vezvision-db'
import {
  getFilesPermissionContext,
  canViewFolder,
  canViewFoldersBatch,
  canManageFolder,
  ROOT_FOLDER_ID,
  writeFileEvent,
  sanitizeSegment,
  buildChildPath,
  updateFolderPathWithDescendants,
} from './files-internal'

export async function listFolders(parentId?: string | null): Promise<ActionResult<VVFolder[]>> {
  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  if (parentId) {
    const canViewParent = await canViewFolder(context.userId, context.role, context.permissions, parentId)
    if (!canViewParent) return { success: true, data: [] }
  }

  const vv = getCoreModulesPrivilegedClient()
  const query = vv
    .from('vv_folders')
    .select('id, parent_id, name, slug, full_path, owner_user_id, is_system, created_at, updated_at')
    .order('created_at', { ascending: true })

  const normalizedParentId = parentId ?? ROOT_FOLDER_ID
  const filteredQuery = query.eq('parent_id', normalizedParentId)
  const { data, error } = await filteredQuery
  if (error) {
    logError('files-folders listFolders', error)
    return { success: false, error: 'Błąd podczas pobierania folderów' }
  }

  const folders = (data ?? []) as VVFolder[]
  const folderIds = folders.map((f) => f.id)
  const canViewMap = folderIds.length > 0
    ? await canViewFoldersBatch(context.userId, context.role, context.permissions, folderIds)
    : new Map<string, boolean>()
  const visibleFolders = folders.filter((folder) => canViewMap.get(folder.id) ?? false)

  return { success: true, data: visibleFolders }
}

export async function listAllFolders(): Promise<ActionResult<VVFolder[]>> {
  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const vv = getCoreModulesPrivilegedClient()
  const { data, error } = await vv.from('vv_folders').select('id, parent_id, name, slug, full_path, owner_user_id, is_system, created_at, updated_at').order('full_path', { ascending: true })

  if (error) {
    logError('files-folders listAllFolders', error)
    return { success: false, error: 'Błąd podczas pobierania pełnej listy folderów' }
  }

  const folders = (data ?? []) as VVFolder[]
  const folderIds = folders.map((f) => f.id)
  const canViewMap = folderIds.length > 0
    ? await canViewFoldersBatch(context.userId, context.role, context.permissions, folderIds)
    : new Map<string, boolean>()
  const visibleFolders = folders.filter((folder) => canViewMap.get(folder.id) ?? false)

  return { success: true, data: visibleFolders }
}

export async function getFolderById(folderId: string): Promise<ActionResult<VVFolder>> {
  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const canView = await canViewFolder(context.userId, context.role, context.permissions, folderId)
  if (!canView) return { success: false, error: 'Brak uprawnień do tego folderu' }

  const vv = getCoreModulesPrivilegedClient()
  const { data, error } = await vv.from('vv_folders').select('id, parent_id, name, slug, full_path, owner_user_id, is_system, created_at, updated_at').eq('id', folderId).single()
  if (error || !data) {
    logError('files-folders getFolderById', error)
    return { success: false, error: 'Folder nie istnieje' }
  }

  return { success: true, data: data as VVFolder }
}

export async function getFolderBreadcrumbs(folderId: string): Promise<ActionResult<VVFolder[]>> {
  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const canView = await canViewFolder(context.userId, context.role, context.permissions, folderId)
  if (!canView) return { success: false, error: 'Brak uprawnień do tego folderu' }

  const { getFolderChain } = await import('./files-internal')
  const chain = await getFolderChain(folderId)
  if (!chain) return { success: false, error: 'Folder nie istnieje' }
  return { success: true, data: chain }
}

export async function createFolder(input: VVFolderInput, csrfToken: string): Promise<ActionResult<VVFolder>> {
  const guard = await guardVezVisionMutation({ action: 'files.folder.create', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FILES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const normalizedParentId = input.parent_id ?? ROOT_FOLDER_ID
  const canManageParent = await canManageFolder(context.userId, context.role, context.permissions, normalizedParentId)
  if (!canManageParent) return { success: false, error: 'Brak uprawnień do tworzenia folderu w tej lokalizacji' }

  const name = input.name.trim()
  if (name.length < 2) return { success: false, error: 'Nazwa folderu jest za krótka' }

  const slug = sanitizeSegment(name)
  if (!slug) return { success: false, error: 'Nieprawidłowa nazwa folderu' }

  const vv = getCoreModulesPrivilegedClient()

  let parentPath = '/root'
  if (normalizedParentId !== ROOT_FOLDER_ID) {
    const { data: parent, error: parentError } = await vv
      .from('vv_folders')
      .select('id, full_path')
      .eq('id', normalizedParentId)
      .single()

    if (parentError || !parent) {
      logError('files-folders createFolder.parent', parentError)
      return { success: false, error: 'Folder nadrzędny nie istnieje' }
    }

    parentPath = parent.full_path
  }

  const fullPath = buildChildPath(parentPath, slug)
  const { data, error } = await vv
    .from('vv_folders')
    .insert({
      parent_id: normalizedParentId,
      name,
      slug,
      full_path: fullPath,
      owner_user_id: null,
      is_system: false,
    })
    .select()
    .single()

  if (error || !data) {
    logError('files-folders createFolder', error)
    if (error?.code === '23505') {
      return { success: false, error: 'Folder o tej nazwie już istnieje w tej lokalizacji' }
    }
    return { success: false, error: 'Błąd podczas tworzenia folderu' }
  }

  await writeFileEvent({
    folderId: data.id,
    actorUserId: auth.userId,
    eventType: 'folder.created',
    payload: { name: data.name, full_path: data.full_path } as Json,
  })

  revalidatePath('/vezvision/files')
  return { success: true, data: data as VVFolder }
}

export async function moveFolder(
  folderId: string,
  targetParentId: string | null,
  csrfToken: string
): Promise<ActionResult<VVFolder>> {
  const guard = await guardVezVisionMutation({ action: 'files.folder.move', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FILES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const canManageSource = await canManageFolder(context.userId, context.role, context.permissions, folderId)
  const normalizedTargetParentId = targetParentId ?? ROOT_FOLDER_ID
  const canManageTarget = await canManageFolder(context.userId, context.role, context.permissions, normalizedTargetParentId)
  if (!canManageSource || !canManageTarget) {
    return { success: false, error: 'Brak uprawnień do przenoszenia folderu w tej lokalizacji' }
  }

  const vv = getCoreModulesPrivilegedClient()
  const { data: folder, error: folderError } = await vv
    .from('vv_folders')
    .select('id, parent_id, slug, full_path, is_system')
    .eq('id', folderId)
    .single()

  if (folderError || !folder) {
    logError('files-folders moveFolder.folder', folderError)
    return { success: false, error: 'Folder nie istnieje' }
  }

  if (folder.is_system) {
    return { success: false, error: 'Folder systemowy nie może zostać przeniesiony' }
  }

  if (targetParentId === folder.id) {
    return { success: false, error: 'Folder nie może być przeniesiony do samego siebie' }
  }

  let parentPath = '/root'
  if (normalizedTargetParentId !== ROOT_FOLDER_ID) {
    const { data: targetParent, error: targetParentError } = await vv
      .from('vv_folders')
      .select('id, full_path')
      .eq('id', normalizedTargetParentId)
      .single()

    if (targetParentError || !targetParent) {
      logError('files-folders moveFolder.targetParent', targetParentError)
      return { success: false, error: 'Folder docelowy nie istnieje' }
    }

    if (targetParent.full_path === folder.full_path || targetParent.full_path.startsWith(`${folder.full_path}/`)) {
      return { success: false, error: 'Nie można przenieść folderu do własnego podfolderu' }
    }

    parentPath = targetParent.full_path
  }

  const newFullPath = buildChildPath(parentPath, folder.slug)
  const siblingBaseQuery = vv
    .from('vv_folders')
    .select('id')
    .eq('slug', folder.slug)
    .neq('id', folder.id)

  const siblingQuery = targetParentId
    ? siblingBaseQuery.eq('parent_id', targetParentId)
    : siblingBaseQuery.is('parent_id', null)

  const { data: sibling, error: siblingError } = await siblingQuery.maybeSingle()

  if (siblingError) {
    logError('files-folders moveFolder.sibling', siblingError)
    return { success: false, error: 'Nie udało się zweryfikować kolizji nazwy folderu' }
  }

  if (sibling) {
    return { success: false, error: 'W folderze docelowym istnieje już folder o tej nazwie' }
  }

  try {
    await updateFolderPathWithDescendants(folder.id, newFullPath)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się zaktualizować ścieżki folderu'
    return { success: false, error: message }
  }

  const { data: moved, error: movedError } = await vv
    .from('vv_folders')
    .update({ parent_id: normalizedTargetParentId })
    .eq('id', folder.id)
    .select('id, parent_id, name, slug, full_path, owner_user_id, is_system, created_at, updated_at')
    .single()

  if (movedError || !moved) {
    logError('files-folders moveFolder.update', movedError)
    return { success: false, error: 'Błąd podczas przenoszenia folderu' }
  }

  await writeFileEvent({
    folderId: moved.id,
    actorUserId: auth.userId,
    eventType: 'folder.moved',
    payload: { old_path: folder.full_path, new_path: moved.full_path, parent_id: normalizedTargetParentId } as Json,
  })

  revalidatePath('/vezvision/files')
  return { success: true, data: moved as VVFolder }
}

export async function deleteFolder(folderId: string, csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'files.folder.delete', csrfToken, maxRequests: 15, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FILES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const canManage = await canManageFolder(context.userId, context.role, context.permissions, folderId)
  if (!canManage) return { success: false, error: 'Brak uprawnień do usunięcia folderu' }

  const vv = getCoreModulesPrivilegedClient()
  const { data: folder, error: folderError } = await vv
    .from('vv_folders')
    .select('id, name, full_path, is_system')
    .eq('id', folderId)
    .single()

  if (folderError || !folder) {
    logError('files-folders deleteFolder.folder', folderError)
    return { success: false, error: 'Folder nie istnieje' }
  }

  if (folder.is_system) {
    return { success: false, error: 'Folder systemowy nie może zostać usunięty' }
  }

  const { count: childFoldersCount, error: childFoldersError } = await vv
    .from('vv_folders')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', folderId)

  if (childFoldersError) {
    logError('files-folders deleteFolder.childFolders', childFoldersError)
    return { success: false, error: 'Nie udało się sprawdzić podfolderów' }
  }

  if ((childFoldersCount ?? 0) > 0) {
    return { success: false, error: 'Najpierw usuń lub przenieś podfoldery' }
  }

  const { count: filesCount, error: filesError } = await vv
    .from('vv_files')
    .select('id', { count: 'exact', head: true })
    .eq('folder_id', folderId)
    .is('deleted_at', null)

  if (filesError) {
    logError('files-folders deleteFolder.files', filesError)
    return { success: false, error: 'Nie udało się sprawdzić plików w folderze' }
  }

  if ((filesCount ?? 0) > 0) {
    return { success: false, error: 'Najpierw usuń lub przenieś pliki z folderu' }
  }

  const { error: deleteError } = await vv.from('vv_folders').delete().eq('id', folderId)
  if (deleteError) {
    logError('files-folders deleteFolder.delete', deleteError)
    return { success: false, error: 'Błąd podczas usuwania folderu' }
  }

  await writeFileEvent({
    folderId,
    actorUserId: auth.userId,
    eventType: 'folder.deleted',
    payload: { name: folder.name, full_path: folder.full_path } as Json,
  })

  revalidatePath('/vezvision/files')
  return { success: true, data: undefined }
}
