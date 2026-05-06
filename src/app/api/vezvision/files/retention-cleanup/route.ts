import { NextResponse } from 'next/server'
import { cleanupRetentionDeletedFiles } from '@/lib/actions/vezvision/files-events'
import { reportApiFailure, reportRuntimeEvent } from '@/lib/monitoring'

interface CleanupResponse {
  success: boolean
  deletedCount?: number
  failedCount?: number
  error?: string
}

function getAuthorizationSecret(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const [scheme, token] = authHeader.split(' ')
  if (!scheme || !token) return null
  if (scheme.toLowerCase() !== 'bearer') return null
  return token
}

export async function POST(request: Request): Promise<NextResponse<CleanupResponse>> {
  const secret = getAuthorizationSecret(request)
  if (!secret) {
    await reportApiFailure('Missing Bearer token for files retention cleanup', {
      route: '/api/vezvision/files/retention-cleanup',
    })
    return NextResponse.json({ success: false, error: 'Brak Bearer token' }, { status: 401 })
  }

  const result = await cleanupRetentionDeletedFiles(secret)
  if (!result.success) {
    await reportApiFailure('Files retention cleanup failed', {
      route: '/api/vezvision/files/retention-cleanup',
      error: result.error,
    })
    const status = result.error === 'Nieautoryzowany request cleanup' ? 401 : 500
    return NextResponse.json({ success: false, error: result.error }, { status })
  }

  if (result.data.failedCount > 0) {
    await reportRuntimeEvent({
      source: 'files_retention_cleanup',
      level: 'warning',
      message: 'Files retention cleanup completed with partial failures',
      details: {
        deleted_count: result.data.deletedCount,
        failed_count: result.data.failedCount,
      },
    })
  }

  return NextResponse.json({
    success: true,
    deletedCount: result.data.deletedCount,
    failedCount: result.data.failedCount,
  })
}
