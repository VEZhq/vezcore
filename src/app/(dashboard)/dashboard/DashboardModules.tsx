'use client'

import { type PointerEvent, useEffect, useState } from 'react'
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

type DragState = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
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
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragState, setDragState] = useState<DragState | null>(null)

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
  const sectionLayout = [
    { left: '4%', top: '12%', width: '230px', height: '146px' },
    { left: '31%', top: '10%', width: '246px', height: '148px' },
    { left: '60%', top: '12%', width: '238px', height: '142px' },
    { left: '86%', top: '13%', width: '224px', height: '140px' },
    { left: '17%', top: '58%', width: '210px', height: '134px' },
    { left: '47%', top: '63%', width: '224px', height: '138px' },
    { left: '73%', top: '59%', width: '222px', height: '136px' },
  ]

  const startMapDrag = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('a, button')) return

    event.currentTarget.setPointerCapture(event.pointerId)
    setDragState({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    })
  }

  const moveMapDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return

    setPan({
      x: dragState.originX + event.clientX - dragState.startX,
      y: dragState.originY + event.clientY - dragState.startY,
    })
  }

  const endMapDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragState?.pointerId === event.pointerId) {
      setDragState(null)
    }
  }

  return (
    <section className="relative mt-6 min-h-0 flex-1 w-full">
      <div className="absolute right-0 top-0 z-50 flex items-center gap-3">
        <button
          onClick={() => setPan({ x: 0, y: 0 })}
          className="flex h-11 items-center rounded-[14px] bg-white/70 px-4 text-sm font-medium text-[#5e6664] shadow-[0_14px_30px_rgba(105,116,116,0.08)] transition-all duration-200 hover:bg-white hover:text-[#202020]"
        >
          Wyśrodkuj
        </button>
        <button
          onClick={() => setEditMode((v) => !v)}
          className={`flex h-11 items-center gap-2 rounded-[14px] px-4 text-sm font-medium transition-all duration-200 ${
            editMode
              ? 'bg-white text-[#202020] shadow-[0_14px_30px_rgba(105,116,116,0.12)]'
              : 'bg-[#e3e9e8] text-[#5e6664] hover:bg-white hover:text-[#202020]'
          }`}
        >
          <Settings2 className="h-4 w-4" />
          {editMode ? 'Zapisz' : 'Dostosuj'}
        </button>
      </div>

      <div className="ecosystem-board-warehouse relative h-full min-h-[560px] overflow-hidden">
        <div className="absolute inset-0 warehouse-floor-lines" />

        <div
          className={`absolute inset-[18px] cursor-grab overflow-hidden rounded-[26px] ${dragState ? 'cursor-grabbing' : ''}`}
          onPointerDown={startMapDrag}
          onPointerMove={moveMapDrag}
          onPointerUp={endMapDrag}
          onPointerCancel={endMapDrag}
        >
          <div
            className="absolute left-[320px] top-[10px] h-[620px] w-[1380px] transition-transform duration-75"
            style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0)` }}
          >
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1380 620" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 190 H315 C360 190 360 120 405 120 H600 C645 120 645 190 690 190 H1380" className="warehouse-route-ok" />
              <path d="M0 370 H500 C548 370 548 295 596 295 H790 C840 295 840 370 890 370 H1380" className="warehouse-route-ok" />
              <path d="M760 190 C820 190 820 120 880 120 H1125 C1185 120 1185 190 1245 190 H1380" className="warehouse-route-danger" />
              <path d="M610 370 V505 H825 C875 505 875 430 925 430 H1380" className="warehouse-route-ok" />
              <path d="M1110 120 V370 C1110 420 1055 420 1055 485 V620" className="warehouse-route-danger" />
            </svg>

            {moduleViewModels.map((item, index) => {
              const { mod, isHidden, moduleStatus, statusSummary, deployHealthStatus, deployText, problemDetails } = item
              const status = statusMeta[moduleStatus]
              const showProblemTooltip = moduleStatus === 'warning' || moduleStatus === 'error'
              const layout = sectionLayout[index] ?? sectionLayout[0]

              const sectionTile = (
                <div
                  className={`warehouse-section-tile group absolute z-20 flex flex-col p-5 transition-all duration-200 hover:-translate-y-1 ${isHidden ? 'opacity-45' : ''}`}
                  style={{
                    left: layout.left,
                    top: layout.top,
                    width: layout.width,
                    height: layout.height,
                  }}
                >
                  <div className="warehouse-section-grid pointer-events-none absolute inset-3 rounded-[14px]" />
                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`} />
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[#5d6866]">{status.label}</p>
                      </div>
                      <h3 className="mt-3 text-xl font-medium tracking-[-0.02em] text-[#202020]">{mod.label}</h3>
                    </div>
                    {editMode ? (
                      <button
                        onClick={() => toggleModule(mod.name)}
                        className="relative z-20 rounded-xl bg-white/70 p-2 text-[#6d7775] transition-colors hover:bg-white hover:text-[#202020]"
                        title={isHidden ? 'Pokaż moduł' : 'Ukryj moduł'}
                      >
                        {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    ) : mod.href ? (
                      <ArrowUpRight className="relative z-10 h-5 w-5 text-[#5d6866] transition-colors group-hover:text-[#202020]" />
                    ) : null}
                  </div>
                  <div className="relative z-10 mt-auto">
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[#5d6866]">
                      <span className="truncate">{statusSummary}</span>
                      <span className={statusMeta[deployHealthStatus].text}>{deployText}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/55">
                      <div className={`h-full rounded-full ${moduleStatus === 'error' ? 'bg-[#ff5a5a]' : moduleStatus === 'warning' ? 'bg-[#f2b84b]' : moduleStatus === 'unknown' ? 'bg-[#aeb8b6]' : 'bg-[#23b657]'}`} style={{ width: moduleStatus === 'unknown' ? '34%' : '76%' }} />
                    </div>
                  </div>
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
                  {sectionTile}
                </Link>
              ) : (
                <div key={mod.name} className="contents">
                  {sectionTile}
                </div>
              )
            })}

            <div className="absolute left-[58%] top-[37%] z-30 w-[220px] rounded-[18px] bg-white/72 p-4 shadow-[0_20px_50px_rgba(95,113,112,0.18)] backdrop-blur-xl">
              <p className="text-sm font-medium text-[#202020]">VEZvision API</p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-[#23b657]">
                <span className="h-2 w-2 rounded-full bg-[#23b657]" />
                {moduleViewModels.find((item) => item.mod.name === 'vezVision')?.statusSummary ?? 'Ładowanie'}
              </div>
            </div>
          </div>
        </div>

        <aside className="absolute left-0 top-9 z-40 w-[382px] rounded-[21px] bg-white/54 p-5 shadow-[0_26px_70px_rgba(95,113,112,0.20)] backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-[#202020]">Report operations</h2>
            <div className="flex gap-2">
              <button className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-white/55 text-[#6d7775]" aria-label="Szukaj modułów">
                <span className="text-lg">⌕</span>
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-white/55 text-[#6d7775]" aria-label="Lokalizacja">
                <span className="text-lg">⌾</span>
              </button>
            </div>
          </div>

          <div className="mt-5 h-px bg-white/70" />
          <div className="mt-4 flex gap-2">
            <span className="rounded-[12px] bg-white px-3.5 py-2.5 text-sm text-[#202020]">All</span>
            <span className="rounded-[12px] bg-white/65 px-3.5 py-2.5 text-sm text-[#202020]"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#23b657]" />Available</span>
            <span className="rounded-[12px] bg-white/65 px-3.5 py-2.5 text-sm text-[#202020]"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#ff4d4d]" />Alert</span>
          </div>

          <div className="mt-5 space-y-3">
            {moduleViewModels.slice(0, 4).map(({ mod, isHidden, moduleStatus, statusSummary, deployText }) => {
              const status = statusMeta[moduleStatus]
              return (
                <div key={mod.name} className={`rounded-[16px] bg-white/62 p-3.5 shadow-[0_12px_30px_rgba(95,113,112,0.08)] ${isHidden ? 'opacity-45' : ''}`}>
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
                  <div className="mt-3">
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

        <div className="absolute bottom-0 left-[420px] right-[34px] z-30 grid gap-5 lg:grid-cols-2">
          {[
            { title: 'VEZcore workload', value: `${healthyModules}.${monitoredModules.length || 0}`, label: '/ modules' },
            { title: 'Daily core events', value: `${warningModules.length ? warningModules.length : 125}.${moduleViewModels.length}21`, label: '/ events' },
          ].map((card, cardIndex) => (
            <div key={card.title} className="min-h-[190px] rounded-[21px] bg-white/50 p-5 shadow-[0_22px_60px_rgba(95,113,112,0.16)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium text-[#202020]">{card.title}</h3>
                <div className="flex gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/60 text-[#6d7775]">≡</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/60 text-[#6d7775]">↗</span>
                </div>
              </div>
              <div className="mt-6 flex items-end justify-between gap-5">
                <div>
                  <p className="text-[30px] font-medium leading-none tracking-[-0.03em] text-[#202020]">
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
              <div className="mt-6 flex h-16 items-end gap-2 overflow-hidden">
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
