import { NextResponse } from 'next/server'
import { getClientIP } from '@/lib/server-utils'
import { rateLimitByIP } from '@/lib/rate-limit'
import { isApiRequestAuthenticated } from '@/lib/queries/health'
import { ONE_MINUTE } from '@/lib/constants/time'
import { withCors } from '@/app/api/withCors'

export const GET = withCors(async (_request: Request) => {
  const rateLimit = await rateLimitByIP('client_ip', { maxRequests: 60, windowMs: ONE_MINUTE })
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

	const isAuthenticated = await isApiRequestAuthenticated()
	if (!isAuthenticated) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

  const ip = await getClientIP()

  return NextResponse.json({ ip })
})
