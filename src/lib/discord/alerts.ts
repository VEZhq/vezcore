import { logError } from '@/lib/logger'
import {
  DISCORD_API,
  fetchWithTimeout,
  buildEmbed,
  buildFields,
  sendToChannel,
} from './api'

export async function sendAuditLog(
  action: string,
  details: Record<string, unknown>
) {
  try {
    const channelId = process.env.DISCORD_AUDIT_CHANNEL_ID
    if (!channelId) return

    const actionColors: Record<string, number> = {
      login: 0x10b981,
      logout: 0xef4444,
      profile_update: 0x3b82f6,
      password_change: 0xf59e0b,
      ip_blocked: 0xff0000,
      '2fa_verify': 0x8b5cf6,
      '2fa_enable': 0x8b5cf6,
      '2fa_disable': 0xf97316,
      user_create: 0x10b981,
      user_update: 0x3b82f6,
      user_delete: 0xff0000,
      email_change: 0x3b82f6,
      permission_grant: 0x8b5cf6,
      permission_revoke: 0xf97316,
      avatar_upload: 0x10b981,
      avatar_remove: 0xef4444,
      ip_blacklist_add: 0xff0000,
      ip_blacklist_remove: 0x10b981,
      ip_whitelist_add: 0x3b82f6,
      ip_whitelist_remove: 0xf59e0b,
      vezvision_auth_rejected: 0xff6b6b,
      vezvision_permission_rejected: 0xff8c00,
      vezvision_csrf_rejected: 0xff6b6b,
      vezvision_rate_limit_rejected: 0xf59e0b,
      vezvision_folder_acl_grant: 0x8b5cf6,
      vezvision_folder_acl_revoke: 0xf97316,
      vezvision_folder_acl_update: 0x3b82f6,
    }

    const actionTitles: Record<string, string> = {
      login: '🟢 Logowanie',
      logout: '🔴 Wylogowanie',
      profile_update: '🔵 Aktualizacja profilu',
      password_change: '🟡 Zmiana hasła',
      ip_blocked: '🚫 IP zablokowane',
      '2fa_verify': '🟣 Weryfikacja 2FA',
      '2fa_enable': '🟣 Włączenie 2FA',
      '2fa_disable': '🟠 Wyłączenie 2FA',
      user_create: '👤 Utworzenie konta',
      user_update: '✏️ Aktualizacja konta',
      user_delete: '🗑️ Usunięcie konta',
      email_change: '📧 Zmiana email',
      permission_grant: '🔑 Nadanie uprawnienia',
      permission_revoke: '🔓 Odebranie uprawnienia',
      avatar_upload: '📷 Upload awatara',
      avatar_remove: '🗑️ Usunięcie awatara',
      ip_blacklist_add: '🚫 Dodano do blacklist',
      ip_blacklist_remove: '✅ Usunięto z blacklist',
      ip_whitelist_add: '✅ Dodano do whitelist',
      ip_whitelist_remove: '🔵 Usunięto z whitelist',
      vezvision_auth_rejected: '🚫 VezVision auth rejected',
      vezvision_permission_rejected: '🚫 VezVision permission rejected',
      vezvision_csrf_rejected: '🛡️ VezVision CSRF rejected',
      vezvision_rate_limit_rejected: '⏱️ VezVision rate-limit rejected',
      vezvision_folder_acl_grant: '📁 Nadanie uprawnień folderu',
      vezvision_folder_acl_revoke: '🔓 Odebranie uprawnień folderu',
      vezvision_folder_acl_update: '✏️ Aktualizacja uprawnień folderu',
    }

    const fields = buildFields(details, {
      email: { name: 'Email' },
      ip: { name: 'IP' },
      user_agent: { name: 'User Agent', inline: false },
      full_name: { name: 'Imię' },
    })

    const embed = buildEmbed({
      title: actionTitles[action] || `📋 ${action}`,
      color: actionColors[action] || 0x6b7280,
      fields,
    })

    const success = await sendToChannel(channelId, embed)
    if (!success) {
      logError('discord.sendAuditLog.failed', new Error(`Failed to send ${action}`))
    }
  } catch (error) {
    logError('discord.sendAuditLog.exception', error)
  }
}

export async function sendSecurityAlert(
  type: 'failed_login' | 'ip_blocked' | 'password_change' | 'suspicious',
  details: Record<string, unknown>
) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN
    const channelId = process.env.DISCORD_SECURITY_CHANNEL_ID

    if (!token || !channelId) {
      logError('discord.sendSecurityAlert.missing_config', new Error('Discord config missing'))
      return false
    }

    const colors: Record<string, number> = {
      failed_login: 0xff6b6b,
      ip_blocked: 0xff0000,
      password_change: 0xffd93d,
      suspicious: 0xff8c00,
    }

    const titles: Record<string, string> = {
      failed_login: '⚠️ Nieudane logowanie',
      ip_blocked: '🚫 IP zablokowane',
      password_change: '🔑 Zmiana hasła',
      suspicious: '⚠️ Podejrzana aktywność',
    }

    const fields = []

    if (details.email) {
      fields.push({ name: 'Email', value: String(details.email).replace(/@/g, '@\u200B'), inline: true })
    }

    if (details.ip) {
      fields.push({ name: 'IP', value: String(details.ip), inline: true })
    }

    if (details.reason) {
      fields.push({ name: 'Powód', value: String(details.reason).substring(0, 1000), inline: false })
    }

    if (details.attempts) {
      fields.push({ name: 'Próby', value: String(details.attempts), inline: true })
    }

    if (details.user_agent) {
      fields.push({ name: 'User Agent', value: String(details.user_agent).substring(0, 100), inline: false })
    }

    const embed = {
      title: titles[type],
      color: colors[type],
      fields,
      timestamp: new Date().toISOString(),
    }

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
      logError('discord.sendSecurityAlert.api_error', new Error('Discord API error'))
      return false
    }

    return true
  } catch (error) {
    logError('discord.sendSecurityAlert.failed', error)
    return false
  }
}

export async function sendSystemAlert(
  type: 'error' | 'performance' | 'settings' | 'database',
  details: Record<string, unknown>
) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN
    const channelId = process.env.DISCORD_SYSTEM_CHANNEL_ID

    if (!token || !channelId) {
      logError('discord.sendSystemAlert.missing_config', new Error('Missing config'))
      return
    }

    const colors: Record<string, number> = {
      error: 0xff0000,
      performance: 0xffa500,
      settings: 0x3b82f6,
      database: 0x8b5cf6,
    }

    const titles: Record<string, string> = {
      error: '🚨 System Error',
      performance: '⚠️ Performance Alert',
      settings: '⚙️ Settings Changed',
      database: '🗄️ Database Issue',
    }

    const fields = []

    if (details.message) {
      fields.push({ name: 'Message', value: String(details.message).substring(0, 1000), inline: false })
    }

    if (details.stack) {
      fields.push({ name: 'Stack', value: String(details.stack).substring(0, 500), inline: false })
    }

    if (details.endpoint) {
      fields.push({ name: 'Endpoint', value: String(details.endpoint), inline: true })
    }

    if (details.responseTime) {
      fields.push({ name: 'Response Time', value: `${details.responseTime}ms`, inline: true })
    }

    if (details.setting) {
      fields.push({ name: 'Setting', value: String(details.setting), inline: true })
    }

    if (details.oldValue) {
      fields.push({ name: 'Old Value', value: String(details.oldValue), inline: true })
    }

    if (details.newValue) {
      fields.push({ name: 'New Value', value: String(details.newValue), inline: true })
    }

    const embed = {
      title: titles[type],
      color: colors[type],
      fields,
      timestamp: new Date().toISOString(),
    }

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
      logError('discord.sendSystemAlert.api_error', new Error(`Failed to send ${type}`))
      return false
    }

    return true
  } catch (error) {
    logError('discord.sendSystemAlert.exception', error)
    return false
  }
}

export async function sendIntegrationEvent(
  type: 'github' | 'deploy' | 'backup' | 'webhook',
  details: Record<string, unknown>
) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN
    const channelId = process.env.DISCORD_INTEGRATIONS_CHANNEL_ID

    if (!token || !channelId) {
      logError('discord.sendIntegrationEvent.missing_config', new Error('Missing config'))
      return
    }

    const colors: Record<string, number> = {
      github: 0x24292e,
      deploy: 0x10b981,
      backup: 0x8b5cf6,
      webhook: 0xf59e0b,
    }

    const titles: Record<string, string> = {
      github: '🐙 GitHub Event',
      deploy: '🚀 Deploy',
      backup: '💾 Backup',
      webhook: '🔗 Webhook',
    }

    const fields = []

    if (details.repo) {
      fields.push({ name: 'Repository', value: String(details.repo), inline: true })
    }

    if (details.branch) {
      fields.push({ name: 'Branch', value: String(details.branch), inline: true })
    }

    if (details.commit) {
      fields.push({ name: 'Commit', value: String(details.commit).substring(0, 7), inline: true })
    }

    if (details.message) {
      fields.push({ name: 'Message', value: String(details.message).substring(0, 500), inline: false })
    }

    if (details.author) {
      fields.push({ name: 'Author', value: String(details.author), inline: true })
    }

    if (details.status) {
      fields.push({ name: 'Status', value: String(details.status), inline: true })
    }

    if (details.environment) {
      fields.push({ name: 'Environment', value: String(details.environment), inline: true })
    }

    if (details.size) {
      fields.push({ name: 'Size', value: String(details.size), inline: true })
    }

    if (details.duration) {
      fields.push({ name: 'Duration', value: String(details.duration), inline: true })
    }

    const embed = {
      title: titles[type],
      color: colors[type],
      fields,
      timestamp: new Date().toISOString(),
    }

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
      logError('discord.sendIntegrationEvent.api_error', new Error(`Failed to send ${type}`))
      return false
    }

    return true
  } catch (error) {
    logError('discord.sendIntegrationEvent.exception', error)
    return false
  }
}
