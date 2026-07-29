'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
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
import { ThemeToggle } from '@/components/theme/ThemeToggle'
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

function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseIsoDate(value: string) {
  if (!value) return null
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatFilterDate(value: string) {
  const date = parseIsoDate(value)
  return date
    ? new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
    : 'Wybierz datę'
}

function DateRangeFilter({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: {
  startDate: string
  endDate: string
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [activeField, setActiveField] = useState<'start' | 'end' | null>(null)
  const [visibleMonth, setVisibleMonth] = useState(() => new Date())

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setActiveField(null)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  const openCalendar = (field: 'start' | 'end') => {
    const selected = parseIsoDate(field === 'start' ? startDate : endDate)
    setVisibleMonth(selected ?? new Date())
    setActiveField((current) => current === field ? null : field)
  }

  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
  const gridStart = new Date(firstDay)
  gridStart.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7))
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return date
  })
  const selectedValue = activeField === 'start' ? startDate : endDate
  const today = toIsoDate(new Date())

  const selectDate = (date: Date) => {
    const value = toIsoDate(date)
    if (activeField === 'start') {
      onStartChange(value)
      if (endDate && value > endDate) onEndChange(value)
    } else if (activeField === 'end') {
      onEndChange(value)
      if (startDate && value < startDate) onStartChange(value)
    }
    setActiveField(null)
  }

  const applyPreset = (daysBack: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - daysBack)
    onStartChange(toIsoDate(start))
    onEndChange(toIsoDate(end))
    setActiveField(null)
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="grid grid-cols-3 gap-1.5">
        {[
          ['Dzisiaj', 0],
          ['7 dni', 6],
          ['30 dni', 29],
        ].map(([label, days]) => (
          <button
            key={label}
            type="button"
            onClick={() => applyPreset(Number(days))}
            className="h-8 border border-black/[0.08] bg-white text-[10px] text-[#68706d] transition-colors hover:border-[#789483]/45 hover:text-[#35423b] dark:border-white/[0.09] dark:bg-white/[0.045] dark:text-[#a0a6a3] dark:hover:border-[#789483] dark:hover:text-white"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {([
          ['start', 'Od', startDate],
          ['end', 'Do', endDate],
        ] as const).map(([field, label, value]) => (
          <button
            key={field}
            type="button"
            onClick={() => openCalendar(field)}
            className={`flex min-w-0 items-center gap-2 border bg-white px-2.5 py-2 text-left transition-colors dark:bg-[#121413] ${
              activeField === field ? 'border-[#789483]' : 'border-black/[0.12] hover:border-black/[0.22] dark:border-white/[0.11] dark:hover:border-white/[0.24]'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#789483]" />
            <span className="min-w-0">
              <span className="block text-[8px] uppercase text-[#979d9a]">{label}</span>
              <span className="block truncate text-[10px] font-medium text-[#3d4340] dark:text-[#d7dad8]">{formatFilterDate(value)}</span>
            </span>
          </button>
        ))}
      </div>

      {activeField && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 border border-black/[0.12] bg-white p-3 shadow-[0_18px_45px_rgba(29,36,32,0.16)] dark:border-white/[0.1] dark:bg-[#131614] dark:shadow-[0_18px_45px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
              className="flex h-8 w-8 items-center justify-center text-[#717976] hover:bg-[#f2f4f3] dark:text-[#a0a6a3] dark:hover:bg-white/[0.07]"
              aria-label="Poprzedni miesiąc"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-[11px] font-semibold capitalize">
                {new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' }).format(visibleMonth)}
              </p>
              <p className="text-[8px] text-[#979d9a]">{activeField === 'start' ? 'Data początkowa' : 'Data końcowa'}</p>
            </div>
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
              className="flex h-8 w-8 items-center justify-center text-[#717976] hover:bg-[#f2f4f3] dark:text-[#a0a6a3] dark:hover:bg-white/[0.07]"
              aria-label="Następny miesiąc"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 text-center text-[8px] font-medium uppercase text-[#9ba19f]">
            {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map((day) => (
              <span key={day} className="py-1">{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((date) => {
              const value = toIsoDate(date)
              const inMonth = date.getMonth() === visibleMonth.getMonth()
              const selected = value === selectedValue
              const inRange = startDate && endDate && value >= startDate && value <= endDate
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectDate(date)}
                  className={`relative h-8 text-[10px] transition-colors ${
                    selected
                      ? 'bg-[#627f6e] font-semibold text-white'
                      : inRange
                        ? 'bg-[#edf3ef] text-[#405449] hover:bg-[#e1ebe4]'
                        : inMonth
                          ? 'text-[#333936] hover:bg-[#f0f3f1] dark:text-[#d2d6d3] dark:hover:bg-white/[0.07]'
                          : 'text-[#c0c5c2] hover:bg-[#f6f7f6] dark:text-[#4f5652] dark:hover:bg-white/[0.035]'
                  } ${value === today && !selected ? 'font-semibold ring-1 ring-inset ring-[#8ca494]' : ''}`}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function EventTypeFilter({
  actions,
  value,
  onChange,
}: {
  actions: string[]
  value: string
  onChange: (value: string) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between border border-black/[0.12] bg-white px-3 text-left text-[11px] text-[#414744] hover:border-black/[0.22] dark:border-white/[0.11] dark:bg-[#121413] dark:text-[#d3d6d4] dark:hover:border-white/[0.24]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${value ? getMeta(value).dot : 'bg-[#a9afad]'}`} />
          <span className="truncate">{value ? getMeta(value).label : 'Wszystkie zdarzenia'}</span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-[#8d9491] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto border border-black/[0.12] bg-white py-1 shadow-[0_16px_38px_rgba(29,36,32,0.14)] dark:border-white/[0.1] dark:bg-[#131614] dark:shadow-[0_16px_38px_rgba(0,0,0,0.5)]">
          {[['', 'Wszystkie zdarzenia'], ...actions.map((action) => [action, getMeta(action).label])].map(([action, label]) => (
            <button
              key={action || 'all'}
              type="button"
              onClick={() => {
                onChange(action)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[10px] text-[#626966] hover:bg-[#f2f4f3] dark:text-[#aab0ad] dark:hover:bg-white/[0.07]"
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${action ? getMeta(action).dot : 'bg-[#a9afad]'}`} />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {value === action && <Check className="h-3.5 w-3.5 shrink-0 text-[#668976]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
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
    <div className="min-h-screen bg-white text-[#242725] dark:bg-[#070807] dark:text-[#eceeed] xl:h-screen xl:overflow-hidden">
      <MobileNav currentPath="/audit" showKonta={canAccessKonta} showAudit showSettings={canAccessSettings} />

      <div className="mx-auto grid min-h-screen w-full max-w-[1540px] xl:h-screen xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="min-w-0 px-5 py-8 sm:px-10 lg:px-14 xl:flex xl:min-h-0 xl:flex-col xl:overflow-hidden">
          <header className="flex shrink-0 items-end justify-between border-b border-black/[0.12] pb-7 dark:border-white/[0.1]">
            <div>
              <Link
                href="/dashboard"
                className="text-[10px] font-semibold uppercase text-[#68706d] hover:text-black dark:text-[#929895] dark:hover:text-white"
                title="Wróć do dashboardu"
              >
                Admin
              </Link>
              <h1 className="mt-1 text-[34px] font-semibold leading-none text-[#232624] dark:text-[#f1f2f1]">Audit Log</h1>
            </div>
            <ThemeToggle />
          </header>

          <section className="audit-log-scroll pt-8 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-4">
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
                            <span className="h-px flex-1 bg-black/[0.12] dark:bg-white/[0.1]" />
                            <span className="rounded-full border border-black/[0.14] bg-white px-3 py-1 text-[10px] font-semibold shadow-sm dark:border-white/[0.12] dark:bg-[#101211]">
                              {dateLabel}
                            </span>
                            <span className="h-px flex-1 bg-black/[0.12] dark:bg-white/[0.1]" />
                          </div>
                        </div>
                      )}

                      <article className="grid grid-cols-[72px_26px_minmax(0,1fr)] gap-3">
                        <time className="pt-[18px] text-right font-mono text-[11px] text-[#626966]">
                          {eventTime(log.created_at)}
                        </time>
                        <div className="relative flex justify-center">
                          <span className="absolute bottom-0 top-0 w-px bg-black/[0.12] dark:bg-white/[0.1]" />
                          <span className={`relative mt-[15px] flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white dark:ring-[#070807] ${meta.iconStyle}`}>
                            <Icon className="h-2.5 w-2.5" />
                          </span>
                        </div>
                        <div className="min-w-0 py-3 pb-7">
                          <p className="text-[13px] leading-6">
                            <strong className="font-semibold text-[#668976]">{log.user_email || 'system'}</strong>{' '}
                            <strong className="font-semibold text-[#292d2b] dark:text-[#e5e7e6]">{meta.label}</strong>
                            {log.entity_type && (
                              <span className="text-[#353a38] dark:text-[#c2c6c3]"> na {log.entity_type}</span>
                            )}
                          </p>
                          {(log.entity_id || details.length > 0) && (
                            <div className="mt-1 space-y-1 text-[11px] leading-5 text-[#555c59] dark:text-[#a0a6a3]">
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
              <div className="ml-[84px] mt-4 flex items-center justify-between border-t border-black/[0.10] py-5 dark:border-white/[0.09]">
                <span className="text-[10px] text-[#777e7b]">
                  {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} z {total}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="flex h-8 w-8 items-center justify-center border border-black/[0.12] text-[#646b68] disabled:opacity-30 dark:border-white/[0.1] dark:text-[#a3a9a6]"
                    aria-label="Poprzednia strona"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[10px]">{page} / {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page === totalPages}
                    className="flex h-8 w-8 items-center justify-center border border-black/[0.12] text-[#646b68] disabled:opacity-30 dark:border-white/[0.1] dark:text-[#a3a9a6]"
                    aria-label="Następna strona"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>

        <aside className="border-l border-black/[0.12] bg-[#f5f7f6] px-7 py-8 dark:border-white/[0.09] dark:bg-[#0b0c0b] xl:h-screen">
          <div>
            <div className="flex items-start justify-between">
              <h2 className="text-[28px] font-semibold leading-none">Filters</h2>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex h-8 w-8 items-center justify-center text-[#777e7b] hover:bg-white hover:text-[#b45656] dark:hover:bg-white/[0.07]"
                  aria-label="Wyczyść filtry"
                  title="Wyczyść filtry"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <section className="mt-7 border-t border-black/[0.10] pt-5 dark:border-white/[0.09]">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold">Filter by time</h3>
                  <p className="mt-0.5 text-[9px] text-[#929896]">Zakres aktualizuje oś automatycznie</p>
                </div>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('')
                      setEndDate('')
                      setPage(1)
                    }}
                    className="text-[9px] text-[#789483] hover:text-[#43564a]"
                  >
                    Wyczyść
                  </button>
                )}
              </div>
              <DateRangeFilter
                startDate={startDate}
                endDate={endDate}
                onStartChange={(value) => {
                  setStartDate(value)
                  setPage(1)
                }}
                onEndChange={(value) => {
                  setEndDate(value)
                  setPage(1)
                }}
              />
            </section>

            <section className="mt-7 border-t border-black/[0.10] pt-5 dark:border-white/[0.09]">
              <h3 className="text-[15px] font-semibold">Filter by users</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setUserFilter('')
                    setPage(1)
                  }}
                  className={`inline-flex h-8 items-center gap-1.5 border px-2.5 text-[10px] ${
                    userFilter === ''
                      ? 'border-[#789483]/45 bg-[#eaf0ec] font-medium text-[#43564a] dark:border-white/[0.16] dark:bg-white/[0.08] dark:text-[#eceeed]'
                      : 'border-black/[0.08] bg-white text-[#747b78] hover:border-black/[0.18] dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-[#a1a7a4] dark:hover:border-white/[0.2]'
                  }`}
                >
                  <Users className="h-3 w-3" />
                  Wszyscy
                </button>
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setUserFilter(user.id)
                      setPage(1)
                    }}
                    className={`inline-flex h-8 max-w-full items-center gap-1.5 border px-2.5 text-[10px] ${
                      userFilter === user.id
                        ? 'border-[#789483]/45 bg-[#eaf0ec] font-medium text-[#43564a] dark:border-white/[0.16] dark:bg-white/[0.08] dark:text-[#eceeed]'
                        : 'border-black/[0.08] bg-white text-[#747b78] hover:border-black/[0.18] dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-[#a1a7a4] dark:hover:border-white/[0.2]'
                    }`}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#edf1ef] text-[8px] font-semibold text-[#668976]">
                      {user.label.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate">{user.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-7 border-t border-black/[0.10] pt-5 dark:border-white/[0.09]">
              <h3 className="mb-3 text-[15px] font-semibold">Filter by event type</h3>
              <EventTypeFilter
                actions={actions}
                value={actionFilter}
                onChange={(value) => {
                  setActionFilter(value)
                  setPage(1)
                }}
              />
            </section>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-7 flex h-9 w-full items-center justify-center gap-2 border border-black/[0.10] bg-white text-[10px] text-[#626966] hover:border-[#b56b6b]/35 hover:text-[#a44f4f] dark:border-white/[0.1] dark:bg-white/[0.045] dark:text-[#a7adaa]"
              >
                <X className="h-3.5 w-3.5" />
                Wyczyść wszystkie filtry
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
