'use server'
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, MIN_PAGE_LIMIT, MAX_TITLE_LENGTH, MAX_SLUG_LENGTH, MAX_EXCERPT_LENGTH, MAX_CONTENT_LENGTH_KB, MAX_QUESTION_LENGTH, MAX_ANSWER_LENGTH_KB, MAX_CATEGORY_LENGTH, MAX_SUBJECT_LENGTH, MAX_EVENT_TITLE_LENGTH } from '@/lib/constants/pagination'

import { revalidatePath } from 'next/cache'
import { getVezVisionPrivilegedClient } from '@/lib/supabase/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { logError } from '@/lib/logger'
import type { ActionResult, VVFileEvent } from './types'
import type { Json } from '@/types/vezvision-db'
import { ONE_DAY_MS } from '@/lib/constants/time'
import {
  requireAnyVezVisionActionPermission,
  canViewFolder,
  getFilesPermissionContext,
  parseRetentionDays,
  permanentlyDeleteFileById,
  writeFileEvent,
} from './files-internal'
import type { CleanupRetentionResult } from './files-internal'

export async function cleanupRetentionDeletedFiles(
  requestSecret: string
): Promise<ActionResult<CleanupRetentionResult>> {
  const expectedSecret = process.env.VEZVISION_FILES_RETENTION_SECRET
  if (!expectedSecret) {
    return { success: false, error: 'Brak konfiguracji VEZVISION_FILES_RETENTION_SECRET' }
  }

  const { timingSafeEqual } = await import('node:crypto')
  const requestBuffer = Buffer.from(requestSecret, 'utf8')
  const expectedBuffer = Buffer.from(expectedSecret, 'utf8')
  const secretsMatch =
    requestBuffer.length === expectedBuffer.length &&
    timingSafeEqual(requestBuffer, expectedBuffer)

  if (!secretsMatch) {
    return { success: false, error: 'Nieautoryzowany request cleanup' }
  }

  const retentionDays = parseRetentionDays(process.env.VEZVISION_FILES_RETENTION_DAYS)
  const thresholdDate = new Date(Date.now() - retentionDays * ONE_DAY_MS).toISOString()

  const vv = getVezVisionPrivilegedClient()
  const { data: candidates, error } = await vv
    .from('vv_files')
    .select('id')
    .not('deleted_at', 'is', null)
    .lte('deleted_at', thresholdDate)
    .limit(MAX_PAGE_LIMIT)

  if (error) {
    logError('files.cleanupRetention', error)
    return { success: false, error: 'Nie udało się pobrać plików do czyszczenia retention' }
  }

  const candidateIds = (candidates ?? []).map((item) => item.id)
  if (candidateIds.length === 0) {
    return { success: true, data: { deletedCount: 0, failedCount: 0 } }
  }

  const outcomes = await Promise.all(candidateIds.map((id) => permanentlyDeleteFileById(id, null)))
  const deletedCount = outcomes.filter(Boolean).length
  const failedCount = outcomes.length - deletedCount

  revalidatePath('/vezvision/files')
  return { success: true, data: { deletedCount, failedCount } }
}

export async function listFileEvents(limit = DEFAULT_PAGE_LIMIT, folderId: string | null = null): Promise<ActionResult<VVFileEvent[]>> {
  const auth = await requireAnyVezVisionActionPermission([
    VEZVISION_PERMISSIONS.FILES_VIEW,
    VEZVISION_PERMISSIONS.FILES_MANAGE,
    VEZVISION_PERMISSIONS.FILES_PERMISSIONS_MANAGE,
  ])
  if ('error' in auth) return { success: false, error: auth.error }

  const context = await getFilesPermissionContext()
  if ('error' in context) return { success: false, error: context.error }

  const canView = await canViewFolder(context.userId, context.role, context.permissions, folderId)
  if (!canView) return { success: true, data: [] }

  const safeLimit = Math.min(Math.max(limit, MIN_PAGE_LIMIT), MAX_PAGE_LIMIT)
  const vv = getVezVisionPrivilegedClient()
  let query = vv
    .from('vv_file_events')
    .select('id, file_id, folder_id, actor_user_id, event_type, ip, user_agent, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  query = folderId ? query.eq('folder_id', folderId) : query.is('folder_id', null)

  const { data, error } = await query

  if (error) {
    logError('files.listFileEvents', error)
    return { success: false, error: 'Błąd podczas pobierania zdarzeń plików' }
  }

  return { success: true, data: (data ?? []) as VVFileEvent[] }
}
