import { getAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logger'

type MonitoringLevel = 'info' | 'warning' | 'error'

interface MonitoringEvent {
  source: string
  message: string
  level: MonitoringLevel
  details?: Record<string, unknown>
}

interface MonitoringInsertClient {
  from: (table: 'audit_log') => {
    insert: (value: {
      user_id: string | null
      action: string
      entity_type: string
      entity_id: string
      details: Record<string, unknown>
    }) => Promise<{ error: unknown }>
  }
}

export async function reportRuntimeEvent(event: MonitoringEvent): Promise<void> {
  const adminClient = getAdminClient() as unknown as MonitoringInsertClient
  await adminClient
    .from('audit_log')
    .insert({
      user_id: null,
      action: `runtime_${event.source}_${event.level}`,
      entity_type: 'system',
      entity_id: event.source,
      details: {
        message: event.message,
        ...(event.details ?? {}),
      },
    })
    .then(({ error }) => {
      if (error) {
        logError('monitoring.persist', error)
      }
    })
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!domain) return email
  const maskedUser = user.length > 1 ? user.charAt(0) + '***' : '***'
  return `${maskedUser}@${domain}`
}

export async function reportAuthFailure(
  message: string,
  details?: Record<string, unknown> & { email?: string }
): Promise<void> {
  const safeDetails = details ? { ...details } : {}
  if (safeDetails.email) {
    safeDetails.email = maskEmail(String(safeDetails.email))
  }
  await reportRuntimeEvent({
    source: 'auth',
    message,
    level: 'warning',
    details: safeDetails,
  })
}

export async function reportDiscordFailure(message: string, details?: Record<string, unknown>): Promise<void> {
  await reportRuntimeEvent({
    source: 'discord',
    message,
    level: 'error',
    details,
  })
}

export async function reportApiFailure(message: string, details?: Record<string, unknown>): Promise<void> {
  await reportRuntimeEvent({
    source: 'api',
    message,
    level: 'error',
    details,
  })
}
