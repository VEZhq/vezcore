'use server'
import { ONE_MINUTE } from '@/lib/constants/time'

import { revalidatePath } from 'next/cache'
import { getCoreModulesPrivilegedClient } from '@/lib/supabase/core-modules'
import { getAdminClient } from '@/lib/supabase/admin'
import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { guardVezVisionMutation } from '@/lib/actions/vezvision/security'
import { sendAuditLog } from '@/lib/discord'
import type { ActionResult, VVFileAssignableUser, VVFolderAclEntry } from './types'
import type { Json } from '@/types/vezvision-db'
import {
  getFilesPermissionContext,
  canManageFolder,
  ROOT_FOLDER_ID,
  getResolvedFolderAclEntries,
  getFolderSummary,
  insertVezVisionAuditLog,
  getCurrentActorEmail,
  writeFileEvent,
} from './files-internal'
import { logError } from '@/lib/logger'
import type { VVFileEventType } from './types'

export async function listFolderAcl(folderId: string): Promise<ActionResult<VVFolderAclEntry[]>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FILES_PERMISSIONS_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  if (folderId === ROOT_FOLDER_ID) {
    return { success: true, data: [] }
  }

  const result = await getResolvedFolderAclEntries(folderId)
  return { success: true, data: result }
}

export async function listAssignableFileUsers(): Promise<ActionResult<VVFileAssignableUser[]>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FILES_PERMISSIONS_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminClient = getAdminClient()
  const { data: authUsers, error } = await adminClient.auth.admin.listUsers()

  if (error) {
    logError('files-acl.listAssignableFileUsers', error)
    return { success: false, error: 'Nie udało się pobrać listy użytkowników' }
  }

  const users: VVFileAssignableUser[] = (authUsers?.users ?? [])
    .map((user) => ({
      id: user.id,
      email: user.email ?? null,
      name: typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null,
    }))
    .sort((a, b) => {
      const left = (a.email ?? a.name ?? a.id).toLowerCase()
      const right = (b.email ?? b.name ?? b.id).toLowerCase()
      return left.localeCompare(right)
    })

  return { success: true, data: users }
}

export async function upsertFolderAcl(input: {
  folderId: string
  userId: string
  canView: boolean
  canUpload: boolean
  canManage: boolean
}, csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'files.folder.acl.upsert', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FILES_PERMISSIONS_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  if (input.folderId === ROOT_FOLDER_ID) {
    return { success: false, error: 'Nie można modyfikować ACL folderu root' }
  }

  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const canManageAclTarget = await canManageFolder(context.userId, context.role, context.permissions, input.folderId)
  if (!canManageAclTarget) return { success: false, error: 'Brak uprawnień do zarządzania ACL tego folderu' }

  const vv = getCoreModulesPrivilegedClient()
  const canView = input.canView || input.canUpload || input.canManage
  const canUpload = input.canUpload || input.canManage
  const actorEmail = await getCurrentActorEmail()
  const folderSummary = await getFolderSummary(input.folderId)
  if (!folderSummary) return { success: false, error: 'Folder nie istnieje' }

  const { data: existingLocalRaw, error: existingLocalError } = await vv
    .from('vv_file_permissions')
    .select('can_view, can_upload, can_manage')
    .eq('folder_id', input.folderId)
    .is('file_id', null)
    .eq('user_id', input.userId)
    .maybeSingle()

  if (existingLocalError) {
    logError('files-acl.upsertFolderAcl.existingLocal', existingLocalError)
    return { success: false, error: 'Nie udało się odczytać istniejącego ACL folderu' }
  }

  const existingLocal = existingLocalRaw as { can_view: boolean; can_upload: boolean; can_manage: boolean } | null

  if (!canView && !canUpload && !input.canManage) {
    const { error } = await vv
      .from('vv_file_permissions')
      .delete()
      .eq('folder_id', input.folderId)
      .is('file_id', null)
      .eq('user_id', input.userId)

    if (error) {
      logError('files-acl.upsertFolderAcl.delete', error)
      return { success: false, error: 'Nie udało się usunąć ACL folderu' }
    }

    await insertVezVisionAuditLog('vezvision_folder_acl_revoke', 'vezvision_folder', input.folderId, {
      folder_name: folderSummary.name,
      folder_path: folderSummary.full_path,
      target_user_id: input.userId,
      previous_permissions: existingLocal,
    })

    sendAuditLog('vezvision_folder_acl_revoke', {
      admin_email: actorEmail ?? auth.userId,
      folder_name: folderSummary.name,
      folder_path: folderSummary.full_path,
      target_user_id: input.userId,
    }).catch((error) => logError('files-acl.sendAuditLog.revoke', error))

    await writeFileEvent({
      folderId: input.folderId,
      actorUserId: auth.userId,
      eventType: 'folder.acl_revoked',
      payload: { target_user_id: input.userId, folder_path: folderSummary.full_path } as Json,
    })

    revalidatePath('/vezvision/files')
    return { success: true, data: undefined }
  }

  const { error } = await vv
    .from('vv_file_permissions')
    .upsert(
      {
        file_id: null,
        folder_id: input.folderId,
        user_id: input.userId,
        can_view: canView,
        can_upload: canUpload,
        can_manage: input.canManage,
      },
      { onConflict: 'folder_id,user_id' }
    )

  if (error) {
    logError('files-acl.upsertFolderAcl.upsert', error)
    return { success: false, error: 'Nie udało się zapisać ACL folderu' }
  }

  const action = existingLocal ? 'vezvision_folder_acl_update' : 'vezvision_folder_acl_grant'
  const eventType: VVFileEventType = existingLocal ? 'folder.acl_updated' : 'folder.acl_granted'

  await insertVezVisionAuditLog(action, 'vezvision_folder', input.folderId, {
    folder_name: folderSummary.name,
    folder_path: folderSummary.full_path,
    target_user_id: input.userId,
    previous_permissions: existingLocal,
    next_permissions: {
      can_view: canView,
      can_upload: canUpload,
      can_manage: input.canManage,
    },
  })

  sendAuditLog(action, {
    admin_email: actorEmail ?? auth.userId,
    folder_name: folderSummary.name,
    folder_path: folderSummary.full_path,
    target_user_id: input.userId,
    can_view: canView,
    can_upload: canUpload,
    can_manage: input.canManage,
  }).catch((error) => logError('files-acl.sendAuditLog.grant', error))

  await writeFileEvent({
    folderId: input.folderId,
    actorUserId: auth.userId,
    eventType,
    payload: {
      target_user_id: input.userId,
      folder_path: folderSummary.full_path,
      can_view: canView,
      can_upload: canUpload,
      can_manage: input.canManage,
    } as Json,
  })

  revalidatePath('/vezvision/files')
  return { success: true, data: undefined }
}

export async function removeFolderAcl(folderId: string, userId: string, csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'files.folder.acl.remove', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FILES_PERMISSIONS_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  if (folderId === ROOT_FOLDER_ID) {
    return { success: false, error: 'Nie można modyfikować ACL folderu root' }
  }

  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const canManageAclTarget = await canManageFolder(context.userId, context.role, context.permissions, folderId)
  if (!canManageAclTarget) return { success: false, error: 'Brak uprawnień do zarządzania ACL tego folderu' }

  const vv = getCoreModulesPrivilegedClient()
  const actorEmail = await getCurrentActorEmail()
  const folderSummary = await getFolderSummary(folderId)
  if (!folderSummary) return { success: false, error: 'Folder nie istnieje' }

  const { data: existingLocalRaw } = await vv
    .from('vv_file_permissions')
    .select('can_view, can_upload, can_manage')
    .eq('folder_id', folderId)
    .is('file_id', null)
    .eq('user_id', userId)
    .maybeSingle()

  const { error } = await vv
    .from('vv_file_permissions')
    .delete()
    .eq('folder_id', folderId)
    .is('file_id', null)
    .eq('user_id', userId)

  if (error) {
    logError('files-acl.removeFolderAcl', error)
    return { success: false, error: 'Nie udało się usunąć uprawnienia folderu' }
  }

  await insertVezVisionAuditLog('vezvision_folder_acl_revoke', 'vezvision_folder', folderId, {
    folder_name: folderSummary.name,
    folder_path: folderSummary.full_path,
    target_user_id: userId,
    previous_permissions: existingLocalRaw,
  })

  sendAuditLog('vezvision_folder_acl_revoke', {
    admin_email: actorEmail ?? auth.userId,
    folder_name: folderSummary.name,
    folder_path: folderSummary.full_path,
    target_user_id: userId,
  }).catch((error) => logError('files-acl.sendAuditLog.remove', error))

  await writeFileEvent({
    folderId,
    actorUserId: auth.userId,
    eventType: 'folder.acl_revoked',
    payload: { target_user_id: userId, folder_path: folderSummary.full_path } as Json,
  })

  revalidatePath('/vezvision/files')
  return { success: true, data: undefined }
}
