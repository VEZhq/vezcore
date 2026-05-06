import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'

export interface AccountListUser {
  id: string
  email: string
  full_name: string | null
  role: string | null
  created_at: string
}

export interface AccountProfile {
  id: string
  full_name: string | null
  role: string | null
  created_at: string
}

export interface AccountDetailUser extends AccountProfile {
  email: string
}

export interface AccountActivityEntry {
  action: string
  details: Record<string, unknown> | null
  created_at: string
}

export interface AccountAuditLogEntry {
  id: string
  action: string
  details: Record<string, unknown> | null
  entity_type: string | null
  entity_id: string | null
  created_at: string
}

export interface AccountSessionEntry {
  id: string
  ip: string
  user_agent: string
  created_at: string
  updated_at: string
  aal: string
  is_current: boolean
}

interface ProfileRow {
  id: string
  full_name: string | null
  role: string | null
  created_at: string
}

interface ActivityRow {
  action: string
  details: Record<string, unknown> | null
  created_at: string
}

interface AuditRow {
  id: string
  action: string
  details: Record<string, unknown> | null
  entity_type: string | null
  entity_id: string | null
  created_at: string
}

interface RawSessionRow {
  id: string
  ip: string | null
  user_agent: string | null
  created_at: string
  updated_at: string
  aal: string | null
}

export async function getAccountsPageData(input: {
  page: number
  limit: number
  search: string
}): Promise<{ users: AccountListUser[]; total: number }> {
  const supabase = await createClient()
  const adminClient = getAdminClient()
  const { data: authUsers } = await adminClient.auth.admin.listUsers()
  const emailMap = new Map((authUsers?.users || []).map((user) => [user.id, user.email || '']))

  let matchingIds: string[] | null = null
  if (input.search) {
    const searchLower = input.search.toLowerCase()
    matchingIds = [...emailMap.entries()]
      .filter(([, email]) => email.toLowerCase().includes(searchLower))
      .map(([id]) => id)
  }

  if (input.search && matchingIds?.length === 0) return { users: [], total: 0 }

  const offset = (input.page - 1) * input.limit
  let query = supabase
    .from('profiles')
    .select('id, full_name, role, created_at', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (input.search && matchingIds) {
    query = query.or(`full_name.ilike.%${input.search}%,id.in.(${matchingIds.join(',')})`)
  }

  const { data: profiles, count } = await query.range(offset, offset + input.limit - 1)
  const profileRows = (profiles ?? []) as ProfileRow[]

  return {
    users: profileRows.map((profile) => ({
      id: profile.id,
      email: emailMap.get(profile.id) || '',
      full_name: profile.full_name,
      role: profile.role,
      created_at: profile.created_at,
    })),
    total: count || 0,
  }
}

export async function getAccountDetailData(id: string): Promise<{
  user: AccountDetailUser
  recentActivity: AccountActivityEntry[]
  has2FA: boolean
} | null> {
  const supabase = await createClient()
  const adminClient = getAdminClient()

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!targetProfile) return null

  const [{ data: authUserData }, { data: mfaFactors }, { data: recentActivity }] = await Promise.all([
    adminClient.auth.admin.getUserById(id),
    adminClient
      .from('mfa_factors')
      .select('id')
      .eq('user_id', id)
      .eq('factor_type', 'totp')
      .eq('status', 'verified')
      .limit(1),
    supabase
      .from('audit_log')
      .select('action, details, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const profile = targetProfile as ProfileRow
  return {
    user: {
      id: profile.id,
      email: authUserData?.user?.email || '',
      full_name: profile.full_name,
      role: profile.role,
      created_at: profile.created_at,
    },
    recentActivity: (recentActivity ?? []) as ActivityRow[],
    has2FA: (mfaFactors?.length ?? 0) > 0,
  }
}

export async function getAccountPermissionsUserData(id: string): Promise<AccountDetailUser | null> {
  const supabase = await createClient()
  const adminClient = getAdminClient()

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!targetProfile) return null

  const { data: authUserData } = await adminClient.auth.admin.getUserById(id)
  const profile = targetProfile as ProfileRow

  return {
    id: profile.id,
    email: authUserData?.user?.email || '',
    full_name: profile.full_name,
    role: profile.role,
    created_at: profile.created_at,
  }
}

export async function getAccountActivityData(id: string): Promise<{
  user: { id: string; full_name: string | null; email: string }
  auditLog: AccountAuditLogEntry[]
  sessions: AccountSessionEntry[]
} | null> {
  const supabase = await createClient()
  const adminClient = getAdminClient()

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!targetProfile) return null

  const [auditLogResult, sessionsResult, authUserData] = await Promise.all([
    supabase
      .from('audit_log')
      .select('id, action, details, entity_type, entity_id, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.rpc('get_user_sessions', { target_user_id: id }),
    adminClient.auth.admin.getUserById(id),
  ])

  const profile = targetProfile as { id: string; full_name: string | null }
  const rawSessions = (sessionsResult.data ?? []) as RawSessionRow[]

  return {
    user: {
      id: profile.id,
      full_name: profile.full_name,
      email: authUserData?.data?.user?.email || '',
    },
    auditLog: (auditLogResult.data ?? []) as AuditRow[],
    sessions: rawSessions.map((session, index) => ({
      id: session.id,
      ip: session.ip ?? 'unknown',
      user_agent: session.user_agent ?? 'unknown',
      created_at: session.created_at,
      updated_at: session.updated_at,
      aal: session.aal ?? 'aal1',
      is_current: index === 0,
    })),
  }
}
