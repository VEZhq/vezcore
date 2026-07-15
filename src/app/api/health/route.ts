import { NextResponse } from 'next/server'
import { getHealthRouteStatus, type HealthRouteStatus } from '@/lib/queries/health'
import { withCors } from '@/app/api/withCors'
import { rateLimitByIP } from '@/lib/rate-limit'
import { ONE_MINUTE } from '@/lib/constants/time'

function getBearerToken(request: Request): string | null {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

export const GET = withCors(async (request: Request): Promise<NextResponse<HealthRouteStatus>> => {
  const rateLimit = await rateLimitByIP('health', { maxRequests: 30, windowMs: ONE_MINUTE })
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { status: 'unhealthy', timestamp: new Date().toISOString() } as HealthRouteStatus,
      { status: 429 }
    )
  }

  const token = getBearerToken(request)
  const healthCheckToken = process.env.HEALTH_CHECK_TOKEN
  if (!token || !healthCheckToken || token !== healthCheckToken) {
    return NextResponse.json(
      { status: 'unhealthy', timestamp: new Date().toISOString() } as HealthRouteStatus,
      { status: 401 }
    )
  }

  const body = await getHealthRouteStatus()
  const httpStatus = body.status === 'unhealthy' ? 503 : 200
  return NextResponse.json(body, { status: httpStatus })
})
