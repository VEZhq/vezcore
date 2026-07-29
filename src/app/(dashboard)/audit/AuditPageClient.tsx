'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  KeyRound,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react'
import { MobileNav } from '@/components/MobileNav'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { getAuditLogs, getAuditLogActions, type AuditLog } from '@/lib/actions/audit'

type Severity = 'ok' | 'warn' | 'critical' | 'info'

type ActionMeta = {
  label: string
  icon: LucideIcon
  severity: Severity
  dot: string
  iconStyle: string
}

const actionMeta: Record<string, ActionMeta> = {
  login: { label: 'Zalogowano', icon: LogIn, severity: 'ok', dot: 'bg-[#67ad7c]', iconStyle: 'bg-[#edf6f0] text-[#4c8660]' },
  logout: { label: 'Wylogowano', icon: LogOut, severity: 'info', dot: 'bg-[#9da4a1]', iconStyle: 'bg-[#f0f2f1] text-[#737a77]' },
  failed_login: { label: 'Nieudane logowanie', icon: AlertTriangle, severity: 'critical', dot: 'bg-[#d86c6c]', iconStyle: 'bg-[#faeeee] text-[#b74f4f]' },
  ip_blocked: { label: 'Zablokowano IP', icon: Shield, severity: 'critical', dot: 'bg-[#d86c6c]', iconStyle: 'bg-[#faeeee] text-[#b74f4f]' },
  password_change: { label: 'Zmieniono hasło', icon: KeyRound, severity: 'warn', dot: 'bg-[#d5a64e]', iconStyle: 'bg-[#faf3e5] text-[#a47a2f]' },
  email_change: { label: 'Zmieniono e-mail', icon: User, severity: 'warn', dot: 'bg-[#d5a64e]', iconStyle: 'bg-[#faf3e5] text-[#a47a2f]' },
  profile_update: { label: 'Zmieniono profil', icon: User, severity: 'info', dot: 'bg-[#a692ad]', iconStyle: 'bg-[#f3eef4] text-[#806a82]' },
  avatar_upload: { label: 'Dodano avatar', icon: User, severity: 'info', dot: 'bg-[#a692ad]', iconStyle: 'bg-[#f3eef4] text-[#806a82]' },
  avatar_remove: { label: 'Usunięto avatar', icon: User, severity: 'info', dot: 'bg-[#a692ad]', iconStyle: 'bg-[#f3eef4] text-[#806a82]' },
  '2fa_enable': { label: 'Włączono 2FA', icon: ShieldCheck, severity: 'ok', dot: 'bg-[#67ad7c]', iconStyle: 'bg-[#edf6f0] text-[#4c8660]' },
  '2fa_disable': { label: 'Wyłączono 2FA', icon: AlertTriangle, severity: 'warn', dot: 'bg-[#d5a64e]', iconStyle: 'bg-[#faf3e5] text-[#a47a2f]' },
  '2fa_verify': { label: 'Potwierdzono 2FA', icon: ShieldCheck, severity: 'ok', dot: 'bg-[#67ad7c]', iconStyle: 'bg-[#edf6f0] text-[#4c8660]' },
  '2fa_failed': { label: 'Błąd 2FA', icon: AlertTriangle, severity: 'critical', dot: 'bg-[#d86c6c]', iconStyle: 'bg-[#faeeee] text-[#b74f4f]' },
  user_create: { label: 'Utworzono konto', icon: Users, severity: 'ok', dot: 'bg-[#67ad7c]', iconStyle: 'bg-[#edf6f0] text-[#4c8660]' },
  user_update: { label: 'Zmieniono konto', icon: Users, severity: 'info', dot: 'bg-[#a692ad]', iconStyle: 'bg-[#f3eef4] text-[#806a82]' },
  user_delete: { label: 'Usunięto konto', icon: Users, severity: 'critical', dot: 'bg-[#d86c6c]', iconStyle: 'bg-[#faeeee] text-[#b74f4f]' },
  user_deactivate: { label: 'Wyłączono konto', icon: Users, severity: 'warn', dot: 'bg-[#d5a64e]', iconStyle: 'bg-[#faf3e5] text-[#a47a2f]' },
  user_activate: { label: 'Aktywowano konto', icon: Users, severity: 'ok', dot: 'bg-[#67ad7c]', iconStyle: 'bg-[#edf6f0] text-[#4c8660]' },
  session_revoke: { label: 'Wycofano sesję', icon: KeyRound, severity: 'warn', dot: 'bg-[#d5a64e]', iconStyle: 'bg-[#faf3e5] text-[#a47a2f]' },
  all_sessions_revoked: { label: 'Wycofano sesje', icon: KeyRound, severity: 'warn', dot: 'bg-[#d5a64e]', iconStyle: 'bg-[#faf3e5] text-[#a47a2f]' },
  permission_grant: { label: 'Nadano uprawnienie', icon: ShieldCheck, severity: 'ok', dot: 'bg-[#67ad7c]', iconStyle: 'bg-[#edf6f0] text-[#4c8660]' },
  permission_revoke: { label: 'Cofnięto uprawnienie', icon: Shield, severity: 'warn', dot: 'bg-[#d5a64e]', iconStyle: 'bg-[#faf3e5] text-[#a47a2f]' },
}

const defaultActionMeta: ActionMeta = {
  label: 'Zdarzenie systemowe',
  icon: Clock3,
  severity: 'info',
  dot: 'bg-[#9da4a1]',
  iconStyle: 'bg-[#f0f2f1] text-[#737a77]',
}

interface AuditPageClientProps {
  canAccessKonta: boolean
  canAccessSettings: boolean
}

function getMeta(action: string) {
  return actionMeta[action] ?? { ...defaultActionMeta, label: action.replaceAll('_', ' ') }
}

function formatDetailValue(value: unknown) {
  if (value === null || value === undefined) return 'brak'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

export default function AuditPageClient({ canAccessKonta, canAccessSettings }: AuditPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { preferences } = useUserPreferences()

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [actions, setActions] = useState<string[]>([])
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [actionFilter, setActionFilter] = useState(searchParams.get('action') || '')
  const [startDate, setStartDate] = useState(searchParams.get('start') || '')
  const [endDate, setEndDate] = useState(searchParams.get('end') || '')
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))

  const limit = 20
  const totalPages = Math.ceil(total / limit)
  const hasFilters = Boolean(search || actionFilter || startDate || endDate)
  const criticalCount = useMemo(
    () => logs.filter((log) => getMeta(log.action).severity === 'critical').length,
    [logs]
  )
  const warningCount = useMemo(
    () => logs.filter((log) => getMeta(log.action).severity === 'warn').length,
    [logs]
  )
  const uniqueUsers = useMemo(
    () => new Set(logs.map((log) => log.user_email || log.user_id || 'system')).size,
    [logs]
  )

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
  }, [actionFilter, endDate, page, search, startDate])

  useKeyboardShortcuts({
    onSearch: () => searchInputRef.current?.focus(),
    onRefresh: () => void fetchLogs(),
    onCancel: () => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    },
    onGoDashboard: () => router.push('/dashboard'),
    onGoProfile: () => router.push('/profile'),
    onGoSettings: canAccessSettings ? () => router.push('/settings') : undefined,
  })

  useEffect(() => {
    let cancelled = false
    getAuditLogActions().then((result) => {
      if (!cancelled) setActions(result)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (actionFilter) params.set('action', actionFilter)
    if (startDate) params.set('start', startDate)
    if (endDate) params.set('end', endDate)
    if (page > 1) params.set('page', page.toString())
    router.replace(params.toString() ? `?${params.toString()}` : '/audit', { scroll: false })
  }, [actionFilter, endDate, page, router, search, startDate])

  const eventDate = (value: string | null) => {
    if (!value) return 'Brak daty'
    return new Intl.DateTimeFormat('pl-PL', {
      timeZone: preferences.timezone,
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(value))
  }

  const eventTime = (value: string | null) => {
    if (!value) return '--:--'
    return new Intl.DateTimeFormat('pl-PL', {
      timeZone: preferences.timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(value))
  }

  const clearFilters = () => {
    setSearch('')
    setActionFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-[#eef1f0] text-[#242725]">
      <MobileNav currentPath="/audit" showKonta={canAccessKonta} showAudit showSettings={canAccessSettings} />

      <div className="mx-auto min-h-screen w-full max-w-[1540px] px-4 py-4 sm:px-7 sm:py-6">
        <header className="flex min-h-14 flex-wrap items-center gap-4 border-b border-black/[0.08] pb-4">
          <Image
            src="/logo/vezcore_logo_black_full.svg"
            alt="VEZcore"
            width={122}
            height={42}
            className="h-auto w-[122px]"
            priority
          />
          <span className="hidden h-6 w-px bg-black/[0.09] sm:block" />
          <div>
            <p className="text-[9px] font-medium uppercase text-[#929896]">Bezpieczeństwo</p>
            <h1 className="text-lg font-semibold">Aktywność</h1>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex h-9 items-center gap-2 rounded-[8px] px-3 text-[11px] text-[#68706d] transition-colors hover:bg-white hover:text-[#242725]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
            <button
              type="button"
              onClick={() => void fetchLogs()}
              className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-white text-[#68706d] shadow-sm transition-colors hover:text-[#242725]"
              aria-label="Odśwież aktywność"
              title="Odśwież"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <div className="grid border-b border-black/[0.07] py-4 sm:grid-cols-4">
          {[
            ['Zdarzenia', total],
            ['Na stronie', logs.length],
            ['Użytkownicy', uniqueUsers],
            ['Wymaga uwagi', criticalCount + warningCount],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between border-black/[0.07] px-3 py-2 first:pl-0 sm:border-r sm:last:border-r-0">
              <span className="text-[10px] text-[#858c89]">{label}</span>
              <strong className="text-base font-semibold text-[#343836]">{value}</strong>
            </div>
          ))}
        </div>

        <div className="grid min-h-[calc(100vh-155px)] xl:grid-cols-[minmax(0,1fr)_330px]">
          <main className="min-w-0 bg-white/75 px-4 py-5 sm:px-7">
            <div className="mb-6 flex flex-col gap-3 border-b border-black/[0.07] pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Oś zdarzeń</p>
                <p className="mt-1 text-[11px] text-[#7d8582]">
                  Logowania, bezpieczeństwo, konta, sesje i zmiany uprawnień.
                </p>
              </div>
              <p className="text-[10px] text-[#929896]">
                Strona {page}{totalPages > 0 ? ` z ${totalPages}` : ''}
              </p>
            </div>

            {loading ? (
              <div className="space-y-6 py-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="grid animate-pulse grid-cols-[58px_24px_minmax(0,1fr)] gap-3">
                    <div className="h-3 rounded bg-black/[0.05]" />
                    <div className="mx-auto h-5 w-5 rounded-full bg-black/[0.06]" />
                    <div>
                      <div className="h-3 w-2/5 rounded bg-black/[0.06]" />
                      <div className="mt-3 h-3 w-3/4 rounded bg-black/[0.04]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : fetchError ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <AlertTriangle className="h-7 w-7 text-[#bd5c5c]" />
                <p className="mt-3 text-sm font-medium">Nie udało się pobrać aktywności</p>
                <p className="mt-1 text-xs text-[#7d8582]">{fetchError}</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-7 w-7 text-[#7b9d85]" />
                <p className="mt-3 text-sm font-medium">Brak zdarzeń</p>
                <p className="mt-1 text-xs text-[#7d8582]">Zmień filtry albo sprawdź ponownie później.</p>
              </div>
            ) : (
              <div>
                {logs.map((log, index) => {
                  const meta = getMeta(log.action)
                  const Icon = meta.icon
                  const details = log.details ? Object.entries(log.details).slice(0, 4) : []
                  const dateLabel = eventDate(log.created_at)
                  const previousDate = index > 0 ? eventDate(logs[index - 1].created_at) : null
                  const showDate = dateLabel !== previousDate

                  return (
                    <div key={log.id}>
                      {showDate && (
                        <div className="grid grid-cols-[58px_24px_minmax(0,1fr)] gap-3 py-3">
                          <span />
                          <span className="mx-auto h-px w-6 bg-black/[0.10]" />
                          <span className="text-[10px] font-semibold uppercase text-[#8b9290]">{dateLabel}</span>
                        </div>
                      )}
                      <article className="group grid grid-cols-[58px_24px_minmax(0,1fr)] gap-3">
                        <time className="pt-3 text-right font-mono text-[10px] text-[#7f8784]">
                          {eventTime(log.created_at)}
                        </time>
                        <div className="relative flex justify-center">
                          <span className="absolute bottom-0 top-0 w-px bg-black/[0.09]" />
                          <span className={`relative mt-3 h-2.5 w-2.5 rounded-full border-2 border-white ${meta.dot}`} />
                        </div>
                        <div className="min-w-0 border-b border-black/[0.06] py-2.5 pb-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`flex h-7 w-7 items-center justify-center rounded-[7px] ${meta.iconStyle}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <strong className="text-[12px] font-semibold">{log.user_email || 'system'}</strong>
                            <span className="text-[12px] text-[#626a67]">{meta.label}</span>
                          </div>
                          <div className="ml-9 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#8a918f]">
                            <span>{log.action}</span>
                            <span>
                              {log.entity_type || 'system'}
                              {log.entity_id ? ` / ${log.entity_id.slice(0, 8)}` : ''}
                            </span>
                          </div>
                          {details.length > 0 && (
                            <div className="ml-9 mt-2 flex flex-wrap gap-x-4 gap-y-1 rounded-[7px] bg-[#f4f5f4] px-3 py-2">
                              {details.map(([key, value]) => (
                                <span key={key} className="flex max-w-full min-w-0 items-center gap-1 text-[9px] text-[#858c89]">
                                  <b className="shrink-0 font-medium text-[#626966]">{key}:</b>
                                  <span className="truncate font-mono">{formatDetailValue(value)}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    </div>
                  )
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between border-t border-black/[0.07] pt-4">
                <p className="text-[10px] text-[#858c89]">
                  {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} z {total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#69706e] hover:bg-[#f0f1f0] disabled:opacity-30"
                    aria-label="Poprzednia strona"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-12 text-center text-[10px] text-[#6f7774]">{page} / {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#69706e] hover:bg-[#f0f1f0] disabled:opacity-30"
                    aria-label="Następna strona"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </main>

          <aside className="border-l border-black/[0.07] bg-[#f6f8f7] px-5 py-6">
            <div className="sticky top-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold">Filtry</p>
                  <p className="mt-1 text-[10px] text-[#858c89]">Zawęź widoczną aktywność</p>
                </div>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#8a918f] hover:bg-white hover:text-[#b65555]"
                    aria-label="Wyczyść filtry"
                    title="Wyczyść"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <label className="mt-6 block">
                <span className="mb-2 block text-[10px] font-medium text-[#69716e]">Szukaj</span>
                <span className="relative block">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#969d9a]" />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setPage(1)
                    }}
                    placeholder="Akcja lub obiekt"
                    className="h-10 w-full rounded-[7px] border border-black/[0.08] bg-white pl-9 pr-3 text-[11px] outline-none placeholder:text-[#a0a6a4] focus:border-black/[0.18]"
                  />
                </span>
              </label>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <label>
                  <span className="mb-2 block text-[10px] font-medium text-[#69716e]">Od</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => {
                      setStartDate(event.target.value)
                      setPage(1)
                    }}
                    className="h-10 w-full rounded-[7px] border border-black/[0.08] bg-white px-2 text-[10px] outline-none focus:border-black/[0.18]"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-[10px] font-medium text-[#69716e]">Do</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => {
                      setEndDate(event.target.value)
                      setPage(1)
                    }}
                    className="h-10 w-full rounded-[7px] border border-black/[0.08] bg-white px-2 text-[10px] outline-none focus:border-black/[0.18]"
                  />
                </label>
              </div>

              <div className="mt-6">
                <p className="mb-2 text-[10px] font-medium text-[#69716e]">Typ zdarzenia</p>
                <div className="max-h-[430px] space-y-0.5 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActionFilter('')
                      setPage(1)
                    }}
                    className={`flex w-full items-center justify-between rounded-[6px] px-2.5 py-2 text-left text-[10px] ${
                      actionFilter === '' ? 'bg-white font-medium text-[#252927] shadow-sm' : 'text-[#737b78] hover:bg-white/70'
                    }`}
                  >
                    Wszystkie zdarzenia
                    <span className="text-[#a0a6a4]">{total}</span>
                  </button>
                  {actions.map((action) => {
                    const meta = getMeta(action)
                    return (
                      <button
                        key={action}
                        type="button"
                        onClick={() => {
                          setActionFilter(action)
                          setPage(1)
                        }}
                        className={`flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-left text-[10px] ${
                          actionFilter === action ? 'bg-white font-medium text-[#252927] shadow-sm' : 'text-[#737b78] hover:bg-white/70'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
                        <span className="truncate">{meta.label}</span>
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
  )
}
