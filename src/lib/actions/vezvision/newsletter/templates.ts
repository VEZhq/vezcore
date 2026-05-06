'use server'
import { ONE_MINUTE } from '@/lib/constants/time'

import { revalidatePath } from 'next/cache'
import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { getVezVisionPrivilegedClient } from '@/lib/supabase/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { guardVezVisionMutation } from '@/lib/actions/vezvision/security'
import { logError } from '@/lib/logger'
import type { TablesInsert, TablesUpdate } from '@/types/vezvision-db'
import type { ActionResult } from '../types'

export interface NewsletterTemplate {
  id: string
  name: string
  name_en: string | null
  content_html: string
  content_html_en: string | null
  thumbnail_url: string | null
  is_active: boolean
  order_index: number
  created_at: string
  updated_at: string
}

export async function getNewsletterTemplates(): Promise<ActionResult<NewsletterTemplate[]>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_newsletter_templates')
    .select('id, name, name_en, content_html, content_html_en, thumbnail_url, is_active, order_index, created_at, updated_at')
    .eq('is_active', true)
    .order('order_index', { ascending: true })

  if (error) {
    logError('newsletter.getNewsletterTemplates', error)
    return { success: false, error: 'Błąd podczas pobierania szablonów' }
  }

  return { success: true, data: (data ?? []) as NewsletterTemplate[] }
}

export async function createNewsletterTemplate(
  input: {
    name: string
    name_en?: string | null
    content_html: string
    content_html_en?: string | null
    thumbnail_url?: string | null
  },
  csrfToken: string
): Promise<ActionResult<NewsletterTemplate>> {
  const guard = await guardVezVisionMutation({ action: 'newsletter.template.create', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const insertData: TablesInsert<'vv_newsletter_templates'> = {
    name: input.name,
    name_en: input.name_en ?? null,
    content_html: input.content_html,
    content_html_en: input.content_html_en ?? null,
    thumbnail_url: input.thumbnail_url ?? null,
    is_active: true,
    order_index: 0,
  }

  const { data, error } = await vv
    .from('vv_newsletter_templates')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    logError('newsletter.createNewsletterTemplate', error)
    return { success: false, error: 'Błąd podczas tworzenia szablonu' }
  }

  revalidatePath('/vezvision/newsletter/settings')
  return { success: true, data: data as NewsletterTemplate }
}

export async function updateNewsletterTemplate(
  id: string,
  input: {
    name?: string
    name_en?: string | null
    content_html?: string
    content_html_en?: string | null
    thumbnail_url?: string | null
  },
  csrfToken: string
): Promise<ActionResult<NewsletterTemplate>> {
  const guard = await guardVezVisionMutation({ action: 'newsletter.template.update', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const updateData: TablesUpdate<'vv_newsletter_templates'> = {}

  if (input.name !== undefined) updateData.name = input.name
  if (input.name_en !== undefined) updateData.name_en = input.name_en ?? null
  if (input.content_html !== undefined) updateData.content_html = input.content_html
  if (input.content_html_en !== undefined) updateData.content_html_en = input.content_html_en ?? null
  if (input.thumbnail_url !== undefined) updateData.thumbnail_url = input.thumbnail_url ?? null

  const { data, error } = await vv
    .from('vv_newsletter_templates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logError('newsletter.updateNewsletterTemplate', error)
    return { success: false, error: 'Błąd podczas aktualizacji szablonu' }
  }

  revalidatePath('/vezvision/newsletter/settings')
  return { success: true, data: data as NewsletterTemplate }
}

export async function deleteNewsletterTemplate(id: string, csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'newsletter.template.delete', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { error } = await vv.from('vv_newsletter_templates').delete().eq('id', id)

  if (error) {
    logError('newsletter.deleteNewsletterTemplate', error)
    return { success: false, error: 'Błąd podczas usuwania szablonu' }
  }

  revalidatePath('/vezvision/newsletter/settings')
  return { success: true, data: undefined }
}
