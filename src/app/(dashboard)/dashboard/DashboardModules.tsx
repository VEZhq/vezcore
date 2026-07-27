'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Circle, EyeOff, Eye, Settings2 } from 'lucide-react'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'
import { DASHBOARD_MODULES, DASHBOARD_MODULE_ICON_COLORS, type DashboardModuleName } from '@/lib/constants/modules'

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

  return (
    <div className="w-full max-w-6xl mb-7">
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setEditMode((v) => !v)}
          className={`flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] transition-colors duration-200 ${
            editMode
              ? 'text-emerald-400 light:text-emerald-600'
              : 'text-[#444444] light:text-[#888888] hover:text-[#888888] light:hover:text-[#555555]'
          }`}
        >
          <Settings2 className="h-3 w-3" />
          {editMode ? 'Zapisz' : 'Dostosuj'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {visibleModules.map((mod) => {
          const isHidden = preferences.hiddenModules.includes(mod.name)
          const sources = moduleStatusSources[mod.name]
          const hasStatus = canAccessInfrastructure && (sources.checks.length > 0 || sources.deploy)
          const statuses: HealthStatus[] = infraData
            ? sources.checks.map((key) => infraData.checks[key]?.status ?? 'unknown')
            : sources.checks.map(() => 'checking')

          if (sources.deploy) {
            statuses.push(infraData ? getDeployHealthStatus(infraData.deploy.status) : 'checking')
          }

          const moduleStatus = hasStatus ? getWorstStatus(statuses) : 'unknown'
          const status = statusMeta[moduleStatus]
          const statusTime = infraData ? `Sprawdzono ${formatStatusTime(infraData.checkedAt)}` : 'Sprawdzam status'
          const problemDetails = getProblemDetails(infraData, sources)
          const showProblemTooltip = moduleStatus === 'warning' || moduleStatus === 'error'

          const cardContent = (
            <div
              className={`relative tile-${mod.color} tile-hover group min-h-[168px] bg-[#111111]/80 light:bg-white/90 backdrop-blur-xl border border-white/[0.06] light:border-black/[0.08] p-4 transition-all duration-300 ${
                editMode ? 'cursor-default' : mod.href ? 'cursor-pointer' : 'cursor-default'
              } ${isHidden ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-md bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] flex items-center justify-center transition-colors duration-300">
                  <mod.icon
                    className={`h-5 w-5 ${DASHBOARD_MODULE_ICON_COLORS[mod.color].dark} light:${DASHBOARD_MODULE_ICON_COLORS[mod.color].light} transition-colors duration-300`}
                  />
                </div>

                {editMode && (
                  <button
                    onClick={() => toggleModule(mod.name)}
                    className={`p-1.5 rounded transition-colors duration-200 ${
                      isHidden
                        ? 'text-[#666666] hover:text-white light:text-[#aaaaaa] light:hover:text-black'
                        : 'text-[#444444] hover:text-red-400 light:text-[#888888] light:hover:text-red-500'
                    }`}
                    title={isHidden ? 'Pokaż kafelek' : 'Ukryj kafelek'}
                  >
                    {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                )}
              </div>

              <h3 className="text-sm font-medium text-white light:text-black mb-1 transition-colors duration-300">
                {mod.label}
              </h3>
              <p className="line-clamp-2 text-[11px] leading-relaxed text-[#666666] light:text-[#999999] transition-colors duration-300">
                {mod.description}
              </p>

              {hasStatus && (
                <div className="mt-4 border-t border-white/[0.05] light:border-black/[0.06] pt-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-[9px] uppercase tracking-[0.14em]">
                    <span
                      className={`group/status relative inline-flex items-center gap-2 ${status.text}`}
                    >
                      <Circle className={`h-2 w-2 fill-current ${status.text}`} />
                      {status.label}
                      {showProblemTooltip && problemDetails.length > 0 && (
                        <span className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-72 max-w-[72vw] border border-white/[0.08] light:border-black/[0.08] bg-[#050505] light:bg-white p-3 text-left text-[10px] font-normal normal-case tracking-normal text-[#b5b5b5] light:text-[#555555] shadow-2xl group-hover/status:block">
                          <span className="mb-1 block font-medium uppercase tracking-[0.14em] text-white light:text-black">Co się stało</span>
                          {problemDetails.map((detail) => (
                            <span key={detail.text} className="block leading-relaxed">{detail.text}</span>
                          ))}
                        </span>
                      )}
                    </span>
                    <span className="truncate text-[#555555] light:text-[#999999]">{statusTime}</span>
                  </div>

                  {sources.deploy && (
                    <div className="flex items-center justify-between gap-3 text-[9px] uppercase tracking-[0.14em] text-[#555555] light:text-[#999999]">
                      <span>Deploy</span>
                      <span className={statusMeta[getDeployHealthStatus(infraData?.deploy.status)].text}>
                        {infraData?.deploy.shortSha ?? 'brak nr'} / {formatStatusTime(infraData?.deploy.completedAt)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {editMode && isHidden && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[9px] uppercase tracking-[0.3em] text-[#555555] light:text-[#aaaaaa]">
                    Ukryty
                  </span>
                </div>
              )}
            </div>
          )

          return (
            <div key={mod.name}>
              {!editMode && mod.href ? (
                <Link href={mod.href} className="block">
                  {cardContent}
                </Link>
              ) : (
                cardContent
              )}
            </div>
          )
        })}

        {!editMode && visibleModules.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <p className="text-xs text-[#555555] light:text-[#aaaaaa] uppercase tracking-[0.25em] mb-3">
              Wszystkie moduły ukryte
            </p>
            <button
              onClick={() => setEditMode(true)}
              className="text-[10px] uppercase tracking-[0.25em] text-emerald-500 hover:text-emerald-400 transition-colors duration-200"
            >
              Przywróć widżety
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
