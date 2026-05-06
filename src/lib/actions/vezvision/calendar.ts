'use server'
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, MIN_PAGE_LIMIT, MAX_TITLE_LENGTH, MAX_SLUG_LENGTH, MAX_EXCERPT_LENGTH, MAX_CONTENT_LENGTH_KB, MAX_QUESTION_LENGTH, MAX_ANSWER_LENGTH_KB, MAX_CATEGORY_LENGTH, MAX_SUBJECT_LENGTH, MAX_EVENT_TITLE_LENGTH } from '@/lib/constants/pagination'
import { ONE_MINUTE } from '@/lib/constants/time'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { getVezVisionPrivilegedClient } from '@/lib/supabase/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { guardVezVisionMutation } from '@/lib/actions/vezvision/security'
import { logError } from '@/lib/logger'
import type { ActionResult, VVCalendarEvent, VVCalendarEventInput } from './types'

const isoDateSchema = z.string().datetime({ message: 'Nieprawidłowy format daty' })
const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Nieprawidłowy format koloru' })

const calendarEventSchema = z.object({
  title: z.string().min(1, { message: 'Tytuł jest wymagany' }),
  description: z.string().nullable().optional(),
  start_at: isoDateSchema,
  end_at: isoDateSchema.nullable().optional(),
  all_day: z.boolean().optional(),
  color: hexColorSchema.optional(),
  category: z.string().optional(),
})

function sanitizeInput(input: VVCalendarEventInput): VVCalendarEventInput {
  return {
    title: input.title.trim().slice(0, 200),
    description: input.description?.trim().slice(0, 2000) ?? null,
    start_at: input.start_at,
    end_at: input.end_at ?? null,
    all_day: input.all_day ?? false,
    color: input.color?.trim().slice(0, 7) ?? '#3b82f6',
    category: input.category?.trim().slice(0, MAX_CATEGORY_LENGTH) ?? 'Inne',
  }
}

export async function listCalendarEvents(
  startDate?: string,
  endDate?: string
): Promise<ActionResult<VVCalendarEvent[]>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.CALENDAR_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  let query = vv
    .from('vv_calendar_events')
    .select('id, title, description, start_at, end_at, all_day, color, category, created_by, created_at, updated_at, deleted_at')
    .is('deleted_at', null)
    .order('start_at', { ascending: true })

  if (startDate) query = query.gte('start_at', startDate)
  if (endDate) query = query.lte('start_at', endDate)

  const { data, error } = await query

  if (error) {
    logError('calendar.listCalendarEvents', error)
    return { success: false, error: 'Błąd podczas pobierania wydarzeń' }
  }

  return { success: true, data: (data ?? []) as VVCalendarEvent[] }
}

export async function getCalendarEvent(id: string): Promise<ActionResult<VVCalendarEvent>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.CALENDAR_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_calendar_events')
    .select('id, title, description, start_at, end_at, all_day, color, category, created_by, created_at, updated_at, deleted_at')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    logError('calendar.getCalendarEvent', error)
    return { success: false, error: 'Wydarzenie nie zostało znalezione' }
  }

  return { success: true, data: data as VVCalendarEvent }
}

export async function createCalendarEvent(
  input: VVCalendarEventInput,
  csrfToken: string
): Promise<ActionResult<VVCalendarEvent>> {
  const guard = await guardVezVisionMutation({ action: 'calendar.create', csrfToken, maxRequests: 30, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.CALENDAR_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const sanitized = sanitizeInput(input)

  const parseResult = calendarEventSchema.safeParse(sanitized)
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0].message }
  }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_calendar_events')
    .insert({
      ...sanitized,
      created_by: auth.userId,
    })
    .select()
    .single()

  if (error || !data) {
    logError('calendar.createCalendarEvent', error)
    return { success: false, error: 'Błąd podczas tworzenia wydarzenia' }
  }

  revalidatePath('/vezvision/calendar')
  return { success: true, data: data as VVCalendarEvent }
}

export async function updateCalendarEvent(
  id: string,
  input: Partial<VVCalendarEventInput>,
  csrfToken: string
): Promise<ActionResult<VVCalendarEvent>> {
  const guard = await guardVezVisionMutation({ action: 'calendar.update', csrfToken, maxRequests: 30, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.CALENDAR_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const sanitized: Partial<{
    title: string
    description: string | null
    start_at: string
    end_at: string | null
    all_day: boolean
    color: string
    category: string
  }> = {}
  if (input.title !== undefined) sanitized.title = input.title.trim().slice(0, 200)
  if (input.description !== undefined) sanitized.description = input.description?.trim().slice(0, 2000) ?? null
  if (input.start_at !== undefined) sanitized.start_at = input.start_at
  if (input.end_at !== undefined) sanitized.end_at = input.end_at ?? null
  if (input.all_day !== undefined) sanitized.all_day = input.all_day
  if (input.color !== undefined) sanitized.color = input.color.trim().slice(0, 7)
  if (input.category !== undefined) sanitized.category = input.category.trim().slice(0, MAX_CATEGORY_LENGTH)

  const parseResult = calendarEventSchema.partial().safeParse(sanitized)
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0].message }
  }

  const vv = getVezVisionPrivilegedClient()
  const { data: existing } = await vv.from('vv_calendar_events').select('created_by').eq('id', id).is('deleted_at', null).single()
  if (existing && existing.created_by !== auth.userId) {
    return { success: false, error: 'Brak uprawnień do edycji tego wydarzenia' }
  }

  const { data, error } = await vv
    .from('vv_calendar_events')
    .update(sanitized)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data) {
    logError('calendar.updateCalendarEvent', error)
    return { success: false, error: 'Błąd podczas aktualizacji wydarzenia' }
  }

  revalidatePath('/vezvision/calendar')
  return { success: true, data: data as VVCalendarEvent }
}

export async function deleteCalendarEvent(
  id: string,
  csrfToken: string
): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'calendar.delete', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.CALENDAR_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data: existing } = await vv.from('vv_calendar_events').select('created_by').eq('id', id).is('deleted_at', null).single()
  if (existing && existing.created_by !== auth.userId) {
    return { success: false, error: 'Brak uprawnień do usunięcia tego wydarzenia' }
  }

  const { error } = await vv
    .from('vv_calendar_events')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) {
    logError('calendar.deleteCalendarEvent', error)
    return { success: false, error: 'Błąd podczas usuwania wydarzenia' }
  }

  revalidatePath('/vezvision/calendar')
  return { success: true, data: undefined }
}
