'use server'
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, MIN_PAGE_LIMIT, MAX_TITLE_LENGTH, MAX_SLUG_LENGTH, MAX_EXCERPT_LENGTH, MAX_CONTENT_LENGTH_KB, MAX_QUESTION_LENGTH, MAX_ANSWER_LENGTH_KB, MAX_CATEGORY_LENGTH, MAX_SUBJECT_LENGTH, MAX_EVENT_TITLE_LENGTH } from '@/lib/constants/pagination'
import { ONE_MINUTE } from '@/lib/constants/time'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { logError } from '@/lib/logger'
import { getVezVisionPrivilegedClient } from '@/lib/supabase/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { guardVezVisionMutation } from '@/lib/actions/vezvision/security'
import { sanitizeSearchTerm } from '@/lib/vezvision-security-utils'
import type { TablesInsert, TablesUpdate } from '@/types/vezvision-db'
import type { ActionResult, VVNewsletterSubscriber } from '../types'

const emailSchema = z.string().email({ message: 'Nieprawidłowy adres email' })

function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function getNewsletterSubscribers(filters?: {
  activeOnly?: boolean
  search?: string
  tag?: string
  limit?: number
  offset?: number
}): Promise<ActionResult<{ subscribers: VVNewsletterSubscriber[]; total: number }>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  
  let query = vv
    .from('vv_newsletter_subscribers')
    .select('*', { count: 'exact' })
    .order('subscribed_at', { ascending: false })
    .range(filters?.offset ?? 0, (filters?.offset ?? 0) + (filters?.limit ?? DEFAULT_PAGE_LIMIT) - 1)

  if (filters?.activeOnly) query = query.eq('is_active', true)
  if (filters?.tag) query = query.contains('tags', [filters.tag])
  if (filters?.search) {
    const search = sanitizeSearchTerm(filters.search)
    if (search.length >= 2) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }
  }

  const { data, error, count } = await query
  if (error) {
    logError('newsletter.getNewsletterSubscribers', error)
    return { success: false, error: 'Błąd podczas pobierania odbiorców' }
  }

  return { 
    success: true, 
    data: { 
      subscribers: (data ?? []) as VVNewsletterSubscriber[],
      total: count ?? 0
    } 
  }
}

export async function createNewsletterSubscriber(
  input: {
    email: string
    first_name?: string | null
    last_name?: string | null
    source?: string
    tags?: string[]
  },
  csrfToken: string
): Promise<ActionResult<VVNewsletterSubscriber>> {
  const guard = await guardVezVisionMutation({ action: 'newsletter.subscriber.create', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const email = sanitizeEmail(input.email)
  const emailParse = emailSchema.safeParse(email)
  if (!emailParse.success) {
    return { success: false, error: emailParse.error.issues[0].message }
  }

  const allowedSources = new Set(['manual', 'newsletter', 'client', 'lead', 'candidate'])
  const source = input.source ?? 'manual'
  if (!allowedSources.has(source)) {
    return { success: false, error: 'Nieprawidłowe źródło' }
  }

  const vv = getVezVisionPrivilegedClient()
  const { data: existing } = await vv
    .from('vv_newsletter_subscribers')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (existing) return { success: false, error: 'Odbiorca o tym adresie już istnieje' }

  const insertData: TablesInsert<'vv_newsletter_subscribers'> = {
    email,
    first_name: input.first_name?.trim() || null,
    last_name: input.last_name?.trim() || null,
    source,
    tags: input.tags ?? [],
    is_active: true,
  }

  const { data, error } = await vv
    .from('vv_newsletter_subscribers')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    logError('newsletter.createNewsletterSubscriber', error)
    return { success: false, error: 'Błąd podczas dodawania odbiorcy' }
  }

  revalidatePath('/vezvision/newsletter/audiences')
  return { success: true, data: data as VVNewsletterSubscriber }
}

export async function updateNewsletterSubscriber(
  id: string,
  input: {
    first_name?: string | null
    last_name?: string | null
    tags?: string[]
    is_active?: boolean
  },
  csrfToken: string
): Promise<ActionResult<VVNewsletterSubscriber>> {
  const guard = await guardVezVisionMutation({ action: 'newsletter.subscriber.update', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const updateData: TablesUpdate<'vv_newsletter_subscribers'> = {}
  if (input.first_name !== undefined) updateData.first_name = input.first_name?.trim() || null
  if (input.last_name !== undefined) updateData.last_name = input.last_name?.trim() || null
  if (input.tags !== undefined) updateData.tags = input.tags
  if (input.is_active !== undefined) updateData.is_active = input.is_active

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_newsletter_subscribers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logError('newsletter.updateNewsletterSubscriber', error)
    return { success: false, error: 'Błąd podczas aktualizacji odbiorcy' }
  }

  revalidatePath('/vezvision/newsletter/audiences')
  return { success: true, data: data as VVNewsletterSubscriber }
}

export async function deleteNewsletterSubscriber(id: string, csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'newsletter.subscriber.delete', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { error } = await vv.from('vv_newsletter_subscribers').delete().eq('id', id)
  if (error) {
    logError('newsletter.deleteNewsletterSubscriber', error)
    return { success: false, error: 'Błąd podczas usuwania odbiorcy' }
  }

  revalidatePath('/vezvision/newsletter/audiences')
  return { success: true, data: undefined }
}

export async function bulkUpdateSubscribers(
  ids: string[],
  input: {
    is_active?: boolean
    tags?: string[]
    addTags?: string[]
    removeTags?: string[]
  },
  csrfToken: string
): Promise<ActionResult<{ updated: number }>> {
  const guard = await guardVezVisionMutation({ action: 'newsletter.subscriber.bulk', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  if (!ids.length) return { success: false, error: 'Nie wybrano odbiorców' }

  const vv = getVezVisionPrivilegedClient()

  if (input.is_active !== undefined) {
    await vv.from('vv_newsletter_subscribers').update({ is_active: input.is_active }).in('id', ids)
  }

  if (input.addTags?.length || input.removeTags?.length) {
    const { data: subscribers } = await vv
      .from('vv_newsletter_subscribers')
      .select('id,tags')
      .in('id', ids)

    if (subscribers) {
      for (const subscriber of subscribers) {
        let newTags = subscriber.tags ?? []
        if (input.addTags?.length) {
          newTags = [...new Set([...newTags, ...input.addTags])]
        }
        if (input.removeTags?.length) {
          newTags = newTags.filter((tag: string) => !input.removeTags?.includes(tag))
        }
        await vv.from('vv_newsletter_subscribers').update({ tags: newTags }).eq('id', subscriber.id)
      }
    }
  }

  if (input.tags?.length) {
    await vv.from('vv_newsletter_subscribers').update({ tags: input.tags }).in('id', ids)
  }

  revalidatePath('/vezvision/newsletter/audiences')
  return { success: true, data: { updated: ids.length } }
}
