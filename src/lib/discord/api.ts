const DISCORD_API = 'https://discord.com/api/v10'
import { reportDiscordFailure } from '@/lib/monitoring'
import { logWarn } from '@/lib/logger'

export { DISCORD_API }
export const FETCH_TIMEOUT = 5000
export const DISCORD_THREAD_NAME_MAX_LENGTH = 100

export interface EmbedField {
  name: string
  value: string
  inline?: boolean
}

export interface EmbedConfig {
  title: string
  color: number
  fields: EmbedField[]
}

export interface DiscordThread {
  id: string
  name: string
  archived?: boolean
}

export interface DiscordUserThreadInfo {
  id: string
  name: string
  archived: boolean
  userId: string | null
}

export interface DiscordThreadsResponse {
  threads?: DiscordThread[]
}

export interface UserThreadOptions {
  allowCreate?: boolean
  preferredThreadId?: string | null
}

export function sanitizeDiscord(value: unknown): string {
  return String(value)
    .replace(/@/g, '@\u200B')
    .substring(0, 1000)
}

export function buildEmbed(config: EmbedConfig) {
  return {
    title: config.title,
    color: config.color,
    fields: config.fields,
    timestamp: new Date().toISOString(),
  }
}

export function buildField(name: string, value: unknown, inline = true): EmbedField | null {
  if (value === undefined || value === null) return null
  return { name, value: sanitizeDiscord(value).substring(0, 1000), inline }
}

export function buildFields(
  details: Record<string, unknown>,
  fieldMap: Record<string, { name: string; inline?: boolean }>
): EmbedField[] {
  return Object.entries(fieldMap)
    .map(([key, config]) => buildField(config.name, details[key], config.inline ?? true))
    .filter((f): f is EmbedField => f !== null)
}

export function getUserThreadKey(userId: string): string {
  return `[uid:${userId}]`
}

export function formatUserThreadName(email: string): string {
  const safeEmail = sanitizeDiscord(email).trim() || 'nieznany-email'
  return `👤 ${safeEmail}`.substring(0, DISCORD_THREAD_NAME_MAX_LENGTH)
}

export function extractUserIdFromThreadName(threadName: string): string | null {
  const match = threadName.match(/\[uid:([^\]]+)\]/)
  return match?.[1] ?? null
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
}

export async function sendToChannel(
  channelId: string,
  embed: ReturnType<typeof buildEmbed>
): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) {
    logWarn('discord.api.missing_bot_token')
    return false
  }

  try {
    const response = await fetchWithTimeout(
      `${DISCORD_API}/channels/${channelId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
      }
    )

    if (!response.ok) {
      await reportDiscordFailure('Discord channel message send failed', {
        status: response.status,
        channelId,
      })

      if (response.status === 429) {
        logWarn('discord.api.rate_limited')
      }

      return false
    }

    return true
  } catch {
    await reportDiscordFailure('Discord request exception', {
      channelId,
    })

    return false
  }
}
