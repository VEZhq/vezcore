'use client'

import { type CSSProperties, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Circle, EyeOff, Eye, Settings2 } from 'lucide-react'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'
import {
  DASHBOARD_MODULES,
  DASHBOARD_MODULE_CARD_COLORS,
  DASHBOARD_MODULE_ICON_COLORS,
  type DashboardModuleDefinition,
  type DashboardModuleName,
} from '@/lib/constants/modules'

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

const moduleStatusSources: Record<DashboardModuleName, { checks: string[]; deploy?: boolean }> = {
  vez: { checks: [] },
  vezVision: { checks: ['prodApi'], deploy: true },
  vezLabs: { checks: ['labApi', 'monitor'] },
  vezRent: { checks: [] },
  vezStudio: { checks: [] },
  vezWork: { checks: [] },
  nably: { checks: [] },
}

const statusMeta: Record<HealthStatus, { label: string; dot: string; text: string }> = {
  checking: { label: 'Sprawdzam', dot: 'bg-[#555555]', text: 'text-[#888888]' },
  healthy: { label: 'Działa', dot: 'bg-emerald-400', text: 'text-emerald-400 light:text-emerald-600' },
  warning: { label: 'Uwaga', dot: 'bg-amber-400', text: 'text-amber-400 light:text-amber-600' },
  error: { label: 'Nie działa', dot: 'bg-red-400', text: 'text-red-400 light:text-red-600' },
  unknown: { label: 'Brak monitoringu', dot: 'bg-[#666666]', text: 'text-[#888888]' },
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

type StatusDetail = {
  status: HealthStatus
  text: string
}

type ModuleViewModel = {
  mod: DashboardModuleDefinition
  isHidden: boolean
  hasStatus: boolean
  moduleStatus: HealthStatus
  statusSummary: string
  deployHealthStatus: HealthStatus
  deployText: string
  problemDetails: StatusDetail[]
}

const moduleLayout: Record<DashboardModuleName, {
  left: string
  top: string
  width: string
  height: string
}> = {
  vez: { left: '5%', top: '12%', width: '28%', height: '130px' },
  vezVision: { left: '39%', top: '7%', width: '27%', height: '142px' },
  vezLabs: { left: '71%', top: '14%', width: '24%', height: '128px' },
  vezRent: { left: '12%', top: '43%', width: '24%', height: '132px' },
  vezStudio: { left: '44%', top: '42%', width: '25%', height: '132px' },
  vezWork: { left: '74%', top: '45%', width: '22%', height: '124px' },
  nably: { left: '30%', top: '70%', width: '30%', height: '130px' },
}

const moduleRgb: Record<DashboardModuleDefinition['color'], string> = {
  sage: '189 217 198',
  sand: '234 212 183',
  mauve: '215 191 216',
  peach: '236 200 166',
  rose: '232 191 208',
  mint: '201 216 197',
  linen: '230 220 201',
}

function getCheckDetail(infraData: InfraData | null, key: string): StatusDetail {
  const check = infraData?.checks[key]
  if (!check) return { status: 'unknown', text: `${key}: brak danych z monitoringu` }
  const latency = check.latencyMs ? ` / ${check.latencyMs}ms` : ''
  return { status: check.status, text: `${check.label}: ${check.detail}${latency}` }
}

function getProblemDetails(infraData: InfraData | null, sources: { checks: string[]; deploy?: boolean }) {
  const details = sources.checks.map((key) => getCheckDetail(infraData, key))

  if (sources.deploy) {
    const deployStatus = getDeployHealthStatus(infraData?.deploy.status)
    details.push({
      status: deployStatus,
      text: `Deploy: ${infraData?.deploy.message ?? statusMeta[deployStatus].label} / ${infraData?.deploy.shortSha ?? 'brak nr'} / ${formatStatusTime(infraData?.deploy.completedAt)}`,
    })
  }

  return details.filter((detail) => detail.status === 'warning' || detail.status === 'error')
}

function getStatusSummary(infraData: InfraData | null, sources: { checks: string[]; deploy?: boolean }) {
  if (sources.checks.length === 0 && !sources.deploy) return 'Nie skonfigurowano'
  if (!infraData) return 'Ładowanie'

  const checks = sources.checks
    .map((key) => infraData.checks[key])
    .filter((check): check is InfraData['checks'][string] => Boolean(check))

  if (checks.length === 1) {
    const check = checks[0]
    return check.latencyMs ? `${check.label} ${check.latencyMs}ms` : `${check.label} ${check.detail}`
  }

  if (checks.length > 1) {
    const healthyCount = checks.filter((check) => check.status === 'healthy').length
    return `${healthyCount}/${checks.length} usługi`
  }

  return sources.deploy ? 'Deploy aktywny' : 'Brak danych'
}

export function DashboardModules({
  canAccessVezVision,
  canAccessInfrastructure,
}: {
  canAccessVezVision: boolean
  canAccessInfrastructure: boolean
}) {
  const { preferences, updatePreferences } = useUserPreferences()
  const [editMode, setEditMode] = useState(false)
  const [infraData, setInfraData] = useState<InfraData | null>(null)

  useEffect(() => {
    if (!canAccessInfrastructure) return

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
  }, [canAccessInfrastructure])

  const toggleModule = (name: string) => {
    const next = preferences.hiddenModules.includes(name)
      ? preferences.hiddenModules.filter((m) => m !== name)
      : [...preferences.hiddenModules, name]
    updatePreferences({ hiddenModules: next })
  }

  const permissionFilteredModules = DASHBOARD_MODULES.filter((m) => m.name !== 'vezVision' || canAccessVezVision)

  const visibleModules = editMode
    ? permissionFilteredModules
    : permissionFilteredModules.filter((m) => !preferences.hiddenModules.includes(m.name))

  const moduleViewModels: ModuleViewModel[] = visibleModules.map((mod) => {
    const isHidden = preferences.hiddenModules.includes(mod.name)
    const sources = moduleStatusSources[mod.name]
    const hasStatus = canAccessInfrastructure && (sources.checks.length > 0 || Boolean(sources.deploy))
    const statuses: HealthStatus[] = infraData
      ? sources.checks.map((key) => infraData.checks[key]?.status ?? 'unknown')
      : sources.checks.map(() => 'checking')

    if (sources.deploy) {
      statuses.push(infraData ? getDeployHealthStatus(infraData.deploy.status) : 'checking')
    }

    const moduleStatus = hasStatus ? getWorstStatus(statuses) : 'unknown'
    const deployHealthStatus = sources.deploy ? getDeployHealthStatus(infraData?.deploy.status) : 'unknown'

    return {
      mod,
      isHidden,
      hasStatus,
      moduleStatus,
      statusSummary: getStatusSummary(infraData, sources),
      deployHealthStatus,
      deployText: sources.deploy
        ? `${infraData?.deploy.shortSha ?? 'brak nr'} / ${formatStatusTime(infraData?.deploy.completedAt)}`
        : 'Brak',
      problemDetails: getProblemDetails(infraData, sources),
    }
  })

  const monitoredModules = moduleViewModels.filter((item) => item.hasStatus)
  const healthyModules = monitoredModules.filter((item) => item.moduleStatus === 'healthy').length
  const warningModules = moduleViewModels.filter((item) => item.moduleStatus === 'warning' || item.moduleStatus === 'error')

  return (
    <section className="w-full mb-6">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#777777] light:text-[#777777]">
            Ekosystem
          </p>
          <h1 className="mt-1 text-lg font-medium text-[#f0ddc4] light:text-[#4f3f2d]">
            Mapa operacyjna VEZ
          </h1>
        </div>
        <button
          onClick={() => setEditMode((v) => !v)}
          className={`flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] transition-colors duration-200 ${
            editMode
              ? 'text-[#e6c7a7] light:text-[#7d5a38]'
              : 'text-[#444444] light:text-[#888888] hover:text-[#888888] light:hover:text-[#555555]'
          }`}
        >
          <Settings2 className="h-3 w-3" />
          {editMode ? 'Zapisz' : 'Dostosuj'}
        </button>
      </div>

      <div className="ecosystem-board relative overflow-hidden rounded-[22px] border border-white/[0.07] light:border-black/[0.08] bg-[#11100e]/[0.72] light:bg-[#eef2ef]/[0.86] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.28)] light:shadow-[0_28px_80px_rgba(65,70,66,0.13)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 ecosystem-board-grid opacity-75" />
        <div className="relative grid gap-4 xl:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-white/[0.08] light:border-black/[0.07] bg-[#191713]/[0.70] light:bg-white/[0.64] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.18)] backdrop-blur-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#77716a] light:text-[#8b837a]">
                  Centrum
                </p>
                <h2 className="mt-1 text-base font-medium text-[#efe1cf] light:text-[#41372d]">
                  Moduły VEZ
                </h2>
              </div>
              <div className="rounded-xl border border-white/[0.07] light:border-black/[0.06] bg-white/[0.04] light:bg-black/[0.03] px-3 py-2 text-right">
                <p className="text-[9px] uppercase tracking-[0.18em] text-[#77716a] light:text-[#8b837a]">Online</p>
                <p className="text-sm font-medium text-[#bdd9c6] light:text-[#52705b]">
                  {healthyModules}/{monitoredModules.length || 0}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {moduleViewModels.map(({ mod, isHidden, moduleStatus, statusSummary, problemDetails }) => {
                const status = statusMeta[moduleStatus]
                const showProblemTooltip = moduleStatus === 'warning' || moduleStatus === 'error'
                const moduleColors = DASHBOARD_MODULE_CARD_COLORS[mod.color]

                return (
                  <div
                    key={mod.name}
                    className={`group/list relative rounded-xl border border-white/[0.06] light:border-black/[0.06] bg-white/[0.035] light:bg-white/[0.58] p-3 transition-all duration-200 hover:bg-white/[0.06] light:hover:bg-white/[0.82] ${isHidden ? 'opacity-45' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${moduleColors.iconBox}`}>
                        <mod.icon className={`h-4 w-4 ${DASHBOARD_MODULE_ICON_COLORS[mod.color].dark} ${DASHBOARD_MODULE_ICON_COLORS[mod.color].light}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`truncate text-sm font-medium ${moduleColors.title}`}>{mod.label}</p>
                          {editMode && (
                            <button
                              onClick={() => toggleModule(mod.name)}
                              className="rounded-md p-1 text-[#77716a] transition-colors hover:text-[#ead4b7] light:hover:text-[#4f3f2d]"
                              title={isHidden ? 'Pokaż moduł' : 'Ukryj moduł'}
                            >
                              {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em]">
                          <span className={`group/status relative inline-flex items-center gap-1.5 ${status.text}`}>
                            <Circle className="h-2 w-2 fill-current" />
                            {status.label}
                            {showProblemTooltip && problemDetails.length > 0 && (
                              <span className="pointer-events-none absolute bottom-full left-0 z-40 mb-2 hidden w-72 max-w-[72vw] rounded-xl border border-white/[0.08] light:border-black/[0.08] bg-[#050505] light:bg-white p-3 text-left text-[10px] font-normal normal-case tracking-normal text-[#c7c0b8] light:text-[#555555] shadow-2xl group-hover/status:block">
                                <span className="mb-1 block font-medium uppercase tracking-[0.14em] text-[#efe1cf] light:text-[#4f3f2d]">Co się stało</span>
                                {problemDetails.map((detail) => (
                                  <span key={detail.text} className="block leading-relaxed">{detail.text}</span>
                                ))}
                              </span>
                            )}
                          </span>
                          <span className="truncate text-[#77716a] light:text-[#8b837a]">{statusSummary}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>

          <div className="relative min-h-[620px] overflow-hidden rounded-2xl border border-white/[0.06] light:border-black/[0.06] bg-[#151410]/[0.50] light:bg-[#f8f6f1]/[0.58] p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#77716a] light:text-[#8b837a]">Plan ekosystemu</p>
                <p className="mt-1 text-sm text-[#d8c9b6] light:text-[#61564b]">
                  Operacyjny układ usług, statusów i deployów.
                </p>
              </div>
              <div className="flex gap-2 text-[10px] uppercase tracking-[0.16em]">
                <span className="rounded-full border border-white/[0.07] light:border-black/[0.06] bg-white/[0.04] light:bg-white/[0.7] px-3 py-2 text-[#bdd9c6] light:text-[#52705b]">
                  {warningModules.length ? `${warningModules.length} wymaga uwagi` : 'Stabilnie'}
                </span>
                <span className="rounded-full border border-white/[0.07] light:border-black/[0.06] bg-white/[0.04] light:bg-white/[0.7] px-3 py-2 text-[#c8bcae] light:text-[#786d62]">
                  {formatStatusTime(infraData?.checkedAt)}
                </span>
              </div>
            </div>

            <div className="ecosystem-map relative min-h-[520px]">
              <div className="pointer-events-none absolute inset-x-[6%] top-[18%] h-px bg-[#bdd9c6]/[0.18] light:bg-[#52705b]/[0.16]" />
              <div className="pointer-events-none absolute left-[25%] right-[9%] top-[55%] h-px bg-[#ead4b7]/[0.18] light:bg-[#7d5a38]/[0.14]" />
              <div className="pointer-events-none absolute left-[58%] top-[18%] h-[62%] w-px bg-[#d7bfd8]/[0.16] light:bg-[#735671]/[0.13]" />
              <div className="pointer-events-none absolute left-[15%] top-[28%] h-[45%] w-px bg-[#ecc8a6]/[0.15] light:bg-[#8a5a32]/[0.12]" />

              <div className="grid gap-4 lg:block">
                {moduleViewModels.map((item) => {
                  const { mod, isHidden, moduleStatus, statusSummary, deployHealthStatus, deployText, problemDetails } = item
                  const layout = moduleLayout[mod.name]
                  const status = statusMeta[moduleStatus]
                  const moduleColors = DASHBOARD_MODULE_CARD_COLORS[mod.color]
                  const showProblemTooltip = moduleStatus === 'warning' || moduleStatus === 'error'
                  const style = {
                    '--module-rgb': moduleRgb[mod.color],
                    left: layout.left,
                    top: layout.top,
                    width: layout.width,
                    minHeight: layout.height,
                  } as CSSProperties

                  const node = (
                    <div
                      className={`module-map-node group relative flex min-h-[150px] flex-col overflow-hidden rounded-2xl border p-4 lg:absolute ${editMode ? 'cursor-default' : mod.href ? 'cursor-pointer' : 'cursor-default'} ${isHidden ? 'opacity-40' : ''}`}
                      style={style}
                    >
                      <div className="module-map-surface pointer-events-none absolute inset-2 rounded-xl" />
                      <div className="relative z-10 flex items-start justify-between gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${moduleColors.iconBox}`}>
                          <mod.icon className={`h-5 w-5 ${DASHBOARD_MODULE_ICON_COLORS[mod.color].dark} ${DASHBOARD_MODULE_ICON_COLORS[mod.color].light}`} />
                        </div>
                        <div className="flex items-center gap-2">
                          {mod.href && !editMode && <ArrowUpRight className="h-4 w-4 text-[#77716a] transition-colors group-hover:text-[#efe1cf] light:group-hover:text-[#4f3f2d]" />}
                          {editMode && (
                            <button
                              onClick={() => toggleModule(mod.name)}
                              className="rounded-md p-1 text-[#77716a] transition-colors hover:text-[#ead4b7] light:hover:text-[#4f3f2d]"
                              title={isHidden ? 'Pokaż moduł' : 'Ukryj moduł'}
                            >
                              {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="relative z-10 mt-5">
                        <h3 className={`text-base font-medium ${moduleColors.title}`}>{mod.label}</h3>
                        <p className={`mt-1 line-clamp-2 text-xs leading-relaxed ${moduleColors.description}`}>{mod.description}</p>
                      </div>

                      <div className="relative z-10 mt-auto space-y-2 border-t border-white/[0.06] light:border-black/[0.06] pt-3">
                        <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.14em]">
                          <span className={`group/status relative inline-flex items-center gap-2 ${status.text}`}>
                            <Circle className="h-2 w-2 fill-current" />
                            {status.label}
                            {showProblemTooltip && problemDetails.length > 0 && (
                              <span className="pointer-events-none absolute bottom-full left-0 z-40 mb-2 hidden w-72 max-w-[72vw] rounded-xl border border-white/[0.08] light:border-black/[0.08] bg-[#050505] light:bg-white p-3 text-left text-[10px] font-normal normal-case tracking-normal text-[#c7c0b8] light:text-[#555555] shadow-2xl group-hover/status:block">
                                <span className="mb-1 block font-medium uppercase tracking-[0.14em] text-[#efe1cf] light:text-[#4f3f2d]">Co się stało</span>
                                {problemDetails.map((detail) => (
                                  <span key={detail.text} className="block leading-relaxed">{detail.text}</span>
                                ))}
                              </span>
                            )}
                          </span>
                          <span className="truncate text-[#77716a] light:text-[#8b837a]">{statusSummary}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.14em] text-[#77716a] light:text-[#8b837a]">
                          <span>Deploy</span>
                          <span className={statusMeta[deployHealthStatus].text}>{deployText}</span>
                        </div>
                      </div>

                      {editMode && isHidden && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#11100e]/[0.50] light:bg-white/[0.45]">
                          <span className="rounded-full border border-white/[0.08] light:border-black/[0.06] bg-[#11100e]/[0.74] light:bg-white/[0.8] px-3 py-1 text-[9px] uppercase tracking-[0.24em] text-[#c8bcae] light:text-[#786d62]">
                            Ukryty
                          </span>
                        </div>
                      )}
                    </div>
                  )

                  return (
                    <div key={mod.name} className="lg:contents">
                      {!editMode && mod.href ? (
                        <Link href={mod.href} className="block lg:contents">
                          {node}
                        </Link>
                      ) : (
                        node
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {!editMode && visibleModules.length === 0 && (
          <div className="relative z-10 flex flex-col items-center justify-center py-12 text-center">
            <p className="text-xs text-[#555555] light:text-[#aaaaaa] uppercase tracking-[0.25em] mb-3">
              Wszystkie moduły ukryte
            </p>
            <button
              onClick={() => setEditMode(true)}
              className="text-[10px] uppercase tracking-[0.25em] text-[#e6c7a7] hover:text-[#e6c7a7] transition-colors duration-200"
            >
              Przywróć widżety
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
