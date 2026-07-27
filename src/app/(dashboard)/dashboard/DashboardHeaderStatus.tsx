'use client'

import { useEffect, useState } from 'react'
import { Circle, GitBranch } from 'lucide-react'

type HealthStatus = 'checking' | 'healthy' | 'warning' | 'error' | 'unknown'
type DeployStatus = 'success' | 'failure' | 'pending' | 'unknown'

type InfraData = {
  checkedAt: string
  checks: Record<string, {
    status: Exclude<HealthStatus, 'checking'>
    label: string
    detail: string
    latencyMs?: number
  }>
  deploy: {
    status: DeployStatus
    shortSha: string | null
    message: string
    completedAt: string | null
  }
}

const statusMeta: Record<HealthStatus, { label: string; text: string }> = {
  checking: { label: 'Sprawdzam', text: 'text-[#888888]' },
  healthy: { label: 'System działa', text: 'text-emerald-400 light:text-emerald-600' },
  warning: { label: 'Wymaga uwagi', text: 'text-amber-400 light:text-amber-600' },
  error: { label: 'Problem', text: 'text-red-400 light:text-red-600' },
  unknown: { label: 'Brak danych', text: 'text-[#888888]' },
}

function getWorstStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes('error')) return 'error'
  if (statuses.includes('warning')) return 'warning'
  if (statuses.includes('unknown')) return 'unknown'
  if (statuses.includes('checking')) return 'checking'
  return 'healthy'
}

function getDeployHealthStatus(status: DeployStatus | undefined): HealthStatus {
  if (status === 'success') return 'healthy'
  if (status === 'failure') return 'error'
  if (status === 'pending') return 'warning'
  return 'unknown'
}

export function DashboardHeaderStatus() {
  const [infraData, setInfraData] = useState<InfraData | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/dashboard-infra', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data: InfraData | null) => {
        if (!cancelled) setInfraData(data)
      })
      .catch(() => {
        if (!cancelled) setInfraData(null)
      })

    return () => { cancelled = true }
  }, [])

  const status = getWorstStatus([
    infraData?.checks.vezcore?.status ?? 'checking',
    infraData?.checks.prodApi?.status ?? 'checking',
    infraData ? getDeployHealthStatus(infraData.deploy.status) : 'checking',
  ])
  const meta = statusMeta[status]

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.16em]">
      <span className={`inline-flex items-center gap-2 ${meta.text}`}>
        <Circle className={`h-2 w-2 fill-current ${meta.text}`} />
        {meta.label}
      </span>
      <span className="inline-flex items-center gap-1.5 text-[#555555] light:text-[#999999]">
        <GitBranch className="h-3 w-3" />
        Deploy {infraData?.deploy.shortSha ?? 'brak'}
      </span>
    </div>
  )
}
