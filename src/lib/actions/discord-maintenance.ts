'use server'

import { createActionClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { isAdminRole } from '@/lib/roles'
import { ERRORS } from '@/lib/constants'
import { validateCSRFToken } from '@/lib/actions/csrf'
import { archiveDiscordThread, ensureDiscordMainThread, ensureUserDiscordThread, listDiscordUserThreads } from '@/lib/discord'

export interface DiscordBackfillEntry {
  userId: string
  email: string | null
  status: 'mapped' | 'already_mapped' | 'skipped' | 'failed'
  threadId: string | null
  reason?: string
}

export interface DiscordSweepDuplicateSummary {
  userId: string
  email: string | null
  canonicalThreadId: string
  canonicalThreadName: string
  duplicateCount: number
  duplicateThreadIds: string[]
  duplicateThreadNames: string[]
  archivedDuplicateThreadIds: string[]
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function requireAdminSession() {
  const supabase = await createActionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: ERRORS.NOT_LOGGED_IN as string }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isAdminRole(profile?.role)) return { error: ERRORS.NO_PERMISSIONS as string }

  return { user }
}

async function resolveUserEmail(userId: string): Promise<string | null> {
  const adminClient = getAdminClient()
  const { data, error } = await adminClient.auth.admin.getUserById(userId)
  if (error) return null
  return data.user?.email ?? null
}

export async function backfillDiscordUserThreads(csrfToken: string) {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token CSRF' }
  }

  const auth = await requireAdminSession()
  if ('error' in auth) return { error: auth.error }

  await ensureDiscordMainThread()

  const adminClient = getAdminClient()
  const { data: profilesRaw, error: profilesError } = await adminClient
    .from('profiles')
    .select('id, discord_thread_id')

  if (profilesError) {
    return { error: 'Nie udało się pobrać profili do backfillu' }
  }

  const profiles = (profilesRaw ?? []) as Array<{ id: string; discord_thread_id: string | null }>
  const entries: DiscordBackfillEntry[] = []

  for (const profile of profiles) {
    const email = await resolveUserEmail(profile.id)
    if (!email) {
      entries.push({
        userId: profile.id,
        email: null,
        status: 'skipped',
        threadId: profile.discord_thread_id,
        reason: 'Brak email w auth.users',
      })
      continue
    }

    const threadId = await ensureUserDiscordThread(email, profile.id)
    if (!threadId) {
      entries.push({
        userId: profile.id,
        email,
        status: 'failed',
        threadId: null,
        reason: 'Nie udało się utworzyć lub odzyskać threadu',
      })
      continue
    }

    entries.push({
      userId: profile.id,
      email,
      status: profile.discord_thread_id === threadId ? 'already_mapped' : 'mapped',
      threadId,
    })
  }

  return {
    success: true as const,
    total: entries.length,
    mapped: entries.filter((entry) => entry.status === 'mapped').length,
    alreadyMapped: entries.filter((entry) => entry.status === 'already_mapped').length,
    skipped: entries.filter((entry) => entry.status === 'skipped').length,
    failed: entries.filter((entry) => entry.status === 'failed').length,
    entries,
  }
}

export async function sweepDiscordUserThreadMappings(csrfToken: string) {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token CSRF' }
  }

  const auth = await requireAdminSession()
  if ('error' in auth) return { error: auth.error }

  await ensureDiscordMainThread()

  const adminClient = getAdminClient()
  const threads = await listDiscordUserThreads()
  const userThreads = threads.filter((thread) => thread.userId && isUuid(thread.userId))

  const grouped = new Map<string, typeof userThreads>()
  for (const thread of userThreads) {
    const userId = thread.userId as string
    const existing = grouped.get(userId) ?? []
    existing.push(thread)
    grouped.set(userId, existing)
  }

  if (grouped.size === 0) {
    return {
      success: true as const,
      scannedUsers: 0,
      scannedThreads: userThreads.length,
      duplicateUsers: 0,
      updated: 0,
      alreadyCanonical: 0,
      archivedDuplicates: 0,
      duplicates: [],
    }
  }

  const { data: profilesRaw, error: profilesError } = await adminClient
    .from('profiles')
    .select('id, discord_thread_id')
    .in('id', [...grouped.keys()])

  if (profilesError) {
    return { error: 'Nie udało się pobrać profili do sweepu' }
  }

  const profiles = (profilesRaw ?? []) as Array<{ id: string; discord_thread_id: string | null }>
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))
  const duplicateSummaries: DiscordSweepDuplicateSummary[] = []

  let updated = 0
  let alreadyCanonical = 0
  let archivedDuplicates = 0

  for (const [userId, userThreadGroup] of grouped.entries()) {
    const profile = profileMap.get(userId)
    if (!profile) continue

    const canonicalThread =
      userThreadGroup.find((thread) => thread.id === profile.discord_thread_id) ??
      userThreadGroup.find((thread) => !thread.archived) ??
      userThreadGroup[0]

    if (!canonicalThread) continue

    if (userThreadGroup.length > 1) {
      const duplicateThreads = userThreadGroup.filter((thread) => thread.id !== canonicalThread.id)
      const archivedDuplicateThreadIds: string[] = []

      for (const duplicateThread of duplicateThreads) {
        const archived = duplicateThread.archived || await archiveDiscordThread(duplicateThread.id)
        if (archived) {
          archivedDuplicateThreadIds.push(duplicateThread.id)
          archivedDuplicates += 1
        }
      }

      duplicateSummaries.push({
        userId,
        email: await resolveUserEmail(userId),
        canonicalThreadId: canonicalThread.id,
        canonicalThreadName: canonicalThread.name,
        duplicateCount: userThreadGroup.length,
        duplicateThreadIds: userThreadGroup.map((thread) => thread.id),
        duplicateThreadNames: userThreadGroup.map((thread) => thread.name),
        archivedDuplicateThreadIds,
      })
    }

    if (profile.discord_thread_id === canonicalThread.id) {
      alreadyCanonical += 1
      continue
    }

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ discord_thread_id: canonicalThread.id } as never)
      .eq('id', userId)

    if (!updateError) {
      updated += 1
    }
  }

  return {
    success: true as const,
    scannedUsers: grouped.size,
    scannedThreads: userThreads.length,
    duplicateUsers: duplicateSummaries.length,
    updated,
    alreadyCanonical,
    archivedDuplicates,
    duplicates: duplicateSummaries,
  }
}
