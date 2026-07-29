'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, Shield, Check, X, RefreshCw,
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
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { ProfileAvatar } from '@/components/ProfileAvatar'

interface UserData {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
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
    id: 'infrastructure',
    label: 'Infrastruktura',
    icon: <HardDrive className="h-4 w-4" />,
    ecosystem: 'core',
    keys: [
      'infrastructure.access',
      'operations.view',
      'operations.manage',
      'operations.shortcuts',
      'security.report.view',
      'roles.preview',
    ],
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
    if (!canEditUsers || !csrfToken) {
      if (!csrfToken) setError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    const missingKeys = keys.filter((key) => !hasPermission(key))
    if (missingKeys.length === 0) return

    setLoadingPermission('bulk')
    setError(null)
    const results = await Promise.all(
      missingKeys.map((key) => grantPermission(user.id, key, csrfToken))
    )
    const failed = results.find((result) => 'error' in result)
    if (failed && 'error' in failed) setError(failed.error)
    await loadPermissions()
    setLoadingPermission(null)
  }

  const handleBulkDisable = async (keys: string[]) => {
    if (!canEditUsers || !csrfToken) {
      if (!csrfToken) setError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    const grantedKeys = keys.filter((key) => hasPermission(key))
    if (grantedKeys.length === 0) return

    setLoadingPermission('bulk')
    setError(null)
    const results = await Promise.all(
      grantedKeys.map((key) => revokePermission(user.id, key, csrfToken))
    )
    const failed = results.find((result) => 'error' in result)
    if (failed && 'error' in failed) setError(failed.error)
    await loadPermissions()
    setLoadingPermission(null)
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
      description: 'Konta, audit, ustawienia i infrastruktura',
      color: 'sage' as const,
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
  const enabledPermissionCount = isAdminUser
    ? AVAILABLE_PERMISSIONS.length
    : AVAILABLE_PERMISSIONS.filter((permission) => hasPermission(permission.key)).length
  const selectedEcosystemData = ecosystemOptions.find((option) => option.name === selectedEcosystem)

  return (
    <div className="min-h-screen bg-[#f1f3f2] text-[#252927] dark:bg-[#070807] dark:text-[#eef0ef]">
      <MobileNav currentPath="/konta" showKonta showAudit={canAccessAudit} showSettings={canAccessSettings} />
      <header className="border-b border-black/[0.07] bg-white/45 dark:border-white/[0.08] dark:bg-[#090a09]">
        <div className="mx-auto flex h-12 w-full max-w-[1180px] items-center px-4 sm:px-6">
          <Image src="/logo/vezcore_logo_black_full.svg" alt="VEZcore" width={104} height={42} className="h-auto w-[104px] dark:hidden" priority />
          <Image src="/logo/vezcore_logo_white_full.svg" alt="VEZcore" width={104} height={42} className="hidden h-auto w-[104px] dark:block" priority />
          <span className="mx-3 h-4 w-px bg-black/[0.08] dark:bg-white/[0.1]" />
          <span className="text-[10px] text-[#747b78] dark:text-[#8f9692]">Uprawnienia konta</span>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <Link href={`/konta/${user.id}`} className="flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[10px] text-[#626966] hover:bg-black/[0.04] dark:text-[#aab0ad] dark:hover:bg-white/[0.07]">
              <ArrowLeft className="h-3.5 w-3.5" /> Konto
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
        <section className="border-b border-black/[0.1] pb-6 dark:border-white/[0.09]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <ProfileAvatar
              url={user.avatar_url}
              label={user.full_name || user.email}
              className="h-14 w-14 rounded-[12px] ring-1 ring-black/[0.08] dark:ring-white/[0.1]"
              fallbackClassName="text-[14px]"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-semibold uppercase text-[#808783] dark:text-[#8f9692]">Kontrola dostępu</p>
              <h1 className="mt-1 truncate text-[25px] font-semibold">{user.full_name || user.email.split('@')[0]}</h1>
              <p className="mt-1 truncate font-mono text-[10px] text-[#777e7a] dark:text-[#8e9591]">{user.email}</p>
            </div>
            <div className="flex shrink-0 items-center gap-6 border-l border-black/[0.08] pl-6 dark:border-white/[0.09]">
              <div>
                <p className="font-mono text-[20px] font-semibold tabular-nums">{enabledPermissionCount}</p>
                <p className="mt-0.5 text-[8px] uppercase text-[#8b918e]">Aktywne</p>
              </div>
              <div>
                <p className="font-mono text-[20px] font-semibold tabular-nums">{AVAILABLE_PERMISSIONS.length}</p>
                <p className="mt-0.5 text-[8px] uppercase text-[#8b918e]">Dostępne</p>
              </div>
            </div>
          </div>
          <div className="relative mt-5 max-w-[420px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8b918e]" />
            <input
              type="search"
              placeholder="Szukaj po nazwie, opisie lub kluczu"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 w-full rounded-[8px] border border-black/[0.08] bg-white/65 pl-9 pr-3 text-[11px] outline-none focus:border-[#779182] dark:border-white/[0.09] dark:bg-white/[0.045]"
            />
          </div>
        </section>

        {error && <div className="mt-5 border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[10px] text-red-600 dark:text-red-300">{error}</div>}
        {isAdminUser && (
          <div className="mt-5 flex items-center gap-2 border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-[10px] text-emerald-700 dark:text-emerald-300">
            <Shield className="h-3.5 w-3.5" />
            Rola {user.role} zapewnia wszystkie uprawnienia domyślnie.
          </div>
        )}

        <div className="grid gap-8 py-7 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="lg:border-r lg:border-black/[0.08] lg:pr-5 dark:lg:border-white/[0.08]">
            <p className="mb-2 text-[8px] font-semibold uppercase text-[#969c99]">Obszar</p>
            <div className="space-y-1">
              {ecosystemOptions.map((option) => {
                const Icon = option.icon
                const isActive = selectedEcosystem === option.name
                const optionGroups = PERMISSION_GROUPS.filter((group) => group.ecosystem === option.name)
                const optionKeys = optionGroups.flatMap((group) => group.keys)
                const optionEnabled = isAdminUser ? optionKeys.length : optionKeys.filter(hasPermission).length
                return (
                  <button
                    key={option.name}
                    type="button"
                    onClick={() => setSelectedEcosystem(option.name)}
                    className={`flex w-full items-center gap-3 rounded-[8px] px-2.5 py-2 text-left transition-colors ${
                      isActive
                        ? 'bg-white text-[#26302b] shadow-[0_1px_2px_rgba(23,30,27,0.05)] dark:bg-white/[0.08] dark:text-white'
                        : 'text-[#747b78] hover:bg-white/55 dark:text-[#969c99] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-black/[0.035] dark:bg-white/[0.05]">
                      <Icon className={`h-3.5 w-3.5 ${DASHBOARD_MODULE_ICON_COLORS[option.color].dark} ${DASHBOARD_MODULE_ICON_COLORS[option.color].light}`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[10px] font-medium">{option.label}</span>
                      <span className="mt-0.5 block font-mono text-[8px] text-[#969c99]">{optionEnabled}/{optionKeys.length}</span>
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-45" />
                  </button>
                )
              })}
            </div>
            <div className="mt-6 border-t border-black/[0.08] pt-4 dark:border-white/[0.08]">
              <p className="text-[8px] uppercase text-[#969c99]">Rola bazowa</p>
              <p className="mt-1.5 text-[10px] font-medium">{user.role || 'viewer'}</p>
              <p className="mt-0.5 font-mono text-[8px] text-[#969c99]">{formatDate(user.created_at)}</p>
            </div>
          </aside>

          <section>
            <div className="mb-4">
              <h2 className="text-[14px] font-semibold">{selectedEcosystemData?.label}</h2>
              <p className="mt-1 text-[10px] text-[#858c88]">{selectedEcosystemData?.description}</p>
            </div>
            <div className="space-y-5">
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
                    <div key={group.id} className="border-y border-black/[0.08] dark:border-white/[0.08]">
                      <div className="flex items-center justify-between gap-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => toggleCollapse(group.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span className="shrink-0 text-[#838a86]">{group.icon}</span>
                          <span className="truncate text-[11px] font-semibold">
                            {group.label}
                          </span>
                          <span className={`shrink-0 rounded-[5px] px-2 py-0.5 font-mono text-[9px] tabular-nums ${
                            enabledCount === groupPerms.length
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : enabledCount === 0
                                ? 'bg-black/[0.035] text-[#8b918e] dark:bg-white/[0.05]'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
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
                                disabled={loadingPermission === 'bulk'}
                                className="rounded-[6px] px-2 py-1 text-[9px] text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                              >
                                Wszystkie
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBulkDisable(group.keys)}
                                disabled={loadingPermission === 'bulk'}
                                className="rounded-[6px] px-2 py-1 text-[9px] text-[#7d8480] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                              >
                                Brak
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleCollapse(group.id)}
                            className="text-[#8b918e]"
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
                        <div className="border-t border-black/[0.06] dark:border-white/[0.06]">
                          <div>
                            {visiblePerms.map(perm => {
                              const isEnabled = hasPermission(perm.key)
                              const isLoading = loadingPermission === perm.key

                              return (
                                <div
                                  key={perm.key}
                                  className="flex items-center justify-between gap-4 border-b border-black/[0.06] py-3.5 last:border-b-0 dark:border-white/[0.06]"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-medium leading-snug">{perm.label}</p>
                                    <p className="mt-0.5 break-all font-mono text-[9px] text-[#969c99]">{perm.key}</p>
                                    <p className="mt-1 text-[10px] leading-relaxed text-[#777e7a] dark:text-[#8e9591]">
                                      {perm.description}
                                    </p>
                                  </div>

                                  {canEditUsers && !isAdminUser ? (
                                    <button
                                      onClick={() => handleTogglePermission(perm.key)}
                                      disabled={isLoading}
                                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                                        isEnabled ? 'bg-emerald-500' : 'bg-[#c6cbc8] dark:bg-[#3d423f]'
                                      }`}
                                    >
                                      {isLoading ? (
                                        <RefreshCw className="absolute left-3 top-1 h-3 w-3 animate-spin text-white" />
                                      ) : (
                                        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                          isEnabled ? 'translate-x-[18px]' : 'translate-x-0.5'
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
          </section>
        </div>
      </main>
    </div>
  )
}
