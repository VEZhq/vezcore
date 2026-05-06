'use server'

import { createActionClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { isAdminRole } from '@/lib/roles'
import { ERRORS } from '@/lib/constants'
import { validateCSRFToken } from '@/lib/actions/csrf'
import { rateLimitByIP } from '@/lib/rate-limit'
import { ONE_MINUTE } from '@/lib/constants/time'

interface UserExportData {
  email: string
  full_name: string | null
  role: string
  created_at: string
  last_sign_in: string | null
}

export async function getUsersForExport(csrfToken: string): Promise<UserExportData[] | { error: string }> {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token CSRF' }
  }

  const rateLimitResult = await rateLimitByIP('users_export', { maxRequests: 5, windowMs: ONE_MINUTE })
  if (!rateLimitResult.allowed) {
    return { error: rateLimitResult.error || 'Przekroczono limit prób' }
  }

  const supabase = await createActionClient()
  const adminClient = getAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: ERRORS.NOT_LOGGED_IN }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isAdminRole(callerProfile?.role)) return { error: ERRORS.NO_PERMISSIONS }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (!profiles) return []

  const { data: authUsers } = await adminClient.auth.admin.listUsers()

  const userMap = new Map(
    (authUsers?.users || []).map(u => [u.id, {
      email: u.email || '',
      last_sign_in: u.last_sign_in_at,
    }])
  )

  return profiles.map(profile => {
    const authUser = userMap.get(profile.id)
    return {
      email: authUser?.email || '',
      full_name: profile.full_name,
      role: profile.role || 'user',
      created_at: profile.created_at,
      last_sign_in: authUser?.last_sign_in || null,
    }
  })
}
