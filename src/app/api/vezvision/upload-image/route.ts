import { NextResponse } from 'next/server'
import { getVezVisionPrivilegedClient } from '@/lib/supabase/vezvision'
import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { guardVezVisionMutation } from '@/lib/actions/vezvision/security'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import type { VezVisionPermissionKey } from '@/lib/vezvision-permissions'
import { ONE_MINUTE, FIVE_MINUTES, ONE_SECOND } from '@/lib/constants/time'
import {
  UPLOAD_IMAGE_MAX_SIZE,
  UPLOAD_DOCUMENT_MAX_SIZE,
  UPLOAD_PRIVATE_MAX_SIZE,
} from '@/lib/constants/file-limits'
import { withCors } from '@/app/api/withCors'
import { validateMagicBytes } from '@/lib/file-validation'
import { reportApiFailure } from '@/lib/monitoring'
import { rateLimitByIP } from '@/lib/rate-limit'

type UploadBucket = 'vv-blog-images' | 'vv-portfolio-images' | 'vv-service-images' | 'vv-files-private' | 'vv-newsletter-images'

const PUBLIC_IMAGE_CACHE_CONTROL_SECONDS = '31536000'

interface UploadResponse {
  success: boolean
  data?: string
  error?: string
}

const BUCKET_RULES: Record<UploadBucket, { maxSizeBytes: number; allowedMimeTypes: readonly string[] | null }> = {
  'vv-blog-images': {
    maxSizeBytes: UPLOAD_IMAGE_MAX_SIZE,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  'vv-portfolio-images': {
    maxSizeBytes: UPLOAD_DOCUMENT_MAX_SIZE,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  'vv-service-images': {
    maxSizeBytes: UPLOAD_IMAGE_MAX_SIZE,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  'vv-newsletter-images': {
    maxSizeBytes: UPLOAD_IMAGE_MAX_SIZE,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
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
  },
}

function isUploadBucket(value: string): value is UploadBucket {
  return value === 'vv-blog-images' || value === 'vv-portfolio-images' || value === 'vv-service-images' || value === 'vv-files-private' || value === 'vv-newsletter-images'
}

function getPermissionForBucket(bucket: UploadBucket): VezVisionPermissionKey {
  if (bucket === 'vv-blog-images') return VEZVISION_PERMISSIONS.BLOG_MANAGE
  if (bucket === 'vv-portfolio-images') return VEZVISION_PERMISSIONS.PORTFOLIO_MANAGE
  if (bucket === 'vv-files-private') return VEZVISION_PERMISSIONS.FILES_MANAGE
  if (bucket === 'vv-newsletter-images') return VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE
  return VEZVISION_PERMISSIONS.SERVICES_MANAGE
}

function sanitizeUploadPath(path: string): string | null {
  const trimmed = path.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('/')) return null
  if (trimmed.includes('..')) return null

  const segments = trimmed.split('/').filter(Boolean)
  if (segments.some((s) => s === '.' || s === '..')) return null

  if (!/^[a-zA-Z0-9/_\-.]+$/.test(trimmed)) return null
  return trimmed.replace(/\/+/g, '/').replace(/\/$/g, '')
}

export const POST = withCors(async (request: Request): Promise<NextResponse<UploadResponse>> => {
  // Rate limit before reading body — prevents memory exhaustion from spam uploads
  const earlyRateLimit = await rateLimitByIP('upload-image:early', {
    maxRequests: 30,
    windowMs: ONE_MINUTE,
  })
  if (!earlyRateLimit.allowed) {
    return NextResponse.json({ success: false, error: earlyRateLimit.error ?? 'Za dużo prób uploadu' }, { status: 429 })
  }

  const contentLength = request.headers.get('content-length')
  if (contentLength) {
    const size = Number.parseInt(contentLength, 10)
    if (Number.isNaN(size) || size > UPLOAD_PRIVATE_MAX_SIZE) {
      return NextResponse.json({ success: false, error: 'Plik przekracza maksymalny rozmiar' }, { status: 413 })
    }
  }

  const formData = await request.formData()
  const bucketRaw = formData.get('bucket')
  const pathRaw = formData.get('path')
  const csrfTokenRaw = formData.get('csrfToken')
  const fileRaw = formData.get('file')

  if (typeof bucketRaw !== 'string' || typeof pathRaw !== 'string' || typeof csrfTokenRaw !== 'string') {
    await reportApiFailure('Invalid upload payload', { route: '/api/vezvision/upload-image' })
    return NextResponse.json({ success: false, error: 'Nieprawidłowe dane uploadu' }, { status: 400 })
  }
  if (!isUploadBucket(bucketRaw)) {
    return NextResponse.json({ success: false, error: 'Nieobsługiwany bucket' }, { status: 400 })
  }
  if (bucketRaw === 'vv-files-private') {
    return NextResponse.json({ success: false, error: 'Prywatne pliki wymagają dedykowanej server action' }, { status: 400 })
  }
  if (!(fileRaw instanceof File)) {
    return NextResponse.json({ success: false, error: 'Brak pliku' }, { status: 400 })
  }

  const rules = BUCKET_RULES[bucketRaw]
  if (fileRaw.size <= 0 || fileRaw.size > rules.maxSizeBytes) {
    return NextResponse.json({ success: false, error: 'Nieprawidłowy rozmiar pliku' }, { status: 400 })
  }

  const normalizedMimeType = (fileRaw.type || '').toLowerCase()
  if (!normalizedMimeType || !rules.allowedMimeTypes?.includes(normalizedMimeType)) {
    return NextResponse.json({ success: false, error: 'Nieobsługiwany typ pliku' }, { status: 400 })
  }

  const fileBuffer = await fileRaw.arrayBuffer()
  if (!validateMagicBytes(fileBuffer, [...(rules.allowedMimeTypes ?? [])])) {
    return NextResponse.json({ success: false, error: 'Nieprawidłowa zawartość pliku' }, { status: 400 })
  }

  const sanitizedPath = sanitizeUploadPath(pathRaw)
  if (!sanitizedPath) {
    await reportApiFailure('Rejected invalid upload path', { route: '/api/vezvision/upload-image', bucket: bucketRaw, raw_path: pathRaw })
    return NextResponse.json({ success: false, error: 'Nieprawidłowa ścieżka uploadu' }, { status: 400 })
  }

  const guard = await guardVezVisionMutation({
    action: `upload.${bucketRaw}`,
    csrfToken: csrfTokenRaw,
    maxRequests: 25,
    windowMs: ONE_MINUTE,
  })
  if (!guard.ok) {
    await reportApiFailure('Upload guard rejected request', { route: '/api/vezvision/upload-image', bucket: bucketRaw, error: guard.error })
    return NextResponse.json({ success: false, error: guard.error }, { status: 403 })
  }

  const auth = await requireVezVisionPermission(getPermissionForBucket(bucketRaw))
  if ('error' in auth) {
    await reportApiFailure('Upload permission rejected request', { route: '/api/vezvision/upload-image', bucket: bucketRaw, error: auth.error })
    return NextResponse.json({ success: false, error: auth.error }, { status: 403 })
  }

  const vv = getVezVisionPrivilegedClient()
  const { error } = await vv.storage
    .from(bucketRaw)
    .upload(sanitizedPath, fileBuffer, {
      contentType: fileRaw.type || 'application/octet-stream',
      cacheControl: PUBLIC_IMAGE_CACHE_CONTROL_SECONDS,
      upsert: false,
    })

  if (error) {
    await reportApiFailure('Upload storage write failed', {
      route: '/api/vezvision/upload-image',
      bucket: bucketRaw,
      path: sanitizedPath,
      message: error.message,
    })
    return NextResponse.json({ success: false, error: 'Błąd podczas uploadu pliku' }, { status: 500 })
  }

  const { data } = vv.storage.from(bucketRaw).getPublicUrl(sanitizedPath)
  return NextResponse.json({ success: true, data: data.publicUrl })
})
