import { NextResponse } from 'next/server'
import { validateCSRFToken } from '@/lib/actions/csrf'
import { getAdminClient } from '@/lib/supabase/admin'
import { createActionClient } from '@/lib/supabase/server'
import { sanitizeUserPreferences } from '@/lib/preferences'
import type { Json } from '@/types/database.types'

async function getAuthenticatedUser() {
  const client = await createActionClient()
  const { data: { user } } = await client.auth.getUser()
  return user
}

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = getAdminClient()
  const { data, error } = await admin
    .from('user_preferences')
    .select('preferences, revision, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'query_failed' }, { status: 500 })

  return NextResponse.json(
    {
      preferences: data ? sanitizeUserPreferences(data.preferences) : null,
      revision: data?.revision ?? 0,
      updatedAt: data?.updated_at ?? null,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function PUT(request: Request) {
  const csrfToken = request.headers.get('x-csrf-token')
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return NextResponse.json({ error: 'invalid_csrf' }, { status: 403 })
  }

  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const rawPreferences = body && typeof body === 'object'
    ? (body as Record<string, unknown>).preferences
    : null
  const preferences = sanitizeUserPreferences(rawPreferences)
  const admin = getAdminClient()

  const { data: current } = await admin
    .from('user_preferences')
    .select('revision')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data, error } = await admin
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      preferences: preferences as unknown as Json,
      revision: (current?.revision ?? 0) + 1,
    }, { onConflict: 'user_id' })
    .select('revision, updated_at')
    .single()

  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 })

  return NextResponse.json(
    { success: true, revision: data.revision, updatedAt: data.updated_at },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
