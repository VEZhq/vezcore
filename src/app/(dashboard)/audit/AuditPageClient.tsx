'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  KeyRound,
  LogIn,
  LogOut,
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

type ActionMeta = {
  label: string
  icon: LucideIcon
  dot: string
  iconStyle: string
}

const actionMeta: Record<string, ActionMeta> = {
  login: { label: 'zalogował się', icon: LogIn, dot: 'bg-[#83cdbb]', iconStyle: 'bg-[#83cdbb] text-white' },
  logout: { label: 'wylogował się', icon: LogOut, dot: 'bg-[#a9afad]', iconStyle: 'bg-[#a9afad] text-white' },
  failed_login: { label: 'nieudane logowanie', icon: AlertTriangle, dot: 'bg-[#d96c6c]', iconStyle: 'bg-[#d96c6c] text-white' },
  ip_blocked: { label: 'zablokował adres IP', icon: Shield, dot: 'bg-[#d96c6c]', iconStyle: 'bg-[#d96c6c] text-white' },
  password_change: { label: 'zmienił hasło', icon: KeyRound, dot: 'bg-[#d5b84e]', iconStyle: 'bg-[#d5b84e] text-white' },
  email_change: { label: 'zmienił adres e-mail', icon: User, dot: 'bg-[#d5b84e]', iconStyle: 'bg-[#d5b84e] text-white' },
  profile_update: { label: 'zaktualizował profil', icon: User, dot: 'bg-[#a991ad]', iconStyle: 'bg-[#a991ad] text-white' },
  avatar_upload: { label: 'dodał avatar', icon: User, dot: 'bg-[#a991ad]', iconStyle: 'bg-[#a991ad] text-white' },
  avatar_remove: { label: 'usunął avatar', icon: User, dot: 'bg-[#a991ad]', iconStyle: 'bg-[#a991ad] text-white' },
  '2fa_enable': { label: 'włączył 2FA', icon: ShieldCheck, dot: 'bg-[#71ab7d]', iconStyle: 'bg-[#71ab7d] text-white' },
  '2fa_disable': { label: 'wyłączył 2FA', icon: AlertTriangle, dot: 'bg-[#d5a64e]', iconStyle: 'bg-[#d5a64e] text-white' },
  '2fa_verify': { label: 'potwierdził 2FA', icon: ShieldCheck, dot: 'bg-[#71ab7d]', iconStyle: 'bg-[#71ab7d] text-white' },
  '2fa_failed': { label: 'błąd weryfikacji 2FA', icon: AlertTriangle, dot: 'bg-[#d96c6c]', iconStyle: 'bg-[#d96c6c] text-white' },
  user_create: { label: 'utworzył konto', icon: Users, dot: 'bg-[#71ab7d]', iconStyle: 'bg-[#71ab7d] text-white' },
  user_update: { label: 'zmienił konto', icon: Users, dot: 'bg-[#a991ad]', iconStyle: 'bg-[#a991ad] text-white' },
  user_delete: { label: 'usunął konto', icon: Users, dot: 'bg-[#d96c6c]', iconStyle: 'bg-[#d96c6c] text-white' },
  user_deactivate: { label: 'wyłączył konto', icon: Users, dot: 'bg-[#d5a64e]', iconStyle: 'bg-[#d5a64e] text-white' },
  user_activate: { label: 'aktywował konto', icon: Users, dot: 'bg-[#71ab7d]', iconStyle: 'bg-[#71ab7d] text-white' },
  session_revoke: { label: 'wycofał sesję', icon: KeyRound, dot: 'bg-[#d5a64e]', iconStyle: 'bg-[#d5a64e] text-white' },
  all_sessions_revoked: { label: 'wycofał wszystkie sesje', icon: KeyRound, dot: 'bg-[#d5a64e]', iconStyle: 'bg-[#d5a64e] text-white' },
  permission_grant: { label: 'nadał uprawnienie', icon: ShieldCheck, dot: 'bg-[#71ab7d]', iconStyle: 'bg-[#71ab7d] text-white' },
  permission_revoke: { label: 'cofnął uprawnienie', icon: Shield, dot: 'bg-[#d5a64e]', iconStyle: 'bg-[#d5a64e] text-white' },
}

const defaultActionMeta: ActionMeta = {
  label: 'wykonał zdarzenie systemowe',
  icon: Clock3,
  dot: 'bg-[#9ea5a2]',
  iconStyle: 'bg-[#9ea5a2] text-white',
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
  const { preferences } = useUserPreferences()

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [actions, setActions] = useState<string[]>([])
  const [actionFilter, setActionFilter] = useState(searchParams.get('action') || '')
  const [userFilter, setUserFilter] = useState(searchParams.get('user') || '')
  const [startDate, setStartDate] = useState(searchParams.get('start') || '')
  const [endDate, setEndDate] = useState(searchParams.get('end') || '')
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))

  const limit = 20
  const totalPages = Math.ceil(total / limit)
  const hasFilters = Boolean(actionFilter || userFilter || startDate || endDate)
  const users = useMemo(() => {
    const unique = new Map<string, string>()
    for (const log of logs) {
      if (log.user_id) unique.set(log.user_id, log.user_email || log.user_id.slice(0, 8))
    }
    return Array.from(unique, ([id, label]) => ({ id, label }))
  }, [logs])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    const result = await getAuditLogs({
      action: actionFilter || undefined,
      userId: userFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
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
  }, [actionFilter, endDate, page, startDate, userFilter])

  useKeyboardShortcuts({
    onRefresh: () => void fetchLogs(),
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
    if (actionFilter) params.set('action', actionFilter)
    if (userFilter) params.set('user', userFilter)
    if (startDate) params.set('start', startDate)
    if (endDate) params.set('end', endDate)
    if (page > 1) params.set('page', page.toString())
    router.replace(params.toString() ? `?${params.toString()}` : '/audit', { scroll: false })
  }, [actionFilter, endDate, page, router, startDate, userFilter])

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
    setActionFilter('')
    setUserFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-white text-[#242725]">
      <MobileNav currentPath="/audit" showKonta={canAccessKonta} showAudit showSettings={canAccessSettings} />

      <div className="mx-auto grid min-h-screen w-full max-w-[1540px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="min-w-0 px-5 py-8 sm:px-10 lg:px-14">
          <header className="border-b border-black/[0.12] pb-7">
            <Link
              href="/dashboard"
              className="text-[10px] font-semibold uppercase text-[#68706d] hover:text-black"
              title="Wróć do dashboardu"
            >
              Admin
            </Link>
            <h1 className="mt-1 text-[34px] font-semibold leading-none text-[#232624]">Audit Log</h1>
          </header>

          <section className="pt-8">
            {loading ? (
              <div className="space-y-8">
                {Array.from({ length: 7 }, (_, index) => (
                  <div key={index} className="grid animate-pulse grid-cols-[72px_26px_minmax(0,1fr)] gap-3">
                    <div className="mt-1 h-3 rounded bg-black/[0.05]" />
                    <div className="mx-auto h-5 w-5 rounded-full bg-black/[0.07]" />
                    <div>
                      <div className="h-4 w-1/2 rounded bg-black/[0.06]" />
                      <div className="mt-3 h-3 w-2/3 rounded bg-black/[0.04]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : fetchError ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <AlertTriangle className="h-7 w-7 text-[#bd5c5c]" />
                <p className="mt-3 text-sm font-semibold">Nie udało się pobrać logów</p>
                <p className="mt-1 text-xs text-[#777e7b]">{fetchError}</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-7 w-7 text-[#708f79]" />
                <p className="mt-3 text-sm font-semibold">Brak zdarzeń</p>
                <p className="mt-1 text-xs text-[#777e7b]">Brak wyników dla wybranych filtrów.</p>
              </div>
            ) : (
              <div>
                {logs.map((log, index) => {
                  const meta = getMeta(log.action)
                  const Icon = meta.icon
                  const details = log.details ? Object.entries(log.details).slice(0, 5) : []
                  const dateLabel = eventDate(log.created_at)
                  const previousDate = index > 0 ? eventDate(logs[index - 1].created_at) : null
                  const showDate = dateLabel !== previousDate

                  return (
                    <div key={log.id}>
                      {showDate && (
                        <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 py-2">
                          <span />
                          <div className="flex items-center">
                            <span className="h-px flex-1 bg-black/[0.12]" />
                            <span className="rounded-full border border-black/[0.14] bg-white px-3 py-1 text-[10px] font-semibold shadow-sm">
                              {dateLabel}
                            </span>
                            <span className="h-px flex-1 bg-black/[0.12]" />
                          </div>
                        </div>
                      )}

                      <article className="grid grid-cols-[72px_26px_minmax(0,1fr)] gap-3">
                        <time className="pt-[18px] text-right font-mono text-[11px] text-[#626966]">
                          {eventTime(log.created_at)}
                        </time>
                        <div className="relative flex justify-center">
                          <span className="absolute bottom-0 top-0 w-px bg-black/[0.12]" />
                          <span className={`relative mt-[15px] flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${meta.iconStyle}`}>
                            <Icon className="h-2.5 w-2.5" />
                          </span>
                        </div>
                        <div className="min-w-0 py-3 pb-7">
                          <p className="text-[13px] leading-6">
                            <strong className="font-semibold text-[#668976]">{log.user_email || 'system'}</strong>{' '}
                            <strong className="font-semibold text-[#292d2b]">{meta.label}</strong>
                            {log.entity_type && (
                              <span className="text-[#353a38]"> na {log.entity_type}</span>
                            )}
                          </p>
                          {(log.entity_id || details.length > 0) && (
                            <div className="mt-1 space-y-1 text-[11px] leading-5 text-[#555c59]">
                              {log.entity_id && (
                                <p>
                                  <b className="font-medium">Obiekt:</b>{' '}
                                  <span className="font-mono">{log.entity_id}</span>
                                </p>
                              )}
                              {details.map(([key, value]) => (
                                <p key={key} className="flex max-w-full min-w-0 gap-1">
                                  <b className="shrink-0 font-medium">{key}:</b>
                                  <span className="truncate font-mono text-[#69706d]">{formatDetailValue(value)}</span>
                                </p>
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
              <div className="ml-[84px] mt-4 flex items-center justify-between border-t border-black/[0.10] py-5">
                <span className="text-[10px] text-[#777e7b]">
                  {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} z {total}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="flex h-8 w-8 items-center justify-center border border-black/[0.12] text-[#646b68] disabled:opacity-30"
                    aria-label="Poprzednia strona"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[10px]">{page} / {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page === totalPages}
                    className="flex h-8 w-8 items-center justify-center border border-black/[0.12] text-[#646b68] disabled:opacity-30"
                    aria-label="Następna strona"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>

        <aside className="border-l border-black/[0.12] bg-[#f5f7f6] px-7 py-8">
          <div className="sticky top-8">
            <div className="flex items-start justify-between">
              <h2 className="text-[28px] font-semibold leading-none">Filters</h2>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex h-8 w-8 items-center justify-center text-[#777e7b] hover:bg-white hover:text-[#b45656]"
                  aria-label="Wyczyść filtry"
                  title="Wyczyść filtry"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <section className="mt-7">
              <h3 className="text-[18px] font-semibold">Filter by time</h3>
              <label className="mt-3 block">
                <span className="mb-2 block text-[13px] font-medium">From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value)
                    setPage(1)
                  }}
                  className="h-10 w-full border border-black/[0.16] bg-white px-3 text-[12px] outline-none focus:border-[#708f79]"
                />
              </label>
              <label className="mt-4 block">
                <span className="mb-2 block text-[13px] font-medium">To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    setEndDate(event.target.value)
                    setPage(1)
                  }}
                  className="h-10 w-full border border-black/[0.16] bg-white px-3 text-[12px] outline-none focus:border-[#708f79]"
                />
              </label>
              <button
                type="button"
                onClick={() => void fetchLogs()}
                className="mt-4 h-10 bg-[#313634] px-4 text-[12px] font-medium text-white hover:bg-[#202422]"
              >
                Filter
              </button>
            </section>

            <section className="mt-7">
              <h3 className="border-b border-black/[0.12] pb-3 text-[18px] font-semibold">Filter by users</h3>
              <button
                type="button"
                onClick={() => {
                  setUserFilter('')
                  setPage(1)
                }}
                className={`block w-full border-b border-black/[0.10] px-3 py-3 text-left text-[12px] ${
                  userFilter === '' ? 'font-semibold text-[#26302b]' : 'text-[#668976] hover:bg-white/70'
                }`}
              >
                Wszyscy użytkownicy
              </button>
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setUserFilter(user.id)
                    setPage(1)
                  }}
                  className={`block w-full border-b border-black/[0.10] px-3 py-3 text-left text-[12px] ${
                    userFilter === user.id ? 'font-semibold text-[#26302b]' : 'text-[#668976] hover:bg-white/70'
                  }`}
                >
                  {user.label}
                </button>
              ))}
            </section>

            <section className="mt-7">
              <h3 className="border-b border-black/[0.12] pb-3 text-[18px] font-semibold">Filter by event type</h3>
              <button
                type="button"
                onClick={() => {
                  setActionFilter('')
                  setPage(1)
                }}
                className={`block w-full border-b border-black/[0.10] px-3 py-3 text-left text-[12px] ${
                  actionFilter === '' ? 'font-semibold text-[#26302b]' : 'text-[#668976] hover:bg-white/70'
                }`}
              >
                Wszystkie zdarzenia
              </button>
              <div className="max-h-[420px] overflow-y-auto">
                {actions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => {
                      setActionFilter(action)
                      setPage(1)
                    }}
                    className={`block w-full border-b border-black/[0.10] px-3 py-3 text-left text-[12px] ${
                      actionFilter === action ? 'font-semibold text-[#26302b]' : 'text-[#668976] hover:bg-white/70'
                    }`}
                  >
                    {getMeta(action).label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  )
}
