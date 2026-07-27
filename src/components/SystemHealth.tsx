'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Check,
  ChevronDown,
  Circle,
  Copy,
  ExternalLink,
  Eye,
  FlaskConical,
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
  }
}

type AccessGroup = {
  id: Exclude<EnvironmentFilter, 'all'>
  name: string
  icon: typeof Server
  color: 'emerald' | 'blue' | 'cyan'
  description: string
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
  { id: 'production', label: 'Produkcja' },
  { id: 'labs', label: 'Labs' },
  { id: 'monitor', label: 'Monitor' },
]

const accessGroups: AccessGroup[] = [
  {
    id: 'production',
    name: 'Hetzner',
    icon: Server,
    color: 'emerald',
    description: 'Produkcja i hosty',
    items: [
      {
        label: 'Hetzner Cloud',
        href: 'https://console.hetzner.cloud/projects',
        description: 'Panel chmury',
        alias: 'ssh vez-prod',
        aliasType: 'prod',
        aliasDescription: 'root na hoście produkcyjnym',
      },
      {
        label: 'VEZvision',
        href: 'https://vezvision.com',
        description: 'Strona produkcyjna',
        alias: 'ssh vez-prod',
        aliasType: 'prod',
        aliasDescription: 'wejście na host produkcji',
      },
      {
        label: 'API health',
        href: 'https://api.vezvision.com/healthz',
        description: 'Status API produkcji',
        alias: 'ssh vez-prod',
        aliasType: 'prod',
        aliasDescription: 'diagnostyka usług API',
      },
      {
        label: 'DB tunnel',
        href: 'https://api.vezvision.com/healthz',
        description: 'Tunel do bazy',
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
    description: 'VEZcore, testy i self-hosting',
    items: [
      {
        label: 'VEZcore',
        href: 'https://vezcore.vezlabs.dev',
        description: 'Dashboard produkcyjny VEZcore',
        alias: 'ssh vezlabs-coolify',
        aliasType: 'lab',
        aliasDescription: 'VM Coolify w VLAN Servers',
      },
      {
        label: 'VEZcore test',
        href: 'https://vezcoretest.vezlabs.dev',
        description: 'Środowisko testowe',
        alias: 'ssh vezlabs-coolify',
        aliasType: 'lab',
        aliasDescription: 'host deployów testowych',
      },
      {
        label: 'Proxmox',
        href: 'https://10.77.40.2:8006/',
        description: 'Maszyny wirtualne',
        alias: 'ssh vezlabs-pve',
        aliasType: 'lab',
        aliasDescription: 'Proxmox przez router',
      },
      {
        label: 'Coolify',
        href: 'https://10.77.30.35:8000/',
        description: 'Deploy i aplikacje',
        alias: 'ssh vezlabs-coolify',
        aliasType: 'lab',
        aliasDescription: 'root na VM Coolify',
      },
      {
        label: 'Router',
        href: 'https://192.168.2.1/',
        description: 'Sieć i VLAN',
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
    description: 'Status usług',
    items: [
      {
        label: 'Monitor',
        href: 'https://monitor.vezlabs.dev',
        description: 'Panel monitoringu',
        alias: 'ssh vezlabs-coolify',
        aliasType: 'lab',
        aliasDescription: 'serwis monitoringu w labie',
      },
      {
        label: 'Lab API health',
        href: 'https://api.vezlabs.dev/healthz',
        description: 'Status API labu',
        alias: 'ssh vezlabs-coolify',
        aliasType: 'lab',
        aliasDescription: 'diagnostyka lab gateway',
      },
      {
        label: 'Prod API health',
        href: 'https://api.vezvision.com/healthz',
        description: 'Status API produkcji',
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

const aliasTypeClasses: Record<AccessGroup['items'][number]['aliasType'], string> = {
  prod: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 light:text-emerald-700',
  lab: 'border-blue-500/20 bg-blue-500/10 text-blue-400 light:text-blue-700',
  tunnel: 'border-purple-500/20 bg-purple-500/10 text-purple-400 light:text-purple-700',
  router: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400 light:text-cyan-700',
}

const aliasTypeLabels: Record<AccessGroup['items'][number]['aliasType'], string> = {
  prod: 'Prod',
  lab: 'Lab',
  tunnel: 'Tunel',
  router: 'Router',
}

const statusClasses: Record<HealthStatus, { dot: string; label: string; text: string }> = {
  checking: { dot: 'bg-[#555555]', label: 'Sprawdzam', text: 'text-[#888888]' },
  healthy: { dot: 'bg-emerald-400', label: 'Działa', text: 'text-emerald-400 light:text-emerald-600' },
  warning: { dot: 'bg-amber-400', label: 'Uwaga', text: 'text-amber-400 light:text-amber-600' },
  error: { dot: 'bg-red-400', label: 'Nie działa', text: 'text-red-400 light:text-red-600' },
  unknown: { dot: 'bg-[#666666]', label: 'Brak danych', text: 'text-[#888888]' },
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

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#777777] light:text-[#777777]">
            Infrastruktura
          </p>
          <p className="mt-1 text-sm text-[#666666] light:text-[#999999]">
            Hetzner, Labs, Monitor
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-md border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/60 light:bg-white/80 p-1">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`rounded px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                activeFilter === filter.id
                  ? 'bg-white/[0.08] text-white light:bg-black/[0.06] light:text-black'
                  : 'text-[#555555] light:text-[#999999] hover:text-white light:hover:text-black'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-3 ${visibleGroups.length === 1 || openGroup ? '' : 'lg:grid-cols-3'}`}>
        {visibleGroups.map((group) => {
          const isOpen = openGroup === group.name
          const Icon = group.icon
          const colors = colorClasses[group.color]

          return (
            <div
              key={group.name}
              className={`border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-all duration-300 ${colors.border} ${colors.bg}`}
            >
              <button
                type="button"
                onClick={() => setOpenGroup(isOpen ? null : group.name)}
                className="flex w-full items-center justify-between gap-4 p-3 text-left"
                aria-expanded={isOpen}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/[0.06] light:border-black/[0.06] bg-white/[0.03] light:bg-black/[0.03]">
                    <Icon className={`h-4 w-4 ${colors.text}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white light:text-black">{group.name}</p>
                    <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.18em] text-[#555555] light:text-[#999999]">
                      {group.description}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-[#555555] light:text-[#999999] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="border-t border-white/[0.06] light:border-black/[0.06]">
                  <div className="divide-y divide-white/[0.05] light:divide-black/[0.06]">
                    {group.items.map((item) => {
                      const itemKey = `${group.name}-${item.label}`
                      const isRevealed = revealedAliases.includes(itemKey)
                      const isCopied = copiedAlias === itemKey
                      const showVezCoreStatus = group.id === 'labs' && item.label === 'VEZcore'
                      const vezCoreStatus = infraData?.checks.vezcore?.status ?? 'checking'
                      const vezCoreStatusMeta = statusClasses[vezCoreStatus]
                      const deployStatus = getDeployHealthStatus(infraData?.deploy.status)
                      const deployStatusMeta = statusClasses[deployStatus]
                      const vezCoreLatency = infraData?.checks.vezcore?.latencyMs ? ` / ${infraData.checks.vezcore.latencyMs}ms` : ''
                      const vezCoreProblemDetails = [
                        infraData?.checks.vezcore && (vezCoreStatus === 'warning' || vezCoreStatus === 'error')
                          ? `VEZcore: ${infraData.checks.vezcore.detail}${vezCoreLatency}`
                          : null,
                        deployStatus === 'warning' || deployStatus === 'error'
                          ? `Deploy: ${infraData?.deploy.message ?? deployStatusMeta.label} / ${infraData?.deploy.shortSha ?? 'brak nr'} / ${formatStatusTime(infraData?.deploy.completedAt)}`
                          : null,
                      ].filter((detail): detail is string => Boolean(detail))
                      const showVezCoreProblemTooltip = vezCoreStatus === 'warning' || vezCoreStatus === 'error'
                      const showDeployProblemTooltip = deployStatus === 'warning' || deployStatus === 'error'

                      return (
                        <div
                          key={`${group.name}-${item.label}`}
                          className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,270px)] sm:items-center"
                        >
                          <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                              <a
                                href={item.href}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-w-0 items-center gap-2 text-xs font-medium text-white light:text-black hover:text-emerald-400 light:hover:text-emerald-600 transition-colors"
                              >
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{item.label}</span>
                              </a>
                              <span className={`w-fit rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${aliasTypeClasses[item.aliasType]}`}>
                                {aliasTypeLabels[item.aliasType]}
                              </span>
                              {showVezCoreStatus && (
                                <span
                                  className={`group/status relative inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] ${vezCoreStatusMeta.text}`}
                                >
                                  <Circle className={`h-2 w-2 fill-current ${vezCoreStatusMeta.text}`} />
                                  {vezCoreStatusMeta.label}
                                  {showVezCoreProblemTooltip && vezCoreProblemDetails.length > 0 && (
                                    <span className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-72 max-w-[72vw] border border-white/[0.08] light:border-black/[0.08] bg-[#050505] light:bg-white p-3 text-left text-[10px] font-normal normal-case tracking-normal text-[#b5b5b5] light:text-[#555555] shadow-2xl group-hover/status:block">
                                      <span className="mb-1 block font-medium uppercase tracking-[0.14em] text-white light:text-black">Co się stało</span>
                                      {vezCoreProblemDetails.map((detail) => (
                                        <span key={detail} className="block leading-relaxed">{detail}</span>
                                      ))}
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>

                            <p className="mt-1.5 text-[11px] leading-relaxed text-[#666666] light:text-[#999999]">{item.description}</p>

                            {showVezCoreStatus && (
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-[#555555] light:text-[#999999]">
                                <span className={`group/deploy relative ${deployStatusMeta.text}`}>
                                  Deploy {infraData?.deploy.shortSha ?? 'brak nr'} / {formatStatusTime(infraData?.deploy.completedAt)}
                                  {showDeployProblemTooltip && (
                                    <span className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-72 max-w-[72vw] border border-white/[0.08] light:border-black/[0.08] bg-[#050505] light:bg-white p-3 text-left text-[10px] font-normal normal-case tracking-normal text-[#b5b5b5] light:text-[#555555] shadow-2xl group-hover/deploy:block">
                                      <span className="mb-1 block font-medium uppercase tracking-[0.14em] text-white light:text-black">Co się stało</span>
                                      <span className="block leading-relaxed">Deploy: {infraData?.deploy.message ?? deployStatusMeta.label} / {infraData?.deploy.shortSha ?? 'brak nr'} / {formatStatusTime(infraData?.deploy.completedAt)}</span>
                                    </span>
                                  )}
                                </span>
                                <span>
                                  {infraData ? `Sprawdzono ${formatStatusTime(infraData.checkedAt)}` : 'Sprawdzam status'}
                                </span>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAliasClick(itemKey, item.alias)}
                            className="group/alias inline-flex min-h-9 w-full min-w-0 items-center justify-between gap-3 rounded-md border border-white/[0.06] light:border-black/[0.08] bg-[#050505]/70 light:bg-black/[0.02] px-3 py-2 font-mono text-[11px] text-[#777777] light:text-[#777777] hover:border-white/[0.12] light:hover:border-black/[0.14] hover:text-white light:hover:text-black transition-colors"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              {isCopied ? (
                                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400 light:text-emerald-600" />
                              ) : isRevealed ? (
                                <Copy className="h-3.5 w-3.5 shrink-0" />
                              ) : (
                                <Eye className="h-3.5 w-3.5 shrink-0" />
                              )}
                              <span className={isRevealed ? 'hidden' : 'truncate group-hover/alias:hidden'}>Alias SSH ukryty</span>
                              <span className={isRevealed ? 'truncate' : 'hidden truncate group-hover/alias:inline'}>{item.alias}</span>
                            </span>
                            <span className="shrink-0 text-[10px] text-[#555555] light:text-[#999999]">
                              {isCopied ? 'Skopiowano' : isRevealed ? 'Kopiuj' : 'Pokaż'}
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
    </section>
  )
}
