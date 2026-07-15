import { NextResponse } from 'next/server'
import { createActionClient } from '@/lib/supabase/server'
import { isAdminRole } from '@/lib/roles'

export async function GET(request: Request) {
  const client = await createActionClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await client.from('profiles').select('role').eq('id', user.id).single()
  if (!isAdminRole(profile?.role ?? null)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const sinceRaw = new URL(request.url).searchParams.get('since')
  const since = sinceRaw && !Number.isNaN(Date.parse(sinceRaw)) ? new Date(sinceRaw).toISOString() : new Date().toISOString()
  const { data, error } = await client
    .from('audit_log')
    .select('action, details, created_at')
    .in('action', ['failed_login', 'ip_blocked', '2fa_failed'])
    .gt('created_at', since)
    .order('created_at', { ascending: true })
    .limit(25)

  if (error) return NextResponse.json({ error: 'query_failed' }, { status: 500 })
  return NextResponse.json({ alerts: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}
