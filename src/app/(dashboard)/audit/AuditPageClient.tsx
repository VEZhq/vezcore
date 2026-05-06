'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  User,
  Settings,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Shield,
  AlertTriangle,
  Clock,
  RefreshCw,
  Keyboard,
} from 'lucide-react'
import { useConfirm } from '@/components/ConfirmDialog'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { getAuditLogs, getAuditLogActions, type AuditLog } from '@/lib/actions/audit'
import { MobileNav } from '@/components/MobileNav'
import { AuditLogSkeleton } from '@/components/skeletons'

const actionColors: Record<string, { bg: string; text: string; icon: typeof LogIn }> = {
  login: { bg: 'bg-emerald-500/10', text: 'text-emerald-400 light:text-emerald-600', icon: LogIn },
  logout: { bg: 'bg-red-500/10', text: 'text-red-400 light:text-red-600', icon: LogOut },
  '2fa_verify': { bg: 'bg-blue-500/10', text: 'text-blue-400 light:text-blue-600', icon: Shield },
  '2fa_enable': { bg: 'bg-purple-500/10', text: 'text-purple-400 light:text-purple-600', icon: Shield },
  '2fa_disable': { bg: 'bg-orange-500/10', text: 'text-orange-400 light:text-orange-600', icon: AlertTriangle },
  password_change: { bg: 'bg-yellow-500/10', text: 'text-yellow-400 light:text-yellow-600', icon: RefreshCw },
  profile_update: { bg: 'bg-cyan-500/10', text: 'text-cyan-400 light:text-cyan-600', icon: User },
  ip_blocked: { bg: 'bg-red-600/10', text: 'text-red-500 light:text-red-700', icon: AlertTriangle },
  failed_login: { bg: 'bg-red-400/10', text: 'text-red-400 light:text-red-500', icon: AlertTriangle },
}

const defaultActionColor = { bg: 'bg-gray-500/10', text: 'text-gray-400 light:text-gray-600', icon: Clock }

interface AuditPageClientProps {
  canAccessSettings: boolean
}

export default function AuditPageClient({ canAccessSettings }: AuditPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { confirm } = useConfirm()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { preferences } = useUserPreferences()

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [actions, setActions] = useState<string[]>([])
  const [showShortcuts, setShowShortcuts] = useState(false)

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [actionFilter, setActionFilter] = useState(searchParams.get('action') || '')
  const [startDate, setStartDate] = useState(searchParams.get('start') || '')
  const [endDate, setEndDate] = useState(searchParams.get('end') || '')
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [showFilters, setShowFilters] = useState(false)

  const limit = 20
  const totalPages = Math.ceil(total / limit)

  useKeyboardShortcuts({
    onSearch: () => {
      searchInputRef.current?.focus()
    },
    onRefresh: () => {
      void fetchLogs()
    },
    onCancel: () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      setShowFilters(false)
      setShowShortcuts(false)
    },
    onToggleTheme: () => {
      const toggle = document.querySelector('[data-theme-toggle]') as HTMLButtonElement
      toggle?.click()
    },
    onGoDashboard: () => router.push('/dashboard'),
    onGoProfile: () => router.push('/profile'),
    onGoSettings: canAccessSettings ? () => router.push('/settings') : undefined,
  })

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    const result = await getAuditLogs({
      action: actionFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: search || undefined,
      page,
      limit,
    })

    if ('error' in result) {
      setFetchError(result.error ?? 'Nieznany błąd')
    } else {
      setLogs(result.logs)
      setTotal(result.total)
    }
    setLoading(false)
  }, [actionFilter, startDate, endDate, search, page])

  useEffect(() => {
    let cancelled = false
    getAuditLogActions().then((result) => {
      if (!cancelled) {
        setActions(result)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (actionFilter) params.set('action', actionFilter)
    if (startDate) params.set('start', startDate)
    if (endDate) params.set('end', endDate)
    if (page > 1) params.set('page', page.toString())

    const newUrl = params.toString() ? `?${params.toString()}` : '/audit'
    router.replace(newUrl, { scroll: false })
  }, [search, actionFilter, startDate, endDate, page, router])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pl-PL', {
      timeZone: preferences.timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getActionColor = (action: string) => {
    return actionColors[action] || defaultActionColor
  }

  const getActionIcon = (action: string) => {
    const color = getActionColor(action)
    const Icon = color.icon
    return <Icon className={`h-4 w-4 ${color.text}`} />
  }

  const clearFilters = async () => {
    const confirmed = await confirm({
      title: 'Wyczyścić filtry?',
      message: 'Czy na pewno chcesz wyczyścić wszystkie filtry? Spowoduje to usunięcie aktualnego wyszukiwania i filtrów.',
      confirmText: 'Wyczyść',
      cancelText: 'Anuluj',
      variant: 'warning',
    })

    if (confirmed) {
      setSearch('')
      setActionFilter('')
      setStartDate('')
      setEndDate('')
      setPage(1)
    }
  }

  const hasFilters = search || actionFilter || startDate || endDate

  return (
    <div className="min-h-screen bg-[#0a0a0a] light:bg-[#f5f5f5] transition-colors duration-300">
      <MobileNav currentPath="/audit" showAudit={true} showSettings={canAccessSettings} />

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
            href="/audit"
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white light:text-black"
          >
            Audit Log
          </Link>
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
        <div className="max-w-6xl mx-auto space-y-6 lg:space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-medium text-white light:text-black transition-colors duration-300">Audit Log</h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mt-1 transition-colors duration-300">
                Historia aktywności systemu
              </p>
            </div>
            <button
              onClick={() => void fetchLogs()}
              className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] border border-white/[0.06] light:border-black/[0.06] hover:bg-white/[0.02] light:hover:bg-black/[0.02] transition-colors duration-300"
            >
              <RefreshCw className="h-3 w-3" />
              Odśwież
            </button>
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] border border-white/[0.06] light:border-black/[0.06] hover:bg-white/[0.02] light:hover:bg-black/[0.02] transition-colors duration-300"
            >
              <Keyboard className="h-3 w-3" />
              ?
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#444444] light:text-[#888888]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Szukaj w logach... (⌘K)"
                  className="w-full h-12 pl-12 pr-4 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.06] light:border-black/[0.06] text-white light:text-black text-sm placeholder:text-[#444444] light:placeholder:text-[#888888] focus:outline-none focus:border-white/[0.12] light:focus:border-black/[0.12] transition-colors duration-300"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 h-12 text-[10px] uppercase tracking-[0.2em] border transition-colors duration-300 ${
                  showFilters || hasFilters
                    ? 'bg-white/[0.05] light:bg-black/[0.05] border-white/[0.12] light:border-black/[0.12] text-white light:text-black'
                    : 'border-white/[0.06] light:border-black/[0.06] text-[#666666] light:text-[#999999] hover:bg-white/[0.02] light:hover:bg-black/[0.02]'
                }`}
              >
                <Filter className="h-3 w-3" />
                Filtry
                {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </button>
            </div>

            {showFilters && (
              <div className="flex items-center gap-4 p-4 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.06] light:border-black/[0.06] transition-colors duration-300">
                <div className="flex-1 space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888]">
                    Akcja
                  </label>
                  <select
                    value={actionFilter}
                    onChange={(e) => {
                      setActionFilter(e.target.value)
                      setPage(1)
                    }}
                    className="w-full h-10 px-3 bg-white/[0.02] light:bg-white border border-white/[0.06] light:border-black/[0.06] text-white light:text-black text-sm focus:outline-none focus:border-white/[0.12] light:focus:border-black/[0.12] transition-colors duration-300"
                  >
                    <option value="">Wszystkie akcje</option>
                    {actions.map(action => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888]">
                    Od daty
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setPage(1)
                    }}
                    className="w-full h-10 px-3 bg-white/[0.02] light:bg-white border border-white/[0.06] light:border-black/[0.06] text-white light:text-black text-sm focus:outline-none focus:border-white/[0.12] light:focus:border-black/[0.12] transition-colors duration-300"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888]">
                    Do daty
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setPage(1)
                    }}
                    className="w-full h-10 px-3 bg-white/[0.02] light:bg-white border border-white/[0.06] light:border-black/[0.06] text-white light:text-black text-sm focus:outline-none focus:border-white/[0.12] light:focus:border-black/[0.12] transition-colors duration-300"
                  />
                </div>

                {hasFilters && (
                  <button
                    onClick={() => void clearFilters()}
                    className="h-10 px-4 text-[10px] uppercase tracking-[0.2em] text-red-400 light:text-red-600 border border-red-500/20 light:border-red-600/20 hover:bg-red-500/10 light:hover:bg-red-600/10 transition-colors duration-300"
                  >
                    Wyczyść
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-colors duration-300">
            {loading ? (
              <AuditLogSkeleton count={5} />
            ) : fetchError ? (
              <div className="p-12 text-center">
                <p className="text-[10px] uppercase tracking-[0.3em] text-red-400 light:text-red-600">
                  Błąd
                </p>
                <p className="text-xs text-[#666666] light:text-[#999999] mt-2">
                  {fetchError}
                </p>
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
                  Brak logów
                </p>
                <p className="text-xs text-[#666666] light:text-[#999999] mt-2">
                  {hasFilters ? 'Brak wyników dla wybranych filtrów' : 'Aktywność systemu pojawi się tutaj automatycznie'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06] light:divide-black/[0.06]">
                {logs.map((log) => {
                  const actionColor = getActionColor(log.action)
                  return (
                    <div key={log.id} className="p-6 hover:bg-white/[0.02] light:hover:bg-black/[0.02] transition-colors duration-300">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg ${actionColor.bg} flex items-center justify-center flex-shrink-0`}>
                          {getActionIcon(log.action)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-3">
                              <span className={`text-sm font-medium ${actionColor.text}`}>
                                {log.action}
                              </span>
                              {log.entity_type && (
                                <span className="text-[10px] text-[#444444] light:text-[#888888] font-mono">
                                  {log.entity_type}
                                  {log.entity_id && ` • ${log.entity_id.substring(0, 8)}...`}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#444444] light:text-[#888888] font-mono">
                              {formatDate(log.created_at ?? '')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-[#666666] light:text-[#999999]">
                              {log.user_email}
                            </span>
                          </div>

                          {log.details && (
                            <div className="mt-3 p-3 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.04] light:border-black/[0.04] rounded transition-colors duration-300">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {Object.entries(log.details).map(([key, value]) => (
                                  <div key={key} className="space-y-0.5">
                                    <span className="text-[8px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888]">
                                      {key}
                                    </span>
                                    <p className="text-[10px] text-[#888888] light:text-[#666666] font-mono truncate">
                                      {typeof value === 'string' ? value : JSON.stringify(value)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[#444444] light:text-[#888888]">
                Wyświetlane {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} z {total} logów
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] border border-white/[0.06] light:border-black/[0.06] hover:bg-white/[0.02] light:hover:bg-black/[0.02] disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-300"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Poprzednia
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 text-[10px] transition-colors duration-300 ${
                          page === pageNum
                            ? 'bg-white/[0.08] light:bg-black/[0.08] text-white light:text-black'
                            : 'text-[#666666] light:text-[#999999] hover:bg-white/[0.02] light:hover:bg-black/[0.02]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] border border-white/[0.06] light:border-black/[0.06] hover:bg-white/[0.02] light:hover:bg-black/[0.02] disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-300"
                >
                  Następna
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {showShortcuts && (
            <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl p-6 transition-colors duration-300">
              <h3 className="text-xs uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] mb-4">
                Skróty klawiszowe
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-[#444444] light:text-[#888888]">Szukaj</p>
                  <kbd className="inline-block px-2 py-1 text-[10px] text-white light:text-black bg-white/[0.05] light:bg-black/[0.05] border border-white/[0.1] light:border-black/[0.1] rounded">
                    ⌘K
                  </kbd>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-[#444444] light:text-[#888888]">Odśwież</p>
                  <kbd className="inline-block px-2 py-1 text-[10px] text-white light:text-black bg-white/[0.05] light:bg-black/[0.05] border border-white/[0.1] light:border-black/[0.1] rounded">
                    ⌘R
                  </kbd>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-[#444444] light:text-[#888888]">Dashboard</p>
                  <kbd className="inline-block px-2 py-1 text-[10px] text-white light:text-black bg-white/[0.05] light:bg-black/[0.05] border border-white/[0.1] light:border-black/[0.1] rounded">
                    ⌘⇧D
                  </kbd>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-[#444444] light:text-[#888888]">Profil</p>
                  <kbd className="inline-block px-2 py-1 text-[10px] text-white light:text-black bg-white/[0.05] light:bg-black/[0.05] border border-white/[0.1] light:border-black/[0.1] rounded">
                    ⌘⇧P
                  </kbd>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-[#444444] light:text-[#888888]">Audit Log</p>
                  <kbd className="inline-block px-2 py-1 text-[10px] text-white light:text-black bg-white/[0.05] light:bg-black/[0.05] border border-white/[0.1] light:border-black/[0.1] rounded">
                    ⌘⇧A
                  </kbd>
                </div>
                {canAccessSettings && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-[#444444] light:text-[#888888]">Ustawienia</p>
                    <kbd className="inline-block px-2 py-1 text-[10px] text-white light:text-black bg-white/[0.05] light:bg-black/[0.05] border border-white/[0.1] light:border-black/[0.1] rounded">
                      ⌘⇧S
                    </kbd>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-[10px] text-[#444444] light:text-[#888888]">Motyw</p>
                  <kbd className="inline-block px-2 py-1 text-[10px] text-white light:text-black bg-white/[0.05] light:bg-black/[0.05] border border-white/[0.1] light:border-black/[0.1] rounded">
                    ⌘⇧T
                  </kbd>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-[#444444] light:text-[#888888]">Anuluj</p>
                  <kbd className="inline-block px-2 py-1 text-[10px] text-white light:text-black bg-white/[0.05] light:bg-black/[0.05] border border-white/[0.1] light:border-black/[0.1] rounded">
                    Esc
                  </kbd>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
