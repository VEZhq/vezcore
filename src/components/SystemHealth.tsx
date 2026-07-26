'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Check,
  ChevronDown,
  Circle,
  Copy,
  ExternalLink,
  Eye,
  FlaskConical,
  GitBranch,
  Server,
} from 'lucide-react'

type EnvironmentFilter = 'all' | 'production' | 'labs' | 'monitor'
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
    url: string | null
  }
  incidents: Array<{
    severity: 'info' | 'warning' | 'error'
    label: string
    detail: string
  }>
}

type AccessGroup = {
  id: Exclude<EnvironmentFilter, 'all'>
  name: string
  icon: typeof Server
  color: 'emerald' | 'blue' | 'cyan'
  description: string
  healthKeys: string[]
  items: Array<{
    label: string
    href: string
    description: string
    alias: string
    aliasType: 'prod' | 'lab' | 'tunnel' | 'router'
    aliasDescription: string
  }>
}

const filters: Array<{ id: EnvironmentFilter; label: string }> = [
  { id: 'all', label: 'Wszystko' },
  { id: 'production', label: 'Production' },
  { id: 'labs', label: 'Labs' },
  { id: 'monitor', label: 'Monitor' },
]

const accessGroups: AccessGroup[] = [
  {
    id: 'production',
    name: 'Hetzner',
    icon: Server,
    color: 'emerald',
    description: 'Produkcja, API i tunel bazy',
    healthKeys: ['prodApi'],
    items: [
      {
        label: 'Hetzner Cloud',
        href: 'https://console.hetzner.cloud/projects',
        description: 'Panel infrastruktury produkcyjnej',
        alias: 'ssh vez-prod',
        aliasType: 'prod',
        aliasDescription: 'root na hoście produkcyjnym',
      },
      {
        label: 'VEZvision',
        href: 'https://vezvision.com',
        description: 'Publiczna produkcja VEZvision',
        alias: 'ssh vez-prod',
        aliasType: 'prod',
        aliasDescription: 'wejście na host produkcji',
      },
      {
        label: 'API health',
        href: 'https://api.vezvision.com/healthz',
        description: 'Publiczny healthcheck API',
        alias: 'ssh vez-prod',
        aliasType: 'prod',
        aliasDescription: 'diagnostyka usług API',
      },
      {
        label: 'DB tunnel',
        href: 'https://api.vezvision.com/healthz',
        description: 'Tunel do bazy przez host produkcyjny',
        alias: 'ssh -N vezvision-db-tunnel',
        aliasType: 'tunnel',
        aliasDescription: 'lokalny tunel PostgreSQL',
      },
    ],
  },
  {
    id: 'labs',
    name: 'Labs',
    icon: FlaskConical,
    color: 'blue',
    description: 'VEZlabs, Proxmox i Coolify',
    healthKeys: ['labApi', 'vezcore'],
    items: [
      {
        label: 'VEZcore',
        href: 'https://vezcore.vezlabs.dev',
        description: 'Prywatny VEZcore w labie',
        alias: 'ssh vezlabs-coolify',
        aliasType: 'lab',
        aliasDescription: 'VM Coolify w VLAN Servers',
      },
      {
        label: 'VEZcore test',
        href: 'https://vezcoretest.vezlabs.dev',
        description: 'Pre-production dla develop',
        alias: 'ssh vezlabs-coolify',
        aliasType: 'lab',
        aliasDescription: 'host deployów testowych',
      },
      {
        label: 'Proxmox',
        href: 'https://10.77.40.2:8006/',
        description: 'Hypervisor VEZlab',
        alias: 'ssh vezlabs-pve',
        aliasType: 'lab',
        aliasDescription: 'Proxmox przez router',
      },
      {
        label: 'Coolify',
        href: 'https://10.77.30.35:8000/',
        description: 'Panel self-hostingu labu',
        alias: 'ssh vezlabs-coolify',
        aliasType: 'lab',
        aliasDescription: 'root na VM Coolify',
      },
      {
        label: 'Router',
        href: 'https://192.168.2.1/',
        description: 'OpenWrt i trasy VLAN',
        alias: 'ssh vezlabs-router',
        aliasType: 'router',
        aliasDescription: 'router VEZlab',
      },
    ],
  },
  {
    id: 'monitor',
    name: 'Monitor',
    icon: Activity,
    color: 'cyan',
    description: 'Monitoring i healthchecki',
    healthKeys: ['monitor', 'labApi', 'prodApi'],
    items: [
      {
        label: 'Monitor',
        href: 'https://monitor.vezlabs.dev',
        description: 'Dashboard monitoringu',
        alias: 'ssh vezlabs-coolify',
        aliasType: 'lab',
        aliasDescription: 'serwis monitoringu w labie',
      },
      {
        label: 'Lab API health',
        href: 'https://api.vezlabs.dev/healthz',
        description: 'Healthcheck API labu',
        alias: 'ssh vezlabs-coolify',
        aliasType: 'lab',
        aliasDescription: 'diagnostyka lab gateway',
      },
      {
        label: 'Prod API health',
        href: 'https://api.vezvision.com/healthz',
        description: 'Healthcheck API produkcji',
        alias: 'ssh vez-prod',
        aliasType: 'prod',
        aliasDescription: 'diagnostyka produkcji',
      },
    ],
  },
]

const colorClasses: Record<AccessGroup['color'], { text: string; border: string; bg: string }> = {
  emerald: {
    text: 'text-emerald-400 light:text-emerald-600',
    border: 'hover:border-emerald-400/30 light:hover:border-emerald-600/25',
    bg: 'hover:bg-emerald-500/[0.04]',
  },
  blue: {
    text: 'text-blue-400 light:text-blue-600',
    border: 'hover:border-blue-400/30 light:hover:border-blue-600/25',
    bg: 'hover:bg-blue-500/[0.04]',
  },
  cyan: {
    text: 'text-cyan-400 light:text-cyan-600',
    border: 'hover:border-cyan-400/30 light:hover:border-cyan-600/25',
    bg: 'hover:bg-cyan-500/[0.04]',
  },
}

const statusClasses: Record<HealthStatus, { dot: string; label: string; text: string }> = {
  checking: { dot: 'bg-[#555555]', label: 'Sprawdzam', text: 'text-[#888888]' },
  healthy: { dot: 'bg-emerald-400', label: 'Działa', text: 'text-emerald-400 light:text-emerald-600' },
  warning: { dot: 'bg-amber-400', label: 'Uwaga', text: 'text-amber-400 light:text-amber-600' },
  error: { dot: 'bg-red-400', label: 'Nie działa', text: 'text-red-400 light:text-red-600' },
  unknown: { dot: 'bg-[#666666]', label: 'Brak danych', text: 'text-[#888888]' },
}

const aliasTypeClasses: Record<AccessGroup['items'][number]['aliasType'], string> = {
  prod: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 light:text-emerald-700',
  lab: 'border-blue-500/20 bg-blue-500/10 text-blue-400 light:text-blue-700',
  tunnel: 'border-purple-500/20 bg-purple-500/10 text-purple-400 light:text-purple-700',
  router: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400 light:text-cyan-700',
}

function getWorstStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes('error')) return 'error'
  if (statuses.includes('warning')) return 'warning'
  if (statuses.includes('unknown')) return 'unknown'
  if (statuses.includes('checking')) return 'checking'
  return 'healthy'
}

function formatDeployTime(value: string | null): string {
  if (!value) return 'brak czasu'
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getDeployHealthStatus(status: DeployStatus | undefined): HealthStatus {
  if (status === 'success') return 'healthy'
  if (status === 'failure') return 'error'
  if (status === 'pending') return 'warning'
  return 'unknown'
}

export function SystemHealth() {
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<EnvironmentFilter>('all')
  const [revealedAliases, setRevealedAliases] = useState<string[]>([])
  const [copiedAlias, setCopiedAlias] = useState<string | null>(null)
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

  const visibleGroups = useMemo(
    () => activeFilter === 'all'
      ? accessGroups
      : accessGroups.filter((group) => group.id === activeFilter),
    [activeFilter]
  )

  async function handleAliasClick(key: string, alias: string) {
    if (!revealedAliases.includes(key)) {
      setRevealedAliases((current) => [...current, key])
      return
    }

    try {
      await navigator.clipboard.writeText(alias)
      setCopiedAlias(key)
      window.setTimeout(() => setCopiedAlias(null), 1400)
    } catch {
      setCopiedAlias(null)
    }
  }

  function getGroupStatuses(group: AccessGroup): HealthStatus[] {
    if (!infraData) return ['checking']
    const statuses: HealthStatus[] = group.healthKeys.map((key) => infraData.checks[key]?.status ?? 'unknown')

    if (group.id === 'labs') {
      statuses.push(getDeployHealthStatus(infraData.deploy.status))
    }

    return statuses
  }

  function getGroupStatus(group: AccessGroup): HealthStatus {
    const statuses = getGroupStatuses(group)
    return getWorstStatus(statuses)
  }

  function getGroupIssues(group: AccessGroup) {
    if (!infraData) return []

    const checkLabels = new Set(
      group.healthKeys
        .map((key) => infraData.checks[key]?.label)
        .filter(Boolean)
    )

    return infraData.incidents.filter((incident) => {
      if (group.id === 'labs' && incident.label === 'Deploy') return true
      return checkLabels.has(incident.label)
    })
  }

  const deploy = infraData?.deploy
  const deployStatus = statusClasses[getDeployHealthStatus(deploy?.status)]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/60 light:bg-white/80 p-1">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition-colors ${
                activeFilter === filter.id
                  ? 'bg-white/[0.08] text-white light:bg-black/[0.06] light:text-black'
                  : 'text-[#555555] light:text-[#999999] hover:text-white light:hover:text-black'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <p className="text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#999999]">
          Kafelki pokazują status usług
        </p>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${visibleGroups.length === 1 ? '' : 'lg:grid-cols-3'}`}>
        {visibleGroups.map((group) => {
          const isOpen = openGroup === group.name
          const Icon = group.icon
          const colors = colorClasses[group.color]
          const status = getGroupStatus(group)
          const statusMeta = statusClasses[status]
          const groupIssues = getGroupIssues(group)
          const statusDetail = infraData
            ? `Sprawdzono ${formatDeployTime(infraData.checkedAt)}`
            : 'Sprawdzam usługi'

          return (
            <div
              key={group.name}
              className={`border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-all duration-300 ${colors.border} ${colors.bg}`}
            >
              <button
                type="button"
                onClick={() => setOpenGroup(isOpen ? null : group.name)}
                className="flex w-full items-center justify-between gap-4 p-4 text-left"
                aria-expanded={isOpen}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/[0.06] light:border-black/[0.06] bg-white/[0.03] light:bg-black/[0.03]">
                    <Icon className={`h-5 w-5 ${colors.text}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white light:text-black">{group.name}</p>
                      <span className={`inline-flex h-2 w-2 rounded-full ${statusMeta.dot}`} />
                    </div>
                    <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.18em] text-[#555555] light:text-[#999999]">
                      {group.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.12em] text-[#555555] light:text-[#999999]">
                      <span>{statusDetail}</span>
                      {group.id === 'labs' && (
                        <span className={deployStatus.text}>
                          Deploy {deploy?.shortSha ?? 'brak nr'} / {formatDeployTime(deploy?.completedAt ?? null)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`text-[9px] uppercase tracking-[0.16em] ${statusMeta.text}`}>
                    {statusMeta.label}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-[#555555] light:text-[#999999] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-white/[0.06] light:border-black/[0.06] p-3">
                  <div className="mb-3 grid gap-2">
                    {group.healthKeys.map((key) => {
                      const check = infraData?.checks[key]
                      const checkStatus = check ? statusClasses[check.status] : statusClasses.checking
                      return (
                        <div key={key} className="flex items-center justify-between gap-3 text-[10px]">
                          <span className="text-[#777777] light:text-[#888888]">{check?.label ?? key}</span>
                          <span className={`inline-flex items-center gap-2 ${checkStatus.text}`}>
                            <Circle className={`h-2 w-2 fill-current ${checkStatus.text}`} />
                            {check?.latencyMs ? `${check.detail} / ${check.latencyMs}ms` : checkStatus.label}
                          </span>
                        </div>
                      )
                    })}
                    {group.id === 'labs' && (
                      <div className="flex items-center justify-between gap-3 text-[10px]">
                        <span className="text-[#777777] light:text-[#888888]">Deploy</span>
                        <div className="inline-flex items-center gap-2">
                          <span className={`inline-flex items-center gap-2 ${deployStatus.text}`}>
                            <Circle className={`h-2 w-2 fill-current ${deployStatus.text}`} />
                            {deploy?.shortSha ? `${deploy.shortSha} / ${formatDeployTime(deploy.completedAt)}` : deployStatus.label}
                          </span>
                          {deploy?.url && (
                            <a href={deploy.url} target="_blank" rel="noreferrer" className="text-[#666666] hover:text-white light:text-[#888888] light:hover:text-black transition-colors">
                              <GitBranch className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-3 space-y-2 border border-white/[0.04] light:border-black/[0.04] bg-white/[0.02] light:bg-black/[0.02] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#555555] light:text-[#999999]">Do sprawdzenia</p>
                    {(groupIssues.length > 0 ? groupIssues : [{ severity: 'info' as const, label: group.name, detail: 'Brak rzeczy do sprawdzenia' }]).map((incident) => {
                      const tone = incident.severity === 'error'
                        ? 'text-red-400 light:text-red-600'
                        : incident.severity === 'warning'
                          ? 'text-amber-400 light:text-amber-600'
                          : 'text-emerald-400 light:text-emerald-600'

                      return (
                        <div key={`${group.name}-${incident.label}-${incident.detail}`} className="flex items-start gap-2 text-[11px]">
                          <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone}`} />
                          <p className="min-w-0 text-[#777777] light:text-[#777777]">
                            <span className={`font-medium ${tone}`}>{incident.label}</span>
                            {' / '}
                            {incident.detail}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  <div className="space-y-2">
                    {group.items.map((item) => {
                      const itemKey = `${group.name}-${item.label}`
                      const isRevealed = revealedAliases.includes(itemKey)
                      const isCopied = copiedAlias === itemKey

                      return (
                        <div
                          key={`${group.name}-${item.label}`}
                          className="flex flex-col gap-3 border border-white/[0.04] light:border-black/[0.04] bg-white/[0.02] light:bg-black/[0.02] p-3"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <a
                              href={item.href}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-w-0 items-center gap-2 text-xs text-white light:text-black hover:text-emerald-400 light:hover:text-emerald-600 transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </a>
                            <span className={`w-fit rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${aliasTypeClasses[item.aliasType]}`}>
                              {item.aliasType}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#666666] light:text-[#999999]">{item.description}</p>

                          <button
                            type="button"
                            onClick={() => handleAliasClick(itemKey, item.alias)}
                            className="group/alias inline-flex min-h-8 w-full items-center justify-between gap-3 rounded-md border border-white/[0.06] light:border-black/[0.08] bg-[#050505]/80 light:bg-white px-3 py-2 font-mono text-[11px] text-[#777777] light:text-[#777777] hover:text-white light:hover:text-black transition-colors"
                            title={isRevealed ? 'Kliknij, aby skopiować alias SSH' : 'Najedź lub kliknij, aby odsłonić alias SSH'}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              {isCopied ? (
                                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400 light:text-emerald-600" />
                              ) : isRevealed ? (
                                <Copy className="h-3.5 w-3.5 shrink-0" />
                              ) : (
                                <Eye className="h-3.5 w-3.5 shrink-0" />
                              )}
                              <span className={isRevealed ? 'hidden' : 'truncate group-hover/alias:hidden'}>ssh •••••••</span>
                              <span className={isRevealed ? 'truncate' : 'hidden truncate group-hover/alias:inline'}>{item.alias}</span>
                            </span>
                            <span className="hidden shrink-0 text-[10px] text-[#555555] light:text-[#999999] sm:inline">
                              {item.aliasDescription}
                            </span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}
