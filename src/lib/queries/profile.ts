import { createClient } from '@/lib/supabase/server'
import { get2FAFactors } from '@/lib/actions/twoFactor'
import type { DashboardAuthUser } from '@/lib/queries/auth'

export interface ProfilePageProfile {
  id: string
  full_name: string | null
  role: string | null
  avatar_url: string | null
  tenant_id: string | null
}

export interface ProfilePageTenant {
  id: string
  name: string
}

interface ProfileRow {
  id: string
  full_name: string | null
  role: string | null
  avatar_url: string | null
  tenant_id: string | null
}

interface TenantRow {
  id: string
  name: string
}

export async function getProfilePageData(user: DashboardAuthUser): Promise<{
  profile: ProfilePageProfile | null
  tenant: ProfilePageTenant | null
  twoFactors: Array<{ id: string }>
}> {
  const supabase = await createClient()

  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url, tenant_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as ProfileRow | null
  const { data: tenantData } = profile?.tenant_id
    ? await supabase.from('tenants').select('id, name').eq('id', profile.tenant_id).single()
    : { data: null }

  const { factors: twoFactors } = await get2FAFactors()

  return {
    profile,
    tenant: tenantData as TenantRow | null,
    twoFactors,
  }
}
