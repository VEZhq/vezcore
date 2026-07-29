export interface UserPreferences {
  timezone: string
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  sessionTimeout: number
  autoLogoutOnIpChange: boolean
  hiddenModules: string[]
  hiddenServiceNodes: string[]
  operationsPanelSize: {
    width: number
    height: number
  }
  dashboardModulePositions: Record<string, {
    left: number
    top: number
  }>
  dashboardServiceNodePositions: Record<string, {
    left: number
    top: number
  }>
  dashboardCenter: {
    x: number
    y: number
  }
}

const VALID_TIMEZONES = [
  'Europe/Warsaw', 'Europe/London', 'Europe/Berlin',
  'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo',
]
const VALID_DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const
const VALID_SESSION_TIMEOUTS = [15, 30, 60, 120]
const VALID_MODULE_NAMES = ['vez', 'vezVision', 'vezLabs', 'vezRent', 'vezStudio', 'vezWork', 'nably']
const VALID_SERVICE_NODE_NAMES = ['prodApi', 'database', 'deploy', 'labApi', 'minio', 'monitor']
const DASHBOARD_POSITION_MIN = -1200
const DASHBOARD_POSITION_MAX_LEFT = 2560
const DASHBOARD_POSITION_MAX_TOP = 1770

export const defaultUserPreferences: UserPreferences = {
  timezone: 'Europe/Warsaw',
  dateFormat: 'DD/MM/YYYY',
  sessionTimeout: 15,
  autoLogoutOnIpChange: false,
  hiddenModules: [],
  hiddenServiceNodes: [],
  operationsPanelSize: { width: 300, height: 360 },
  dashboardModulePositions: {},
  dashboardServiceNodePositions: {},
  dashboardCenter: { x: 0, y: 0 },
}

function sanitizePositions(
  raw: unknown,
  validNames: string[]
): Record<string, { left: number; top: number }> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  const positions = raw as Record<string, unknown>
  return Object.fromEntries(
    validNames.flatMap((name) => {
      const position = positions[name]
      if (!position || typeof position !== 'object' || Array.isArray(position)) return []
      const { left, top } = position as Record<string, unknown>
      if (!Number.isFinite(left) || !Number.isFinite(top)) return []
      return [[name, {
        left: Math.min(DASHBOARD_POSITION_MAX_LEFT, Math.max(DASHBOARD_POSITION_MIN, Math.round(left as number))),
        top: Math.min(DASHBOARD_POSITION_MAX_TOP, Math.max(DASHBOARD_POSITION_MIN, Math.round(top as number))),
      }]]
    })
  )
}

export function sanitizeUserPreferences(raw: unknown): UserPreferences {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ...defaultUserPreferences,
      hiddenModules: [],
      hiddenServiceNodes: [],
      operationsPanelSize: { ...defaultUserPreferences.operationsPanelSize },
      dashboardModulePositions: {},
      dashboardServiceNodePositions: {},
      dashboardCenter: { ...defaultUserPreferences.dashboardCenter },
    }
  }
  const obj = raw as Record<string, unknown>

  const panel = obj.operationsPanelSize && typeof obj.operationsPanelSize === 'object'
    ? obj.operationsPanelSize as Record<string, unknown>
    : {}
  const center = obj.dashboardCenter && typeof obj.dashboardCenter === 'object'
    ? obj.dashboardCenter as Record<string, unknown>
    : {}

  return {
    timezone: VALID_TIMEZONES.includes(obj.timezone as string)
      ? obj.timezone as string
      : defaultUserPreferences.timezone,
    dateFormat: (VALID_DATE_FORMATS as readonly unknown[]).includes(obj.dateFormat)
      ? obj.dateFormat as UserPreferences['dateFormat']
      : defaultUserPreferences.dateFormat,
    sessionTimeout: VALID_SESSION_TIMEOUTS.includes(obj.sessionTimeout as number)
      ? obj.sessionTimeout as number
      : defaultUserPreferences.sessionTimeout,
    autoLogoutOnIpChange: typeof obj.autoLogoutOnIpChange === 'boolean'
      ? obj.autoLogoutOnIpChange
      : defaultUserPreferences.autoLogoutOnIpChange,
    hiddenModules: Array.isArray(obj.hiddenModules)
      ? obj.hiddenModules.filter(
          (name): name is string => typeof name === 'string' && VALID_MODULE_NAMES.includes(name)
        )
      : [],
    hiddenServiceNodes: Array.isArray(obj.hiddenServiceNodes)
      ? obj.hiddenServiceNodes.filter(
          (name): name is string => typeof name === 'string' && VALID_SERVICE_NODE_NAMES.includes(name)
        )
      : [],
    operationsPanelSize: {
      width: Number.isFinite(panel.width)
        ? Math.min(520, Math.max(280, Math.round(panel.width as number)))
        : defaultUserPreferences.operationsPanelSize.width,
      height: Number.isFinite(panel.height)
        ? Math.min(680, Math.max(280, Math.round(panel.height as number)))
        : defaultUserPreferences.operationsPanelSize.height,
    },
    dashboardModulePositions: sanitizePositions(obj.dashboardModulePositions, VALID_MODULE_NAMES),
    dashboardServiceNodePositions: sanitizePositions(obj.dashboardServiceNodePositions, VALID_SERVICE_NODE_NAMES),
    dashboardCenter: {
      x: Number.isFinite(center.x)
        ? Math.min(1200, Math.max(-1200, Math.round(center.x as number)))
        : 0,
      y: Number.isFinite(center.y)
        ? Math.min(1200, Math.max(-1200, Math.round(center.y as number)))
        : 0,
    },
  }
}
