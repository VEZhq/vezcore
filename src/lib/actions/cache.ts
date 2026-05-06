'use server'

import { revalidatePath } from 'next/cache'
import { createActionClient } from '@/lib/supabase/server'
import { ERRORS } from '@/lib/constants'
import { validateCSRFToken } from '@/lib/actions/csrf'

function isSuperAdminRole(role: string | null): boolean {
  return role === 'super_admin'
}

export interface CacheStats {
  paths: string[]
  lastCleared: string | null
}

let lastClearedTime: string | null = null

const ALLOWED_CACHE_PATHS = new Set(['/dashboard', '/profile', '/konta', '/audit', '/settings', '/security'])

async function getAdminUser() {
  const supabase = await createActionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return isSuperAdminRole(profile?.role) ? user : null
}



export async function clearAllCache(csrfToken: string): Promise<{ success: true; clearedAt: string } | { error: string }> {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token CSRF' }
  }

  const user = await getAdminUser()
  if (!user) return { error: ERRORS.NO_PERMISSIONS }

  revalidatePath('/', 'layout')
  revalidatePath('/dashboard')
  revalidatePath('/profile')
  revalidatePath('/konta')
  revalidatePath('/audit')
  revalidatePath('/settings')
  revalidatePath('/security')

  lastClearedTime = new Date().toISOString()

  return { success: true, clearedAt: lastClearedTime }
}

export async function clearPathCache(path: string, csrfToken: string): Promise<{ success: true } | { error: string }> {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token CSRF' }
  }

  if (!ALLOWED_CACHE_PATHS.has(path)) {
    return { error: 'Nieobsługiwana ścieżka cache' }
  }

  const user = await getAdminUser()
  if (!user) return { error: ERRORS.NO_PERMISSIONS }

  revalidatePath(path)
  lastClearedTime = new Date().toISOString()
  return { success: true }
}
