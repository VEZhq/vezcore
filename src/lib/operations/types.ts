export type OperationHealth = 'healthy' | 'warning' | 'error' | 'unknown'
export type OperationSeverity = 'info' | 'warning' | 'error'

export type OperationCheck = {
  status: OperationHealth
  label: string
  detail: string
  latencyMs?: number
}

export type OperationDeploy = {
  status: 'success' | 'failure' | 'pending' | 'unknown'
  sha: string | null
  shortSha: string | null
  message: string
  completedAt: string | null
  url: string | null
}

export type OperationsOverview = {
  generatedAt: string
  uptime: Array<{
    serviceKey: string
    healthy: number
    total: number
    percentage: number | null
    lastCheckedAt: string | null
  }>
  incidents: Array<{
    id: string
    service_key: string
    module_key: string
    severity: string
    status: string
    title: string
    detail: string
    started_at: string
    last_seen_at: string
    resolved_at: string | null
  }>
  deployments: Array<{
    id: string
    module_key: string
    sha: string
    short_sha: string
    status: string
    message: string
    url: string | null
    deployed_at: string | null
    recorded_at: string
  }>
  notifications: Array<{
    id: string
    kind: string
    severity: string
    title: string
    body: string
    module_key: string | null
    href: string | null
    created_at: string
    read: boolean
  }>
  maintenance: Array<{
    id: string
    module_key: string
    title: string
    reason: string
    status: string
    scheduled_start: string
    scheduled_end: string
    started_at: string | null
    ended_at: string | null
  }>
  snapshots: Array<{
    id: string
    name: string
    created_at: string
    captured_by: string | null
  }>
  dependencies: Array<{
    id: string
    parent_key: string
    child_key: string
    relation: string
    description: string
  }>
  shortcuts: Array<{
    id: string
    module_key: string
    label: string
    description: string
    href: string | null
    canReveal: boolean
  }>
}
