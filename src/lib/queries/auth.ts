import { createClient } from '@/lib/supabase/server'
import type { AuthUser } from '@/lib/auth/compat'

export interface DashboardAuthUser {
  id: string
  email: string | undefined
  created_at: string
  last_sign_in_at?: string
  email_confirmed_at?: string
}

export async function getDashboardAuthUser(): Promise<DashboardAuthUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return mapAuthUser(user)
}

export async function enforceRequiredMfaLevel(): Promise<{ allowed: true } | { allowed: false }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ? { allowed: true } : { allowed: false }
}

function mapAuthUser(user: AuthUser): DashboardAuthUser {
  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
    email_confirmed_at: user.email_confirmed_at,
  }
}
