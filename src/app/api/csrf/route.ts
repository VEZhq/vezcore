import { NextResponse } from 'next/server'
import { getCSRFToken } from '@/lib/actions/csrf'
import { rateLimitByIP } from '@/lib/rate-limit'
import { ONE_MINUTE } from '@/lib/constants/time'
import { withCors } from '@/app/api/withCors'

export const GET = withCors(async (_request: Request) => {
  const rateLimit = await rateLimitByIP('csrf_generate', { maxRequests: 30, windowMs: ONE_MINUTE })
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const token = await getCSRFToken()
  return NextResponse.json({ token })
})
