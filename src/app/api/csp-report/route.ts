import { NextResponse } from 'next/server'
import { rateLimitByIP } from '@/lib/rate-limit'
import { reportRuntimeEvent } from '@/lib/monitoring'
import { logError } from '@/lib/logger'
import { ONE_MINUTE } from '@/lib/constants/time'

interface CspReportBody {
  'csp-report': {
    'document-uri'?: string
    'referrer'?: string
    'violated-directive'?: string
    'effective-directive'?: string
    'original-policy'?: string
    'disposition'?: string
    'blocked-uri'?: string
    'line-number'?: number
    'column-number'?: number
    'source-file'?: string
    'status-code'?: number
    'script-sample'?: string
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const rateLimit = await rateLimitByIP('csp_report', { maxRequests: 30, windowMs: ONE_MINUTE })
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let report: CspReportBody['csp-report']
  try {
    const body = (await request.json()) as CspReportBody
    report = body['csp-report']
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!report) {
    return NextResponse.json({ error: 'Missing csp-report field' }, { status: 400 })
  }

  try {
    await reportRuntimeEvent({
      source: 'csp',
      message: `${report['violated-directive'] ?? 'unknown'} blocked ${report['blocked-uri'] ?? 'unknown'}`,
      level: 'warning',
      details: {
        violated_directive: report['violated-directive'],
        blocked_uri: report['blocked-uri'],
        document_uri: report['document-uri'],
        source_file: report['source-file'],
        line_number: report['line-number'],
        script_sample: report['script-sample'],
      },
    })
  } catch (error) {
    await logError('csp.report.persist', error)
  }

  return NextResponse.json({ received: true })
}
