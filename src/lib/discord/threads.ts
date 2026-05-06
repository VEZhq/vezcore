import { getAdminClient } from '@/lib/supabase/admin'
import { logWarn } from '@/lib/logger'
import {
  DISCORD_API,
  fetchWithTimeout,
  type DiscordThread,
  type DiscordThreadsResponse,
  type DiscordUserThreadInfo,
  type UserThreadOptions,
  getUserThreadKey,
  formatUserThreadName,
  extractUserIdFromThreadName,
  sanitizeDiscord,
} from './api'

async function listActiveThreads(channelId: string, token: string): Promise<DiscordThread[]> {
  const res = await fetchWithTimeout(
    `${DISCORD_API}/channels/${channelId}/threads/active`,
    { headers: { Authorization: `Bot ${token}` } }
  )

  if (!res.ok) {
    return []
  }

  const data = await res.json() as DiscordThreadsResponse
  return data.threads ?? []
}

async function listArchivedPublicThreads(channelId: string, token: string): Promise<DiscordThread[]> {
  const res = await fetchWithTimeout(
    `${DISCORD_API}/channels/${channelId}/threads/archived/public?limit=100`,
    { headers: { Authorization: `Bot ${token}` } }
  )

  if (!res.ok) {
    return []
  }

  const data = await res.json() as DiscordThreadsResponse
  return data.threads ?? []
}

async function listAllThreads(channelId: string, token: string): Promise<DiscordThread[]> {
  const [activeThreads, archivedThreads] = await Promise.all([
    listActiveThreads(channelId, token),
    listArchivedPublicThreads(channelId, token),
  ])

  const merged = [...activeThreads, ...archivedThreads]
  const seen = new Set<string>()

  return merged.filter((thread) => {
    if (seen.has(thread.id)) return false
    seen.add(thread.id)
    return true
  })
}

async function findThreadByName(
  channelId: string,
  token: string,
  matcher: (thread: DiscordThread) => boolean
): Promise<DiscordThread | null> {
  const [activeThreads, archivedThreads] = await Promise.all([
    listActiveThreads(channelId, token),
    listArchivedPublicThreads(channelId, token),
  ])

  const match = [...activeThreads, ...archivedThreads].find(matcher)
  return match ?? null
}

async function findCanonicalUserThread(
  channelId: string,
  token: string,
  email: string,
  userId: string,
  preferredThreadId: string | null
): Promise<DiscordThread | null> {
  const userKey = getUserThreadKey(userId)
  const userThreadName = formatUserThreadName(email)
  const threads = await listAllThreads(channelId, token)
  const userThreads = threads.filter(
    (thread) => thread.name.includes(userKey) || thread.name === userThreadName
  )

  if (userThreads.length === 0) {
    return null
  }

  return (
    userThreads.find((thread) => thread.id === preferredThreadId) ??
    userThreads.find((thread) => !thread.archived) ??
    userThreads[0] ??
    null
  )
}

async function unarchiveThread(threadId: string, token: string): Promise<boolean> {
  const response = await fetchWithTimeout(
    `${DISCORD_API}/channels/${threadId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ archived: false, locked: false }),
    }
  )

  return response.ok
}

async function updateThread(
  threadId: string,
  token: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const response = await fetchWithTimeout(
    `${DISCORD_API}/channels/${threadId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )

  return response.ok
}

async function syncUserThread(
  thread: DiscordThread,
  token: string,
  expectedName: string
): Promise<boolean> {
  const payload: Record<string, unknown> = {}

  if (thread.archived) {
    payload.archived = false
    payload.locked = false
  }

  if (thread.name !== expectedName) {
    payload.name = expectedName
  }

  if (Object.keys(payload).length === 0) {
    return true
  }

  return updateThread(thread.id, token, payload)
}

async function createForumThread(
  channelId: string,
  token: string,
  name: string,
  starterContent: string
): Promise<string | null> {
  const createRes = await fetchWithTimeout(
    `${DISCORD_API}/channels/${channelId}/threads`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        auto_archive_duration: 10080,
        type: 11,
        message: { content: starterContent },
      }),
    }
  )

  if (!createRes.ok) {
    return null
  }

  const data = await createRes.json() as { id?: string }
  return data.id ?? null
}

async function getOrCreateMainThread(): Promise<string | null> {
  try {
    const token = process.env.DISCORD_BOT_TOKEN
    const channelId = process.env.DISCORD_USERS_CHANNEL_ID

    if (!token || !channelId) {
      return null
    }

    const mainThread = await findThreadByName(channelId, token, (thread) => thread.name === 'Użytkownicy')
    if (mainThread) {
      if (mainThread.archived) {
        const unarchived = await unarchiveThread(mainThread.id, token)
        if (!unarchived) {
          return null
        }
      }
      return mainThread.id
    }
    return createForumThread(channelId, token, 'Użytkownicy', '📋 Wątek ogólny dla zdarzeń użytkowników')
  } catch {
    return null
  }
}

export async function ensureDiscordMainThread(): Promise<string | null> {
  return getOrCreateMainThread()
}

export async function getOrCreateUserThread(
  email: string,
  userId: string,
  options: UserThreadOptions = {}
): Promise<string | null> {
  try {
    const token = process.env.DISCORD_BOT_TOKEN
    const channelId = process.env.DISCORD_USERS_CHANNEL_ID

    if (!token || !channelId) {
      return null
    }

    const adminClient = getAdminClient()
    const { data: profileRaw } = await adminClient
      .from('profiles')
      .select('discord_thread_id')
      .eq('id', userId)
      .maybeSingle()

    const profile = profileRaw as { discord_thread_id: string | null } | null
    const userThreadName = formatUserThreadName(email)
    const preferredThreadId = options.preferredThreadId ?? profile?.discord_thread_id ?? null

    if (preferredThreadId) {
      const res = await fetchWithTimeout(
        `${DISCORD_API}/channels/${preferredThreadId}`,
        { headers: { Authorization: `Bot ${token}` } }
      )

      if (res.ok) {
        const thread = await res.json() as DiscordThread
        await syncUserThread(thread, token, userThreadName)
        return preferredThreadId
      }

      logWarn('discord.threads.stale_thread_id')
      if (profile?.discord_thread_id === preferredThreadId) {
        await adminClient
          .from('profiles')
          .update({ discord_thread_id: null } as never)
          .eq('id', userId)
      }
    }

    const existingThread = await findCanonicalUserThread(channelId, token, email, userId, null)

    if (existingThread) {
      await syncUserThread(existingThread, token, userThreadName)

      await adminClient
        .from('profiles')
        .update({ discord_thread_id: existingThread.id } as never)
        .eq('id', userId)

      return existingThread.id
    }

    if (options.allowCreate === false) {
      return null
    }

    const createdThreadId = await createForumThread(
      channelId,
      token,
      userThreadName,
      `📌 Historia alertów użytkownika ${sanitizeDiscord(email)} (${sanitizeDiscord(userId)})`
    )

    if (createdThreadId) {
      await adminClient
        .from('profiles')
        .update({ discord_thread_id: createdThreadId } as never)
        .eq('id', userId)
    }

    return createdThreadId
  } catch {
    return null
  }
}

export async function ensureUserDiscordThread(email: string, userId: string): Promise<string | null> {
  return getOrCreateUserThread(email, userId)
}

export async function listDiscordUserThreads(): Promise<DiscordUserThreadInfo[]> {
  try {
    const token = process.env.DISCORD_BOT_TOKEN
    const channelId = process.env.DISCORD_USERS_CHANNEL_ID

    if (!token || !channelId) {
      return []
    }

    const adminClient = getAdminClient()
    const { data: profilesRaw } = await adminClient
      .from('profiles')
      .select('id, discord_thread_id')

    const profiles = (profilesRaw ?? []) as Array<{ id: string; discord_thread_id: string | null }>
    const threadUserMap = new Map(
      profiles
        .filter((profile) => profile.discord_thread_id)
        .map((profile) => [profile.discord_thread_id as string, profile.id])
    )

    const threads = await listAllThreads(channelId, token)

    return threads.map((thread) => ({
      id: thread.id,
      name: thread.name,
      archived: Boolean(thread.archived),
      userId: threadUserMap.get(thread.id) ?? extractUserIdFromThreadName(thread.name),
    }))
  } catch {
    return []
  }
}

export async function archiveDiscordThread(threadId: string): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN

  if (!token) {
    return false
  }

  return updateThread(threadId, token, { archived: true, locked: false })
}
