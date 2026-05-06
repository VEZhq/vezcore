'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Home, User, Settings, ArrowLeft, Shield, Check, X, RefreshCw,
  ChevronDown, ChevronRight, Users, Globe, FileText, HardDrive, Search
} from 'lucide-react'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'
import {
  getUserPermissionsList,
  grantPermission,
  revokePermission,
  Permission
} from '@/lib/actions/permissions'
import { AVAILABLE_PERMISSIONS } from '@/lib/constants'
import { DASHBOARD_MODULES, DASHBOARD_MODULE_ICON_COLORS, type DashboardModuleName } from '@/lib/constants/modules'
import { MobileNav } from '@/components/MobileNav'
import { useCSRFToken } from '@/hooks/useCSRFToken'

interface UserData {
  id: string
  email: string
  full_name: string | null
  role: string | null
  created_at: string
}

interface PermissionsClientProps {
  user: UserData
  canEditUsers: boolean
  isAdminUser: boolean
  canAccessAudit: boolean
  canAccessSettings: boolean
}

type PermissionKey = typeof AVAILABLE_PERMISSIONS[number]['key']
type PermissionEcosystem = DashboardModuleName | 'core'

type PermissionGroup = {
  id: string
  label: string
  icon: React.ReactNode
  keys: PermissionKey[]
  ecosystem: PermissionEcosystem
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'admin',
    label: 'Administracja',
    icon: <Users className="h-4 w-4" />,
    ecosystem: 'core',
    keys: ['konta.view', 'konta.create', 'konta.edit', 'konta.delete', 'konta.permissions', 'audit.view', 'settings.view', 'settings.edit'],
  },
  {
    id: 'vezvision-access',
    label: 'VezVision — Dostęp',
    icon: <Globe className="h-4 w-4" />,
    ecosystem: 'vezVision',
    keys: ['vezvision.access'],
  },
  {
    id: 'vezvision-content',
    label: 'VezVision — Treści',
    icon: <FileText className="h-4 w-4" />,
    ecosystem: 'vezVision',
    keys: [
      'vezvision.blog.view', 'vezvision.blog.manage', 'vezvision.blog.publish',
      'vezvision.portfolio.view', 'vezvision.portfolio.manage',
      'vezvision.services.view', 'vezvision.services.manage',
      'vezvision.faq.view', 'vezvision.faq.manage',
      'vezvision.newsletter.view', 'vezvision.newsletter.manage',
    ],
  },
  {
    id: 'vezvision-system',
    label: 'VezVision — System',
    icon: <HardDrive className="h-4 w-4" />,
    ecosystem: 'vezVision',
    keys: [
      'vezvision.files.view', 'vezvision.files.manage', 'vezvision.files.permissions.manage',
      'vezvision.settings.view', 'vezvision.settings.manage',
    ],
  },
]

export default function PermissionsClient({ user, canEditUsers, isAdminUser, canAccessAudit, canAccessSettings }: PermissionsClientProps) {
  const { preferences } = useUserPreferences()
  const { token: csrfToken } = useCSRFToken()
  const [loadingPermission, setLoadingPermission] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userPermissions, setUserPermissions] = useState<Permission[]>([])
  const [lastToggleTime, setLastToggleTime] = useState(() => Date.now() - 2000)
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [selectedEcosystem, setSelectedEcosystem] = useState<PermissionEcosystem>('vezVision')

  const loadPermissions = useCallback(async () => {
    const result = await getUserPermissionsList(user.id)
    if (!('error' in result)) {
      setUserPermissions(result)
    }
  }, [user.id])

  useEffect(() => {
    let cancelled = false
    getUserPermissionsList(user.id).then((result) => {
      if (!cancelled && !('error' in result)) {
        setUserPermissions(result)
      }
    })
    return () => { cancelled = true }
  }, [user.id])

  const hasPermission = (key: string) => {
    if (isAdminUser) return true
    return userPermissions.some(p => p.permission_key === key)
  }

  const handleTogglePermission = async (permissionKey: string) => {
    if (!canEditUsers) return

    const now = new Date().getTime()
    const cooldown = 1000

    if (now - lastToggleTime < cooldown) return

    setLoadingPermission(permissionKey)
    setError(null)
    setLastToggleTime(now)

    try {
      if (!csrfToken) {
        setError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
        return
      }

      if (hasPermission(permissionKey)) {
        const result = await revokePermission(user.id, permissionKey, csrfToken)
        if ('error' in result) setError(result.error)
      } else {
        const result = await grantPermission(user.id, permissionKey, csrfToken)
        if ('error' in result) setError(result.error)
      }
      await loadPermissions()
    } catch {
      setError('Wystąpił błąd')
    }

    setLoadingPermission(null)
  }

  const handleBulkEnable = async (keys: string[]) => {
    for (const key of keys) {
      if (!hasPermission(key)) {
        await handleTogglePermission(key)
      }
    }
  }

  const handleBulkDisable = async (keys: string[]) => {
    for (const key of keys) {
      if (hasPermission(key)) {
        await handleTogglePermission(key)
      }
    }
  }

  const toggleCollapse = (groupId: string) => {
    setCollapsed(prev => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nigdy'
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      timeZone: preferences.timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const searchLower = search.toLowerCase()
  const availablePermissionEcosystems = new Set<PermissionEcosystem>(PERMISSION_GROUPS.map(group => group.ecosystem))
  const ecosystemOptions = [
    {
      name: 'core' as const,
      label: 'Core',
      description: 'Konta, audit i ustawienia systemowe',
      color: 'emerald' as const,
      icon: Shield,
    },
    ...DASHBOARD_MODULES.filter(module => availablePermissionEcosystems.has(module.name)),
  ]
  const filteredKeys = search
    ? new Set(
        AVAILABLE_PERMISSIONS
          .filter(p =>
            p.label.toLowerCase().includes(searchLower) ||
            p.description.toLowerCase().includes(searchLower) ||
            p.key.toLowerCase().includes(searchLower)
          )
          .map(p => p.key)
      )
    : null

  const permMap = new Map(AVAILABLE_PERMISSIONS.map(p => [p.key, p]))
  const visibleGroups = PERMISSION_GROUPS.filter(group => group.ecosystem === selectedEcosystem)

  return (
    <div className="min-h-screen bg-[#0a0a0a] light:bg-[#f5f5f5] transition-colors duration-300">
      <MobileNav currentPath="/konta" showKonta={true} showAudit={canAccessAudit} showSettings={canAccessSettings} />

      <div className="hidden lg:flex fixed top-6 left-6 right-6 z-50 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
          >
            <Home className="h-3 w-3" />
            Dashboard
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
          >
            <User className="h-3 w-3" />
            Profil
          </Link>
          <Link
            href="/konta"
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
          >
            Konta
          </Link>
          {canAccessAudit && (
            <Link
              href="/audit"
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
            >
              Audit Log
            </Link>
          )}
          {canAccessSettings && (
            <Link
              href="/settings"
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
            >
              <Settings className="h-3 w-3" />
              Ustawienia
            </Link>
          )}
        </div>
      </div>

      <div className="p-4 lg:p-8 pt-20 lg:pt-24">
        <div className="mx-auto w-full max-w-7xl space-y-6 lg:space-y-8">
          <div className="flex items-center gap-4">
            <Link
              href={`/konta/${user.id}`}
              className="text-[#444444] hover:text-white light:hover:text-black transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-medium text-white light:text-black transition-colors duration-300">
                Pozwolenia
              </h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mt-1 transition-colors duration-300">
                {user.email}
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
            <div className="space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {isAdminUser && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                  <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-400">
                    Ten użytkownik ma rolę <span className="font-medium">{user.role}</span> — posiada wszystkie uprawnienia domyślnie.
                  </p>
                </div>
              )}

              <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl p-5 lg:p-6 transition-colors duration-300">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
                      Zarządzanie uprawnieniami
                    </p>
                    <p className="mt-2 text-sm text-[#666666] light:text-[#888888] max-w-2xl leading-relaxed">
                      Grupuj, filtruj i zmieniaj dostęp szybciej — bez przewijania jednej długiej kolumny przez środek ekranu.
                    </p>
                  </div>

                  <div className="relative w-full lg:max-w-sm xl:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#444444] light:text-[#888888]" />
                    <input
                      type="text"
                      placeholder="Szukaj uprawnienia..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] text-sm text-white light:text-black placeholder-[#444444] light:placeholder-[#888888] focus:outline-none focus:border-emerald-500/40 transition-colors duration-300"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-5 2xl:grid-cols-2">
                {visibleGroups.map(group => {
                  const groupPerms = group.keys
                    .map(k => permMap.get(k))
                    .filter((p): p is typeof AVAILABLE_PERMISSIONS[number] => p !== undefined)

                  const visiblePerms = filteredKeys
                    ? groupPerms.filter(p => filteredKeys.has(p.key))
                    : groupPerms

                  if (filteredKeys && visiblePerms.length === 0) return null

                  const enabledCount = isAdminUser
                    ? groupPerms.length
                    : groupPerms.filter(p => hasPermission(p.key)).length
                  const isOpen = !collapsed[group.id]

                  return (
                    <div
                      key={group.id}
                      className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-colors duration-300"
                    >
                      <div className="flex items-center justify-between gap-4 p-5 hover:bg-white/[0.02] light:hover:bg-black/[0.02] transition-colors duration-200">
                        <button
                          type="button"
                          onClick={() => toggleCollapse(group.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span className="text-[#444444] light:text-[#888888] shrink-0">{group.icon}</span>
                          <span className="truncate text-[10px] uppercase tracking-[0.25em] text-[#888888] light:text-[#666666] font-medium">
                            {group.label}
                          </span>
                          <span className={`shrink-0 text-[9px] px-2 py-0.5 rounded-full font-mono tabular-nums ${
                            enabledCount === groupPerms.length
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                              : enabledCount === 0
                                ? 'bg-white/[0.04] light:bg-black/[0.04] text-[#555555] light:text-[#aaaaaa] border border-white/[0.06] light:border-black/[0.06]'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {enabledCount}/{groupPerms.length}
                          </span>
                        </button>

                        <div className="flex items-center gap-3 shrink-0">
                          {canEditUsers && !isAdminUser && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleBulkEnable(group.keys)}
                                className="text-[9px] uppercase tracking-[0.15em] px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors duration-200"
                              >
                                Wszystkie
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBulkDisable(group.keys)}
                                className="text-[9px] uppercase tracking-[0.15em] px-2.5 py-1 bg-white/[0.04] light:bg-black/[0.04] border border-white/[0.06] light:border-black/[0.06] text-[#666666] light:text-[#999999] hover:text-white light:hover:text-black hover:bg-white/[0.08] light:hover:bg-black/[0.08] transition-colors duration-200"
                              >
                                Brak
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleCollapse(group.id)}
                            className="text-[#444444] light:text-[#888888]"
                            aria-label={isOpen ? `Zwiń grupę ${group.label}` : `Rozwiń grupę ${group.label}`}
                            aria-expanded={isOpen}
                          >
                            {isOpen
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />
                            }
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="border-t border-white/[0.04] light:border-black/[0.04]">
                          <div className="p-4 space-y-2">
                            {visiblePerms.map(perm => {
                              const isEnabled = hasPermission(perm.key)
                              const isLoading = loadingPermission === perm.key

                              return (
                                <div
                                  key={perm.key}
                                  className={`flex items-center justify-between gap-4 px-4 py-3 border transition-colors duration-200 ${
                                    isEnabled
                                      ? 'bg-emerald-500/[0.04] border-emerald-500/[0.12] light:bg-emerald-500/[0.04] light:border-emerald-500/[0.15]'
                                      : 'bg-white/[0.02] light:bg-black/[0.02] border-white/[0.04] light:border-black/[0.04]'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white light:text-black leading-snug">{perm.label}</p>
                                    <p className="text-[10px] text-[#555555] light:text-[#aaaaaa] mt-0.5 font-mono break-all">{perm.key}</p>
                                    <p className="text-[11px] text-[#666666] light:text-[#999999] mt-1 leading-relaxed">
                                      {perm.description}
                                    </p>
                                  </div>

                                  {canEditUsers && !isAdminUser ? (
                                    <button
                                      onClick={() => handleTogglePermission(perm.key)}
                                      disabled={isLoading}
                                      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-300 ${
                                        isEnabled ? 'bg-emerald-500' : 'bg-[#333333] light:bg-[#cccccc]'
                                      }`}
                                    >
                                      {isLoading ? (
                                        <RefreshCw className="h-3 w-3 absolute top-1.5 left-3.5 animate-spin text-white" />
                                      ) : (
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-md absolute top-1 transition-transform duration-300 ${
                                          isEnabled ? 'translate-x-6' : 'translate-x-1'
                                        }`} />
                                      )}
                                    </button>
                                  ) : (
                                    <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                      isEnabled ? 'bg-emerald-500/20' : 'bg-red-500/20'
                                    }`}>
                                      {isEnabled
                                        ? <Check className="h-3 w-3 text-emerald-400" />
                                        : <X className="h-3 w-3 text-red-400" />
                                      }
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <aside className="xl:sticky xl:top-24">
              <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-colors duration-300">
                <div className="p-6">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mb-4">
                    Informacje o koncie
                  </p>
                  <div className="space-y-3">
                    <div className="flex justify-between gap-4">
                      <span className="text-[10px] text-[#666666] light:text-[#999999]">Email</span>
                      <span className="text-xs text-white light:text-black font-mono text-right break-all">{user.email}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-[10px] text-[#666666] light:text-[#999999]">Imię</span>
                      <span className="text-xs text-white light:text-black text-right">{user.full_name || 'Nie ustawiono'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-[10px] text-[#666666] light:text-[#999999]">Rola</span>
                      <span className="text-xs text-white light:text-black text-right">{user.role || 'viewer'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-[10px] text-[#666666] light:text-[#999999]">Data utworzenia</span>
                      <span className="text-xs text-white light:text-black font-mono text-right">{formatDate(user.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-colors duration-300">
                <div className="p-6">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mb-2">
                    Ekosystem / projekt
                  </p>
                  <p className="text-xs text-[#666666] light:text-[#999999] leading-relaxed mb-4">
                    Wybierz kafelek z dashboardu, dla którego chcesz otworzyć system pozwoleń.
                  </p>

                  <div className="space-y-2">
                    {ecosystemOptions.map(option => {
                      const isActive = selectedEcosystem === option.name
                      const Icon = option.icon

                      return (
                        <button
                          key={option.name}
                          type="button"
                          onClick={() => setSelectedEcosystem(option.name)}
                          className={`w-full text-left border p-4 transition-all duration-200 ${
                            isActive
                              ? 'border-emerald-500/30 bg-emerald-500/[0.05]'
                              : 'border-white/[0.06] light:border-black/[0.06] bg-white/[0.02] light:bg-black/[0.02] hover:bg-white/[0.04] light:hover:bg-black/[0.04]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/[0.06] light:border-black/[0.06] bg-white/[0.03] light:bg-black/[0.03]">
                              <Icon className={`h-5 w-5 ${DASHBOARD_MODULE_ICON_COLORS[option.color].dark} light:${DASHBOARD_MODULE_ICON_COLORS[option.color].light}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-white light:text-black">
                                  {option.name === 'core' ? option.label : option.name}
                                </p>
                                {isActive && (
                                  <span className="text-[9px] uppercase tracking-[0.2em] text-emerald-400">
                                    Aktywny
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-[#666666] light:text-[#999999] leading-relaxed">
                                {option.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
