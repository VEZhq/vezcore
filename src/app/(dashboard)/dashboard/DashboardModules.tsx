'use client'

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
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
  GitBranch,
  GripVertical,
  HardDrive,
  Info,
  LocateFixed,
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
    sha: string | null
    shortSha: string | null
    message: string
    completedAt: string | null
    url: string | null
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

type ModuleDragState = {
  pointerId: number
  name: DashboardModuleName
  startX: number
  startY: number
  originLeft: number
  originTop: number
}

type ModulePosition = {
  left: number
  top: number
}

type ServiceNodeDragState = {
  pointerId: number
  id: ServiceNodeDefinition['id']
  startX: number
  startY: number
  originLeft: number
  originTop: number
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
  href?: string
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
  checking: { label: 'Sprawdzam', dot: 'bg-[#8c9492]', text: 'text-[#717976] dark:text-[#a0a6a3]' },
  healthy: { label: 'Działa', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
  warning: { label: 'Uwaga', dot: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-300' },
  error: { label: 'Nie działa', dot: 'bg-red-500', text: 'text-red-700 dark:text-red-400' },
  unknown: { label: 'Brak monitoringu', dot: 'bg-[#a0a7a5]', text: 'text-[#717976] dark:text-[#a0a6a3]' },
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

const GITHUB_REPOSITORY_URL = 'https://github.com/VEZhq/vezcore'
const moduleRepositories: Partial<Record<DashboardModuleName, string>> = {
  vez: GITHUB_REPOSITORY_URL,
  vezVision: 'https://github.com/VEZvision/vezvision.com',
}
const serviceNodeDescriptions: Record<ServiceNodeDefinition['id'], string> = {
  prodApi: 'Produkcyjny endpoint API obsługujący VEZvision.',
  database: 'Główna baza danych używana przez VEZcore.',
  deploy: 'Ostatni wdrożony commit aplikacji VEZcore.',
  labApi: 'API środowiska testowego i usług VEZlabs.',
  minio: 'Magazyn obiektowy dla plików środowiska Labs.',
  monitor: 'Monitoring dostępności usług ekosystemu.',
}
const SCENE_WIDTH = 1360
const SCENE_HEIGHT = 570
const PAN_LIMIT = 1200
const LAYOUT_MARGIN = PAN_LIMIT
const DRAWING_WIDTH = SCENE_WIDTH + (LAYOUT_MARGIN * 2)
const DRAWING_HEIGHT = SCENE_HEIGHT + (LAYOUT_MARGIN * 2)

const serviceNodes: ServiceNodeDefinition[] = [
  { id: 'prodApi', label: 'Prod API', checkKey: 'prodApi', owner: 'vezVision', icon: Server, left: 104, top: 210, width: 140, href: 'https://api.vezvision.com/healthz' },
  { id: 'database', label: 'Core DB', checkKey: 'database', owner: 'vez', icon: Database, left: 342, top: 280, width: 132 },
  { id: 'deploy', label: 'Deploy', deploy: true, owner: 'vez', icon: Rocket, left: 746, top: 280, width: 126 },
  { id: 'labApi', label: 'Lab API', checkKey: 'labApi', owner: 'vezLabs', icon: Server, left: 806, top: 28, width: 132, href: 'https://api.vezlabs.dev/healthz' },
  { id: 'minio', label: 'MinIO', checkKey: 'minio', owner: 'vezLabs', icon: HardDrive, left: 900, top: 280, width: 126, href: 'https://s3-dev.vezlabs.dev' },
  { id: 'monitor', label: 'Monitor', checkKey: 'monitor', owner: 'vezLabs', icon: Activity, left: 1202, top: 102, width: 132, href: 'https://monitor.vezlabs.dev' },
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

function horizontalConnector(
  from: { x: number; y: number },
  to: { x: number; y: number }
) {
  if (Math.abs(to.y - from.y) < 4) return `M${from.x} ${from.y} H${to.x}`
  const direction = to.x >= from.x ? 1 : -1
  const middleX = from.x + ((to.x - from.x) / 2)
  const chamfer = Math.min(12, Math.max(5, Math.abs(to.y - from.y) / 3))
  return [
    `M${from.x} ${from.y}`,
    `H${middleX - (chamfer * direction)}`,
    `L${middleX} ${from.y + (chamfer * Math.sign(to.y - from.y || 1))}`,
    `V${to.y - (chamfer * Math.sign(to.y - from.y || 1))}`,
    `L${middleX + (chamfer * direction)} ${to.y}`,
    `H${to.x}`,
  ].join(' ')
}

function verticalConnector(
  from: { x: number; y: number },
  to: { x: number; y: number },
  laneOffset = 0
) {
  if (Math.abs(to.x - from.x) < 4 && Math.abs(laneOffset) < 0.5) {
    return `M${from.x} ${from.y} V${to.y}`
  }

  const direction = to.y >= from.y ? 1 : -1
  const middleY = from.y + ((to.y - from.y) / 2) + laneOffset
  const chamfer = Math.min(12, Math.max(5, Math.abs(to.x - from.x) / 5))
  return [
    `M${from.x} ${from.y}`,
    `V${middleY - (chamfer * direction)}`,
    `L${from.x + (chamfer * Math.sign(to.x - from.x || 1))} ${middleY}`,
    `H${to.x - (chamfer * Math.sign(to.x - from.x || 1))}`,
    `L${to.x} ${middleY + (chamfer * direction)}`,
    `V${to.y}`,
  ].join(' ')
}

function moduleAnchor(
  layout: { left: number; top: number; width: number; height: number },
  side: 'left' | 'right' | 'top' | 'bottom'
) {
  if (side === 'left') return { x: layout.left, y: layout.top + (layout.height / 2) }
  if (side === 'right') return { x: layout.left + layout.width, y: layout.top + (layout.height / 2) }
  if (side === 'top') return { x: layout.left + (layout.width / 2), y: layout.top }
  return { x: layout.left + (layout.width / 2), y: layout.top + layout.height }
}

function nodeAnchor(node: ServiceNodeDefinition) {
  return { x: node.left + (node.width / 2), y: node.top + 24 }
}

function serviceConnector(
  layout: { left: number; top: number; width: number; height: number },
  node: ServiceNodeDefinition
) {
  const target = nodeAnchor(node)
  const center = {
    x: layout.left + (layout.width / 2),
    y: layout.top + (layout.height / 2),
  }
  const horizontal = Math.abs(target.x - center.x) >= Math.abs(target.y - center.y)
  if (horizontal) {
    const from = moduleAnchor(layout, target.x < center.x ? 'left' : 'right')
    return horizontalConnector(from, target)
  }
  const from = moduleAnchor(layout, target.y < center.y ? 'top' : 'bottom')
  return verticalConnector(from, target)
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

function getServiceNodeHref(node: ServiceNodeDefinition, infraData: InfraData | null) {
  if (node.id === 'deploy') {
    if (infraData?.deploy.sha) {
      return `https://github.com/VEZhq/vezcore/commit/${infraData.deploy.sha}`
    }
    return infraData?.deploy.url ?? undefined
  }
  return node.href
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
  const [panelSize, setPanelSize] = useState(preferences.operationsPanelSize)
  const [modulePositions, setModulePositions] = useState<Record<string, ModulePosition>>(
    preferences.dashboardModulePositions
  )
  const [serviceNodePositions, setServiceNodePositions] = useState<Record<string, ModulePosition>>(
    preferences.dashboardServiceNodePositions
  )
  const sceneRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const moduleDragRef = useRef<ModuleDragState | null>(null)
  const serviceNodeDragRef = useRef<ServiceNodeDragState | null>(null)
  const resizeRef = useRef<ResizeState | null>(null)
  const panelSizeRef = useRef(panelSize)
  const modulePositionsRef = useRef(modulePositions)
  const serviceNodePositionsRef = useRef(serviceNodePositions)
  const panRef = useRef(preferences.dashboardCenter)
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

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      modulePositionsRef.current = preferences.dashboardModulePositions
      serviceNodePositionsRef.current = preferences.dashboardServiceNodePositions
      panelSizeRef.current = preferences.operationsPanelSize
      setModulePositions(preferences.dashboardModulePositions)
      setServiceNodePositions(preferences.dashboardServiceNodePositions)
      setPanelSize(preferences.operationsPanelSize)
    })
    return () => cancelAnimationFrame(frame)
  }, [
    preferences.dashboardModulePositions,
    preferences.dashboardServiceNodePositions,
    preferences.operationsPanelSize,
  ])

  useEffect(() => {
    panRef.current = preferences.dashboardCenter
    const frame = requestAnimationFrame(() => {
      if (sceneRef.current) {
        const { x, y } = preferences.dashboardCenter
        sceneRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [preferences.dashboardCenter])

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
  const effectiveLayout = Object.fromEntries(
    (Object.keys(moduleLayout) as DashboardModuleName[]).map((name) => [
      name,
      { ...moduleLayout[name], ...modulePositions[name] },
    ])
  ) as typeof moduleLayout
  const effectiveServiceNodes = serviceNodes.map((node) => ({
    ...node,
    ...serviceNodePositions[node.id],
  }))
  const sceneServiceNodes = effectiveServiceNodes.filter(
    (node) => editMode || !preferences.hiddenServiceNodes.includes(node.id)
  )
  const projectConnections = [
    {
      id: 'vision-core',
      from: 'vezVision' as const,
      to: 'vez' as const,
      path: horizontalConnector(
        moduleAnchor(effectiveLayout.vezVision, 'right'),
        moduleAnchor(effectiveLayout.vez, 'left')
      ),
      status: statusByModule.vezVision ?? 'unknown',
      repository: moduleRepositories.vezVision,
    },
    {
      id: 'core-labs',
      from: 'vez' as const,
      to: 'vezLabs' as const,
      path: horizontalConnector(
        moduleAnchor(effectiveLayout.vez, 'right'),
        moduleAnchor(effectiveLayout.vezLabs, 'left')
      ),
      status: labsStatus,
      repository: moduleRepositories.vez,
    },
    ...(['nably', 'vezWork', 'vezRent', 'vezStudio'] as const).map((name, index) => ({
      id: `labs-${name}`,
      from: 'vezLabs' as const,
      to: name,
      path: verticalConnector(
        {
          x: effectiveLayout.vezLabs.left + (effectiveLayout.vezLabs.width * ((index + 1) / 5)),
          y: effectiveLayout.vezLabs.top + effectiveLayout.vezLabs.height,
        },
        moduleAnchor(effectiveLayout[name], 'top'),
        (index - 1.5) * 8
      ),
      status: dependencyStatus(labsStatus, statusByModule[name] ?? 'unknown'),
      repository: moduleRepositories[name],
    })),
  ]

  const toggleModule = (name: DashboardModuleName) => {
    const next = preferences.hiddenModules.includes(name)
      ? preferences.hiddenModules.filter((moduleName) => moduleName !== name)
      : [...preferences.hiddenModules, name]
    updatePreferences({ hiddenModules: next })
  }

  const toggleServiceNode = (id: ServiceNodeDefinition['id']) => {
    const next = preferences.hiddenServiceNodes.includes(id)
      ? preferences.hiddenServiceNodes.filter((nodeId) => nodeId !== id)
      : [...preferences.hiddenServiceNodes, id]
    updatePreferences({ hiddenServiceNodes: next })
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
    panRef.current = preferences.dashboardCenter
    scheduleSceneTransform()
  }

  const saveMapCenter = () => {
    updatePreferences({ dashboardCenter: { ...panRef.current } })
  }

  const resetModuleLayout = () => {
    panRef.current = { x: 0, y: 0 }
    scheduleSceneTransform()
    modulePositionsRef.current = {}
    serviceNodePositionsRef.current = {}
    setModulePositions({})
    setServiceNodePositions({})
    updatePreferences({
      dashboardModulePositions: {},
      dashboardServiceNodePositions: {},
      dashboardCenter: { x: 0, y: 0 },
    })
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
      x: clamp(drag.originX + event.clientX - drag.startX, -PAN_LIMIT, PAN_LIMIT),
      y: clamp(drag.originY + event.clientY - drag.startY, -PAN_LIMIT, PAN_LIMIT),
    }
    scheduleSceneTransform()
  }

  const endMapDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    delete event.currentTarget.dataset.panning
  }

  const startModuleDrag = (
    event: ReactPointerEvent<HTMLElement>,
    name: DashboardModuleName
  ) => {
    if (!editMode || (event.target as HTMLElement).closest('button, a, [role="button"]')) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const layout = effectiveLayout[name]
    moduleDragRef.current = {
      pointerId: event.pointerId,
      name,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: layout.left,
      originTop: layout.top,
    }
  }

  const moveModuleDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = moduleDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    const base = moduleLayout[drag.name]
    const nextPosition = {
      left: clamp(
        drag.originLeft + event.clientX - drag.startX,
        -LAYOUT_MARGIN,
        SCENE_WIDTH + LAYOUT_MARGIN - base.width
      ),
      top: clamp(
        drag.originTop + event.clientY - drag.startY,
        -LAYOUT_MARGIN,
        SCENE_HEIGHT + LAYOUT_MARGIN - base.height
      ),
    }
    const next = { ...modulePositionsRef.current, [drag.name]: nextPosition }
    modulePositionsRef.current = next
    setModulePositions(next)
  }

  const endModuleDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (moduleDragRef.current?.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    moduleDragRef.current = null
    updatePreferences({ dashboardModulePositions: modulePositionsRef.current })
  }

  const startServiceNodeDrag = (
    event: ReactPointerEvent<HTMLElement>,
    node: ServiceNodeDefinition
  ) => {
    if (!editMode || (event.target as HTMLElement).closest('button, a, [role="button"]')) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const current = effectiveServiceNodes.find((item) => item.id === node.id) ?? node
    serviceNodeDragRef.current = {
      pointerId: event.pointerId,
      id: node.id,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: current.left,
      originTop: current.top,
    }
  }

  const moveServiceNodeDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = serviceNodeDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    const node = serviceNodes.find((item) => item.id === drag.id)
    if (!node) return
    const nextPosition = {
      left: clamp(
        drag.originLeft + event.clientX - drag.startX,
        -LAYOUT_MARGIN,
        SCENE_WIDTH + LAYOUT_MARGIN - node.width
      ),
      top: clamp(
        drag.originTop + event.clientY - drag.startY,
        -LAYOUT_MARGIN,
        SCENE_HEIGHT + LAYOUT_MARGIN - 48
      ),
    }
    const next = { ...serviceNodePositionsRef.current, [drag.id]: nextPosition }
    serviceNodePositionsRef.current = next
    setServiceNodePositions(next)
  }

  const endServiceNodeDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (serviceNodeDragRef.current?.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    serviceNodeDragRef.current = null
    updatePreferences({ dashboardServiceNodePositions: serviceNodePositionsRef.current })
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
    if (!resize || resize.pointerId !== event.pointerId) return

    const maxWidth = Math.min(540, window.innerWidth - 32)
    const maxHeight = Math.min(700, window.innerHeight - 190)
    const next = {
      width: clamp(resize.originWidth + event.clientX - resize.startX, 280, maxWidth),
      height: clamp(resize.originHeight + event.clientY - resize.startY, 280, maxHeight),
    }
    panelSizeRef.current = next
    setPanelSize(next)
  }

  const endPanelResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (resizeRef.current?.pointerId !== event.pointerId) return
    resizeRef.current = null
    updatePreferences({ operationsPanelSize: panelSizeRef.current })
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
          onClick={resetModuleLayout}
          className="flex h-9 items-center gap-2 rounded-[9px] border border-black/[0.06] bg-white/80 px-3 text-xs font-medium text-[#626866] shadow-sm transition-colors hover:bg-white dark:border-white/[0.09] dark:bg-[#121413]/90 dark:text-[#aeb3b1] dark:hover:bg-[#181b1a]"
          title="Przywróć domyślny układ kafelków i połączeń"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Resetuj układ
        </button>
        <button
          onClick={resetMap}
          className="flex h-9 items-center gap-2 rounded-[9px] border border-black/[0.06] bg-white/80 px-3 text-xs font-medium text-[#626866] shadow-sm transition-colors hover:bg-white dark:border-white/[0.09] dark:bg-[#121413]/90 dark:text-[#aeb3b1] dark:hover:bg-[#181b1a]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Wyśrodkuj
        </button>
        {editMode && (
          <button
            onClick={saveMapCenter}
            className="flex h-9 items-center gap-2 rounded-[9px] border border-black/[0.06] bg-white/80 px-3 text-xs font-medium text-[#626866] shadow-sm transition-colors hover:bg-white dark:border-white/[0.09] dark:bg-[#121413]/90 dark:text-[#aeb3b1] dark:hover:bg-[#181b1a]"
            title="Ustaw bieżące położenie planszy jako punkt dla przycisku Wyśrodkuj"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            Ustaw środek
          </button>
        )}
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

      <div className="ecosystem-board-warehouse relative h-full min-h-[540px] overflow-hidden rounded-[14px]">
        <div className="warehouse-floor-lines absolute inset-0" />

        <div
          className="warehouse-map-viewport absolute inset-0 overflow-hidden rounded-[14px]"
          onPointerDown={startMapDrag}
          onPointerMove={moveMapDrag}
          onPointerUp={endMapDrag}
          onPointerCancel={endMapDrag}
        >
          <div
            ref={sceneRef}
            className="warehouse-map-scene absolute h-[570px] w-[1360px]"
            style={{
              left: 'calc(50% - 550px)',
              top: 'calc(50% - 285px)',
            }}
          >
            <svg
              className="absolute overflow-visible"
              style={{
                left: -LAYOUT_MARGIN,
                top: -LAYOUT_MARGIN,
                width: DRAWING_WIDTH,
                height: DRAWING_HEIGHT,
              }}
              viewBox={`${-LAYOUT_MARGIN} ${-LAYOUT_MARGIN} ${DRAWING_WIDTH} ${DRAWING_HEIGHT}`}
              preserveAspectRatio="none"
            >
              <title>Połączenia modułów ekosystemu</title>
              {projectConnections.map((connection) => {
                if (!sceneModuleNames.has(connection.from) || !sceneModuleNames.has(connection.to)) return null
                const edge = (
                  <>
                    <path
                      d={connection.path}
                      className={`ecosystem-edge ${edgeStatusClass(connection.status)}`}
                    />
                    {canAccessInfrastructure && connection.repository && (
                      <path d={connection.path} className="ecosystem-edge-hit" />
                    )}
                  </>
                )

                return canAccessInfrastructure && connection.repository ? (
                  <a
                    key={connection.id}
                    href={connection.repository}
                    target="_blank"
                    rel="noreferrer"
                    className="ecosystem-edge-link"
                    aria-label={`Otwórz repozytorium połączenia ${connection.from} i ${connection.to}`}
                  >
                    {edge}
                    <title>Otwórz właściwe repozytorium</title>
                  </a>
                ) : (
                  <g key={connection.id}>{edge}</g>
                )
              })}
              {sceneServiceNodes
                .filter((node) => canAccessInfrastructure && sceneModuleNames.has(node.owner))
                .map((node) => {
                  const path = serviceConnector(effectiveLayout[node.owner], node)
                  return (
                    <a
                      key={`edge-${node.id}`}
                      href={getServiceNodeHref(node, infraData) ?? GITHUB_REPOSITORY_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="ecosystem-edge-link"
                      aria-label={`Otwórz ${node.label}`}
                    >
                      <path
                        d={path}
                        className={`ecosystem-edge service-edge ${edgeStatusClass(serviceStatusById[node.id])}`}
                      />
                      <path d={path} className="ecosystem-edge-hit" />
                      <title>{`Otwórz ${node.label}`}</title>
                    </a>
                  )
                })}
            </svg>

            {sceneModules.map((item) => {
              const { mod, isHidden, moduleStatus, statusSummary, deployText, problemDetails } = item
              const Icon = mod.icon
              const status = statusMeta[moduleStatus]
              const layout = effectiveLayout[mod.name]
              const palette = modulePalette[mod.color]
              const repository = moduleRepositories[mod.name]
              const showInfoBelow = layout.top < 180
              const showProblemTooltip = (moduleStatus === 'warning' || moduleStatus === 'error') && problemDetails.length > 0

              const tile = (
                <article
                  data-no-pan={editMode ? '' : undefined}
                  data-module-tile={mod.name}
                  onPointerDown={(event) => startModuleDrag(event, mod.name)}
                  onPointerMove={moveModuleDrag}
                  onPointerUp={endModuleDrag}
                  onPointerCancel={endModuleDrag}
                  onLostPointerCapture={endModuleDrag}
                  className={`warehouse-module-tile group absolute z-20 ${mod.name === 'vez' ? 'is-root' : ''} ${editMode ? 'is-editing cursor-grab touch-none active:cursor-grabbing' : ''} ${isHidden ? 'opacity-40' : ''}`}
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
                          className="group/info relative flex h-6 w-6 items-center justify-center rounded-full border border-black/[0.07] bg-white/70 text-[#7f8784] shadow-[0_1px_2px_rgba(25,31,29,0.04)] transition-colors hover:border-black/[0.13] hover:bg-white hover:text-[#343836] focus:border-black/[0.13] focus:bg-white focus:outline-none dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-[#979d9a] dark:hover:bg-white/[0.08] dark:hover:text-white"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                          }}
                          aria-label={`Informacje o ${mod.label}`}
                        >
                          <Info className="h-3.5 w-3.5" strokeWidth={1.8} />
                          <span className={`pointer-events-none absolute right-0 z-50 hidden w-52 rounded-[8px] border border-white/10 bg-[#252825]/95 px-3 py-2 text-left text-[10px] font-normal leading-relaxed text-white shadow-[0_8px_22px_rgba(20,24,22,0.2)] backdrop-blur-md group-hover/info:block group-focus/info:block ${
                            showInfoBelow ? 'top-8' : 'bottom-8'
                          }`}>
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
                        ) : (
                          <>
                            {mod.href && (
                              <a
                                href={mod.href}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-[#8c9391] transition-colors hover:bg-black/[0.04] hover:text-[#343836] dark:hover:bg-white/[0.07] dark:hover:text-white"
                                onClick={(event) => event.stopPropagation()}
                                aria-label={`Otwórz ${mod.label}`}
                                title={`Otwórz ${mod.label}`}
                              >
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {canAccessInfrastructure && repository && (
                              <a
                                href={repository}
                                target="_blank"
                                rel="noreferrer"
                                className="flex h-7 w-7 items-center justify-center rounded-full text-[#8c9391] transition-colors hover:bg-black/[0.04] hover:text-[#343836] dark:hover:bg-white/[0.07] dark:hover:text-white"
                                onClick={(event) => event.stopPropagation()}
                                aria-label={`Otwórz repozytorium ${mod.label}`}
                                title="Otwórz repozytorium GitHub"
                              >
                                <GitBranch className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </>
                        )}
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

              return <div key={mod.name} className="contents">{tile}</div>
            })}

            {sceneServiceNodes
              .filter((node) => canAccessInfrastructure && sceneModuleNames.has(node.owner))
              .map((node) => {
                const Icon = node.icon
                const nodeStatus = serviceStatusById[node.id]
                const status = statusMeta[nodeStatus]
                const detail = getServiceNodeDetail(node, infraData)
                const href = getServiceNodeHref(node, infraData)
                const showNodeInfoAbove = node.top > 390
                const isHidden = preferences.hiddenServiceNodes.includes(node.id)

                const nodeContent = (
                  <>
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
                    {editMode ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          toggleServiceNode(node.id)
                        }}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] text-[#89918e] hover:bg-black/[0.05] hover:text-[#39403d] dark:hover:bg-white/[0.07] dark:hover:text-white"
                        aria-label={isHidden ? `Pokaż ${node.label}` : `Ukryj ${node.label}`}
                        title={isHidden ? `Pokaż ${node.label}` : `Ukryj ${node.label}`}
                      >
                        {isHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </button>
                    ) : (
                      <span
                        role="button"
                        tabIndex={0}
                        className="group/nodeinfo relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-black/[0.07] bg-white/70 text-[#89918e] transition-colors hover:border-black/[0.14] hover:text-[#39403d] focus:border-black/[0.14] focus:outline-none dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-[#929895] dark:hover:text-white"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                        }}
                        aria-label={`Informacje o ${node.label}`}
                      >
                        <Info className="h-3 w-3" strokeWidth={1.8} />
                        <span className={`pointer-events-none absolute right-0 z-50 hidden w-48 rounded-[8px] border border-white/10 bg-[#252825]/95 px-3 py-2 text-left text-[9px] font-normal leading-relaxed text-white shadow-[0_8px_22px_rgba(20,24,22,0.2)] backdrop-blur-md group-hover/nodeinfo:block group-focus/nodeinfo:block ${
                          showNodeInfoAbove ? 'bottom-7' : 'top-7'
                        }`}>
                          <span className="block font-medium">{serviceNodeDescriptions[node.id]}</span>
                          <span className="mt-1 block text-white/65">{detail}</span>
                        </span>
                      </span>
                    )}
                  </>
                )

                return href && !editMode ? (
                  <a
                    key={node.id}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="ecosystem-service-node group/service absolute z-30 flex items-center gap-2.5"
                    style={{ left: node.left, top: node.top, width: node.width }}
                    title={`${node.label}: ${detail}. Otwórz`}
                  >
                    {nodeContent}
                  </a>
                ) : (
                  <div
                    key={node.id}
                    data-no-pan={editMode ? '' : undefined}
                    data-service-node={node.id}
                    onPointerDown={(event) => startServiceNodeDrag(event, node)}
                    onPointerMove={moveServiceNodeDrag}
                    onPointerUp={endServiceNodeDrag}
                    onPointerCancel={endServiceNodeDrag}
                    onLostPointerCapture={endServiceNodeDrag}
                    className={`ecosystem-service-node absolute z-30 flex items-center gap-2.5 ${
                      editMode ? 'is-editing cursor-grab touch-none active:cursor-grabbing' : ''
                    } ${isHidden ? 'opacity-40' : ''}`}
                    style={{ left: node.left, top: node.top, width: node.width }}
                    title={editMode ? `Przeciągnij ${node.label}` : `${node.label}: ${detail}`}
                  >
                    {nodeContent}
                  </div>
                )
              })}
          </div>
        </div>

        {canAccessInfrastructure && (
          <aside
            ref={panelRef}
            data-no-pan
            className="operations-panel absolute left-3 top-3 z-40 flex min-h-[280px] min-w-[280px] flex-col overflow-hidden rounded-[14px]"
            style={{
              width: panelSize.width,
              height: panelSize.height,
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
                      className="operations-module-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px]"
                      style={{
                        '--module-accent': palette.accent,
                        '--module-soft': palette.soft,
                      } as CSSProperties}
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
            onLostPointerCapture={endPanelResize}
            aria-label="Zmień rozmiar panelu"
            title="Przeciągnij, aby zmienić rozmiar"
          >
            <MoveDiagonal2 className="h-3.5 w-3.5" />
          </button>
          </aside>
        )}

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
