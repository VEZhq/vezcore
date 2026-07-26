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
    completedAt: string | null
  }
}

const moduleStatusSources: Record<DashboardModuleName, { checks: string[]; deploy?: boolean }> = {
  vez: { checks: ['vezcore'], deploy: true },
  vezVision: { checks: ['prodApi'] },
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

export function DashboardModules({ canAccessVezVision }: { canAccessVezVision: boolean }) {
  const { preferences, updatePreferences } = useUserPreferences()
  const [editMode, setEditMode] = useState(false)
  const [infraData, setInfraData] = useState<InfraData | null>(null)

  useEffect(() => {
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
  }, [])

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
    <div className="w-full max-w-5xl mb-8">
      <div className="flex justify-end mb-3">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleModules.map((mod) => {
          const isHidden = preferences.hiddenModules.includes(mod.name)
          const sources = moduleStatusSources[mod.name]
          const statuses: HealthStatus[] = infraData
            ? sources.checks.map((key) => infraData.checks[key]?.status ?? 'unknown')
            : sources.checks.map(() => 'checking')

          if (sources.deploy) {
            statuses.push(infraData ? getDeployHealthStatus(infraData.deploy.status) : 'checking')
          }

          const moduleStatus = statuses.length > 0 ? getWorstStatus(statuses) : 'unknown'
          const status = statusMeta[moduleStatus]
          const statusTime = sources.checks.length > 0 || sources.deploy
            ? infraData ? `Sprawdzono ${formatStatusTime(infraData.checkedAt)}` : 'Sprawdzam status'
            : 'Monitoring niepodpięty'

          const cardContent = (
            <div
              className={`relative tile-${mod.color} tile-hover group bg-[#111111]/80 light:bg-white/90 backdrop-blur-xl border border-white/[0.06] light:border-black/[0.08] p-6 transition-all duration-300 ${
                editMode ? 'cursor-default' : mod.href ? 'cursor-pointer' : 'cursor-default'
              } ${isHidden ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-md bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] flex items-center justify-center transition-colors duration-300">
                  <mod.icon
                    className={`h-6 w-6 ${DASHBOARD_MODULE_ICON_COLORS[mod.color].dark} light:${DASHBOARD_MODULE_ICON_COLORS[mod.color].light} transition-colors duration-300`}
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

              <h3 className="text-base font-medium text-white light:text-black mb-1 transition-colors duration-300">
                {mod.label}
              </h3>
              <p className="text-xs text-[#666666] light:text-[#999999] transition-colors duration-300">
                {mod.description}
              </p>

              <div className="mt-5 border-t border-white/[0.05] light:border-black/[0.06] pt-3 space-y-2">
                <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em]">
                  <span className={`inline-flex items-center gap-2 ${status.text}`}>
                    <Circle className={`h-2 w-2 fill-current ${status.text}`} />
                    {status.label}
                  </span>
                  <span className="truncate text-[#555555] light:text-[#999999]">{statusTime}</span>
                </div>

                {sources.deploy && (
                  <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em] text-[#555555] light:text-[#999999]">
                    <span>Deploy</span>
                    <span className={statusMeta[getDeployHealthStatus(infraData?.deploy.status)].text}>
                      {infraData?.deploy.shortSha ?? 'brak nr'} / {formatStatusTime(infraData?.deploy.completedAt)}
                    </span>
                  </div>
                )}
              </div>

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
