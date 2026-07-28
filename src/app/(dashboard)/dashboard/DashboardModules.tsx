'use client'

import { type CSSProperties, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, EyeOff, Eye, Settings2 } from 'lucide-react'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'
import {
  DASHBOARD_MODULES,
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
    <section className="relative mt-10 w-full">
      <div className="absolute right-0 top-0 z-30 flex items-center gap-3">
        <button
          onClick={() => setEditMode((v) => !v)}
          className={`flex h-12 items-center gap-2 rounded-[14px] px-4 text-sm font-medium transition-all duration-200 ${
            editMode
              ? 'bg-white text-[#202020] shadow-[0_14px_30px_rgba(105,116,116,0.12)]'
              : 'bg-[#e3e9e8] text-[#5e6664] hover:bg-white hover:text-[#202020]'
          }`}
        >
          <Settings2 className="h-4 w-4" />
          {editMode ? 'Zapisz' : 'Dostosuj'}
        </button>
      </div>

      <div className="ecosystem-board-warehouse relative min-h-[790px] overflow-hidden">
        <div className="absolute inset-0 warehouse-floor-lines" />
        <div className="absolute left-[260px] right-[-70px] top-[64px] h-[520px]">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1180 520" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 170 H290 C330 170 330 105 370 105 H515 C555 105 555 170 595 170 H1180" className="warehouse-route-ok" />
            <path d="M0 315 H430 C475 315 475 245 520 245 H690 C735 245 735 315 780 315 H1180" className="warehouse-route-ok" />
            <path d="M720 170 C780 170 780 105 840 105 H1010 C1060 105 1060 170 1110 170 H1180" className="warehouse-route-danger" />
            <path d="M560 315 V420 H755 C800 420 800 350 845 350 H1180" className="warehouse-route-ok" />
            <path d="M1000 105 V315 C1000 360 955 360 955 405 V520" className="warehouse-route-danger" />
          </svg>

          {[
            { left: '2%', top: '16%', width: '190px', height: '138px', color: '#4d91f3' },
            { left: '34%', top: '14%', width: '210px', height: '132px', color: '#4d91f3' },
            { left: '68%', top: '14%', width: '220px', height: '134px', color: '#4d91f3' },
            { left: '98%', top: '14%', width: '190px', height: '132px', color: '#4d91f3' },
            { left: '5%', top: '63%', width: '170px', height: '76px', color: '#7bcf89' },
            { left: '24%', top: '78%', width: '100px', height: '94px', color: '#32ad58' },
            { left: '34%', top: '78%', width: '100px', height: '94px', color: '#32ad58' },
            { left: '44%', top: '78%', width: '100px', height: '94px', color: '#32ad58' },
            { left: '63%', top: '78%', width: '100px', height: '94px', color: '#32ad58' },
            { left: '78%', top: '84%', width: '140px', height: '92px', color: '#cfd5ca' },
            { left: '94%', top: '79%', width: '100px', height: '94px', color: '#32ad58' },
          ].map((block, index) => (
            <div
              key={index}
              className="warehouse-static-block absolute"
              style={{
                left: block.left,
                top: block.top,
                width: block.width,
                height: block.height,
                '--warehouse-block-color': block.color,
              } as CSSProperties}
            />
          ))}

          {moduleViewModels.map((item, index) => {
            const { mod, isHidden, moduleStatus, deployText, problemDetails } = item
            const status = statusMeta[moduleStatus]
            const showProblemTooltip = moduleStatus === 'warning' || moduleStatus === 'error'
            const positions = [
              { left: '9%', top: '47%' },
              { left: '44%', top: '47%' },
              { left: '61%', top: '18%' },
              { left: '22%', top: '62%' },
              { left: '52%', top: '73%' },
              { left: '83%', top: '69%' },
              { left: '71%', top: '51%' },
            ]
            const position = positions[index] ?? positions[0]

            const moduleNode = (
              <div
                className={`warehouse-module-node group absolute z-20 w-[156px] rounded-[18px] bg-white/75 p-4 shadow-[0_18px_42px_rgba(95,113,112,0.16)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:bg-white ${isHidden ? 'opacity-45' : ''}`}
                style={{ left: position.left, top: position.top }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                    <span className="text-xs font-medium text-[#202020]">{mod.label}</span>
                  </div>
                  {editMode ? (
                    <button
                      onClick={() => toggleModule(mod.name)}
                      className="rounded-lg bg-[#eef4f3] p-1.5 text-[#6d7775] transition-colors hover:bg-[#e0e8e6] hover:text-[#202020]"
                      title={isHidden ? 'Pokaż moduł' : 'Ukryj moduł'}
                    >
                      {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                  ) : mod.href ? (
                    <ArrowUpRight className="h-4 w-4 text-[#6d7775] transition-colors group-hover:text-[#202020]" />
                  ) : null}
                </div>
                <div className="mt-3 h-2 rounded-full bg-[#dfe8e6]">
                  <div className={`h-full rounded-full ${moduleStatus === 'error' ? 'bg-[#ff5a5a]' : moduleStatus === 'warning' ? 'bg-[#f2b84b]' : moduleStatus === 'unknown' ? 'bg-[#aeb8b6]' : 'bg-[#23b657]'}`} style={{ width: moduleStatus === 'unknown' ? '38%' : '72%' }} />
                </div>
                <p className="mt-2 truncate text-xs text-[#6d7775]">{deployText}</p>
                {showProblemTooltip && problemDetails.length > 0 && (
                  <span className="pointer-events-none absolute bottom-full left-0 z-40 mb-2 hidden w-72 rounded-2xl bg-white p-3 text-left text-xs text-[#5e6664] shadow-[0_18px_40px_rgba(90,105,104,0.18)] group-hover:block">
                    <span className="mb-1 block font-medium text-[#202020]">Co się stało</span>
                    {problemDetails.map((detail) => (
                      <span key={detail.text} className="block leading-relaxed">{detail.text}</span>
                    ))}
                  </span>
                )}
              </div>
            )

            return mod.href && !editMode ? (
              <Link key={mod.name} href={mod.href} className="contents">
                {moduleNode}
              </Link>
            ) : (
              <div key={mod.name} className="contents">
                {moduleNode}
              </div>
            )
          })}

          <div className="absolute left-[58%] top-[35%] z-30 w-[220px] rounded-[18px] bg-white/72 p-4 shadow-[0_20px_50px_rgba(95,113,112,0.18)] backdrop-blur-xl">
            <p className="text-sm font-medium text-[#202020]">VEZvision API</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-[#23b657]">
              <span className="h-2 w-2 rounded-full bg-[#23b657]" />
              {moduleViewModels.find((item) => item.mod.name === 'vezVision')?.statusSummary ?? 'Ładowanie'}
            </div>
          </div>
        </div>

        <aside className="absolute left-0 top-12 z-40 w-[420px] rounded-[22px] bg-white/54 p-6 shadow-[0_26px_70px_rgba(95,113,112,0.20)] backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-[#202020]">Report operations</h2>
            <div className="flex gap-2">
              <button className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-white/55 text-[#6d7775]" aria-label="Szukaj modułów">
                <span className="text-lg">⌕</span>
              </button>
              <button className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-white/55 text-[#6d7775]" aria-label="Lokalizacja">
                <span className="text-lg">⌾</span>
              </button>
            </div>
          </div>

          <div className="mt-6 h-px bg-white/70" />
          <div className="mt-5 flex gap-2">
            <span className="rounded-[12px] bg-white px-4 py-3 text-sm text-[#202020]">All</span>
            <span className="rounded-[12px] bg-white/65 px-4 py-3 text-sm text-[#202020]"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#23b657]" />Available</span>
            <span className="rounded-[12px] bg-white/65 px-4 py-3 text-sm text-[#202020]"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#ff4d4d]" />Alert</span>
          </div>

          <div className="mt-6 space-y-4">
            {moduleViewModels.slice(0, 4).map(({ mod, isHidden, moduleStatus, statusSummary, deployText }) => {
              const status = statusMeta[moduleStatus]
              return (
                <div key={mod.name} className={`rounded-[18px] bg-white/62 p-4 shadow-[0_12px_30px_rgba(95,113,112,0.08)] ${isHidden ? 'opacity-45' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                        <p className="font-medium text-[#202020]">{mod.label}</p>
                      </div>
                      <p className="mt-1 text-xs text-[#7a8583]">{status.label}</p>
                    </div>
                    <span className="rounded-[12px] bg-[#edf3f2] px-3 py-2 text-xs text-[#6d7775]">{statusSummary}</span>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-[#6d7775]">
                      <span>Deploy</span>
                      <span>{deployText}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-[#dfe8e6]">
                      <div className={`h-full rounded-full ${moduleStatus === 'error' ? 'bg-[#ff5a5a]' : moduleStatus === 'warning' ? 'bg-[#f2b84b]' : moduleStatus === 'unknown' ? 'bg-[#aeb8b6]' : 'bg-[#23b657]'}`} style={{ width: moduleStatus === 'unknown' ? '36%' : '74%' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        <div className="absolute bottom-0 left-[470px] right-[42px] z-30 grid gap-6 lg:grid-cols-2">
          {[
            { title: 'VEZcore workload', value: `${healthyModules}.${monitoredModules.length || 0}`, label: '/ modules' },
            { title: 'Daily core events', value: `${warningModules.length ? warningModules.length : 125}.${moduleViewModels.length}21`, label: '/ events' },
          ].map((card, cardIndex) => (
            <div key={card.title} className="min-h-[220px] rounded-[22px] bg-white/50 p-6 shadow-[0_22px_60px_rgba(95,113,112,0.16)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-[#202020]">{card.title}</h3>
                <div className="flex gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/60 text-[#6d7775]">≡</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/60 text-[#6d7775]">↗</span>
                </div>
              </div>
              <div className="mt-8 flex items-end justify-between gap-6">
                <div>
                  <p className="text-[34px] font-medium leading-none tracking-[-0.03em] text-[#202020]">
                    <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded-[5px] bg-[#23b657] text-[10px] text-white">↗</span>
                    {card.value}
                    <span className="ml-1 text-sm font-normal text-[#7a8583]">{card.label}</span>
                  </p>
                </div>
                <div className="w-40 text-xs text-[#6d7775]">
                  <div className="flex justify-between"><span>{cardIndex === 0 ? 'Core' : 'Processed'}</span><span>{cardIndex === 0 ? '84%' : '62%'}</span></div>
                  <div className="mt-2 h-1.5 rounded-full bg-[#dfe8e6]"><div className="h-full w-[72%] rounded-full bg-[#23b657]" /></div>
                </div>
              </div>
              <div className="mt-8 flex h-20 items-end gap-2 overflow-hidden">
                {Array.from({ length: 34 }).map((_, index) => (
                  <span
                    key={index}
                    className={`w-2 shrink-0 rounded-t-full ${index % 5 === 0 ? 'bg-[#23b657]' : 'bg-white/70'}`}
                    style={{ height: `${18 + ((index * 13 + cardIndex * 7) % 62)}px` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {!editMode && visibleModules.length === 0 && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-[22px] bg-white/70 text-center backdrop-blur-xl">
            <p className="mb-3 text-sm text-[#6d7775]">
              Wszystkie moduły ukryte
            </p>
            <button
              onClick={() => setEditMode(true)}
              className="rounded-[14px] bg-[#202020] px-5 py-3 text-sm font-medium text-white"
            >
              Przywróć widżety
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
