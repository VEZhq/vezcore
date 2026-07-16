import { NextResponse } from 'next/server'
import { ONE_DAY_SECONDS } from '@/lib/constants/time'

type RouteHandler = (request: Request) => Promise<NextResponse> | NextResponse

const ALLOWED_ORIGINS = [
  ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
]

function resolveAllowedOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null
  return ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : null
}

export function withCors(handler: RouteHandler): RouteHandler {
  return async (request: Request) => {
    const origin = resolveAllowedOrigin(request.headers.get('origin'))

    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': String(ONE_DAY_SECONDS),
        },
      })
      if (origin) response.headers.set('Access-Control-Allow-Origin', origin)
      return response
    }

    const response = await handler(request)
    if (origin) response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return response
  }
}
