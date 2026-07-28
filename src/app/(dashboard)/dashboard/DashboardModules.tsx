'use client'

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Eye,
  EyeOff,
  GripVertical,
  MoveDiagonal2,
  RotateCcw,
  Settings2,
} from 'lucide-react'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'
import {
  DASHBOARD_MODULES,
  type DashboardModuleDefinition,
  type DashboardModuleName,
} from '@/lib/constants/modules'

type HealthStatus = 'checking' | 'healthy' | 'warning' | 'error' | 'unknown'
type DeployStatus = 'success' | 'failure' | 'pending' | 'unknown'
type PanelFilter = 'all' | 'available' | 'alert'

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

type ResizeState = {
  pointerId: number
  startX: number
  startY: number
  originWidth: number
  originHeight: number
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
  checking: { label: 'Sprawdzam', dot: 'bg-[#7d8785]', text: 'text-[#77817f]' },
  healthy: { label: 'Działa', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  warning: { label: 'Uwaga', dot: 'bg-amber-400', text: 'text-amber-700' },
  error: { label: 'Nie działa', dot: 'bg-red-500', text: 'text-red-700' },
  unknown: { label: 'Brak monitoringu', dot: 'bg-[#9ba4a2]', text: 'text-[#77817f]' },
}

const modulePalette: Record<DashboardModuleDefinition['color'], { accent: string; dark: string; rgb: string }> = {
  sage: { accent: '#91b8a1', dark: '#5e806b', rgb: '145, 184, 161' },
  sand: { accent: '#d5b98e', dark: '#98764b', rgb: '213, 185, 142' },
  mauve: { accent: '#bca0bd', dark: '#816782', rgb: '188, 160, 189' },
  peach: { accent: '#dca982', dark: '#9b6d49', rgb: '220, 169, 130' },
  rose: { accent: '#cf9dae', dark: '#906274', rgb: '207, 157, 174' },
  mint: { accent: '#9ebd96', dark: '#6c8965', rgb: '158, 189, 150' },
  linen: { accent: '#c3b69e', dark: '#867964', rgb: '195, 182, 158' },
}

const moduleLayout: Record<DashboardModuleName, { left: number; top: number; width: number; height: number }> = {
  vez: { left: 36, top: 95, width: 190, height: 116 },
  vezVision: { left: 340, top: 76, width: 208, height: 120 },
  vezLabs: { left: 662, top: 96, width: 196, height: 116 },
  vezRent: { left: 992, top: 88, width: 196, height: 116 },
  vezStudio: { left: 180, top: 354, width: 190, height: 112 },
  vezWork: { left: 530, top: 382, width: 204, height: 116 },
  nably: { left: 874, top: 350, width: 192, height: 112 },
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
  if (!infraData) return 'Ładowanie danych'

  const checks = sources.checks
    .map((key) => infraData.checks[key])
    .filter((check): check is InfraData['checks'][string] => Boolean(check))

  if (checks.length === 1) {
    const check = checks[0]
    return check.latencyMs ? `${check.label} · ${check.latencyMs}ms` : `${check.label} · ${check.detail}`
  }

  if (checks.length > 1) {
    const healthyCount = checks.filter((check) => check.status === 'healthy').length
    return `${healthyCount}/${checks.length} usług działa`
  }

  return sources.deploy ? 'Deploy aktywny' : 'Brak danych'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
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
  const [panelFilter, setPanelFilter] = useState<PanelFilter>('all')
  const [infraData, setInfraData] = useState<InfraData | null>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const resizeRef = useRef<ResizeState | null>(null)
  const panRef = useRef({ x: 0, y: 0 })
  const frameRef = useRef<number | null>(null)

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

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
  }, [])

  const permissionFilteredModules = useMemo(
    () => DASHBOARD_MODULES.filter((mod) => mod.name !== 'vezVision' || canAccessVezVision),
    [canAccessVezVision]
  )

  const allModuleViewModels = useMemo<ModuleViewModel[]>(() => permissionFilteredModules.map((mod) => {
    const sources = moduleStatusSources[mod.name]
    const hasStatus = canAccessInfrastructure && (sources.checks.length > 0 || Boolean(sources.deploy))
    const statuses: HealthStatus[] = infraData
      ? sources.checks.map((key) => infraData.checks[key]?.status ?? 'unknown')
      : sources.checks.map(() => 'checking')

    if (sources.deploy) {
      statuses.push(infraData ? getDeployHealthStatus(infraData.deploy.status) : 'checking')
    }

    return {
      mod,
      isHidden: preferences.hiddenModules.includes(mod.name),
      hasStatus,
      moduleStatus: hasStatus ? getWorstStatus(statuses) : 'unknown',
      statusSummary: hasStatus ? getStatusSummary(infraData, sources) : 'Nie skonfigurowano',
      deployHealthStatus: sources.deploy ? getDeployHealthStatus(infraData?.deploy.status) : 'unknown',
      deployText: sources.deploy
        ? `${infraData?.deploy.shortSha ?? 'brak nr'} · ${formatStatusTime(infraData?.deploy.completedAt)}`
        : 'Brak deployu',
      problemDetails: getProblemDetails(infraData, sources),
    }
  }), [canAccessInfrastructure, infraData, permissionFilteredModules, preferences.hiddenModules])

  const sceneModules = editMode
    ? allModuleViewModels
    : allModuleViewModels.filter((item) => !item.isHidden)

  const panelModules = allModuleViewModels.filter((item) => {
    if (panelFilter === 'available') return item.moduleStatus === 'healthy'
    if (panelFilter === 'alert') return item.moduleStatus === 'warning' || item.moduleStatus === 'error'
    return true
  })

  const toggleModule = (name: string) => {
    const next = preferences.hiddenModules.includes(name)
      ? preferences.hiddenModules.filter((moduleName) => moduleName !== name)
      : [...preferences.hiddenModules, name]
    updatePreferences({ hiddenModules: next })
  }

  const scheduleSceneTransform = () => {
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      if (sceneRef.current) {
        const { x, y } = panRef.current
        sceneRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
      }
      frameRef.current = null
    })
  }

  const resetMap = () => {
    panRef.current = { x: 0, y: 0 }
    scheduleSceneTransform()
  }

  const startMapDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('a, button, [data-no-pan]')) return

    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.dataset.panning = 'true'
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: panRef.current.x,
      originY: panRef.current.y,
    }
  }

  const moveMapDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    panRef.current = {
      x: clamp(drag.originX + event.clientX - drag.startX, -620, 210),
      y: clamp(drag.originY + event.clientY - drag.startY, -140, 130),
    }
    scheduleSceneTransform()
  }

  const endMapDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    delete event.currentTarget.dataset.panning
  }

  const startPanelResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)

    const panel = panelRef.current
    if (!panel) return
    resizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originWidth: panel.offsetWidth,
      originHeight: panel.offsetHeight,
    }
  }

  const movePanelResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current
    const panel = panelRef.current
    if (!resize || !panel || resize.pointerId !== event.pointerId) return

    const maxWidth = Math.min(520, window.innerWidth - 32)
    const maxHeight = Math.min(680, window.innerHeight - 190)
    panel.style.width = `${clamp(resize.originWidth + event.clientX - resize.startX, 280, maxWidth)}px`
    panel.style.height = `${clamp(resize.originHeight + event.clientY - resize.startY, 300, maxHeight)}px`
  }

  const endPanelResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (resizeRef.current?.pointerId !== event.pointerId || !panelRef.current) return
    resizeRef.current = null
    updatePreferences({
      operationsPanelSize: {
        width: panelRef.current.offsetWidth,
        height: panelRef.current.offsetHeight,
      },
    })
  }

  return (
    <section className="relative mt-4 min-h-0 w-full flex-1">
      <div className="absolute right-1 top-1 z-50 flex items-center gap-2">
        <button
          onClick={resetMap}
          className="flex h-9 items-center gap-2 rounded-[10px] bg-white/55 px-3 text-xs font-medium text-[#626c6a] shadow-sm transition-colors hover:bg-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Wyśrodkuj
        </button>
        <button
          onClick={() => setEditMode((value) => !value)}
          className={`flex h-9 items-center gap-2 rounded-[10px] px-3 text-xs font-medium shadow-sm transition-colors ${
            editMode ? 'bg-[#202020] text-white' : 'bg-white/65 text-[#626c6a] hover:bg-white'
          }`}
        >
          <Settings2 className="h-3.5 w-3.5" />
          {editMode ? 'Zapisz układ' : 'Dostosuj'}
        </button>
      </div>

      <div className="ecosystem-board-warehouse relative h-full min-h-[500px] overflow-hidden rounded-[20px]">
        <div className="warehouse-floor-lines absolute inset-0" />

        <div
          ref={viewportRef}
          className="warehouse-map-viewport absolute inset-0 overflow-hidden rounded-[20px]"
          onPointerDown={startMapDrag}
          onPointerMove={moveMapDrag}
          onPointerUp={endMapDrag}
          onPointerCancel={endMapDrag}
        >
          <div ref={sceneRef} className="warehouse-map-scene absolute left-[280px] top-[22px] h-[540px] w-[1240px]">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1240 540" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 155 H280 C320 155 320 135 360 135 H650 C690 135 690 155 730 155 H1240" className="warehouse-route-ok" />
              <path d="M0 410 H250 C290 410 290 330 330 330 H690 C730 330 730 410 770 410 H1240" className="warehouse-route-ok" />
              <path d="M540 135 H860 C910 135 910 145 960 145 H1240" className="warehouse-route-danger" />
              <path d="M640 155 V330 C640 370 680 370 680 410" className="warehouse-route-ok" />
              <path d="M1060 145 V350 C1060 390 1015 390 1015 440 V540" className="warehouse-route-danger" />
              {[155, 410].map((y) => (
                <g key={y}>
                  {[110, 280, 470, 690, 880, 1080].map((x) => (
                    <circle key={x} cx={x} cy={y} r="4" className="warehouse-route-node" />
                  ))}
                </g>
              ))}
            </svg>

            {sceneModules.map((item) => {
              const { mod, isHidden, moduleStatus, statusSummary, deployText, problemDetails } = item
              const Icon = mod.icon
              const status = statusMeta[moduleStatus]
              const layout = moduleLayout[mod.name]
              const palette = modulePalette[mod.color]
              const showProblemTooltip = (moduleStatus === 'warning' || moduleStatus === 'error') && problemDetails.length > 0

              const tile = (
                <article
                  className={`warehouse-module-tile group absolute z-20 ${isHidden ? 'opacity-40' : ''}`}
                  style={{
                    left: layout.left,
                    top: layout.top,
                    width: layout.width,
                    height: layout.height,
                    '--module-accent': palette.accent,
                    '--module-accent-dark': palette.dark,
                    '--module-rgb': palette.rgb,
                  } as CSSProperties}
                >
                  <div className="warehouse-module-surface">
                    <div className="relative z-10 flex items-start justify-between gap-3">
                      <span className="warehouse-module-icon">
                        <Icon className="h-5 w-5" />
                      </span>
                      {editMode ? (
                        <button
                          onClick={() => toggleModule(mod.name)}
                          className="rounded-[9px] bg-white/65 p-2 text-[#65706d] transition-colors hover:bg-white"
                          title={isHidden ? 'Pokaż moduł' : 'Ukryj moduł'}
                        >
                          {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      ) : mod.href ? (
                        <ArrowUpRight className="h-4 w-4 text-[#687370] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      ) : null}
                    </div>

                    <div className="relative z-10 mt-auto">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                        <h3 className="text-base font-semibold text-[#222725]">{mod.label}</h3>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-[#5f6b68]">{statusSummary}</p>
                      <p className="mt-1 truncate text-[10px] text-[#7b8583]">{deployText}</p>
                    </div>
                  </div>

                  {showProblemTooltip && (
                    <span className="pointer-events-none absolute bottom-full left-0 z-50 mb-3 hidden w-72 rounded-[12px] bg-[#202523] p-3 text-left text-xs text-white shadow-xl group-hover:block">
                      <span className="mb-1 block font-semibold">Co się stało</span>
                      {problemDetails.map((detail) => (
                        <span key={detail.text} className="block leading-relaxed text-white/75">{detail.text}</span>
                      ))}
                    </span>
                  )}
                </article>
              )

              return mod.href && !editMode ? (
                <Link key={mod.name} href={mod.href} className="contents">{tile}</Link>
              ) : (
                <div key={mod.name} className="contents">{tile}</div>
              )
            })}
          </div>
        </div>

        <aside
          ref={panelRef}
          data-no-pan
          className="operations-panel absolute left-3 top-3 z-40 flex min-h-[300px] min-w-[280px] flex-col overflow-hidden rounded-[18px] bg-white/68 shadow-[0_24px_64px_rgba(80,100,98,0.18)] backdrop-blur-2xl"
          style={{
            width: preferences.operationsPanelSize.width,
            height: preferences.operationsPanelSize.height,
            maxWidth: 'calc(100% - 24px)',
            maxHeight: 'calc(100% - 24px)',
          }}
        >
          <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-4">
            <div>
              <p className="text-sm font-semibold text-[#242927]">Report operations</p>
              <p className="mt-0.5 text-[11px] text-[#7a8482]">{allModuleViewModels.length} modułów ekosystemu</p>
            </div>
            <GripVertical className="h-4 w-4 text-[#9aa3a1]" />
          </div>

          <div className="flex shrink-0 gap-1.5 border-y border-white/70 px-3 py-2.5">
            {([
              ['all', 'Wszystkie'],
              ['available', 'Działa'],
              ['alert', 'Alerty'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setPanelFilter(value)}
                className={`h-8 rounded-[9px] px-3 text-[11px] font-medium transition-colors ${
                  panelFilter === value
                    ? 'bg-white text-[#242927] shadow-sm'
                    : 'text-[#727c79] hover:bg-white/55'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5 pr-2">
            {panelModules.map((item) => {
              const { mod, moduleStatus, statusSummary, deployText, isHidden } = item
              const Icon = mod.icon
              const status = statusMeta[moduleStatus]
              const row = (
                <div className={`group flex items-center gap-3 rounded-[12px] bg-white/52 p-2.5 transition-colors hover:bg-white/85 ${isHidden ? 'opacity-45' : ''}`}>
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                    style={{ backgroundColor: `${modulePalette[mod.color].accent}38`, color: modulePalette[mod.color].dark }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-[#242927]">{mod.label}</p>
                      <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} title={status.label} />
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-[#6e7976]">{statusSummary}</p>
                    <p className="mt-0.5 truncate text-[9px] text-[#98a09f]">Deploy: {deployText}</p>
                  </div>
                  {mod.href && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#929b99] group-hover:text-[#39403e]" />}
                </div>
              )

              return mod.href ? (
                <Link key={mod.name} href={mod.href}>{row}</Link>
              ) : (
                <div key={mod.name}>{row}</div>
              )
            })}

            {panelModules.length === 0 && (
              <div className="flex h-24 items-center justify-center text-xs text-[#7a8482]">
                Brak modułów w tym widoku
              </div>
            )}
          </div>

          <button
            className="absolute bottom-0 right-0 flex h-7 w-7 cursor-nwse-resize touch-none items-end justify-end p-1.5 text-[#7a8482]"
            onPointerDown={startPanelResize}
            onPointerMove={movePanelResize}
            onPointerUp={endPanelResize}
            onPointerCancel={endPanelResize}
            aria-label="Zmień rozmiar panelu"
            title="Przeciągnij, aby zmienić rozmiar"
          >
            <MoveDiagonal2 className="h-3.5 w-3.5" />
          </button>
        </aside>

        {!editMode && sceneModules.length === 0 && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-[20px] bg-white/72 text-center backdrop-blur-xl">
            <p className="mb-3 text-sm text-[#6d7775]">Wszystkie moduły są ukryte</p>
            <button
              onClick={() => setEditMode(true)}
              className="rounded-[11px] bg-[#202020] px-5 py-2.5 text-sm font-medium text-white"
            >
              Przywróć moduły
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
