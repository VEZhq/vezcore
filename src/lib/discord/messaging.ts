import { logError } from '@/lib/logger'
import {
  DISCORD_API,
  fetchWithTimeout,
  sanitizeDiscord,
  type DiscordThread,
} from './api'
import { getOrCreateUserThread } from './threads'

async function sendToThread(
  threadId: string,
  token: string,
  embed: Record<string, unknown>,
  logPrefix: string
): Promise<boolean> {
  const response = await fetchWithTimeout(
    `${DISCORD_API}/channels/${threadId}/messages`,
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
    logError('discord.sendToThread.api_error', new Error(`${logPrefix}`))
    return false
  }

  return true
}

export async function sendUserEvent(
  email: string,
  userId: string,
  action: string,
  details: Record<string, unknown>
) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN

    if (!token) {
      logError('discord.sendUserEvent.missing_token', new Error('Discord bot token not configured'))
      return
    }

    const preferredThreadId = typeof details.discord_thread_id === 'string' ? details.discord_thread_id : null
    const userThreadId = await getOrCreateUserThread(email, userId, {
      allowCreate: action !== 'user_delete',
      preferredThreadId,
    })

    if (!userThreadId) {
      logError('discord.sendUserEvent.missing_thread', new Error('Failed to get user thread ID for user event'))
      return false
    }

    const actionColors: Record<string, number> = {
      user_create: 0x10b981,
      user_update: 0x3b82f6,
      user_block: 0xff0000,
      user_unblock: 0x10b981,
      user_delete: 0xff0000,
      profile_update: 0x3b82f6,
      email_change: 0x3b82f6,
      login: 0x10b981,
      logout: 0xef4444,
      password_change: 0xf59e0b,
      '2fa_enable': 0x8b5cf6,
      '2fa_disable': 0xf97316,
    }

    const actionTitles: Record<string, string> = {
      user_create: '👤 Utworzenie konta',
      user_update: '✏️ Aktualizacja konta',
      user_block: '🚫 Zablokowanie konta',
      user_unblock: '✅ Odblokowanie konta',
      user_delete: '🗑️ Usunięcie konta',
      profile_update: '🔵 Aktualizacja profilu',
      email_change: '📧 Zmiana email',
      login: '🟢 Logowanie',
      logout: '🔴 Wylogowanie',
      password_change: '🔑 Zmiana hasła',
      '2fa_enable': '🟣 Włączenie 2FA',
      '2fa_disable': '🟠 Wyłączenie 2FA',
    }

    const fields = []

    fields.push({ name: 'Użytkownik', value: sanitizeDiscord(email), inline: true })

    if (details.admin_email) {
      fields.push({ name: 'Admin', value: sanitizeDiscord(details.admin_email), inline: true })
    }

    if (details.ip) {
      fields.push({ name: 'IP', value: sanitizeDiscord(details.ip), inline: true })
    }

    if (details.changes) {
      fields.push({ name: 'Zmiany', value: sanitizeDiscord(details.changes), inline: false })
    }

    if (details.role) {
      fields.push({ name: 'Rola', value: sanitizeDiscord(details.role), inline: true })
    }

    if (details.user_agent) {
      fields.push({ name: 'User Agent', value: sanitizeDiscord(details.user_agent).substring(0, 100), inline: false })
    }

    const embed = {
      title: actionTitles[action] || `📋 ${action}`,
      color: actionColors[action] || 0x6b7280,
      fields,
      timestamp: new Date().toISOString(),
    }

    return sendToThread(userThreadId, token, embed, `[Discord Users] Failed to send ${action}`)
  } catch (error) {
    logError('discord.sendUserEvent.failed', error)
    return false
  }
}
