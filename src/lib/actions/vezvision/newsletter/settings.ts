'use server'
import { ONE_MINUTE } from '@/lib/constants/time'

import { revalidatePath } from 'next/cache'
import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { getVezVisionPrivilegedClient } from '@/lib/supabase/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { guardVezVisionMutation } from '@/lib/actions/vezvision/security'
import { logError } from '@/lib/logger'
import type { ActionResult } from '../types'

export interface NewsletterSettings {
  brand_name: string
  logo_url: string | null
  primary_color: string
  background_color: string
  surface_color: string
  text_color: string
  footer_text: string | null
  from_name: string
  from_email: string
  reply_to: string | null
}

export async function getNewsletterSettings(): Promise<ActionResult<NewsletterSettings>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  
  const { data, error } = await vv
    .from('vv_site_settings')
    .select('value')
    .eq('key', 'newsletter_branding')
    .maybeSingle()

  if (error) {
    logError('newsletter.getNewsletterSettings', error)
    return { success: false, error: 'Błąd podczas pobierania ustawień' }
  }

  const defaults: NewsletterSettings = {
    brand_name: 'VezVision',
    logo_url: 'https://pcxcqbpygyidkusetghk.supabase.co/storage/v1/object/public/vezvision-assets/logo-navbar.svg',
    primary_color: '#04070d',
    background_color: '#f3f4f6',
    surface_color: '#ffffff',
    text_color: '#0f0f0f',
    footer_text: null,
    from_name: 'VezVision',
    from_email: 'newsletter@vezvision.com',
    reply_to: null,
  }

  const settings = data?.value as NewsletterSettings | null
  return { success: true, data: settings ? { ...defaults, ...settings } : defaults }
}

export async function updateNewsletterSettings(
  input: Partial<NewsletterSettings>,
  csrfToken: string
): Promise<ActionResult<NewsletterSettings>> {
  const guard = await guardVezVisionMutation({ action: 'newsletter.settings.update', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()

  const { data: existing } = await vv
    .from('vv_site_settings')
    .select('value')
    .eq('key', 'newsletter_branding')
    .maybeSingle()

  const current = (existing?.value ?? {}) as unknown as NewsletterSettings
  const updated = { ...current, ...input }

  const { data, error } = await vv
    .from('vv_site_settings')
    .upsert({
      key: 'newsletter_branding',
      value: updated as unknown as import('@/types/vezvision-db').Database['public']['Tables']['vv_site_settings']['Insert']['value'],
      description: 'Newsletter branding settings',
      is_public: false,
    })
    .select()
    .single()

  if (error) {
    logError('newsletter.updateNewsletterSettings', error)
    return { success: false, error: 'Błąd podczas zapisywania ustawień' }
  }

  revalidatePath('/vezvision/newsletter/settings')
  return { success: true, data: (data?.value ?? updated) as NewsletterSettings }
}
