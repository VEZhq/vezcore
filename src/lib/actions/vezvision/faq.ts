'use server'
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, MIN_PAGE_LIMIT, MAX_TITLE_LENGTH, MAX_SLUG_LENGTH, MAX_EXCERPT_LENGTH, MAX_CONTENT_LENGTH_KB, MAX_QUESTION_LENGTH, MAX_ANSWER_LENGTH_KB, MAX_CATEGORY_LENGTH, MAX_SUBJECT_LENGTH, MAX_EVENT_TITLE_LENGTH } from '@/lib/constants/pagination'
import { ONE_MINUTE } from '@/lib/constants/time'

import { revalidatePath } from 'next/cache'
import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { getVezVisionPrivilegedClient } from '@/lib/supabase/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { guardVezVisionMutation } from '@/lib/actions/vezvision/security'
import { sanitizeSearchTerm } from '@/lib/vezvision-security-utils'
import { logError } from '@/lib/logger'
import type { TablesInsert, TablesUpdate } from '@/types/vezvision-db'
import type {
  ActionResult,
  VVFaqCategory,
  VVFaqCategoryInput,
  VVFaqItem,
  VVFaqItemInput,
} from './types'

type VezVisionClient = ReturnType<typeof getVezVisionPrivilegedClient>

const FAQ_LIMITS = {
  question: 500,
  answer: 50 * 1024,
} as const

function validateFaqInput(input: { question_pl?: string; question_en?: string | null; answer_pl?: string; answer_en?: string | null }): string | null {
  if (input.question_pl && input.question_pl.length > FAQ_LIMITS.question) return `Pytanie PL przekracza ${FAQ_LIMITS.question} znaków`
  if (input.question_en && input.question_en.length > FAQ_LIMITS.question) return `Pytanie EN przekracza ${FAQ_LIMITS.question} znaków`
  if (input.answer_pl && input.answer_pl.length > FAQ_LIMITS.answer) return `Odpowiedź PL przekracza ${FAQ_LIMITS.answer / 1024}KB`
  if (input.answer_en && input.answer_en.length > FAQ_LIMITS.answer) return `Odpowiedź EN przekracza ${FAQ_LIMITS.answer / 1024}KB`
  return null
}

function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function getOrderedFaqItemIds(vv: VezVisionClient): Promise<ActionResult<string[]>> {
  const { data, error } = await vv
    .from('vv_faq_items')
    .select('id')
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    logError('faq getOrderedFaqItemIds', error)
    return { success: false, error: 'Błąd podczas pobierania kolejności FAQ' }
  }

  return { success: true, data: (data ?? []).map((row) => row.id) }
}

function clampOrderIndex(target: number, max: number): number {
  if (target < 0) return 0
  if (target > max) return max
  return target
}

function normalizeOrder(ids: string[], movedId: string, targetIndex: number): string[] {
  const withoutMoved = ids.filter((id) => id !== movedId)
  const clampedIndex = clampOrderIndex(targetIndex, withoutMoved.length)
  withoutMoved.splice(clampedIndex, 0, movedId)
  return withoutMoved
}

async function persistFaqOrder(vv: VezVisionClient, ids: string[]): Promise<ActionResult> {
  type OrderRow = { id: string; order_index: number }
  const rows: OrderRow[] = ids.map((id, index) => ({ id, order_index: index }))
  const { error } = await (vv.from('vv_faq_items') as unknown as { upsert(v: OrderRow[], o: { onConflict: string }): Promise<{ error: unknown }> }).upsert(rows, { onConflict: 'id' })

  if (error) {
    logError('faq persistFaqOrder', error)
    return { success: false, error: 'Błąd podczas zapisywania kolejności FAQ' }
  }

  return { success: true, data: undefined }
}

export async function getFaqCategories(filters?: {
  activeOnly?: boolean
  search?: string
}): Promise<ActionResult<VVFaqCategory[]>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FAQ_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  let query = vv.from('vv_faq_categories').select('id, slug, name_pl, name_en, order_index, is_active, created_by, created_at').order('order_index', { ascending: true })

  if (filters?.activeOnly) query = query.eq('is_active', true)
  if (filters?.search) {
    const search = sanitizeSearchTerm(filters.search)
    if (search.length >= 2) {
      query = query.or(`name_pl.ilike.%${search}%,name_en.ilike.%${search}%`)
    }
  }

  const { data, error } = await query
  if (error) {
    logError('faq getFaqCategories', error)
    return { success: false, error: 'Błąd podczas pobierania kategorii FAQ' }
  }

  return { success: true, data: (data ?? []) as VVFaqCategory[] }
}

export async function createFaqCategory(
  input: VVFaqCategoryInput,
  csrfToken: string
): Promise<ActionResult<VVFaqCategory>> {
  const guard = await guardVezVisionMutation({ action: 'faq.category.create', csrfToken, maxRequests: 15, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FAQ_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const slug = sanitizeSlug(input.slug)
  if (!slug) return { success: false, error: 'Nieprawidłowy slug kategorii FAQ' }

  const vv = getVezVisionPrivilegedClient()
  const { data: existing } = await vv.from('vv_faq_categories').select('id').eq('slug', slug).maybeSingle()
  if (existing) return { success: false, error: 'Kategoria FAQ z takim slugiem już istnieje' }

  const insertData: TablesInsert<'vv_faq_categories'> = {
    slug,
    name_pl: input.name_pl,
    name_en: input.name_en ?? null,
    order_index: input.order_index ?? 0,
    is_active: input.is_active ?? true,
    created_by: auth.userId,
  }

  const { data, error } = await vv.from('vv_faq_categories').insert(insertData).select('id, slug, name_pl, name_en, order_index, is_active, created_at, created_by').single()
  if (error) {
    logError('faq createFaqCategory', error)
    return { success: false, error: 'Błąd podczas tworzenia kategorii FAQ' }
  }

  revalidatePath('/vezvision/faq')
  return { success: true, data: data as VVFaqCategory }
}

export async function updateFaqCategory(
  id: string,
  input: Partial<VVFaqCategoryInput>,
  csrfToken: string
): Promise<ActionResult<VVFaqCategory>> {
  const guard = await guardVezVisionMutation({ action: 'faq.category.update', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FAQ_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data: currentCategory, error: fetchError } = await vv
    .from('vv_faq_categories')
    .select('created_by')
    .eq('id', id)
    .single()

  if (fetchError || !currentCategory) {
    logError('faq updateFaqCategory.fetch', fetchError)
    return { success: false, error: 'Kategoria FAQ nie istnieje' }
  }

  if (currentCategory.created_by !== null && currentCategory.created_by !== auth.userId) {
    return { success: false, error: 'Brak uprawnień do edycji tej kategorii FAQ' }
  }

  const updateData: TablesUpdate<'vv_faq_categories'> = {}

  if (input.slug !== undefined) {
    const slug = sanitizeSlug(input.slug)
    if (!slug) return { success: false, error: 'Nieprawidłowy slug kategorii FAQ' }
    const { data: existing } = await vv
      .from('vv_faq_categories')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .maybeSingle()
    if (existing) return { success: false, error: 'Kategoria FAQ z takim slugiem już istnieje' }
    updateData.slug = slug
  }

  if (input.name_pl !== undefined) updateData.name_pl = input.name_pl
  if (input.name_en !== undefined) updateData.name_en = input.name_en ?? null
  if (input.order_index !== undefined) updateData.order_index = input.order_index
  if (input.is_active !== undefined) updateData.is_active = input.is_active

  const { data, error } = await vv.from('vv_faq_categories').update(updateData).eq('id', id).select('id, slug, name_pl, name_en, order_index, is_active, created_at, created_by').single()
  if (error) {
    logError('faq updateFaqCategory', error)
    return { success: false, error: 'Błąd podczas zapisu kategorii FAQ' }
  }

  revalidatePath('/vezvision/faq')
  return { success: true, data: data as VVFaqCategory }
}

export async function deleteFaqCategory(id: string, csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'faq.category.delete', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FAQ_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data: currentCategory, error: fetchError } = await vv
    .from('vv_faq_categories')
    .select('created_by')
    .eq('id', id)
    .single()

  if (fetchError || !currentCategory) {
    logError('faq deleteFaqCategory.fetch', fetchError)
    return { success: false, error: 'Kategoria FAQ nie istnieje' }
  }

  if (currentCategory.created_by !== null && currentCategory.created_by !== auth.userId) {
    return { success: false, error: 'Brak uprawnień do usunięcia tej kategorii FAQ' }
  }

  const { error } = await vv.from('vv_faq_categories').delete().eq('id', id)
  if (error) {
    logError('faq deleteFaqCategory', error)
    return { success: false, error: 'Błąd podczas usuwania kategorii FAQ' }
  }

  revalidatePath('/vezvision/faq')
  return { success: true, data: undefined }
}

export async function getFaqItems(filters?: {
  activeOnly?: boolean
  categoryId?: string
  search?: string
  limit?: number
}): Promise<ActionResult<VVFaqItem[]>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FAQ_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  let query = vv
    .from('vv_faq_items')
    .select('id, category_id, question_pl, question_en, answer_pl, answer_en, order_index, is_active, created_at')
    .order('order_index', { ascending: true })
    .limit(filters?.limit ?? DEFAULT_PAGE_LIMIT)

  if (filters?.activeOnly) query = query.eq('is_active', true)
  if (filters?.categoryId) query = query.eq('category_id', filters.categoryId)
  if (filters?.search) {
    const search = sanitizeSearchTerm(filters.search)
    if (search.length >= 2) {
      query = query.or(`question_pl.ilike.%${search}%,question_en.ilike.%${search}%`)
    }
  }

  const { data, error } = await query
  if (error) {
    logError('faq getFaqItems', error)
    return { success: false, error: 'Błąd podczas pobierania FAQ' }
  }

  return { success: true, data: (data ?? []) as VVFaqItem[] }
}

export async function getFaqItem(id: string): Promise<ActionResult<VVFaqItem>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FAQ_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_faq_items')
    .select('*, vv_faq_categories(*)')
    .eq('id', id)
    .single()

  if (error || !data) {
    logError('faq getFaqItem', error)
    return { success: false, error: 'Wpis FAQ nie istnieje' }
  }

  const { vv_faq_categories, ...item } = data as typeof data & { vv_faq_categories: VVFaqCategory | null }
  return {
    success: true,
    data: {
      ...item,
      category: vv_faq_categories,
    } as VVFaqItem,
  }
}

export async function createFaqItem(input: VVFaqItemInput, csrfToken: string): Promise<ActionResult<VVFaqItem>> {
  const guard = await guardVezVisionMutation({ action: 'faq.item.create', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FAQ_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  if (!input.question_pl.trim() || !input.answer_pl.trim()) {
    return { success: false, error: 'Pytanie i odpowiedź PL są wymagane' }
  }

  const lengthError = validateFaqInput(input)
  if (lengthError) return { success: false, error: lengthError }

  const vv = getVezVisionPrivilegedClient()
  const orderTarget =
    input.order_index === undefined || Number.isNaN(input.order_index)
      ? undefined
      : Math.max(0, input.order_index)

  const insertData: TablesInsert<'vv_faq_items'> = {
    category_id: input.category_id ?? null,
    question_pl: input.question_pl,
    question_en: input.question_en ?? null,
    answer_pl: input.answer_pl,
    answer_en: input.answer_en ?? null,
    order_index: orderTarget ?? 0,
    is_active: input.is_active ?? true,
    created_by: auth.userId,
  }

  const { data, error } = await vv.from('vv_faq_items').insert(insertData).select('id, category_id, question_pl, question_en, answer_pl, answer_en, order_index, is_active, created_at, created_by').single()
  if (error) {
    logError('faq createFaqItem', error)
    return { success: false, error: 'Błąd podczas tworzenia wpisu FAQ' }
  }

  const orderedIdsResult = await getOrderedFaqItemIds(vv)
  if (!orderedIdsResult.success) return orderedIdsResult

  const targetIndex = orderTarget ?? orderedIdsResult.data.length - 1
  const normalizedIds = normalizeOrder(orderedIdsResult.data, data.id, targetIndex)
  const orderResult = await persistFaqOrder(vv, normalizedIds)
  if (!orderResult.success) return orderResult

  revalidatePath('/vezvision/faq')
  return { success: true, data: data as VVFaqItem }
}

export async function updateFaqItem(
  id: string,
  input: Partial<VVFaqItemInput>,
  csrfToken: string
): Promise<ActionResult<VVFaqItem>> {
  const guard = await guardVezVisionMutation({ action: 'faq.item.update', csrfToken, maxRequests: 30, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FAQ_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const lengthError = validateFaqInput(input)
  if (lengthError) return { success: false, error: lengthError }

  const vv = getVezVisionPrivilegedClient()
  const { data: currentItem, error: fetchError } = await vv
    .from('vv_faq_items')
    .select('created_by')
    .eq('id', id)
    .single()

  if (fetchError || !currentItem) {
    logError('faq updateFaqItem.fetch', fetchError)
    return { success: false, error: 'Wpis FAQ nie istnieje' }
  }

  if (currentItem.created_by !== null && currentItem.created_by !== auth.userId) {
    return { success: false, error: 'Brak uprawnień do edycji tego wpisu FAQ' }
  }

  const updateData: TablesUpdate<'vv_faq_items'> = {}

  if (input.category_id !== undefined) updateData.category_id = input.category_id ?? null
  if (input.question_pl !== undefined) updateData.question_pl = input.question_pl
  if (input.question_en !== undefined) updateData.question_en = input.question_en ?? null
  if (input.answer_pl !== undefined) updateData.answer_pl = input.answer_pl
  if (input.answer_en !== undefined) updateData.answer_en = input.answer_en ?? null
  if (input.order_index !== undefined) updateData.order_index = input.order_index
  if (input.is_active !== undefined) updateData.is_active = input.is_active

  const { data, error } = await vv.from('vv_faq_items').update(updateData).eq('id', id).select('id, category_id, question_pl, question_en, answer_pl, answer_en, order_index, is_active, created_at, created_by').single()
  if (error) {
    logError('faq updateFaqItem', error)
    return { success: false, error: 'Błąd podczas zapisu wpisu FAQ' }
  }

  if (input.order_index !== undefined && !Number.isNaN(input.order_index)) {
    const orderedIdsResult = await getOrderedFaqItemIds(vv)
    if (!orderedIdsResult.success) return orderedIdsResult

    const normalizedIds = normalizeOrder(orderedIdsResult.data, id, Math.max(0, input.order_index))
    const orderResult = await persistFaqOrder(vv, normalizedIds)
    if (!orderResult.success) return orderResult
  }

  revalidatePath('/vezvision/faq')
  revalidatePath(`/vezvision/faq/${id}`)
  return { success: true, data: data as VVFaqItem }
}

export async function reorderFaqItems(ids: string[], csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'faq.reorder', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FAQ_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const result = await persistFaqOrder(vv, ids)
  if (!result.success) return { success: false, error: 'Błąd podczas zmiany kolejności' }

  revalidatePath('/vezvision/faq')
  return { success: true, data: undefined }
}

export async function duplicateFaqItem(id: string, csrfToken: string): Promise<ActionResult<VVFaqItem>> {
  const guard = await guardVezVisionMutation({ action: 'faq.duplicate', csrfToken, maxRequests: 15, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FAQ_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()

  const { data: original, error: originalError } = await vv
    .from('vv_faq_items')
    .select('id, category_id, question_pl, question_en, answer_pl, answer_en, order_index, is_active, created_by, created_at, updated_at')
    .eq('id', id)
    .single()

  if (originalError || !original) {
    logError('faq duplicateFaqItem.fetch', originalError)
    return { success: false, error: 'Wpis FAQ nie istnieje' }
  }

  const { id: _id, created_at, updated_at, ...itemData } = original as typeof original

  const { data: newItem, error: insertError } = await vv
    .from('vv_faq_items')
    .insert({
      ...itemData,
      question_pl: `${itemData.question_pl} (kopia)`,
      is_active: false,
      order_index: (itemData.order_index ?? 0) + 1,
    })
    .select()
    .single()

  if (insertError || !newItem) {
    logError('faq duplicateFaqItem.insert', insertError)
    return { success: false, error: 'Błąd podczas duplikowania wpisu FAQ' }
  }

  revalidatePath('/vezvision/faq')
  return { success: true, data: newItem as VVFaqItem }
}

export async function deleteFaqItem(id: string, csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'faq.item.delete', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FAQ_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data: currentItem, error: fetchError } = await vv
    .from('vv_faq_items')
    .select('created_by')
    .eq('id', id)
    .single()

  if (fetchError || !currentItem) {
    logError('faq deleteFaqItem.fetch', fetchError)
    return { success: false, error: 'Wpis FAQ nie istnieje' }
  }

  if (currentItem.created_by !== null && currentItem.created_by !== auth.userId) {
    return { success: false, error: 'Brak uprawnień do usunięcia tego wpisu FAQ' }
  }

  const { error } = await vv.from('vv_faq_items').delete().eq('id', id)
  if (error) {
    logError('faq deleteFaqItem', error)
    return { success: false, error: 'Błąd podczas usuwania wpisu FAQ' }
  }

  revalidatePath('/vezvision/faq')
  return { success: true, data: undefined }
}

export async function setFaqItemStatus(
  id: string,
  isActive: boolean,
  csrfToken: string
): Promise<ActionResult<VVFaqItem>> {
  const guard = await guardVezVisionMutation({ action: 'faq.item.status', csrfToken, maxRequests: 30, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.FAQ_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_faq_items')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    logError('faq setFaqItemStatus', error)
    return { success: false, error: 'Błąd podczas zmiany statusu FAQ' }
  }

  revalidatePath('/vezvision/faq')
  revalidatePath(`/vezvision/faq/${id}`)
  return { success: true, data: data as VVFaqItem }
}
