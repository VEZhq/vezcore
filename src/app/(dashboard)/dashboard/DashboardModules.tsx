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

type NavigationAccess = {
  canAccessKonta: boolean
  canAccessAudit: boolean
  canAccessSettings: boolean
  canViewVezVisionBlog: boolean
  canViewVezVisionPortfolio: boolean
  canViewVezVisionServices: boolean
  canViewVezVisionFaq: boolean
  canViewVezVisionNewsletter: boolean
  canViewVezVisionFiles: boolean
  canViewVezVisionSettings: boolean
  canViewVezVisionCalendar: boolean
}

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

type InternalLink = {
  label: string
  href: string
  description: string
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
  { id: 'deploy', label: 'Deploy', deploy: true, owner: 'vez', icon: Rocket, left: 766, top: 280, width: 126 },
  { id: 'labApi', label: 'Lab API', checkKey: 'labApi', owner: 'vezLabs', icon: Server, left: 806, top: 28, width: 132 },
  { id: 'minio', label: 'MinIO', checkKey: 'minio', owner: 'vezLabs', icon: HardDrive, left: 812, top: 280, width: 126 },
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

function buildInternalLinks(access: NavigationAccess): Record<DashboardModuleName, InternalLink[]> {
  return {
    vez: [],
    vezVision: [
      { label: 'Centrum VEZvision', href: '/vezvision', description: 'Przegląd modułu' },
      ...(access.canViewVezVisionBlog
        ? [{ label: 'Blog', href: '/vezvision/blog', description: 'Publikacje i szkice' }]
        : []),
      ...(access.canViewVezVisionPortfolio
        ? [{ label: 'Portfolio', href: '/vezvision/portfolio', description: 'Projekty i realizacje' }]
        : []),
      ...(access.canViewVezVisionServices
        ? [{ label: 'Usługi', href: '/vezvision/services', description: 'Oferta usług' }]
        : []),
      ...(access.canViewVezVisionFaq
        ? [{ label: 'FAQ', href: '/vezvision/faq', description: 'Pytania i odpowiedzi' }]
        : []),
      ...(access.canViewVezVisionFiles
        ? [{ label: 'Pliki', href: '/vezvision/files', description: 'Zasoby i foldery' }]
        : []),
      ...(access.canViewVezVisionNewsletter
        ? [{ label: 'Newsletter', href: '/vezvision/newsletter', description: 'Kampanie i odbiorcy' }]
        : []),
      ...(access.canViewVezVisionCalendar
        ? [{ label: 'Kalendarz', href: '/vezvision/calendar', description: 'Terminy i wydarzenia' }]
        : []),
      ...(access.canViewVezVisionSettings
        ? [{ label: 'Ustawienia VEZvision', href: '/vezvision/settings', description: 'Konfiguracja modułu' }]
        : []),
    ],
    vezLabs: [],
    vezRent: [],
    vezStudio: [],
    vezWork: [],
    nably: [],
  }
}

export function DashboardModules({
  canAccessVezVision,
  canAccessInfrastructure,
  navigationAccess,
}: {
  canAccessVezVision: boolean
  canAccessInfrastructure: boolean
  navigationAccess: NavigationAccess
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

  const internalLinks = useMemo(() => buildInternalLinks(navigationAccess), [navigationAccess])
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
          className="flex h-9 items-center gap-2 rounded-[9px] border border-black/[0.06] bg-white/80 px-3 text-xs font-medium text-[#626866] shadow-sm transition-colors hover:bg-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Wyśrodkuj
        </button>
        <button
          onClick={() => setEditMode((value) => !value)}
          className={`flex h-9 items-center gap-2 rounded-[9px] border px-3 text-xs font-medium shadow-sm transition-colors ${
            editMode
              ? 'border-[#202020] bg-[#202020] text-white'
              : 'border-black/[0.06] bg-white/80 text-[#626866] hover:bg-white'
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
                  d="M268 126 H360 L384 150 V220 L408 244 H510"
                  className={`ecosystem-edge ${edgeStatusClass(statusByModule.vezVision ?? 'unknown')}`}
                />
              )}
              {sceneModuleNames.has('vez') && sceneModuleNames.has('vezLabs') && (
                <path
                  d="M730 244 H810 L834 220 V150 L858 126 H970"
                  className={`ecosystem-edge ${edgeStatusClass(labsStatus)}`}
                />
              )}
              {sceneModuleNames.has('vezLabs') && (
                <>
                  {([
                    ['nably', 'M1012 182 V328 L990 350 H150 V430'],
                    ['vezWork', 'M1052 182 V350 L1032 370 H458 V430'],
                    ['vezRent', 'M1092 182 V370 L1072 390 H788 V430'],
                    ['vezStudio', 'M1132 182 V390 L1112 410 H1098 V430'],
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
                <path d="M164 182 V196 H174 V210" className={`ecosystem-edge service-edge ${edgeStatusClass(serviceStatusById.prodApi)}`} />
              )}
              {canAccessInfrastructure && sceneModuleNames.has('vez') && (
                <>
                  <path d="M510 304 H492 L474 304" className={`ecosystem-edge service-edge ${edgeStatusClass(serviceStatusById.database)}`} />
                  <path d="M730 304 H748 L766 304" className={`ecosystem-edge service-edge ${edgeStatusClass(serviceStatusById.deploy)}`} />
                </>
              )}
              {canAccessInfrastructure && sceneModuleNames.has('vezLabs') && (
                <>
                  <path d="M994 70 V52 H938" className={`ecosystem-edge service-edge ${edgeStatusClass(serviceStatusById.labApi)}`} />
                  <path d="M994 182 V252 L966 280 H938" className={`ecosystem-edge service-edge ${edgeStatusClass(serviceStatusById.minio)}`} />
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
                      {editMode ? (
                        <button
                          onClick={() => toggleModule(mod.name)}
                          className="rounded-[8px] border border-black/[0.05] bg-white/80 p-1.5 text-[#69706e] transition-colors hover:bg-white"
                          title={isHidden ? 'Pokaż moduł' : 'Ukryj moduł'}
                        >
                          {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                      ) : mod.href ? (
                        <ArrowUpRight className="h-4 w-4 text-[#89908e] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      ) : null}
                    </div>

                    <div className="mt-auto">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                        <h3 className="text-[15px] font-semibold text-[#242826]">{mod.label}</h3>
                      </div>
                      <p className="mt-1 truncate text-[10px] text-[#69716e]">{statusSummary}</p>
                      {mod.name === 'vezVision' && (
                        <p className="mt-0.5 truncate text-[9px] text-[#929896]">Deploy: {deployText}</p>
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
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[#f1f2f1] text-[#717876]">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} />
                        <span className="truncate text-[10px] font-semibold text-[#303432]">{node.label}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[8px] text-[#858c89]">{detail}</span>
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
              <p className="text-[12px] font-semibold text-[#242725]">Report operations</p>
              <p className="mt-0.5 text-[9px] text-[#8a918f]">
                {healthyModuleCount} działa · {alertModuleCount} alertów
              </p>
            </div>
            <GripVertical className="h-4 w-4 text-[#a2a8a6]" />
          </div>

          <div className="flex shrink-0 gap-1 border-y border-black/[0.05] px-3 py-1.5">
            {([
              ['all', 'Wszystkie'],
              ['alert', `Alerty ${alertModuleCount}`],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setPanelFilter(value)}
                className={`h-6 rounded-[6px] px-2 text-[9px] font-medium transition-colors ${
                  panelFilter === value
                    ? 'bg-[#f0f1f0] text-[#242725]'
                    : 'text-[#747b79] hover:bg-[#f5f6f5]'
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
              const links = internalLinks[mod.name]
              const resources = canAccessInfrastructure
                ? (infraData?.resources ?? []).filter((resource) => resource.module === mod.name)
                : []

              return (
                <div
                  key={mod.name}
                  className={`mb-1 overflow-hidden rounded-[10px] border transition-colors ${
                    isOpen ? 'border-black/[0.08] bg-white' : 'border-transparent bg-[#fafafa] hover:bg-white'
                  } ${isHidden ? 'opacity-45' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenModule(isOpen ? null : mod.name)}
                    className="flex w-full items-center gap-2 p-2 text-left"
                    aria-expanded={isOpen}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px]"
                      style={{ backgroundColor: palette.soft, color: palette.accent }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-[#272a29]">
                      {mod.label}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      <span className="text-[8px] text-[#7e8583]">{status.label}</span>
                      <ChevronDown className={`h-3 w-3 text-[#9ca2a0] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-black/[0.05] px-2.5 pb-2.5 pt-2">
                      <div className="flex items-center justify-between gap-3 text-[8px]">
                        <span className={`inline-flex items-center gap-1.5 font-medium ${status.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                        {moduleStatusSources[mod.name].deploy && (
                          <span className="truncate text-[#929896]">Deploy {deployText}</span>
                        )}
                      </div>

                      {links.length > 0 && (
                        <div className="mt-2">
                          <p className="mb-1 text-[8px] font-medium text-[#9aa09e]">Strony</p>
                          <div className="grid grid-cols-2 gap-1">
                            {links.map((link) => (
                              <Link
                                key={link.href}
                                href={link.href}
                                className="group/link flex min-w-0 items-center gap-1 rounded-[6px] bg-[#f7f8f7] px-2 py-1.5 transition-colors hover:bg-[#f1f2f1]"
                              >
                                <span className="min-w-0 flex-1 truncate text-[9px] font-medium text-[#454a48]">{link.label}</span>
                                <ArrowUpRight className="h-2.5 w-2.5 shrink-0 text-[#a1a7a5] group-hover/link:text-[#4f5654]" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {resources.length > 0 && (
                        <div className="mt-2">
                          <p className="mb-1 text-[8px] font-medium text-[#9aa09e]">Zasoby</p>
                          <div className="space-y-1">
                            {resources.map((resource) => {
                              const resourceKey = `${mod.name}-${resource.label}`
                              const isRevealed = revealedAliases.includes(resourceKey)
                              const isCopied = copiedAlias === resourceKey

                              return (
                                <div key={resourceKey} className="rounded-[7px] bg-[#f7f8f7] px-2 py-1.5">
                                  <a
                                    href={resource.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group/resource flex items-center gap-2"
                                  >
                                    <span className="min-w-0 flex-1 truncate text-[9px] font-medium text-[#454a48]">{resource.label}</span>
                                    <ExternalLink className="h-2.5 w-2.5 shrink-0 text-[#a1a7a5] group-hover/resource:text-[#4f5654]" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleAliasClick(resourceKey, resource.alias)}
                                    className="group/alias mt-1 flex h-6 w-full items-center justify-between gap-2 rounded-[5px] bg-white px-1.5 font-mono text-[8px] text-[#6f7774] transition-colors hover:bg-[#fdfdfd]"
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
