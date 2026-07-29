import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'
import type { OperationCheck, OperationDeploy, OperationSeverity } from './types'

const SERVICE_MODULES: Record<string, string> = {
  prodApi: 'vezVision',
  labApi: 'vezLabs',
  vezcore: 'vez',
  monitor: 'vezLabs',
  minio: 'vezLabs',
  database: 'vez',
}

function severityForStatus(status: OperationCheck['status']): Exclude<OperationSeverity, 'info'> {
  return status === 'error' ? 'error' : 'warning'
}

export async function recordOperationsState(
  checks: Record<string, OperationCheck>,
  deployments: Array<{ moduleKey: string; deploy: OperationDeploy }>,
  checkedAt = new Date().toISOString()
) {
  const admin = getAdminClient()
  const now = new Date(checkedAt)

  await admin
    .from('operations_maintenance_windows')
    .update({ status: 'completed', ended_at: checkedAt })
    .in('status', ['scheduled', 'active'])
    .lt('scheduled_end', checkedAt)

  const { data: maintenanceRows } = await admin
    .from('operations_maintenance_windows')
    .select('id, module_key, status, scheduled_start, scheduled_end')
    .in('status', ['scheduled', 'active'])
    .lte('scheduled_start', checkedAt)
    .gte('scheduled_end', checkedAt)

  const maintenanceModules = new Set((maintenanceRows ?? []).map((row) => row.module_key))
  const scheduledIds = (maintenanceRows ?? [])
    .filter((row) => row.status === 'scheduled')
    .map((row) => row.id)

  if (scheduledIds.length > 0) {
    await admin
      .from('operations_maintenance_windows')
      .update({ status: 'active', started_at: checkedAt })
      .in('id', scheduledIds)
  }

  await admin.from('operations_status_samples').insert(
    Object.entries(checks).map(([serviceKey, check]) => ({
      service_key: serviceKey,
      module_key: SERVICE_MODULES[serviceKey] ?? 'vez',
      status: check.status,
      detail: check.detail.slice(0, 500),
      latency_ms: check.latencyMs ?? null,
      checked_at: checkedAt,
    }))
  )

  for (const [serviceKey, check] of Object.entries(checks)) {
    const moduleKey = SERVICE_MODULES[serviceKey] ?? 'vez'
    const { data: activeIncident } = await admin
      .from('operations_incidents')
      .select('id, status')
      .eq('service_key', serviceKey)
      .in('status', ['open', 'acknowledged'])
      .maybeSingle()

    const degraded = check.status !== 'healthy'
    const maintenanceActive = maintenanceModules.has(moduleKey)

    if (degraded && !maintenanceActive) {
      if (activeIncident) {
        await admin
          .from('operations_incidents')
          .update({
            severity: severityForStatus(check.status),
            detail: check.detail.slice(0, 1000),
            last_seen_at: checkedAt,
          })
          .eq('id', activeIncident.id)
      } else {
        const { data: incident } = await admin
          .from('operations_incidents')
          .insert({
            service_key: serviceKey,
            module_key: moduleKey,
            severity: severityForStatus(check.status),
            title: `${check.label}: ${check.status === 'error' ? 'awaria' : 'ostrzeżenie'}`,
            detail: check.detail.slice(0, 1000),
            started_at: checkedAt,
            last_seen_at: checkedAt,
          })
          .select('id')
          .single()

        if (incident) {
          await admin.from('operations_notifications').insert({
            kind: 'incident_opened',
            severity: severityForStatus(check.status),
            title: `${check.label}: wymaga uwagi`,
            body: check.detail.slice(0, 500),
            module_key: moduleKey,
            href: '/operations?section=incidents',
            dedupe_key: `incident-opened:${incident.id}`,
          })
        }
      }
    } else if (!degraded && activeIncident) {
      await admin
        .from('operations_incidents')
        .update({
          status: 'resolved',
          resolved_at: checkedAt,
          last_seen_at: checkedAt,
        })
        .eq('id', activeIncident.id)

      await admin.from('operations_notifications').insert({
        kind: 'incident_resolved',
        severity: 'info',
        title: `${check.label}: działanie przywrócone`,
        body: `Usługa wróciła do stanu prawidłowego o ${now.toISOString()}.`,
        module_key: moduleKey,
        href: '/operations?section=incidents',
        dedupe_key: `incident-resolved:${activeIncident.id}`,
      })
    }
  }

  for (const { moduleKey, deploy } of deployments) {
    if (!deploy.sha || !deploy.shortSha) continue
    const { data: existing } = await admin
      .from('operations_deployments')
      .select('id')
      .eq('module_key', moduleKey)
      .eq('sha', deploy.sha)
      .maybeSingle()

    if (!existing) {
      await admin.from('operations_deployments').insert({
        module_key: moduleKey,
        sha: deploy.sha,
        short_sha: deploy.shortSha,
        status: deploy.status,
        message: deploy.message.slice(0, 500),
        url: deploy.url,
        deployed_at: deploy.completedAt,
      })
      await admin.from('operations_notifications').insert({
        kind: 'deployment',
        severity: deploy.status === 'failure' ? 'error' : deploy.status === 'success' ? 'info' : 'warning',
        title: `Deploy ${moduleKey}: ${deploy.shortSha}`,
        body: deploy.message.slice(0, 500),
        module_key: moduleKey,
        href: deploy.url ?? '/operations?section=deployments',
        dedupe_key: `deployment:${deploy.sha}`,
      })
    }
  }

  const retentionDate = new Date(now)
  retentionDate.setDate(retentionDate.getDate() - 90)
  await admin
    .from('operations_status_samples')
    .delete()
    .lt('checked_at', retentionDate.toISOString())
}
