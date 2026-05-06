'use server'
import { ONE_MINUTE } from '@/lib/constants/time'
import {
  UPLOAD_IMAGE_MAX_SIZE,
  UPLOAD_DOCUMENT_MAX_SIZE,
  UPLOAD_PRIVATE_MAX_SIZE,
} from '@/lib/constants/file-limits'

import { getVezVisionPrivilegedClient } from '@/lib/supabase/vezvision'
import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import type { VVBucket, ActionResult } from './types'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { guardVezVisionMutation } from '@/lib/actions/vezvision/security'
import { logError } from '@/lib/logger'

const BUCKET_RULES: Record<VVBucket, { maxSizeBytes: number; allowedMimeTypes: readonly string[]; pathPrefix: string }> = {
  'vv-blog-images': {
    maxSizeBytes: UPLOAD_IMAGE_MAX_SIZE,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    pathPrefix: 'blog/',
  },
  'vv-portfolio-images': {
    maxSizeBytes: UPLOAD_DOCUMENT_MAX_SIZE,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    pathPrefix: 'portfolio/',
  },
  'vv-service-images': {
    maxSizeBytes: UPLOAD_IMAGE_MAX_SIZE,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    pathPrefix: 'services/',
  },
  'vv-files-private': {
    maxSizeBytes: UPLOAD_PRIVATE_MAX_SIZE,
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/zip',
      'application/json',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    pathPrefix: '',
  },
}

function isVezVisionBucket(value: string): value is VVBucket {
  return value === 'vv-blog-images' || value === 'vv-portfolio-images' || value === 'vv-service-images' || value === 'vv-files-private'
}

function sanitizeUploadPath(path: string): string | null {
  const trimmed = path.trim()
  if (!trimmed || trimmed.startsWith('/') || trimmed.includes('..')) return null
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(trimmed)) return null
  const normalized = trimmed.replace(/\/+/g, '/').replace(/\/$/g, '')
  if (!normalized || normalized.split('/').some((segment) => segment === '.' || segment === '..')) return null
  return normalized
}

function hasAllowedExtension(path: string, allowedMimeTypes: readonly string[]): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const mimeToExt: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'image/gif': ['gif'],
    'image/svg+xml': ['svg'],
    'application/pdf': ['pdf'],
    'text/plain': ['txt'],
    'application/zip': ['zip'],
    'application/json': ['json'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  }
  const allowedExts = allowedMimeTypes.flatMap((mime) => mimeToExt[mime] ?? [])
  return allowedExts.includes(ext)
}

function hasExpectedMagicBytes(file: Uint8Array, contentType: string): boolean {
  if (contentType === 'image/jpeg') return file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff
  if (contentType === 'image/png') return file[0] === 0x89 && file[1] === 0x50 && file[2] === 0x4e && file[3] === 0x47
  if (contentType === 'image/gif') return file[0] === 0x47 && file[1] === 0x49 && file[2] === 0x46
  if (contentType === 'image/webp') return file[0] === 0x52 && file[1] === 0x49 && file[2] === 0x46 && file[3] === 0x46 && file[8] === 0x57 && file[9] === 0x45 && file[10] === 0x42 && file[11] === 0x50
  return true
}

function getManagePermissionForBucket(bucket: VVBucket) {
  if (bucket === 'vv-blog-images') return VEZVISION_PERMISSIONS.BLOG_MANAGE
  if (bucket === 'vv-portfolio-images') return VEZVISION_PERMISSIONS.PORTFOLIO_MANAGE
  if (bucket === 'vv-files-private') return VEZVISION_PERMISSIONS.FILES_MANAGE
  return VEZVISION_PERMISSIONS.SERVICES_MANAGE
}

export async function uploadImage(
  bucket: VVBucket,
  path: string,
  file: ArrayBuffer,
  contentType: string,
  csrfToken: string
): Promise<ActionResult<string>> {
  if (bucket === 'vv-files-private') return { success: false, error: 'Prywatne pliki wymagają dedykowanej server action' }
  if (!isVezVisionBucket(bucket)) return { success: false, error: 'Nieobsługiwany bucket' }
  const rules = BUCKET_RULES[bucket]
  const sanitizedPath = sanitizeUploadPath(path)
  if (!sanitizedPath || (rules.pathPrefix && !sanitizedPath.startsWith(rules.pathPrefix))) {
    return { success: false, error: 'Nieprawidłowa ścieżka uploadu' }
  }

  const normalizedContentType = contentType.toLowerCase()
  if (!rules.allowedMimeTypes.includes(normalizedContentType)) {
    return { success: false, error: 'Nieobsługiwany typ pliku' }
  }
  if (!hasAllowedExtension(sanitizedPath, rules.allowedMimeTypes)) {
    return { success: false, error: 'Nieprawidłowe rozszerzenie pliku' }
  }

  const bytes = new Uint8Array(file)
  if (bytes.byteLength <= 0 || bytes.byteLength > rules.maxSizeBytes) {
    return { success: false, error: 'Nieprawidłowy rozmiar pliku' }
  }
  if (!hasExpectedMagicBytes(bytes, normalizedContentType)) {
    return { success: false, error: 'Nieprawidłowa zawartość pliku' }
  }

  const guard = await guardVezVisionMutation({ action: `upload.${bucket}`, csrfToken, maxRequests: 25, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(getManagePermissionForBucket(bucket))
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const blob = new Blob([file], { type: normalizedContentType })
  const { error } = await vv.storage
    .from(bucket)
    .upload(sanitizedPath, blob, { contentType: normalizedContentType, upsert: false })

  if (error) {
    logError('upload.uploadImage.storage', error)
    return { success: false, error: 'Błąd podczas uploadu pliku' }
  }

  const { data: urlData } = vv.storage.from(bucket).getPublicUrl(sanitizedPath)
  return { success: true, data: urlData.publicUrl }
}

export async function deleteImage(bucket: VVBucket, path: string, csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: `upload.delete.${bucket}`, csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(getManagePermissionForBucket(bucket))
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { error } = await vv.storage.from(bucket).remove([path])
  if (error) {
    logError('upload.deleteImage.storage', error)
    return { success: false, error: 'Błąd podczas usuwania pliku' }
  }

  return { success: true, data: undefined }
}

export async function getPublicUrl(bucket: VVBucket, path: string): Promise<ActionResult<string>> {
  const auth = await requireVezVisionPermission(getManagePermissionForBucket(bucket))
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data } = vv.storage.from(bucket).getPublicUrl(path)
  return { success: true, data: data.publicUrl }
}
