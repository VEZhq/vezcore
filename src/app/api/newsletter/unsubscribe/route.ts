import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveClientIpFromHeaders } from '@/lib/server-utils'
import { checkRateLimit } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'

function getNewsletterSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.VEZVISION_SUPABASE_URL
  const anonKey = process.env.VEZVISION_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return null
  }

  return { url, anonKey }
}

async function unsubscribeByToken(url: string, anonKey: string, token: string, ip: string): Promise<boolean> {
  const response = await fetch(`${url}/functions/v1/unsubscribe-newsletter`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify({ token }),
  })

  if (!response.ok) {
    return false
  }

  const data = await response.json().catch(() => null)
  return data?.success === true
}

export async function GET(request: Request, { params }: { params: Promise<Record<string, string>> }) {
  await params
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token || token.length !== 48 || !/^[a-f0-9]+$/.test(token)) {
    redirect('/unsubscribed?status=invalid')
  }

  const headersList = await headers()
  const ip = resolveClientIpFromHeaders(headersList)

  const rateLimit = await checkRateLimit(`unsubscribe_get:${ip}`, { maxRequests: 10, windowMs: 60_000, failOpen: true })
  if (!rateLimit.allowed) {
    return new NextResponse('Too many requests', { status: 429 })
  }

  const config = getNewsletterSupabaseConfig()
  if (!config) {
    redirect('/unsubscribed?status=invalid')
  }

  const success = await unsubscribeByToken(config.url, config.anonKey, token, ip)

  if (!success) {
    redirect('/unsubscribed?status=invalid')
  }

  redirect('/unsubscribed?status=ok')
}

export async function POST(request: Request, { params }: { params: Promise<Record<string, string>> }) {
  await params

  const { searchParams } = new URL(request.url)
  let token = searchParams.get('token')

  if (!token) {
    try {
      const formData = await request.formData()
      token = formData.get('token') as string
    } catch {
      // Ignore
    }
  }

  if (!token || token.length !== 48 || !/^[a-f0-9]+$/.test(token)) {
    return new Response('Invalid token', { status: 400 })
  }

  const headersList = await headers()
  const ip = resolveClientIpFromHeaders(headersList)

  const rateLimit = await checkRateLimit(`unsubscribe_post:${ip}`, { maxRequests: 10, windowMs: 60_000, failOpen: true })
  if (!rateLimit.allowed) {
    return new NextResponse('Too many requests', { status: 429 })
  }

  const config = getNewsletterSupabaseConfig()
  if (!config) {
    return new Response('Newsletter backend is not configured', { status: 500 })
  }

  const success = await unsubscribeByToken(config.url, config.anonKey, token, ip)

  if (!success) {
    return new Response('Invalid token or already unsubscribed', { status: 400 })
  }

  return new Response('Unsubscribed', { status: 200 })
}
