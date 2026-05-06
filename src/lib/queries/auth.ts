import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

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
  const { data: authLevel } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  if (authLevel?.nextLevel === 'aal2' && authLevel.currentLevel === 'aal1') {
    await supabase.auth.signOut()
    return { allowed: false }
  }

  return { allowed: true }
}

function mapAuthUser(user: User): DashboardAuthUser {
  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
    email_confirmed_at: user.email_confirmed_at,
  }
}
