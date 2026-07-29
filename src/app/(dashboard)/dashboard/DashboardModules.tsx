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
  Activity,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  HardDrive,
  Info,
  MoveDiagonal2,
  Rocket,
  RotateCcw,
  Server,
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
type PanelFilter = 'all' | 'alert'

type InfrastructureResource = {
  module: 'vez' | 'vezVision' | 'vezLabs'
  label: string
  href: string
  description: string
  alias: string
  aliasType: 'prod' | 'lab' | 'tunnel' | 'router'
}

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
  resources?: InfrastructureResource[]
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

type ServiceNodeDefinition = {
  id: 'prodApi' | 'database' | 'deploy' | 'labApi' | 'minio' | 'monitor'
  label: string
  checkKey?: string
  deploy?: boolean
  owner: DashboardModuleName
  icon: typeof Server
  left: number
  top: number
  width: number
}

const moduleStatusSources: Record<DashboardModuleName, { checks: string[]; deploy?: boolean }> = {
  vez: { checks: [] },
  vezVision: { checks: ['prodApi'], deploy: true },
  vezLabs: { checks: ['labApi', 'monitor', 'minio'] },
  vezRent: { checks: [] },
  vezStudio: { checks: [] },
  vezWork: { checks: [] },
  nably: { checks: [] },
}

const statusMeta: Record<HealthStatus, { label: string; dot: string; text: string }> = {
  checking: { label: 'Sprawdzam', dot: 'bg-[#8c9492]', text: 'text-[#717976]' },
  healthy: { label: 'Działa', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  warning: { label: 'Uwaga', dot: 'bg-amber-400', text: 'text-amber-700' },
  error: { label: 'Nie działa', dot: 'bg-red-500', text: 'text-red-700' },
  unknown: { label: 'Brak monitoringu', dot: 'bg-[#a0a7a5]', text: 'text-[#717976]' },
}

const modulePalette: Record<DashboardModuleDefinition['color'], { accent: string; soft: string }> = {
  sage: { accent: '#668875', soft: '#edf4ef' },
  sand: { accent: '#92734e', soft: '#f6f1e9' },
  mauve: { accent: '#806a82', soft: '#f3eef4' },
  peach: { accent: '#9b6d4f', soft: '#f7efe9' },
  rose: { accent: '#8d6674', soft: '#f6eef1' },
  mint: { accent: '#687f62', soft: '#eff4ed' },
  linen: { accent: '#7e725f', soft: '#f4f1ec' },
}

const moduleLayout: Record<DashboardModuleName, { left: number; top: number; width: number; height: number }> = {
  vez: { left: 510, top: 210, width: 220, height: 122 },
  vezVision: { left: 60, top: 70, width: 208, height: 112 },
  vezLabs: { left: 970, top: 70, width: 208, height: 112 },
  nably: { left: 52, top: 430, width: 196, height: 108 },
  vezWork: { left: 360, top: 430, width: 196, height: 108 },
  vezRent: { left: 690, top: 430, width: 196, height: 108 },
  vezStudio: { left: 1000, top: 430, width: 196, height: 108 },
}

const serviceNodes: ServiceNodeDefinition[] = [
  { id: 'prodApi', label: 'Prod API', checkKey: 'prodApi', owner: 'vezVision', icon: Server, left: 104, top: 210, width: 140 },
  { id: 'database', label: 'Core DB', checkKey: 'database', owner: 'vez', icon: Database, left: 342, top: 280, width: 132 },
  { id: 'deploy', label: 'Deploy', deploy: true, owner: 'vez', icon: Rocket, left: 746, top: 280, width: 126 },
  { id: 'labApi', label: 'Lab API', checkKey: 'labApi', owner: 'vezLabs', icon: Server, left: 806, top: 28, width: 132 },
  { id: 'minio', label: 'MinIO', checkKey: 'minio', owner: 'vezLabs', icon: HardDrive, left: 900, top: 280, width: 126 },
  { id: 'monitor', label: 'Monitor', checkKey: 'monitor', owner: 'vezLabs', icon: Activity, left: 1202, top: 102, width: 132 },
]

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

function edgeStatusClass(status: HealthStatus) {
  if (status === 'healthy') return 'is-healthy'
  if (status === 'warning') return 'is-warning'
  if (status === 'error') return 'is-error'
  return 'is-neutral'
}

function dependencyStatus(parent: HealthStatus, target: HealthStatus) {
  if (parent === 'error' || parent === 'warning') return parent
  return target
}

function getServiceNodeStatus(node: ServiceNodeDefinition, infraData: InfraData | null): HealthStatus {
  if (!infraData) return 'checking'
  if (node.deploy) return getDeployHealthStatus(infraData.deploy.status)
  return infraData.checks[node.checkKey ?? '']?.status ?? 'unknown'
}

function getServiceNodeDetail(node: ServiceNodeDefinition, infraData: InfraData | null) {
  if (!infraData) return 'Sprawdzam'
  if (node.deploy) {
    return infraData.deploy.shortSha ?? statusMeta[getDeployHealthStatus(infraData.deploy.status)].label
  }

  const check = infraData.checks[node.checkKey ?? '']
  if (!check) return 'Brak danych'
  return check.latencyMs ? `${check.detail} · ${check.latencyMs}ms` : check.detail
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
  const [openModule, setOpenModule] = useState<DashboardModuleName | null>(null)
  const [revealedAliases, setRevealedAliases] = useState<string[]>([])
  const [copiedAlias, setCopiedAlias] = useState<string | null>(null)
  const [infraData, setInfraData] = useState<InfraData | null>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
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
    if (panelFilter === 'alert') return item.moduleStatus === 'warning' || item.moduleStatus === 'error'
    return true
  })
  const healthyModuleCount = allModuleViewModels.filter((item) => item.moduleStatus === 'healthy').length
  const alertModuleCount = allModuleViewModels.filter(
    (item) => item.moduleStatus === 'warning' || item.moduleStatus === 'error'
  ).length

  const statusByModule = Object.fromEntries(
    allModuleViewModels.map((item) => [item.mod.name, item.moduleStatus])
  ) as Record<DashboardModuleName, HealthStatus>
  const sceneModuleNames = new Set(sceneModules.map((item) => item.mod.name))
  const labsStatus = statusByModule.vezLabs ?? 'unknown'
  const serviceStatusById = Object.fromEntries(
    serviceNodes.map((node) => [node.id, getServiceNodeStatus(node, infraData)])
  ) as Record<ServiceNodeDefinition['id'], HealthStatus>

  const toggleModule = (name: DashboardModuleName) => {
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
      x: clamp(drag.originX + event.clientX - drag.startX, -520, 230),
      y: clamp(drag.originY + event.clientY - drag.startY, -120, 120),
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

    const maxWidth = Math.min(540, window.innerWidth - 32)
    const maxHeight = Math.min(700, window.innerHeight - 190)
    panel.style.width = `${clamp(resize.originWidth + event.clientX - resize.startX, 280, maxWidth)}px`
    panel.style.height = `${clamp(resize.originHeight + event.clientY - resize.startY, 280, maxHeight)}px`
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

  const handleAliasClick = async (key: string, alias: string) => {
    const supportsHover = window.matchMedia('(hover: hover)').matches
    const isRevealed = revealedAliases.includes(key)

    if (!supportsHover && !isRevealed) {
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
    <section className="relative mt-2 min-h-0 w-full flex-1">
      <div className="absolute right-1 top-1 z-50 flex items-center gap-2">
        <button
          onClick={resetMap}
          className="flex h-9 items-center gap-2 rounded-[9px] border border-black/[0.06] bg-white/80 px-3 text-xs font-medium text-[#626866] shadow-sm transition-colors hover:bg-white dark:border-white/[0.09] dark:bg-[#121413]/90 dark:text-[#aeb3b1] dark:hover:bg-[#181b1a]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Wyśrodkuj
        </button>
        <button
          onClick={() => setEditMode((value) => !value)}
          className={`flex h-9 items-center gap-2 rounded-[9px] border px-3 text-xs font-medium shadow-sm transition-colors ${
            editMode
              ? 'border-[#202020] bg-[#202020] text-white dark:border-white/70 dark:bg-white dark:text-black'
              : 'border-black/[0.06] bg-white/80 text-[#626866] hover:bg-white dark:border-white/[0.09] dark:bg-[#121413]/90 dark:text-[#aeb3b1] dark:hover:bg-[#181b1a]'
          }`}
        >
          <Settings2 className="h-3.5 w-3.5" />
          {editMode ? 'Zapisz układ' : 'Dostosuj'}
        </button>
      </div>

      <div className="ecosystem-board-warehouse relative h-full min-h-[500px] overflow-hidden rounded-[18px]">
        <div className="warehouse-floor-lines absolute inset-0" />

        <div
          className="warehouse-map-viewport absolute inset-0 overflow-hidden rounded-[18px]"
          onPointerDown={startMapDrag}
          onPointerMove={moveMapDrag}
          onPointerUp={endMapDrag}
          onPointerCancel={endMapDrag}
        >
          <div ref={sceneRef} className="warehouse-map-scene absolute left-[300px] top-[8px] h-[570px] w-[1360px]">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1360 570" preserveAspectRatio="none" aria-hidden="true">
              {sceneModuleNames.has('vez') && sceneModuleNames.has('vezVision') && (
                <path
                  d="M268 126 H356 V188 H438 V271 H510"
                  className={`ecosystem-edge ${edgeStatusClass(statusByModule.vezVision ?? 'unknown')}`}
                />
              )}
              {sceneModuleNames.has('vez') && sceneModuleNames.has('vezLabs') && (
                <path
                  d="M730 271 H814 V188 H886 V126 H970"
                  className={`ecosystem-edge ${edgeStatusClass(labsStatus)}`}
                />
              )}
              {sceneModuleNames.has('vezLabs') && (
                <>
                  {([
                    ['nably', 'M1000 182 V344 H150 V430'],
                    ['vezWork', 'M1045 182 V365 H458 V430'],
                    ['vezRent', 'M1090 182 V386 H788 V430'],
                    ['vezStudio', 'M1135 182 V407 H1098 V430'],
                  ] as const).map(([name, path]) => {
                    if (!sceneModuleNames.has(name)) return null
                    const branchStatus = dependencyStatus(labsStatus, statusByModule[name] ?? 'unknown')
                    return (
                      <path
                        key={name}
                        d={path}
                        className={`ecosystem-edge ${edgeStatusClass(branchStatus)}`}
                      />
                    )
                  })}
                </>
              )}
              {canAccessInfrastructure && sceneModuleNames.has('vezVision') && (
                <path d="M164 182 V210" className={`ecosystem-edge service-edge ${edgeStatusClass(serviceStatusById.prodApi)}`} />
              )}
              {canAccessInfrastructure && sceneModuleNames.has('vez') && (
                <>
                  <path d="M510 304 H474" className={`ecosystem-edge service-edge ${edgeStatusClass(serviceStatusById.database)}`} />
                  <path d="M730 304 H746" className={`ecosystem-edge service-edge ${edgeStatusClass(serviceStatusById.deploy)}`} />
                </>
              )}
              {canAccessInfrastructure && sceneModuleNames.has('vezLabs') && (
                <>
                  <path d="M994 70 V52 H938" className={`ecosystem-edge service-edge ${edgeStatusClass(serviceStatusById.labApi)}`} />
                  <path d="M1018 182 V238 H963 V280" className={`ecosystem-edge service-edge ${edgeStatusClass(serviceStatusById.minio)}`} />
                  <path d="M1178 126 H1202" className={`ecosystem-edge service-edge ${edgeStatusClass(serviceStatusById.monitor)}`} />
                </>
              )}
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
                  className={`warehouse-module-tile group absolute z-20 ${mod.name === 'vez' ? 'is-root' : ''} ${isHidden ? 'opacity-40' : ''}`}
                  style={{
                    left: layout.left,
                    top: layout.top,
                    width: layout.width,
                    height: layout.height,
                    '--module-accent': palette.accent,
                    '--module-soft': palette.soft,
                  } as CSSProperties}
                >
                  <div className="warehouse-module-surface">
                    <div className="flex items-start justify-between gap-3">
                      <span className="warehouse-module-icon">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="flex items-center gap-1">
                        <span
                          role="button"
                          tabIndex={0}
                          className="group/info relative flex h-7 w-7 items-center justify-center rounded-full text-[#8c9391] transition-colors hover:bg-black/[0.04] hover:text-[#343836] focus:bg-black/[0.04] focus:outline-none dark:text-[#8c9391] dark:hover:bg-white/[0.07] dark:hover:text-white dark:focus:bg-white/[0.07]"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                          }}
                          aria-label={`Informacje o ${mod.label}`}
                        >
                          <Info className="h-3.5 w-3.5" />
                          <span className="pointer-events-none absolute right-0 top-9 z-50 hidden w-52 rounded-[8px] bg-[#242725] px-3 py-2 text-left text-[10px] font-normal leading-relaxed text-white shadow-xl group-hover/info:block group-focus/info:block">
                            {mod.description}
                          </span>
                        </span>
                        {editMode ? (
                          <button
                            onClick={() => toggleModule(mod.name)}
                            className="rounded-[8px] border border-black/[0.05] bg-white/80 p-1.5 text-[#69706e] transition-colors hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-[#a7adaa] dark:hover:bg-white/[0.1]"
                            title={isHidden ? 'Pokaż moduł' : 'Ukryj moduł'}
                          >
                            {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                        ) : mod.href ? (
                          <ArrowUpRight className="h-4 w-4 text-[#89908e] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        ) : null}
                      </span>
                    </div>

                    <div className="mt-auto">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                        <h3 className="text-[15px] font-semibold text-[#242826] dark:text-[#f0f1f0]">{mod.label}</h3>
                      </div>
                      <p className="mt-1 truncate text-[10px] text-[#69716e] dark:text-[#a0a5a2]">{statusSummary}</p>
                      {mod.name === 'vezVision' && (
                        <p className="mt-0.5 truncate text-[9px] text-[#929896] dark:text-[#747b78]">Deploy: {deployText}</p>
                      )}
                    </div>
                  </div>

                  {showProblemTooltip && (
                    <span className="pointer-events-none absolute bottom-full left-0 z-50 mb-3 hidden w-72 rounded-[11px] bg-[#202321] p-3 text-left text-xs text-white shadow-xl group-hover:block">
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

            {serviceNodes
              .filter((node) => canAccessInfrastructure && sceneModuleNames.has(node.owner))
              .map((node) => {
                const Icon = node.icon
                const nodeStatus = serviceStatusById[node.id]
                const status = statusMeta[nodeStatus]
                const detail = getServiceNodeDetail(node, infraData)

                return (
                  <div
                    key={node.id}
                    className="ecosystem-service-node absolute z-30 flex items-center gap-2.5"
                    style={{ left: node.left, top: node.top, width: node.width }}
                    title={`${node.label}: ${detail}`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[#f1f2f1] text-[#717876] dark:bg-white/[0.07] dark:text-[#a8aeab]">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} />
                        <span className="truncate text-[10px] font-semibold text-[#303432] dark:text-[#e5e7e6]">{node.label}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[8px] text-[#858c89] dark:text-[#858b88]">{detail}</span>
                    </span>
                  </div>
                )
              })}
          </div>
        </div>

        <aside
          ref={panelRef}
          data-no-pan
          className="operations-panel absolute left-3 top-3 z-40 flex min-h-[280px] min-w-[280px] flex-col overflow-hidden rounded-[14px]"
          style={{
            width: preferences.operationsPanelSize.width,
            height: preferences.operationsPanelSize.height,
            maxWidth: 'calc(100% - 24px)',
            maxHeight: 'calc(100% - 24px)',
          }}
        >
          <div className="flex shrink-0 items-center justify-between px-3.5 pb-2 pt-3">
            <div>
              <p className="text-[13px] font-semibold text-[#242725] dark:text-[#eef0ef]">Report operations</p>
              <p className="mt-0.5 text-[10px] text-[#8a918f] dark:text-[#858c88]">
                {healthyModuleCount} działa · {alertModuleCount} alertów
              </p>
            </div>
            <GripVertical className="h-4 w-4 text-[#a2a8a6]" />
          </div>

          <div className="flex shrink-0 gap-1 border-y border-black/[0.05] px-3 py-1.5 dark:border-white/[0.07]">
            {([
              ['all', 'Wszystkie'],
              ['alert', `Alerty ${alertModuleCount}`],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setPanelFilter(value)}
                className={`h-6 rounded-[6px] px-2 text-[9px] font-medium transition-colors ${
                  panelFilter === value
                    ? 'bg-[#f0f1f0] text-[#242725] dark:bg-white/[0.09] dark:text-white'
                    : 'text-[#747b79] hover:bg-[#f5f6f5] dark:text-[#8f9692] dark:hover:bg-white/[0.055]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {panelModules.map((item) => {
              const { mod, moduleStatus, deployText, isHidden } = item
              const Icon = mod.icon
              const status = statusMeta[moduleStatus]
              const palette = modulePalette[mod.color]
              const isOpen = openModule === mod.name
              const resources = canAccessInfrastructure
                ? (infraData?.resources ?? []).filter((resource) => resource.module === mod.name)
                : []

              return (
                <div
                  key={mod.name}
                  className={`mb-1 overflow-hidden rounded-[10px] border transition-colors ${
                    isOpen
                      ? 'border-black/[0.08] bg-white dark:border-white/[0.09] dark:bg-white/[0.055]'
                      : 'border-transparent bg-[#fafafa] hover:bg-white dark:bg-white/[0.025] dark:hover:bg-white/[0.05]'
                  } ${isHidden ? 'opacity-45' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (resources.length > 0) setOpenModule(isOpen ? null : mod.name)
                    }}
                    className="flex w-full items-center gap-2 p-2 text-left"
                    aria-expanded={resources.length > 0 ? isOpen : undefined}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px]"
                      style={{ backgroundColor: palette.soft, color: palette.accent }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#272a29] dark:text-[#e5e7e6]">
                      {mod.label}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      <span className="text-[9px] text-[#7e8583] dark:text-[#969c99]">{status.label}</span>
                      {resources.length > 0 && (
                        <ChevronDown className={`h-3 w-3 text-[#9ca2a0] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      )}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-black/[0.05] px-2.5 pb-2.5 pt-2 dark:border-white/[0.07]">
                      <div className="flex items-center justify-between gap-3 text-[8px]">
                        <span className={`inline-flex items-center gap-1.5 font-medium ${status.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                        {moduleStatusSources[mod.name].deploy && (
                          <span className="truncate text-[#929896]">Deploy {deployText}</span>
                        )}
                      </div>

                      {resources.length > 0 && (
                        <div className="mt-2">
                          <p className="mb-1.5 text-[9px] font-medium text-[#8d9492]">Infrastruktura</p>
                          <div className="space-y-1">
                            {resources.map((resource) => {
                              const resourceKey = `${mod.name}-${resource.label}`
                              const isRevealed = revealedAliases.includes(resourceKey)
                              const isCopied = copiedAlias === resourceKey

                              return (
                                <div key={resourceKey} className="rounded-[7px] bg-[#f7f8f7] px-2 py-1.5 dark:bg-black/20">
                                  <a
                                    href={resource.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group/resource flex items-center gap-2"
                                  >
                                    <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-[#454a48] dark:text-[#c8ccca]">{resource.label}</span>
                                    <ExternalLink className="h-3 w-3 shrink-0 text-[#a1a7a5] group-hover/resource:text-[#4f5654]" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleAliasClick(resourceKey, resource.alias)}
                                    className="group/alias mt-1.5 flex h-7 w-full items-center justify-between gap-2 rounded-[5px] bg-white px-2 font-mono text-[9px] text-[#6f7774] transition-colors hover:bg-[#fdfdfd] dark:bg-white/[0.055] dark:text-[#a7adaa] dark:hover:bg-white/[0.08]"
                                    title="Najedź, aby odsłonić. Kliknij, aby skopiować."
                                  >
                                    <span className="flex min-w-0 items-center gap-1.5">
                                      {isCopied ? (
                                        <Check className="h-2.5 w-2.5 shrink-0 text-emerald-600" />
                                      ) : isRevealed ? (
                                        <Copy className="h-2.5 w-2.5 shrink-0" />
                                      ) : (
                                        <Eye className="h-2.5 w-2.5 shrink-0" />
                                      )}
                                      <span className={isRevealed ? 'hidden' : 'truncate group-hover/alias:hidden'}>••••••••••••</span>
                                      <span className={isRevealed ? 'truncate' : 'hidden truncate group-hover/alias:inline'}>{resource.alias}</span>
                                    </span>
                                    <span className="shrink-0 font-sans text-[7px] text-[#a0a6a4]">
                                      {isCopied ? 'Skopiowano' : 'Kopiuj'}
                                    </span>
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )
            })}

            {panelModules.length === 0 && (
              <div className="flex h-24 items-center justify-center text-xs text-[#7a8482]">
                Brak modułów w tym widoku
              </div>
            )}
          </div>

          <button
            className="absolute bottom-0 right-0 flex h-7 w-7 cursor-nwse-resize touch-none items-end justify-end p-1.5 text-[#8e9593]"
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
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-[18px] bg-white/78 text-center backdrop-blur-xl">
            <p className="mb-3 text-sm text-[#6d7775]">Wszystkie moduły są ukryte</p>
            <button
              onClick={() => setEditMode(true)}
              className="rounded-[9px] bg-[#202020] px-5 py-2.5 text-sm font-medium text-white"
            >
              Przywróć moduły
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
