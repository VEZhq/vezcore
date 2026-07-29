'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { validateCSRFToken } from '@/lib/actions/csrf'
import { getAdminClient } from '@/lib/supabase/admin'
import { createActionClient } from '@/lib/supabase/server'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'
import type { Json } from '@/types/database.types'

type ActionResult<T = undefined> = T extends undefined
  ? { success: true } | { error: string }
  : { success: true; data: T } | { error: string }

const uuidSchema = z.string().uuid()
const maintenanceSchema = z.object({
  moduleKey: z.enum(['vez', 'vezVision', 'vezLabs', 'nably', 'vezWork', 'vezRent', 'vezStudio']),
  title: z.string().trim().min(3).max(120),
  reason: z.string().trim().min(3).max(1000),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
}).refine(
  (value) => new Date(value.scheduledEnd).getTime() > new Date(value.scheduledStart).getTime(),
  { message: 'Koniec prac musi przypadać po ich rozpoczęciu' }
)

const SHORTCUT_ALIASES: Record<string, string | undefined> = {
  vezcore: process.env.OPERATIONS_ALIAS_VEZCORE || 'ssh vezlabs-coolify',
  vez_prod: process.env.OPERATIONS_ALIAS_VEZ_PROD || 'ssh vez-prod',
  vezvision_db_tunnel: process.env.OPERATIONS_ALIAS_VEZVISION_DB_TUNNEL || 'ssh -N vezvision-db-tunnel',
  vezlabs_pve: process.env.OPERATIONS_ALIAS_VEZLABS_PVE || 'ssh vezlabs-pve',
  vezlabs_coolify: process.env.OPERATIONS_ALIAS_VEZLABS_COOLIFY || 'ssh vezlabs-coolify',
  vezlabs_router: process.env.OPERATIONS_ALIAS_VEZLABS_ROUTER || 'ssh vezlabs-router',
  vezlabs_monitor: process.env.OPERATIONS_ALIAS_VEZLABS_MONITOR || 'ssh vezlabs-coolify',
  vezlabs_minio: process.env.OPERATIONS_ALIAS_VEZLABS_MINIO || 'ssh vezlabs-coolify',
}

type AuthenticatedPermissionState = NonNullable<
  Awaited<ReturnType<typeof getAuthenticatedUserPermissionState>>
>

async function requireMutationPermission(
  csrfToken: string,
  permission: 'manage' | 'shortcuts'
): Promise<
  | { ok: true; authState: AuthenticatedPermissionState }
  | { ok: false; error: string }
> {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { ok: false, error: 'Nieprawidłowy token bezpieczeństwa' }
  }

  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) return { ok: false, error: 'Nie jesteś zalogowany' }

  const allowed = permission === 'manage'
    ? authState.permissions.canManageOperations
    : authState.permissions.canRevealOperationsShortcuts
  if (!allowed) return { ok: false, error: 'Brak uprawnień' }

  return { ok: true, authState }
}

async function writeAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> = {}
) {
  const client = await createActionClient()
  await client.from('audit_log').insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: details as Json,
  })
}

export async function acknowledgeIncident(
  incidentId: string,
  csrfToken: string
): Promise<ActionResult> {
  const id = uuidSchema.safeParse(incidentId)
  if (!id.success) return { error: 'Nieprawidłowy identyfikator incydentu' }
  const guard = await requireMutationPermission(csrfToken, 'manage')
  if (!guard.ok) return { error: guard.error }

  const now = new Date().toISOString()
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('operations_incidents')
    .update({
      status: 'acknowledged',
      acknowledged_at: now,
      acknowledged_by: guard.authState.userId,
    })
    .eq('id', id.data)
    .eq('status', 'open')
    .select('id')
    .maybeSingle()

  if (error || !data) return { error: 'Incydent nie jest już aktywny' }
  await writeAudit(guard.authState.userId, 'operations_incident_acknowledge', 'operations_incident', id.data)
  revalidatePath('/operations')
  return { success: true }
}

export async function markNotificationsRead(
  notificationIds: string[],
  csrfToken: string
): Promise<ActionResult> {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token bezpieczeństwa' }
  }
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState?.permissions.canAccessOperations) return { error: 'Brak uprawnień' }

  const ids = [...new Set(notificationIds)]
    .map((id) => uuidSchema.safeParse(id))
    .filter((result): result is z.ZodSafeParseSuccess<string> => result.success)
    .map((result) => result.data)
    .slice(0, 100)
  if (ids.length === 0) return { success: true }

  const admin = getAdminClient()
  const { error } = await admin.from('operations_notification_reads').upsert(
    ids.map((notificationId) => ({
      notification_id: notificationId,
      user_id: authState.userId,
    })),
    { onConflict: 'notification_id,user_id' }
  )
  if (error) return { error: 'Nie udało się oznaczyć powiadomień' }
  revalidatePath('/operations')
  return { success: true }
}

export async function createMaintenanceWindow(
  input: z.input<typeof maintenanceSchema>,
  csrfToken: string
): Promise<ActionResult<{ id: string }>> {
  const parsed = maintenanceSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Nieprawidłowe dane' }
  const guard = await requireMutationPermission(csrfToken, 'manage')
  if (!guard.ok) return { error: guard.error }

  const admin = getAdminClient()
  const { data, error } = await admin
    .from('operations_maintenance_windows')
    .insert({
      module_key: parsed.data.moduleKey,
      title: parsed.data.title,
      reason: parsed.data.reason,
      scheduled_start: parsed.data.scheduledStart,
      scheduled_end: parsed.data.scheduledEnd,
      created_by: guard.authState.userId,
    })
    .select('id')
    .single()

  if (error || !data) return { error: 'Nie udało się zaplanować prac' }
  await admin.from('operations_notifications').insert({
    kind: 'maintenance_scheduled',
    severity: 'info',
    title: parsed.data.title,
    body: parsed.data.reason,
    module_key: parsed.data.moduleKey,
    href: '/operations?section=maintenance',
    dedupe_key: `maintenance:${data.id}`,
  })
  await writeAudit(
    guard.authState.userId,
    'operations_maintenance_create',
    'operations_maintenance',
    data.id,
    { module_key: parsed.data.moduleKey }
  )
  revalidatePath('/operations')
  return { success: true, data }
}

export async function updateMaintenanceStatus(
  maintenanceId: string,
  status: 'active' | 'completed' | 'cancelled',
  csrfToken: string
): Promise<ActionResult> {
  const id = uuidSchema.safeParse(maintenanceId)
  if (!id.success) return { error: 'Nieprawidłowy identyfikator prac' }
  const guard = await requireMutationPermission(csrfToken, 'manage')
  if (!guard.ok) return { error: guard.error }

  const now = new Date().toISOString()
  const update = status === 'active'
    ? { status, started_at: now }
    : { status, ended_at: now }
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('operations_maintenance_windows')
    .update(update)
    .eq('id', id.data)
    .in('status', ['scheduled', 'active'])
    .select('id')
    .maybeSingle()

  if (error || !data) return { error: 'Nie można zmienić stanu tych prac' }
  await writeAudit(
    guard.authState.userId,
    'operations_maintenance_status',
    'operations_maintenance',
    id.data,
    { status }
  )
  revalidatePath('/operations')
  return { success: true }
}

export async function captureOperationsSnapshot(
  name: string,
  csrfToken: string
): Promise<ActionResult<{ id: string }>> {
  const safeName = z.string().trim().min(3).max(120).safeParse(name)
  if (!safeName.success) return { error: 'Nazwa migawki musi mieć od 3 do 120 znaków' }
  const guard = await requireMutationPermission(csrfToken, 'manage')
  if (!guard.ok) return { error: guard.error }

  const admin = getAdminClient()
  const [
    { data: latestSamples },
    { data: incidents },
    { data: deployments },
    { data: maintenance },
  ] = await Promise.all([
    admin
      .from('operations_status_samples')
      .select('service_key, module_key, status, detail, latency_ms, checked_at')
      .order('checked_at', { ascending: false })
      .limit(50),
    admin
      .from('operations_incidents')
      .select('id, service_key, module_key, severity, status, title, detail, started_at, resolved_at')
      .in('status', ['open', 'acknowledged']),
    admin
      .from('operations_deployments')
      .select('module_key, sha, short_sha, status, message, deployed_at')
      .order('recorded_at', { ascending: false })
      .limit(20),
    admin
      .from('operations_maintenance_windows')
      .select('id, module_key, title, status, scheduled_start, scheduled_end')
      .in('status', ['scheduled', 'active']),
  ])

  const latestByService = Object.values(
    (latestSamples ?? []).reduce<Record<string, NonNullable<typeof latestSamples>[number]>>((result, sample) => {
      if (!result[sample.service_key]) result[sample.service_key] = sample
      return result
    }, {})
  )

  const snapshot = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    services: latestByService,
    incidents: incidents ?? [],
    deployments: deployments ?? [],
    maintenance: maintenance ?? [],
  }
  const { data, error } = await admin
    .from('operations_snapshots')
    .insert({
      name: safeName.data,
      captured_by: guard.authState.userId,
      data: snapshot as unknown as Json,
    })
    .select('id')
    .single()

  if (error || !data) return { error: 'Nie udało się utworzyć migawki' }
  await writeAudit(
    guard.authState.userId,
    'operations_snapshot_create',
    'operations_snapshot',
    data.id,
    { name: safeName.data }
  )
  revalidatePath('/operations')
  return { success: true, data }
}

export async function revealOperationsShortcut(
  shortcutId: string,
  csrfToken: string
): Promise<ActionResult<{ alias: string }>> {
  const id = uuidSchema.safeParse(shortcutId)
  if (!id.success) return { error: 'Nieprawidłowy identyfikator skrótu' }
  const guard = await requireMutationPermission(csrfToken, 'shortcuts')
  if (!guard.ok) return { error: guard.error }

  const admin = getAdminClient()
  const { data } = await admin
    .from('operations_shortcuts')
    .select('id, alias_key, label, enabled')
    .eq('id', id.data)
    .eq('enabled', true)
    .maybeSingle()
  if (!data) return { error: 'Skrót nie istnieje lub jest wyłączony' }

  const alias = SHORTCUT_ALIASES[data.alias_key]
  if (!alias) return { error: 'Alias nie jest skonfigurowany na serwerze' }

  await writeAudit(
    guard.authState.userId,
    'operations_shortcut_reveal',
    'operations_shortcut',
    data.id,
    { label: data.label, alias_key: data.alias_key }
  )
  return { success: true, data: { alias } }
}
