export {
  buildEmbed,
  buildField,
  buildFields,
  sanitizeDiscord,
  fetchWithTimeout,
  sendToChannel,
  DISCORD_API,
  FETCH_TIMEOUT,
  DISCORD_THREAD_NAME_MAX_LENGTH,
  type EmbedField,
  type EmbedConfig,
  type DiscordThread,
  type DiscordUserThreadInfo,
  type DiscordThreadsResponse,
  type UserThreadOptions,
} from './api'

export {
  archiveDiscordThread,
  ensureDiscordMainThread,
  ensureUserDiscordThread,
  listDiscordUserThreads,
  getOrCreateUserThread,
} from './threads'

export { sendUserEvent } from './messaging'

export {
  sendAuditLog,
  sendSecurityAlert,
  sendSystemAlert,
  sendIntegrationEvent,
} from './alerts'
