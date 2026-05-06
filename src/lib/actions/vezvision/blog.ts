'use server'
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, MIN_PAGE_LIMIT, MAX_TITLE_LENGTH, MAX_SLUG_LENGTH, MAX_EXCERPT_LENGTH, MAX_CONTENT_LENGTH_KB, MAX_QUESTION_LENGTH, MAX_ANSWER_LENGTH_KB, MAX_CATEGORY_LENGTH, MAX_SUBJECT_LENGTH, MAX_EVENT_TITLE_LENGTH } from '@/lib/constants/pagination'
import { ONE_MINUTE } from '@/lib/constants/time'

import { getVezVisionPrivilegedClient } from '@/lib/supabase/vezvision'
import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { revalidatePath } from 'next/cache'
import type { TablesInsert, TablesUpdate } from '@/types/vezvision-db'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { sanitizeSearchTerm, sanitizeVezVisionHtml } from '@/lib/vezvision-security-utils'
import { guardVezVisionMutation } from '@/lib/actions/vezvision/security'
import { logError } from '@/lib/logger'
import type {
  VVBlogPost,
  VVBlogCategory,
  VVBlogPostInput,
  ActionResult,
} from './types'

function calcReadingTime(content: string): number {
  return Math.max(1, Math.round(content.trim().split(/\s+/).length / 200))
}

function normalizeReadingTime(value: number | undefined): number | null {
  if (value === undefined) return null
  if (!Number.isFinite(value)) return null
  const normalized = Math.round(value)
  if (normalized < 1 || normalized > 999) return null
  return normalized
}

const VALID_STATUSES = ['draft', 'published', 'archived', 'scheduled'] as const
type ValidStatus = typeof VALID_STATUSES[number]

function isValidStatus(status: string | undefined): status is ValidStatus | undefined {
  return status === undefined || VALID_STATUSES.includes(status as ValidStatus)
}

const BLOG_LIMITS = {
  title: MAX_TITLE_LENGTH,
  slug: MAX_SLUG_LENGTH,
  content: MAX_CONTENT_LENGTH_KB * 1024,
  excerpt: MAX_EXCERPT_LENGTH,
} as const

function validateBlogInput(input: { title_pl?: string; title_en?: string | null; slug?: string; content_pl?: string; content_en?: string | null; excerpt_pl?: string | null; excerpt_en?: string | null; reading_time?: number; status?: VVBlogPostInput['status']; scheduled_for?: string | null }): string | null {
  if (input.title_pl && input.title_pl.length > BLOG_LIMITS.title) return `Tytuł PL przekracza ${BLOG_LIMITS.title} znaków`
  if (input.title_en && input.title_en.length > BLOG_LIMITS.title) return `Tytuł EN przekracza ${BLOG_LIMITS.title} znaków`
  if (input.slug && input.slug.length > BLOG_LIMITS.slug) return `Slug przekracza ${BLOG_LIMITS.slug} znaków`
  if (input.content_pl && input.content_pl.length > BLOG_LIMITS.content) return `Treść PL przekracza ${BLOG_LIMITS.content / 1024}KB`
  if (input.content_en && input.content_en.length > BLOG_LIMITS.content) return `Treść EN przekracza ${BLOG_LIMITS.content / 1024}KB`
  if (input.excerpt_pl && input.excerpt_pl.length > BLOG_LIMITS.excerpt) return `Wstęp PL przekracza ${BLOG_LIMITS.excerpt} znaków`
  if (input.excerpt_en && input.excerpt_en.length > BLOG_LIMITS.excerpt) return `Wstęp EN przekracza ${BLOG_LIMITS.excerpt} znaków`
  if (input.reading_time !== undefined && normalizeReadingTime(input.reading_time) === null) return 'Czas czytania musi być liczbą od 1 do 999'
  if (input.status === 'scheduled') {
    if (!input.scheduled_for) return 'Data publikacji jest wymagana dla zaplanowanego posta'
    if (new Date(input.scheduled_for) <= new Date()) return 'Data publikacji musi być w przyszłości'
  }
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

function hasTextContent(html: string | null | undefined): boolean {
  return Boolean(html?.replace(/<[^>]+>/g, ' ').trim())
}

function validatePublishFields(post: { title_pl?: string | null; slug?: string | null; content_pl?: string | null }): string | null {
  if (!post.title_pl?.trim()) return 'Tytuł PL jest wymagany przed publikacją'
  if (!post.slug?.trim()) return 'Slug jest wymagany przed publikacją'
  if (!hasTextContent(post.content_pl)) return 'Treść PL jest wymagana przed publikacją'
  return null
}

export async function getBlogPosts(filters?: {
  status?: string
  search?: string
  limit?: number
}): Promise<ActionResult<VVBlogPost[]>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.BLOG_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  let query = vv
    .from('vv_blog_posts')
    .select(`*, vv_blog_post_categories(category_id, is_primary, vv_blog_categories(*))`)
    .order('created_at', { ascending: false })
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
    logError('blog getBlogPosts', error)
    return { success: false, error: 'Błąd podczas pobierania postów' }
  }

  const posts = (data ?? []).map((row) => {
    const { vv_blog_post_categories, ...post } = row as typeof row & {
      vv_blog_post_categories: Array<{ vv_blog_categories: VVBlogCategory }>
    }
    return {
      ...post,
      categories: vv_blog_post_categories?.map((pc) => pc.vv_blog_categories).filter(Boolean) ?? [],
    } as VVBlogPost
  })

  return { success: true, data: posts }
}

export async function getBlogPost(id: string): Promise<ActionResult<VVBlogPost>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.BLOG_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_blog_posts')
    .select(`*, vv_blog_post_categories(category_id, is_primary, vv_blog_categories(*))`)
    .eq('id', id)
    .single()

  if (error) {
    logError('blog getBlogPost', error)
    return { success: false, error: 'Post nie istnieje' }
  }
  if (!data) return { success: false, error: 'Post nie istnieje' }

  const { vv_blog_post_categories, ...post } = data as typeof data & {
    vv_blog_post_categories: Array<{ vv_blog_categories: VVBlogCategory }>
  }
  return {
    success: true,
    data: {
      ...post,
      categories: vv_blog_post_categories?.map((pc) => pc.vv_blog_categories).filter(Boolean) ?? [],
    } as VVBlogPost,
  }
}

export async function createBlogPost(input: VVBlogPostInput, csrfToken: string): Promise<ActionResult<VVBlogPost>> {
  const guard = await guardVezVisionMutation({ action: 'blog.create', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.BLOG_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  if (!isValidStatus(input.status)) return { success: false, error: 'Nieprawidłowy status' }
  if (input.status === 'published' || input.status === 'scheduled') {
    const publishError = validatePublishFields(input)
    if (publishError) return { success: false, error: publishError }
    const publishAuth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.BLOG_PUBLISH)
    if ('error' in publishAuth) return { success: false, error: publishAuth.error }
  }

  const lengthError = validateBlogInput(input)
  if (lengthError) return { success: false, error: lengthError }

  const slug = sanitizeSlug(input.slug)
  if (!slug) return { success: false, error: 'Nieprawidłowy slug' }

  const vv = getVezVisionPrivilegedClient()

  const { data: existing } = await vv
    .from('vv_blog_posts')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) return { success: false, error: 'Post z takim slugiem już istnieje' }

  const { category_ids, ...postData } = input

  const insertData = {
    ...postData,
    slug,
    content_pl: sanitizeVezVisionHtml(postData.content_pl),
    content_en: postData.content_en ? sanitizeVezVisionHtml(postData.content_en) : null,
    reading_time: normalizeReadingTime(postData.reading_time) ?? calcReadingTime(postData.content_pl),
    created_by: auth.userId,
  } as unknown as TablesInsert<'vv_blog_posts'>

  const { data, error } = await vv
    .from('vv_blog_posts')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    logError('blog createBlogPost', error)
    return { success: false, error: 'Błąd podczas tworzenia posta' }
  }

  if (category_ids?.length) {
    await vv.from('vv_blog_post_categories').insert(
      category_ids.map((category_id, i) => ({
        post_id: data.id,
        category_id,
        is_primary: i === 0,
      }))
    )
  }

  revalidatePath('/vezvision/blog')
  return { success: true, data: data as VVBlogPost }
}

export async function updateBlogPost(
  id: string,
  input: Partial<VVBlogPostInput>,
  csrfToken: string
): Promise<ActionResult<VVBlogPost>> {
  const guard = await guardVezVisionMutation({ action: 'blog.update', csrfToken, maxRequests: 30, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.BLOG_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const { category_ids, ...rest } = input
  const lengthError = validateBlogInput(rest)
  if (lengthError) return { success: false, error: lengthError }

  if (!isValidStatus(rest.status)) return { success: false, error: 'Nieprawidłowy status' }

  const vv = getVezVisionPrivilegedClient()

  const { data: currentPost, error: currentPostError } = await vv
    .from('vv_blog_posts')
    .select('status, title_pl, slug, content_pl, created_by')
    .eq('id', id)
    .single()

  if (currentPostError || !currentPost) return { success: false, error: 'Post nie istnieje' }
  if (currentPost.created_by !== null && currentPost.created_by !== auth.userId) {
    return { success: false, error: 'Brak uprawnień do edycji tego posta' }
  }

  if (rest.status === 'published' || rest.status === 'scheduled') {
    const publishError = validatePublishFields({
      title_pl: rest.title_pl ?? currentPost.title_pl,
      slug: rest.slug ?? currentPost.slug,
      content_pl: rest.content_pl ?? currentPost.content_pl,
    })
    if (publishError) return { success: false, error: publishError }

    const publishAuth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.BLOG_PUBLISH)
    if ('error' in publishAuth) return { success: false, error: publishAuth.error }
  }

  if (rest.slug !== undefined) {
    const slug = sanitizeSlug(rest.slug)
    if (!slug) return { success: false, error: 'Nieprawidłowy slug' }

    const { data: existing } = await vv
      .from('vv_blog_posts')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .maybeSingle()
    if (existing) return { success: false, error: 'Post z takim slugiem już istnieje' }

    rest.slug = slug
  }

  const updateData: TablesUpdate<'vv_blog_posts'> = { ...rest }
  if (rest.content_pl !== undefined) {
    updateData.content_pl = sanitizeVezVisionHtml(rest.content_pl)
  }
  if (rest.content_en !== undefined) {
    updateData.content_en = rest.content_en ? sanitizeVezVisionHtml(rest.content_en) : null
  }
  if (rest.reading_time !== undefined) {
    const readingTime = normalizeReadingTime(rest.reading_time)
    if (readingTime === null) return { success: false, error: 'Czas czytania musi być liczbą od 1 do 999' }
    updateData.reading_time = readingTime
  } else if (rest.content_pl) {
    updateData.reading_time = calcReadingTime(rest.content_pl)
  }

  const { data, error } = await vv
    .from('vv_blog_posts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logError('blog updateBlogPost', error)
    return { success: false, error: 'Błąd podczas zapisu posta' }
  }

  if (category_ids !== undefined) {
    await vv.from('vv_blog_post_categories').delete().eq('post_id', id)
    if (category_ids.length) {
      await vv.from('vv_blog_post_categories').insert(
        category_ids.map((category_id, i) => ({
          post_id: id,
          category_id,
          is_primary: i === 0,
        }))
      )
    }
  }

  revalidatePath('/vezvision/blog')
  revalidatePath(`/vezvision/blog/${id}`)
  return { success: true, data: data as VVBlogPost }
}

export async function deleteBlogPost(id: string, csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'blog.delete', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.BLOG_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()

  const { data: existing, error: existingError } = await vv
    .from('vv_blog_posts')
    .select('created_by')
    .eq('id', id)
    .single()

  if (existingError || !existing) return { success: false, error: 'Post nie istnieje' }
  if (existing.created_by !== null && existing.created_by !== auth.userId) {
    return { success: false, error: 'Brak uprawnień do usunięcia tego posta' }
  }

  const { error } = await vv.from('vv_blog_posts').delete().eq('id', id)
  if (error) {
    logError('blog deleteBlogPost', error)
    return { success: false, error: 'Błąd podczas usuwania posta' }
  }

  revalidatePath('/vezvision/blog')
  return { success: true, data: undefined }
}

export async function publishBlogPost(id: string, csrfToken: string): Promise<ActionResult<VVBlogPost>> {
  const guard = await guardVezVisionMutation({ action: 'blog.publish', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.BLOG_PUBLISH)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data: currentPost, error: currentPostError } = await vv
    .from('vv_blog_posts')
    .select('title_pl, slug, content_pl')
    .eq('id', id)
    .single()

  if (currentPostError || !currentPost) return { success: false, error: 'Post nie istnieje' }
  const publishError = validatePublishFields(currentPost)
  if (publishError) return { success: false, error: publishError }

  const { data, error } = await vv
    .from('vv_blog_posts')
    .update({ status: 'published' })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logError('blog publishBlogPost', error)
    return { success: false, error: 'Błąd podczas publikacji posta' }
  }

  revalidatePath('/vezvision/blog')
  revalidatePath(`/vezvision/blog/${id}`)
  return { success: true, data: data as VVBlogPost }
}

export async function unpublishBlogPost(id: string, csrfToken: string): Promise<ActionResult<VVBlogPost>> {
  const guard = await guardVezVisionMutation({ action: 'blog.unpublish', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.BLOG_PUBLISH)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_blog_posts')
    .update({ status: 'draft' })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logError('blog unpublishBlogPost', error)
    return { success: false, error: 'Błąd podczas wycofania publikacji' }
  }

  revalidatePath('/vezvision/blog')
  revalidatePath(`/vezvision/blog/${id}`)
  return { success: true, data: data as VVBlogPost }
}

export async function updateBlogPostStatus(
  id: string,
  status: string,
  csrfToken: string
): Promise<ActionResult<VVBlogPost>> {
  const guard = await guardVezVisionMutation({ action: 'blog.status', csrfToken, maxRequests: 30, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  if (!VALID_STATUSES.includes(status as ValidStatus)) {
    return { success: false, error: 'Nieprawidłowy status' }
  }

  const requiredPermission = (status === 'published' || status === 'scheduled')
    ? VEZVISION_PERMISSIONS.BLOG_PUBLISH
    : VEZVISION_PERMISSIONS.BLOG_MANAGE

  const auth = await requireVezVisionPermission(requiredPermission)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()

  if (status === 'published' || status === 'scheduled') {
    const { data: currentPost, error: currentPostError } = await vv
      .from('vv_blog_posts')
      .select('title_pl, slug, content_pl, scheduled_for')
      .eq('id', id)
      .single()

    if (currentPostError || !currentPost) return { success: false, error: 'Post nie istnieje' }
    const publishError = validatePublishFields(currentPost)
    if (publishError) return { success: false, error: publishError }

    if (status === 'scheduled') {
      if (!currentPost.scheduled_for) return { success: false, error: 'Zaplanowany post wymaga daty publikacji — ustaw ją w edytorze' }
      if (new Date(currentPost.scheduled_for) <= new Date()) return { success: false, error: 'Data publikacji musi być w przyszłości' }
    }
  }

  const { data, error } = await vv
    .from('vv_blog_posts')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logError('blog updateBlogPostStatus', error)
    return { success: false, error: 'Błąd podczas zmiany statusu' }
  }

  revalidatePath('/vezvision/blog')
  revalidatePath(`/vezvision/blog/${id}`)
  return { success: true, data: data as VVBlogPost }
}

export async function getBlogCategories(): Promise<ActionResult<VVBlogCategory[]>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.BLOG_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_blog_categories')
    .select('id, slug, name_pl, name_en, color, order_index, created_at')
    .order('order_index')

  if (error) {
    logError('blog getBlogCategories', error)
    return { success: false, error: 'Błąd podczas pobierania kategorii' }
  }
  return { success: true, data: (data ?? []) as VVBlogCategory[] }
}

export async function duplicateBlogPost(id: string, csrfToken: string): Promise<ActionResult<VVBlogPost>> {
  const guard = await guardVezVisionMutation({ action: 'blog.duplicate', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.BLOG_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()

  const { data: source, error: sourceError } = await vv
    .from('vv_blog_posts')
    .select(`*, vv_blog_post_categories(category_id, is_primary)`)
    .eq('id', id)
    .single()

  if (sourceError || !source) return { success: false, error: 'Post nie istnieje' }

  const { vv_blog_post_categories, ...sourcePost } = source as typeof source & {
    vv_blog_post_categories: Array<{ category_id: string; is_primary: boolean }>
  }

  const baseSlug = `${sourcePost.slug}-kopia`
  let newSlug = baseSlug
  let suffix = 1

  while (true) {
    const { data: existing } = await vv
      .from('vv_blog_posts')
      .select('id')
      .eq('slug', newSlug)
      .maybeSingle()
    if (!existing) break
    suffix++
    newSlug = `${baseSlug}-${suffix}`
  }

  const insertData = {
    slug: newSlug,
    status: 'draft',
    featured: sourcePost.featured,
    featured_image: sourcePost.featured_image,
    reading_time: sourcePost.reading_time,
    title_pl: `${sourcePost.title_pl} (kopia)`,
    title_en: sourcePost.title_en,
    excerpt_pl: sourcePost.excerpt_pl,
    excerpt_en: sourcePost.excerpt_en,
    content_pl: sourcePost.content_pl,
    content_en: sourcePost.content_en,
    meta_title_pl: sourcePost.meta_title_pl,
    meta_title_en: sourcePost.meta_title_en,
    meta_desc_pl: sourcePost.meta_desc_pl,
    meta_desc_en: sourcePost.meta_desc_en,
    tags_pl: sourcePost.tags_pl,
    tags_en: sourcePost.tags_en,
    created_by: auth.userId,
  } as unknown as TablesInsert<'vv_blog_posts'>

  const { data: newPost, error: insertError } = await vv
    .from('vv_blog_posts')
    .insert(insertData)
    .select()
    .single()

  if (insertError || !newPost) {
    logError('blog duplicateBlogPost', insertError)
    return { success: false, error: 'Błąd podczas duplikowania posta' }
  }

  if (vv_blog_post_categories?.length) {
    await vv.from('vv_blog_post_categories').insert(
      vv_blog_post_categories.map((pc) => ({
        post_id: newPost.id,
        category_id: pc.category_id,
        is_primary: pc.is_primary,
      }))
    )
  }

  revalidatePath('/vezvision/blog')
  return { success: true, data: newPost as VVBlogPost }
}
