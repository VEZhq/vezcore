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
  VVProject,
  VVProjectImage,
  VVProjectInput,
  VVStatus,
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

async function getOrderedProjectIds(vv: VezVisionClient): Promise<ActionResult<string[]>> {
  const { data, error } = await vv
    .from('vv_projects')
    .select('id')
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    logError('portfolio getOrderedProjectIds', error)
    return { success: false, error: 'Błąd podczas pobierania kolejności projektów' }
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

async function persistProjectOrder(vv: VezVisionClient, ids: string[]): Promise<ActionResult> {
  const rows = ids.map((id, index) => ({ id, order_index: index }))
  const { error } = await vv.from('vv_projects').upsert(rows as unknown as never, { onConflict: 'id' })

  if (error) {
    logError('portfolio persistProjectOrder', error)
    return { success: false, error: 'Błąd podczas zapisywania kolejności projektów' }
  }

  return { success: true, data: undefined }
}

export async function getProjects(filters?: {
  status?: string
  search?: string
  limit?: number
}): Promise<ActionResult<VVProject[]>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.PORTFOLIO_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  let query = vv
    .from('vv_projects')
    .select('id, slug, status, order_index, cover_image, featured, title_pl, title_en, client_name, created_at')
    .order('order_index', { ascending: true })
    .limit(filters?.limit ?? DEFAULT_PAGE_LIMIT)

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.search) {
    const search = sanitizeSearchTerm(filters.search)
    if (search.length >= 2) {
      query = query.or(`title_pl.ilike.%${search}%,title_en.ilike.%${search}%,client_name.ilike.%${search}%`)
    }
  }

  const { data, error } = await query
  if (error) {
    logError('portfolio getProjects', error)
    return { success: false, error: 'Błąd podczas pobierania projektów' }
  }

  return { success: true, data: (data ?? []) as VVProject[] }
}

export async function getProject(id: string): Promise<ActionResult<VVProject>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.PORTFOLIO_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_projects')
    .select(`
      *,
      vv_project_images(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    logError('portfolio getProject', error)
    return { success: false, error: 'Projekt nie istnieje' }
  }
  if (!data) return { success: false, error: 'Projekt nie istnieje' }

  const { vv_project_images, ...project } = data as typeof data & {
    vv_project_images: VVProjectImage[]
  }

  return {
    success: true,
    data: {
      ...project,
      images: (vv_project_images ?? []).sort((a, b) => a.order_index - b.order_index),
    } as VVProject,
  }
}

export async function duplicateProject(id: string, csrfToken: string): Promise<ActionResult<VVProject>> {
  const guard = await guardVezVisionMutation({ action: 'portfolio.duplicate', csrfToken, maxRequests: 15, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.PORTFOLIO_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()

  const { data: original, error: originalError } = await vv
    .from('vv_projects')
    .select(`
      *,
      vv_project_images(*)
    `)
    .eq('id', id)
    .single()

  if (originalError || !original) {
    logError('portfolio duplicateProject.fetch', originalError)
    return { success: false, error: 'Projekt nie istnieje' }
  }

  const baseSlug = sanitizeSlug(original.slug)
  let newSlug = `${baseSlug}-kopia`
  let suffix = 2
  while (true) {
    const { data: existing } = await vv.from('vv_projects').select('id').eq('slug', newSlug).maybeSingle()
    if (!existing) break
    newSlug = `${baseSlug}-kopia-${suffix}`
    suffix++
    if (suffix > 99) return { success: false, error: 'Nie można wygenerować unikalnego sluga' }
  }

  const { vv_project_images, ...projectData } = original as typeof original & { vv_project_images: VVProjectImage[] }

  const { data: newProject, error: insertError } = await vv
    .from('vv_projects')
    .insert({
      ...projectData,
      slug: newSlug,
      status: 'draft',
      featured: false,
      order_index: (projectData.order_index ?? 0) + 1,
      created_by: auth.userId,
    })
    .select()
    .single()

  if (insertError || !newProject) {
    logError('portfolio duplicateProject.insert', insertError)
    return { success: false, error: 'Błąd podczas duplikowania projektu' }
  }

  const images = (vv_project_images ?? []) as VVProjectImage[]
  if (images.length > 0) {
    const imageInserts = images.map((img, idx) => ({
      project_id: newProject.id,
      path: img.path,
      type: img.type,
      alt_pl: img.alt_pl,
      alt_en: img.alt_en,
      order_index: idx,
    }))
    const { error: imagesError } = await vv.from('vv_project_images').insert(imageInserts)
    if (imagesError) {
      logError('portfolio duplicateProject.images', imagesError)
    }
  }

  revalidatePath('/vezvision/portfolio')
  return { success: true, data: newProject as VVProject }
}

export async function createProject(input: VVProjectInput, csrfToken: string): Promise<ActionResult<VVProject>> {
  const guard = await guardVezVisionMutation({ action: 'portfolio.create', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.PORTFOLIO_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const slug = sanitizeSlug(input.slug)
  if (!slug) return { success: false, error: 'Nieprawidłowy slug' }

  if (!isValidUrl(input.demo_url)) return { success: false, error: 'Nieprawidłowy URL demo' }
  if (!isValidUrl(input.github_url)) return { success: false, error: 'Nieprawidłowy URL GitHub' }
  if (!isValidUrl(input.cover_image)) return { success: false, error: 'Nieprawidłowy URL okładki' }

  const vv = getVezVisionPrivilegedClient()

  const { data: existing } = await vv
    .from('vv_projects')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) return { success: false, error: 'Projekt z takim slugiem już istnieje' }

  const orderTarget =
    input.order_index === undefined || Number.isNaN(input.order_index)
      ? undefined
      : Math.max(0, input.order_index)

  const insertData = {
    ...input,
    slug,
    order_index: orderTarget ?? 0,
    created_by: auth.userId,
  } as unknown as TablesInsert<'vv_projects'>

  const { data, error } = await vv
    .from('vv_projects')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    logError('portfolio createProject', error)
    return { success: false, error: 'Błąd podczas tworzenia projektu' }
  }

  const orderedIdsResult = await getOrderedProjectIds(vv)
  if (!orderedIdsResult.success) return orderedIdsResult

  const targetIndex = orderTarget ?? orderedIdsResult.data.length - 1
  const normalizedIds = normalizeOrder(orderedIdsResult.data, data.id, targetIndex)
  const orderResult = await persistProjectOrder(vv, normalizedIds)
  if (!orderResult.success) return orderResult

  revalidatePath('/vezvision/portfolio')
  return { success: true, data: data as VVProject }
}

export async function updateProject(
  id: string,
  input: Partial<VVProjectInput>,
  csrfToken: string
): Promise<ActionResult<VVProject>> {
  const guard = await guardVezVisionMutation({ action: 'portfolio.update', csrfToken, maxRequests: 30, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.PORTFOLIO_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  if (!isValidUrl(input.demo_url)) return { success: false, error: 'Nieprawidłowy URL demo' }
  if (!isValidUrl(input.github_url)) return { success: false, error: 'Nieprawidłowy URL GitHub' }
  if (!isValidUrl(input.cover_image)) return { success: false, error: 'Nieprawidłowy URL okładki' }

  const vv = getVezVisionPrivilegedClient()

  const { data: existing, error: existingError } = await vv
    .from('vv_projects')
    .select('created_by')
    .eq('id', id)
    .single()

  if (existingError || !existing) return { success: false, error: 'Projekt nie istnieje' }
  if (existing.created_by !== null && existing.created_by !== auth.userId) {
    return { success: false, error: 'Brak uprawnień do edycji tego projektu' }
  }

  const rest = { ...input }

  if (rest.slug !== undefined) {
    const slug = sanitizeSlug(rest.slug)
    if (!slug) return { success: false, error: 'Nieprawidłowy slug' }

    const { data: existing } = await vv
      .from('vv_projects')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .maybeSingle()
    if (existing) return { success: false, error: 'Projekt z takim slugiem już istnieje' }

    rest.slug = slug
  }

  const updateData: TablesUpdate<'vv_projects'> = { ...rest }

  const { data, error } = await vv
    .from('vv_projects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logError('portfolio updateProject', error)
    return { success: false, error: 'Błąd podczas zapisu projektu' }
  }

  if (rest.order_index !== undefined && !Number.isNaN(rest.order_index)) {
    const orderedIdsResult = await getOrderedProjectIds(vv)
    if (!orderedIdsResult.success) return orderedIdsResult

    const normalizedIds = normalizeOrder(orderedIdsResult.data, id, Math.max(0, rest.order_index ?? 0))
    const orderResult = await persistProjectOrder(vv, normalizedIds)
    if (!orderResult.success) return orderResult
  }

  revalidatePath('/vezvision/portfolio')
  revalidatePath(`/vezvision/portfolio/${id}`)
  return { success: true, data: data as VVProject }
}

export async function deleteProject(id: string, csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'portfolio.delete', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.PORTFOLIO_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()

  const { data: existing, error: existingError } = await vv
    .from('vv_projects')
    .select('created_by')
    .eq('id', id)
    .single()

  if (existingError || !existing) return { success: false, error: 'Projekt nie istnieje' }
  if (existing.created_by !== null && existing.created_by !== auth.userId) {
    return { success: false, error: 'Brak uprawnień do usunięcia tego projektu' }
  }

  const { error } = await vv.from('vv_projects').delete().eq('id', id)
  if (error) {
    logError('portfolio deleteProject', error)
    return { success: false, error: 'Błąd podczas usuwania projektu' }
  }

  revalidatePath('/vezvision/portfolio')
  return { success: true, data: undefined }
}

export async function reorderProjects(ids: string[], csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'portfolio.reorder', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.PORTFOLIO_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()

  const result = await persistProjectOrder(vv, ids)
  if (!result.success) return { success: false, error: 'Błąd podczas zmiany kolejności' }

  revalidatePath('/vezvision/portfolio')
  return { success: true, data: undefined }
}

export async function setProjectStatus(
  id: string,
  status: VVStatus,
  csrfToken: string
): Promise<ActionResult<VVProject>> {
  const guard = await guardVezVisionMutation({ action: 'portfolio.status', csrfToken, maxRequests: 30, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.PORTFOLIO_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_projects')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    logError('portfolio setProjectStatus', error)
    return { success: false, error: 'Błąd podczas zmiany statusu projektu' }
  }

  revalidatePath('/vezvision/portfolio')
  revalidatePath(`/vezvision/portfolio/${id}`)
  return { success: true, data: data as VVProject }
}

export async function addProjectImage(
  projectId: string,
  image: Omit<TablesInsert<'vv_project_images'>, 'project_id'>,
  csrfToken: string
): Promise<ActionResult<VVProjectImage>> {
  const guard = await guardVezVisionMutation({ action: 'portfolio.image.add', csrfToken, maxRequests: 25, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.PORTFOLIO_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_project_images')
    .insert({ ...image, project_id: projectId })
    .select()
    .single()

  if (error) {
    logError('portfolio addProjectImage', error)
    return { success: false, error: 'Błąd podczas dodawania zdjęcia' }
  }
  revalidatePath(`/vezvision/portfolio/${projectId}`)
  return { success: true, data: data as VVProjectImage }
}

export async function removeProjectImage(imageId: string, projectId: string, csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'portfolio.image.remove', csrfToken, maxRequests: 25, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.PORTFOLIO_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { error } = await vv.from('vv_project_images').delete().eq('id', imageId)
  if (error) {
    logError('portfolio removeProjectImage', error)
    return { success: false, error: 'Błąd podczas usuwania zdjęcia' }
  }

  revalidatePath(`/vezvision/portfolio/${projectId}`)
  return { success: true, data: undefined }
}
