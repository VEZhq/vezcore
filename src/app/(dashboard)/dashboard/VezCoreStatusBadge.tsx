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

const statusMeta: Record<HealthStatus, { label: string; dot: string; text: string }> = {
  checking: { label: 'Sprawdzam', dot: 'bg-[#555555]', text: 'text-[#888888]' },
  healthy: { label: 'Działa', dot: 'bg-emerald-400', text: 'text-emerald-400 light:text-emerald-600' },
  warning: { label: 'Uwaga', dot: 'bg-amber-400', text: 'text-amber-400 light:text-amber-600' },
  error: { label: 'Nie działa', dot: 'bg-red-400', text: 'text-red-400 light:text-red-600' },
  unknown: { label: 'Brak danych', dot: 'bg-[#666666]', text: 'text-[#888888]' },
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

function formatStatusTime(value: string | null | undefined): string {
  if (!value) return 'brak daty'
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function VezCoreStatusBadge() {
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

  const check = infraData?.checks.vezcore
  const deployStatus = getDeployHealthStatus(infraData?.deploy.status)
  const status = getWorstStatus([
    check?.status ?? 'checking',
    infraData ? deployStatus : 'checking',
  ])
  const meta = statusMeta[status]
  const deployMeta = statusMeta[deployStatus]
  const latency = check?.latencyMs ? ` / ${check.latencyMs}ms` : ''
  const problemDetails = [
    check && (check.status === 'warning' || check.status === 'error') ? `VEZcore: ${check.detail}${latency}` : null,
    deployStatus === 'warning' || deployStatus === 'error'
      ? `Deploy: ${infraData?.deploy.message ?? deployMeta.label} / ${infraData?.deploy.shortSha ?? 'brak nr'} / ${formatStatusTime(infraData?.deploy.completedAt)}`
      : null,
  ].filter((detail): detail is string => Boolean(detail))
  const showProblemTooltip = status === 'warning' || status === 'error'

  return (
    <div
      className="group/status absolute right-4 top-4 z-20 hidden min-w-[220px] border border-white/[0.06] light:border-black/[0.08] bg-[#0a0a0a]/80 light:bg-white/90 px-3 py-2 text-[10px] uppercase tracking-[0.16em] backdrop-blur-xl sm:block"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-white light:text-black">VEZcore</span>
        <span className={`inline-flex items-center gap-2 ${meta.text}`}>
          <Circle className={`h-2 w-2 fill-current ${meta.text}`} />
          {meta.label}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 text-[#555555] light:text-[#999999]">
        <span className="inline-flex items-center gap-1.5">
          <GitBranch className="h-3 w-3" />
          Deploy
        </span>
        <span className={deployMeta.text}>{infraData?.deploy.shortSha ?? 'brak nr'}</span>
      </div>
      {showProblemTooltip && problemDetails.length > 0 && (
        <div className="pointer-events-none absolute right-0 top-full z-30 mt-2 hidden w-80 max-w-[80vw] border border-white/[0.08] light:border-black/[0.08] bg-[#050505] light:bg-white p-3 text-left text-[10px] font-normal normal-case tracking-normal text-[#b5b5b5] light:text-[#555555] shadow-2xl group-hover/status:block">
          <span className="mb-1 block font-medium uppercase tracking-[0.14em] text-white light:text-black">Co się stało</span>
          {problemDetails.map((detail) => (
            <span key={detail} className="block leading-relaxed">{detail}</span>
          ))}
        </div>
      )}
    </div>
  )
}
