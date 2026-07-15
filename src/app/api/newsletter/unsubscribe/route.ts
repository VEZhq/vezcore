import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveClientIpFromHeaders } from '@/lib/server-utils'
import { checkRateLimit } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'
import { getVezVisionPrivilegedClient } from '@/lib/supabase/vezvision'

async function unsubscribeByToken(token: string): Promise<boolean> {
  const { data, error } = await getVezVisionPrivilegedClient()
    .from('vv_newsletter_subscribers')
    .update({
      is_active: false,
      unsubscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('token', token)
    .eq('is_active', true)
    .select('id')
    .maybeSingle()

  return !error && Boolean(data)
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

  const success = await unsubscribeByToken(token)

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

  const success = await unsubscribeByToken(token)

  if (!success) {
    return new Response('Invalid token or already unsubscribed', { status: 400 })
  }

  return new Response('Unsubscribed', { status: 200 })
}
