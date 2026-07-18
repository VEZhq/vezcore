'use server'
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, MIN_PAGE_LIMIT, MAX_TITLE_LENGTH, MAX_SLUG_LENGTH, MAX_EXCERPT_LENGTH, MAX_CONTENT_LENGTH_KB, MAX_QUESTION_LENGTH, MAX_ANSWER_LENGTH_KB, MAX_CATEGORY_LENGTH, MAX_SUBJECT_LENGTH, MAX_EVENT_TITLE_LENGTH } from '@/lib/constants/pagination'
import { ONE_MINUTE } from '@/lib/constants/time'

import { getVezVisionPrivilegedClient } from '@/lib/supabase/vezvision'
import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { revalidatePath } from 'next/cache'
import type { TablesInsert, TablesUpdate } from '@/types/vezvision-db'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { sanitizeSearchTerm, sanitizeSlug } from '@/lib/vezvision-security-utils'
import { guardVezVisionMutation } from '@/lib/actions/vezvision/security'
import { logError } from '@/lib/logger'
import type {
  VVService,
  VVServiceCategory,
  VVServiceStatus,
  VVServiceInput,
  ActionResult,
} from './types'

type VezVisionClient = ReturnType<typeof getVezVisionPrivilegedClient>

function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return true
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

async function getOrderedServiceIds(vv: VezVisionClient): Promise<ActionResult<string[]>> {
  const { data, error } = await vv
    .from('vv_services')
    .select('id')
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    logError('services.getOrderedServiceIds', error)
    return { success: false, error: 'Błąd podczas pobierania kolejności usług' }
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

async function persistServiceOrder(vv: VezVisionClient, ids: string[]): Promise<ActionResult> {
  const rows = ids.map((id, index) => ({ id, order_index: index }))
  const { error } = await vv.from('vv_services').upsert(rows as unknown as never, { onConflict: 'id' })

  if (error) {
    logError('services.persistServiceOrder', error)
    return { success: false, error: 'Błąd podczas zapisywania kolejności usług' }
  }

  return { success: true, data: undefined }
}

export async function getServices(filters?: {
  status?: string
  search?: string
  limit?: number
}): Promise<ActionResult<VVService[]>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SERVICES_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  let query = vv
    .from('vv_services')
    .select('id, slug, status, order_index, icon, title_pl, title_en, short_desc_pl, short_desc_en, created_at')
    .order('order_index', { ascending: true })
    .limit(filters?.limit ?? DEFAULT_PAGE_LIMIT)

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.search) {
    const search = sanitizeSearchTerm(filters.search)
    if (search.length >= 2) {
      query = query.or(`title_pl.ilike.%${search}%,title_en.ilike.%${search}%`)
    }
  }

  const { data, error } = await query
  if (error) {
    logError('services.getServices', error)
    return { success: false, error: 'Błąd podczas pobierania usług' }
  }

  return { success: true, data: (data ?? []) as VVService[] }
}

export async function getService(id: string): Promise<ActionResult<VVService>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SERVICES_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_services')
    .select(`*, vv_service_category_assignments(category_id, vv_service_categories(*))`)
    .eq('id', id)
    .single()

  if (error) {
    logError('services.getService', error)
    return { success: false, error: 'Usługa nie istnieje' }
  }
  if (!data) return { success: false, error: 'Usługa nie istnieje' }

  const { vv_service_category_assignments, ...service } = data as typeof data & {
    vv_service_category_assignments: Array<{ vv_service_categories: VVServiceCategory }>
  }

  return {
    success: true,
    data: {
      ...service,
      categories: vv_service_category_assignments?.map((a) => a.vv_service_categories).filter(Boolean) ?? [],
    } as VVService,
  }
}

export async function createService(input: VVServiceInput, csrfToken: string): Promise<ActionResult<VVService>> {
  const guard = await guardVezVisionMutation({ action: 'services.create', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SERVICES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const slug = sanitizeSlug(input.slug)
  if (!slug) return { success: false, error: 'Nieprawidłowy slug' }

  if (!isValidUrl(input.image_url)) return { success: false, error: 'Nieprawidłowy URL obrazka' }

  if (input.price !== undefined && input.price !== null && (isNaN(input.price) || input.price < 0)) {
    return { success: false, error: 'Nieprawidłowa cena' }
  }

  const vv = getVezVisionPrivilegedClient()

  const { data: existing } = await vv
    .from('vv_services')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) return { success: false, error: 'Usługa z takim slugiem już istnieje' }

  const { category_ids, ...serviceData } = input

  const orderTarget =
    input.order_index === undefined || Number.isNaN(input.order_index)
      ? undefined
      : Math.max(0, input.order_index)

  const insertData: TablesInsert<'vv_services'> = {
    ...serviceData,
    slug,
    order_index: orderTarget ?? 0,
    created_by: auth.userId,
  }

  const { data, error } = await vv
    .from('vv_services')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    logError('services.createService', error)
    return { success: false, error: 'Błąd podczas tworzenia usługi' }
  }

  if (category_ids?.length) {
    await vv.from('vv_service_category_assignments').insert(
      category_ids.map((category_id) => ({ service_id: data.id, category_id }))
    )
  }

  const orderedIdsResult = await getOrderedServiceIds(vv)
  if (!orderedIdsResult.success) return orderedIdsResult

  const targetIndex = orderTarget ?? orderedIdsResult.data.length - 1
  const normalizedIds = normalizeOrder(orderedIdsResult.data, data.id, targetIndex)
  const orderResult = await persistServiceOrder(vv, normalizedIds)
  if (!orderResult.success) return orderResult

  revalidatePath('/vezvision/services')
  return { success: true, data: data as VVService }
}

export async function updateService(
  id: string,
  input: Partial<VVServiceInput>,
  csrfToken: string
): Promise<ActionResult<VVService>> {
  const guard = await guardVezVisionMutation({ action: 'services.update', csrfToken, maxRequests: 30, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SERVICES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  if (!isValidUrl(input.image_url)) return { success: false, error: 'Nieprawidłowy URL obrazka' }

  if (input.price !== undefined && input.price !== null && (isNaN(input.price) || input.price < 0)) {
    return { success: false, error: 'Nieprawidłowa cena' }
  }

  const vv = getVezVisionPrivilegedClient()
  const { data: currentService, error: currentServiceError } = await vv
    .from('vv_services')
    .select('id, order_index, created_by')
    .eq('id', id)
    .single()

  if (currentServiceError || !currentService) {
    logError('services.updateService.currentService', currentServiceError)
    return { success: false, error: 'Usługa nie istnieje' }
  }

  if (currentService.created_by !== null && currentService.created_by !== auth.userId) {
    return { success: false, error: 'Brak uprawnień do edycji tej usługi' }
  }

  const { category_ids, ...rest } = input

  if (rest.slug !== undefined) {
    const slug = sanitizeSlug(rest.slug)
    if (!slug) return { success: false, error: 'Nieprawidłowy slug' }

    const { data: existing } = await vv
      .from('vv_services')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .maybeSingle()
    if (existing) return { success: false, error: 'Usługa z takim slugiem już istnieje' }

    rest.slug = slug
  }

  const updateData: TablesUpdate<'vv_services'> = { ...rest }

  const { data, error } = await vv
    .from('vv_services')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logError('services.updateService', error)
    return { success: false, error: 'Błąd podczas zapisu usługi' }
  }

  if (category_ids !== undefined) {
    await vv.from('vv_service_category_assignments').delete().eq('service_id', id)
    if (category_ids.length) {
      await vv.from('vv_service_category_assignments').insert(
        category_ids.map((category_id) => ({ service_id: id, category_id }))
      )
    }
  }

  if (input.order_index !== undefined && !Number.isNaN(input.order_index)) {
    const orderedIdsResult = await getOrderedServiceIds(vv)
    if (!orderedIdsResult.success) return orderedIdsResult

    const normalizedIds = normalizeOrder(orderedIdsResult.data, id, Math.max(0, input.order_index))
    const orderResult = await persistServiceOrder(vv, normalizedIds)
    if (!orderResult.success) return orderResult
  }

  revalidatePath('/vezvision/services')
  revalidatePath(`/vezvision/services/${id}`)
  return { success: true, data: data as VVService }
}

export async function duplicateService(id: string, csrfToken: string): Promise<ActionResult<VVService>> {
  const guard = await guardVezVisionMutation({ action: 'services.duplicate', csrfToken, maxRequests: 15, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SERVICES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()

  const { data: original, error: originalError } = await vv
    .from('vv_services')
    .select(`*, vv_service_category_assignments(category_id)`)
    .eq('id', id)
    .single()

  if (originalError || !original) {
    logError('services.duplicateService.fetch', originalError)
    return { success: false, error: 'Usługa nie istnieje' }
  }

  const baseSlug = sanitizeSlug(original.slug)
  let newSlug = `${baseSlug}-kopia`
  let suffix = 2
  while (true) {
    const { data: existing } = await vv.from('vv_services').select('id').eq('slug', newSlug).maybeSingle()
    if (!existing) break
    newSlug = `${baseSlug}-kopia-${suffix}`
    suffix++
    if (suffix > 99) return { success: false, error: 'Nie można wygenerować unikalnego sluga' }
  }

  const { id: _id, created_at, updated_at, vv_service_category_assignments, ...serviceData } = original as typeof original & { vv_service_category_assignments: Array<{ category_id: string }> }

  const { data: newService, error: insertError } = await vv
    .from('vv_services')
    .insert({
      ...serviceData,
      slug: newSlug,
      status: 'draft',
      order_index: (serviceData.order_index ?? 0) + 1,
      created_by: auth.userId,
    })
    .select()
    .single()

  if (insertError || !newService) {
    logError('services.duplicateService.insert', insertError)
    return { success: false, error: 'Błąd podczas duplikowania usługi' }
  }

  const categoryIds = (vv_service_category_assignments ?? []).map((a) => a.category_id)
  if (categoryIds.length > 0) {
    await vv.from('vv_service_category_assignments').insert(
      categoryIds.map((category_id) => ({ service_id: newService.id, category_id }))
    )
  }

  revalidatePath('/vezvision/services')
  return { success: true, data: newService as VVService }
}

export async function deleteService(id: string, csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'services.delete', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SERVICES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data: currentService, error: fetchError } = await vv
    .from('vv_services')
    .select('created_by')
    .eq('id', id)
    .single()

  if (fetchError || !currentService) {
    logError('services.deleteService.fetch', fetchError)
    return { success: false, error: 'Usługa nie istnieje' }
  }

  if (currentService.created_by !== null && currentService.created_by !== auth.userId) {
    return { success: false, error: 'Brak uprawnień do usunięcia tej usługi' }
  }

  const { error } = await vv.from('vv_services').delete().eq('id', id)
  if (error) {
    logError('services.deleteService', error)
    return { success: false, error: 'Błąd podczas usuwania usługi' }
  }

  revalidatePath('/vezvision/services')
  return { success: true, data: undefined }
}

export async function reorderServices(ids: string[], csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'services.reorder', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SERVICES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const result = await persistServiceOrder(vv, ids)
  if (!result.success) return { success: false, error: 'Błąd podczas zmiany kolejności' }

  revalidatePath('/vezvision/services')
  return { success: true, data: undefined }
}

export async function setServiceStatus(
  id: string,
  status: VVServiceStatus,
  csrfToken: string
): Promise<ActionResult<VVService>> {
  const guard = await guardVezVisionMutation({ action: 'services.status', csrfToken, maxRequests: 30, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SERVICES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_services')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    logError('services.setServiceStatus', error)
    return { success: false, error: 'Błąd podczas zmiany statusu usługi' }
  }

  revalidatePath('/vezvision/services')
  revalidatePath(`/vezvision/services/${id}`)
  return { success: true, data: data as VVService }
}

export async function getServiceCategories(): Promise<ActionResult<VVServiceCategory[]>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SERVICES_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_service_categories')
    .select('id, slug, name_pl, name_en, order_index, created_at')
    .order('order_index')

  if (error) {
    logError('services.getServiceCategories', error)
    return { success: false, error: 'Błąd podczas pobierania kategorii' }
  }
  return { success: true, data: (data ?? []) as VVServiceCategory[] }
}

export async function createServiceCategory(
  input: TablesInsert<'vv_service_categories'>,
  csrfToken: string
): Promise<ActionResult<VVServiceCategory>> {
  const guard = await guardVezVisionMutation({ action: 'services.category.create', csrfToken, maxRequests: 15, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SERVICES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_service_categories')
    .insert(input)
    .select()
    .single()

  if (error) {
    logError('services.createServiceCategory', error)
    return { success: false, error: 'Błąd podczas tworzenia kategorii' }
  }
  revalidatePath('/vezvision/services')
  return { success: true, data: data as VVServiceCategory }
}

export async function deleteServiceCategory(id: string, csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'services.category.delete', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SERVICES_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { error } = await vv.from('vv_service_categories').delete().eq('id', id)
  if (error) {
    logError('services.deleteServiceCategory', error)
    return { success: false, error: 'Błąd podczas usuwania kategorii' }
  }

  revalidatePath('/vezvision/services')
  return { success: true, data: undefined }
}
