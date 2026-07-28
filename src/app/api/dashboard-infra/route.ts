import { NextResponse } from 'next/server'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'

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
  alias: string
  aliasType: 'prod' | 'lab' | 'tunnel' | 'router'
}

const INFRASTRUCTURE_RESOURCES: InfrastructureResource[] = [
  {
    module: 'vez',
    label: 'VEZcore',
    href: 'https://vezcore.vezlabs.dev',
    description: 'Dashboard produkcyjny',
    alias: 'ssh vezlabs-coolify',
    aliasType: 'lab',
  },
  {
    module: 'vezVision',
    label: 'Hetzner Cloud',
    href: 'https://console.hetzner.cloud/projects',
    description: 'Panel produkcyjnej chmury',
    alias: 'ssh vez-prod',
    aliasType: 'prod',
  },
  {
    module: 'vezVision',
    label: 'VEZvision',
    href: 'https://vezvision.com',
    description: 'Strona produkcyjna',
    alias: 'ssh vez-prod',
    aliasType: 'prod',
  },
  {
    module: 'vezVision',
    label: 'API health',
    href: 'https://api.vezvision.com/healthz',
    description: 'Status API produkcji',
    alias: 'ssh vez-prod',
    aliasType: 'prod',
  },
  {
    module: 'vezVision',
    label: 'DB tunnel',
    href: 'https://api.vezvision.com/healthz',
    description: 'Tunel do bazy PostgreSQL',
    alias: 'ssh -N vezvision-db-tunnel',
    aliasType: 'tunnel',
  },
  {
    module: 'vezLabs',
    label: 'VEZcore test',
    href: 'https://vezcoretest.vezlabs.dev',
    description: 'Środowisko testowe',
    alias: 'ssh vezlabs-coolify',
    aliasType: 'lab',
  },
  {
    module: 'vezLabs',
    label: 'Proxmox',
    href: 'https://10.77.40.2:8006/',
    description: 'Maszyny wirtualne',
    alias: 'ssh vezlabs-pve',
    aliasType: 'lab',
  },
  {
    module: 'vezLabs',
    label: 'Coolify',
    href: 'https://10.77.30.35:8000/',
    description: 'Deploy i aplikacje',
    alias: 'ssh vezlabs-coolify',
    aliasType: 'lab',
  },
  {
    module: 'vezLabs',
    label: 'Router',
    href: 'https://192.168.2.1/',
    description: 'Sieć i VLAN',
    alias: 'ssh vezlabs-router',
    aliasType: 'router',
  },
  {
    module: 'vezLabs',
    label: 'Monitor',
    href: 'https://monitor.vezlabs.dev',
    description: 'Panel monitoringu',
    alias: 'ssh vezlabs-coolify',
    aliasType: 'lab',
  },
  {
    module: 'vezLabs',
    label: 'Lab API health',
    href: 'https://api.vezlabs.dev/healthz',
    description: 'Status API labu',
    alias: 'ssh vezlabs-coolify',
    aliasType: 'lab',
  },
]

const HEALTH_CHECKS = [
  { key: 'prodApi', label: 'Prod API', url: 'https://api.vezvision.com/healthz' },
  { key: 'labApi', label: 'Lab API', url: 'https://api.vezlabs.dev/healthz' },
  { key: 'vezcore', label: 'VEZcore', url: 'https://vezcore.vezlabs.dev/login' },
  { key: 'monitor', label: 'Monitor', url: 'https://monitor.vezlabs.dev' },
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

async function getLatestDeploy(): Promise<DeployInfo> {
  const headers: HeadersInit = {
    accept: 'application/vnd.github+json',
    'user-agent': 'vezcore-dashboard',
  }
  if (process.env.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  try {
    const response = await fetch(
      'https://api.github.com/repos/VEZhq/vezcore/actions/workflows/deploy-coolify.yml/runs?branch=main&per_page=1',
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

  const [healthResults, deploy] = await Promise.all([
    Promise.all(HEALTH_CHECKS.map(async (check) => [check.key, await checkEndpoint(check.url, check.label)] as const)),
    getLatestDeploy(),
  ])

  const checks = Object.fromEntries(healthResults)

  return NextResponse.json(
    {
      checkedAt: new Date().toISOString(),
      checks,
      deploy,
      incidents: buildIncidents(checks, deploy),
      resources: INFRASTRUCTURE_RESOURCES,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
