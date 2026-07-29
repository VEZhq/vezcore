import { NextResponse } from 'next/server'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'
import { createActionClient } from '@/lib/supabase/server'
import { recordOperationsState } from '@/lib/operations/record'
import { logError } from '@/lib/logger'

type HealthStatus = 'healthy' | 'warning' | 'error' | 'unknown'
type DeployStatus = 'success' | 'failure' | 'pending' | 'unknown'

type HealthCheckResult = {
  status: HealthStatus
  label: string
  detail: string
  latencyMs?: number
}

type DeployInfo = {
  status: DeployStatus
  sha: string | null
  shortSha: string | null
  message: string
  completedAt: string | null
  url: string | null
}

type InfrastructureResource = {
  module: 'vez' | 'vezVision' | 'vezLabs'
  label: string
  href: string
  description: string
}

const INFRASTRUCTURE_RESOURCES: InfrastructureResource[] = [
  {
    module: 'vez',
    label: 'VEZcore',
    href: 'https://vezcore.vezlabs.dev',
    description: 'Dashboard produkcyjny',
  },
  {
    module: 'vezVision',
    label: 'Hetzner Cloud',
    href: 'https://console.hetzner.cloud/projects',
    description: 'Panel produkcyjnej chmury',
  },
  {
    module: 'vezVision',
    label: 'API health',
    href: 'https://api.vezvision.com/healthz',
    description: 'Status API produkcji',
  },
  {
    module: 'vezVision',
    label: 'DB tunnel',
    href: 'https://api.vezvision.com/healthz',
    description: 'Tunel do bazy PostgreSQL',
  },
  {
    module: 'vezLabs',
    label: 'Proxmox',
    href: 'https://10.77.40.2:8006/',
    description: 'Maszyny wirtualne',
  },
  {
    module: 'vezLabs',
    label: 'Coolify',
    href: 'https://10.77.30.35:8000/',
    description: 'Deploy i aplikacje',
  },
  {
    module: 'vezLabs',
    label: 'Router',
    href: 'https://192.168.2.1/',
    description: 'Sieć i VLAN',
  },
  {
    module: 'vezLabs',
    label: 'Monitor',
    href: 'https://monitor.vezlabs.dev',
    description: 'Panel monitoringu',
  },
  {
    module: 'vezLabs',
    label: 'MinIO',
    href: 'https://s3-dev.vezlabs.dev',
    description: 'Storage obiektowy',
  },
  {
    module: 'vezLabs',
    label: 'Lab API health',
    href: 'https://api.vezlabs.dev/healthz',
    description: 'Status API labu',
  },
]

const HEALTH_CHECKS = [
  { key: 'prodApi', label: 'Prod API', url: 'https://api.vezvision.com/healthz' },
  { key: 'labApi', label: 'Lab API', url: 'https://api.vezlabs.dev/healthz' },
  { key: 'vezcore', label: 'VEZcore', url: 'https://vezcore.vezlabs.dev/login' },
  { key: 'monitor', label: 'Monitor', url: 'https://monitor.vezlabs.dev' },
  { key: 'minio', label: 'MinIO', url: 'https://s3-dev.vezlabs.dev/minio/health/ready' },
] as const

async function checkEndpoint(url: string, label: string): Promise<HealthCheckResult> {
  const started = Date.now()

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
      headers: { accept: 'application/json,text/html;q=0.8,*/*;q=0.5' },
    })

    const latencyMs = Date.now() - started
    if (!response.ok) {
      return {
        status: response.status >= 500 ? 'error' : 'warning',
        label,
        detail: `HTTP ${response.status}`,
        latencyMs,
      }
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const body = await response.json().catch(() => null) as { status?: string } | null
      if (body?.status && ['unhealthy', 'error', 'down'].includes(body.status.toLowerCase())) {
        return { status: 'error', label, detail: body.status, latencyMs }
      }
      if (body?.status && ['degraded', 'warning', 'warn'].includes(body.status.toLowerCase())) {
        return { status: 'warning', label, detail: body.status, latencyMs }
      }
    }

    return { status: 'healthy', label, detail: 'OK', latencyMs }
  } catch {
    return { status: 'unknown', label, detail: 'Brak odpowiedzi' }
  }
}

async function checkDatabase(): Promise<HealthCheckResult> {
  const started = Date.now()

  try {
    const client = await createActionClient()
    const { error } = await client
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    const latencyMs = Date.now() - started
    if (error) {
      return { status: 'error', label: 'Core DB', detail: 'Błąd zapytania', latencyMs }
    }

    return {
      status: latencyMs > 500 ? 'warning' : 'healthy',
      label: 'Core DB',
      detail: latencyMs > 500 ? 'Wysokie opóźnienie' : 'OK',
      latencyMs,
    }
  } catch {
    return { status: 'error', label: 'Core DB', detail: 'Brak połączenia' }
  }
}

async function getLatestDeploy(
  repository: string,
  workflow?: string
): Promise<DeployInfo> {
  const headers: HeadersInit = {
    accept: 'application/vnd.github+json',
    'user-agent': 'vezcore-dashboard',
  }
  if (process.env.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  try {
    const workflowPath = workflow ? `/workflows/${workflow}` : ''
    const response = await fetch(
      `https://api.github.com/repos/${repository}/actions${workflowPath}/runs?branch=main&per_page=1`,
      { cache: 'no-store', signal: AbortSignal.timeout(5000), headers }
    )

    if (!response.ok) throw new Error('github_unavailable')

    const body = await response.json() as {
      workflow_runs?: Array<{
        status?: string
        conclusion?: string | null
        head_sha?: string | null
        display_title?: string | null
        html_url?: string | null
        updated_at?: string | null
      }>
    }
    const run = body.workflow_runs?.[0]
    if (!run) throw new Error('deploy_missing')

    const conclusion = run.conclusion ?? run.status ?? 'unknown'
    const status: DeployStatus =
      conclusion === 'success'
        ? 'success'
        : ['failure', 'cancelled', 'timed_out'].includes(conclusion)
          ? 'failure'
          : ['queued', 'in_progress', 'requested', 'waiting'].includes(conclusion)
            ? 'pending'
            : 'unknown'

    return {
      status,
      sha: run.head_sha ?? null,
      shortSha: run.head_sha?.slice(0, 7) ?? null,
      message: run.display_title ?? 'Deploy to Coolify',
      completedAt: run.updated_at ?? null,
      url: run.html_url ?? null,
    }
  } catch {
    return {
      status: 'unknown',
      sha: null,
      shortSha: null,
      message: 'Nie można pobrać ostatniego deploya',
      completedAt: null,
      url: null,
    }
  }
}

function buildIncidents(checks: Record<string, HealthCheckResult>, deploy: DeployInfo) {
  const incidents: Array<{ severity: 'info' | 'warning' | 'error'; label: string; detail: string }> = []

  for (const check of Object.values(checks)) {
    if (check.status === 'error') {
      incidents.push({ severity: 'error', label: check.label, detail: check.detail })
    } else if (check.status === 'warning' || check.status === 'unknown') {
      incidents.push({ severity: 'warning', label: check.label, detail: check.detail })
    }
  }

  if (deploy.status === 'failure') {
    incidents.push({ severity: 'error', label: 'Deploy', detail: deploy.message })
  } else if (deploy.status === 'pending' || deploy.status === 'unknown') {
    incidents.push({ severity: 'warning', label: 'Deploy', detail: deploy.message })
  }

  if (incidents.length === 0) {
    incidents.push({ severity: 'info', label: 'Operacje', detail: 'Brak rzeczy do sprawdzenia' })
  }

  return incidents.slice(0, 5)
}

export async function GET() {
  const authState = await getAuthenticatedUserPermissionState()
  if (!authState) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!authState.permissions.canAccessInfrastructure) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const [healthResults, database, coreDeploy, visionDeploy] = await Promise.all([
    Promise.all(HEALTH_CHECKS.map(async (check) => [check.key, await checkEndpoint(check.url, check.label)] as const)),
    checkDatabase(),
    getLatestDeploy('VEZhq/vezcore', 'deploy-coolify.yml'),
    getLatestDeploy('VEZvision/vezvision.com'),
  ])

  const checks = Object.fromEntries([...healthResults, ['database', database]])
  const checkedAt = new Date().toISOString()

  await recordOperationsState(checks, [
    { moduleKey: 'vez', deploy: coreDeploy },
    { moduleKey: 'vezVision', deploy: visionDeploy },
  ], checkedAt).catch((error) => {
    logError('dashboard-infra.record-operations-state', error)
  })

  return NextResponse.json(
    {
      checkedAt,
      checks,
      deploy: visionDeploy,
      coreDeploy,
      incidents: buildIncidents(checks, visionDeploy),
      resources: INFRASTRUCTURE_RESOURCES,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
