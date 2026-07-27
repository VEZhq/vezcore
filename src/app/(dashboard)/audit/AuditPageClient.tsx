'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Keyboard,
  KeyRound,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react'
import { useConfirm } from '@/components/ConfirmDialog'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { getAuditLogs, getAuditLogActions, type AuditLog } from '@/lib/actions/audit'
import { MobileNav } from '@/components/MobileNav'
import { AuditLogSkeleton } from '@/components/skeletons'

const actionMeta: Record<string, { label: string; tone: string; icon: LucideIcon; severity: 'ok' | 'warn' | 'critical' | 'info' }> = {
  login: { label: 'Logowanie', tone: 'text-emerald-400 light:text-emerald-600 bg-emerald-500/10 border-emerald-500/20', icon: LogIn, severity: 'ok' },
  logout: { label: 'Wylogowanie', tone: 'text-[#aaaaaa] light:text-[#666666] bg-white/[0.03] border-white/[0.07] light:bg-black/[0.03] light:border-black/[0.08]', icon: LogOut, severity: 'info' },
  failed_login: { label: 'Nieudane logowanie', tone: 'text-red-300 light:text-red-700 bg-red-500/10 border-red-500/25', icon: AlertTriangle, severity: 'critical' },
  ip_blocked: { label: 'Blokada IP', tone: 'text-red-300 light:text-red-700 bg-red-500/10 border-red-500/25', icon: AlertTriangle, severity: 'critical' },
  password_change: { label: 'Zmiana hasła', tone: 'text-amber-300 light:text-amber-700 bg-amber-500/10 border-amber-500/25', icon: KeyRound, severity: 'warn' },
  email_change: { label: 'Zmiana emaila', tone: 'text-amber-300 light:text-amber-700 bg-amber-500/10 border-amber-500/25', icon: User, severity: 'warn' },
  profile_update: { label: 'Aktualizacja profilu', tone: 'text-blue-300 light:text-blue-700 bg-blue-500/10 border-blue-500/25', icon: User, severity: 'info' },
  avatar_upload: { label: 'Avatar dodany', tone: 'text-blue-300 light:text-blue-700 bg-blue-500/10 border-blue-500/25', icon: User, severity: 'info' },
  avatar_remove: { label: 'Avatar usunięty', tone: 'text-blue-300 light:text-blue-700 bg-blue-500/10 border-blue-500/25', icon: User, severity: 'info' },
  '2fa_enable': { label: '2FA włączone', tone: 'text-emerald-400 light:text-emerald-600 bg-emerald-500/10 border-emerald-500/20', icon: ShieldCheck, severity: 'ok' },
  '2fa_disable': { label: '2FA wyłączone', tone: 'text-orange-300 light:text-orange-700 bg-orange-500/10 border-orange-500/25', icon: AlertTriangle, severity: 'warn' },
  '2fa_verify': { label: '2FA potwierdzone', tone: 'text-blue-300 light:text-blue-700 bg-blue-500/10 border-blue-500/25', icon: Shield, severity: 'ok' },
  '2fa_failed': { label: 'Błąd 2FA', tone: 'text-red-300 light:text-red-700 bg-red-500/10 border-red-500/25', icon: AlertTriangle, severity: 'critical' },
  user_create: { label: 'Konto utworzone', tone: 'text-emerald-400 light:text-emerald-600 bg-emerald-500/10 border-emerald-500/20', icon: Users, severity: 'ok' },
  user_update: { label: 'Konto zmienione', tone: 'text-blue-300 light:text-blue-700 bg-blue-500/10 border-blue-500/25', icon: Users, severity: 'info' },
  user_delete: { label: 'Konto usunięte', tone: 'text-red-300 light:text-red-700 bg-red-500/10 border-red-500/25', icon: Users, severity: 'critical' },
  user_deactivate: { label: 'Konto wyłączone', tone: 'text-orange-300 light:text-orange-700 bg-orange-500/10 border-orange-500/25', icon: Users, severity: 'warn' },
  user_activate: { label: 'Konto aktywowane', tone: 'text-emerald-400 light:text-emerald-600 bg-emerald-500/10 border-emerald-500/20', icon: Users, severity: 'ok' },
  session_revoke: { label: 'Sesja wycofana', tone: 'text-amber-300 light:text-amber-700 bg-amber-500/10 border-amber-500/25', icon: KeyRound, severity: 'warn' },
  all_sessions_revoked: { label: 'Sesje wycofane', tone: 'text-amber-300 light:text-amber-700 bg-amber-500/10 border-amber-500/25', icon: KeyRound, severity: 'warn' },
  permission_grant: { label: 'Uprawnienie nadane', tone: 'text-emerald-400 light:text-emerald-600 bg-emerald-500/10 border-emerald-500/20', icon: ShieldCheck, severity: 'ok' },
  permission_revoke: { label: 'Uprawnienie cofnięte', tone: 'text-orange-300 light:text-orange-700 bg-orange-500/10 border-orange-500/25', icon: Shield, severity: 'warn' },
}

const defaultActionMeta = {
  label: 'Zdarzenie systemowe',
  tone: 'text-[#aaaaaa] light:text-[#666666] bg-white/[0.03] border-white/[0.07] light:bg-black/[0.03] light:border-black/[0.08]',
  icon: Clock,
  severity: 'info' as const,
}

interface AuditPageClientProps {
  canAccessKonta: boolean
  canAccessSettings: boolean
}

function getMeta(action: string) {
  return actionMeta[action] || { ...defaultActionMeta, label: action }
}

function formatDetailValue(value: unknown) {
  if (value === null || value === undefined) return 'brak'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon?: LucideIcon
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-xs transition-colors ${
        active
          ? 'border-white/[0.12] bg-white/[0.06] text-white light:border-black/[0.12] light:bg-black/[0.05] light:text-black'
          : 'border-white/[0.07] text-[#888888] hover:text-white light:border-black/[0.08] light:text-[#666666] light:hover:text-black'
      }`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </Link>
  )
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'text-emerald-400 light:text-emerald-600',
}: {
  label: string
  value: string | number
  helper: string
  icon: LucideIcon
  tone?: string
}) {
  return (
    <div className="rounded-md border border-white/[0.07] bg-[#0d0d0d]/85 p-4 light:border-black/[0.08] light:bg-white/90">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#777777] light:text-[#888888]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white light:text-black">{value}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.03] light:border-black/[0.08] light:bg-black/[0.03]">
          <Icon className={`h-4 w-4 ${tone}`} />
        </div>
      </div>
      <p className="mt-3 text-xs text-[#777777] light:text-[#777777]">{helper}</p>
    </div>
  )
}

function ShortcutCard({ label, keys }: { label: string; keys: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-white/[0.03] px-3 py-2 light:bg-black/[0.03]">
      <span className="text-xs text-[#888888] light:text-[#666666]">{label}</span>
      <kbd className="rounded border border-white/[0.1] bg-white/[0.04] px-2 py-1 text-[10px] text-white light:border-black/[0.1] light:bg-black/[0.04] light:text-black">
        {keys}
      </kbd>
    </div>
  )
}

export default function AuditPageClient({ canAccessKonta, canAccessSettings }: AuditPageClientProps) {
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
  const hasFilters = Boolean(search || actionFilter || startDate || endDate)

  const criticalCount = useMemo(
    () => logs.filter(log => getMeta(log.action).severity === 'critical').length,
    [logs]
  )
  const warningCount = useMemo(
    () => logs.filter(log => getMeta(log.action).severity === 'warn').length,
    [logs]
  )
  const uniqueUsers = useMemo(
    () => new Set(logs.map(log => log.user_email || log.user_id || 'system')).size,
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
  }, [actionFilter, startDate, endDate, search, page])

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
    // Initial and filter-driven sync with the server-side audit source.
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
  }, [search, actionFilter, startDate, endDate, page, router])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Brak daty'
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

  return (
    <div className="min-h-screen bg-[#080808] light:bg-[#f6f6f6] transition-colors duration-300">
      <MobileNav currentPath="/audit" showKonta={canAccessKonta} showAudit showSettings={canAccessSettings} />

      <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:py-10">
        <header className="mb-6 flex flex-col gap-5 border-b border-white/[0.07] pb-5 light:border-black/[0.08] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Image
              src="/logo/vezcore_logo_white_full.svg"
              alt="vezCore"
              width={178}
              height={52}
              className="h-auto w-[178px] max-w-[60vw] opacity-85 light:hidden"
              priority
            />
            <Image
              src="/logo/vezcore_logo_black_full.svg"
              alt="vezCore"
              width={178}
              height={52}
              className="hidden h-auto w-[178px] max-w-[60vw] opacity-85 light:block"
              priority
            />
            <p className="mt-4 text-[10px] uppercase tracking-[0.26em] text-[#666666] light:text-[#888888]">
              Bezpieczeństwo
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white light:text-black">
              Audit Log
            </h1>
          </div>

          <nav className="flex flex-wrap gap-2">
            <NavLink href="/dashboard" label="Dashboard" icon={ArrowLeft} />
            <NavLink href="/profile" label="Profil" icon={User} />
            {canAccessKonta && <NavLink href="/konta" label="Konta" icon={Users} />}
            <NavLink href="/audit" label="Audit Log" icon={ShieldCheck} active />
            {canAccessSettings && <NavLink href="/settings" label="Ustawienia" icon={Settings} />}
          </nav>
        </header>

        <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Zdarzenia" value={total} helper="Wynik dla aktualnych filtrów" icon={ShieldCheck} />
          <MetricCard label="Na stronie" value={logs.length} helper={`Strona ${page}${totalPages > 0 ? ` z ${totalPages}` : ''}`} icon={Clock} />
          <MetricCard label="Użytkownicy" value={uniqueUsers} helper="Unikalni autorzy na tej stronie" icon={Users} tone="text-blue-300 light:text-blue-700" />
          <MetricCard label="Uwaga" value={criticalCount + warningCount} helper={`${criticalCount} krytyczne, ${warningCount} ostrzegawcze`} icon={AlertTriangle} tone={criticalCount > 0 ? 'text-red-300 light:text-red-700' : 'text-amber-300 light:text-amber-700'} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <main className="space-y-5">
            <section className="rounded-md border border-white/[0.07] bg-[#0d0d0d]/85 light:border-black/[0.08] light:bg-white/90">
              <div className="border-b border-white/[0.06] p-4 light:border-black/[0.06]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white light:text-black">Zdarzenia systemowe</p>
                    <p className="mt-1 text-xs text-[#777777] light:text-[#777777]">
                      Najnowsze logowania, zmiany uprawnień, 2FA, sesje i zdarzenia administracyjne.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative min-w-0 sm:w-[320px]">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666666] light:text-[#888888]" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={search}
                        onChange={(event) => {
                          setSearch(event.target.value)
                          setPage(1)
                        }}
                        placeholder="Szukaj akcji lub obiektu"
                        className="h-10 w-full rounded-md border border-white/[0.07] bg-white/[0.03] pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-[#666666] focus:border-emerald-500/45 light:border-black/[0.08] light:bg-black/[0.03] light:text-black light:placeholder:text-[#999999]"
                      />
                    </div>
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-xs transition-colors ${
                        showFilters || hasFilters
                          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300 light:text-emerald-700'
                          : 'border-white/[0.07] text-[#999999] hover:text-white light:border-black/[0.08] light:text-[#666666] light:hover:text-black'
                      }`}
                    >
                      <Filter className="h-4 w-4" />
                      Filtry
                      {hasFilters && <span className="h-2 w-2 rounded-full bg-emerald-400 light:bg-emerald-600" />}
                    </button>
                    <button
                      onClick={() => void fetchLogs()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/[0.07] px-3 text-xs text-[#999999] transition-colors hover:text-white light:border-black/[0.08] light:text-[#666666] light:hover:text-black"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Odśwież
                    </button>
                  </div>
                </div>
              </div>

              {showFilters && (
                <div className="border-b border-white/[0.06] bg-white/[0.025] p-4 light:border-black/[0.06] light:bg-black/[0.025]">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_1fr_1fr_auto] md:items-end">
                    <label className="block">
                      <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-[#777777]">Akcja</span>
                      <select
                        value={actionFilter}
                        onChange={(event) => {
                          setActionFilter(event.target.value)
                          setPage(1)
                        }}
                        className="h-10 w-full rounded-md border border-white/[0.07] bg-[#0d0d0d] px-3 text-sm text-white outline-none focus:border-emerald-500/45 light:border-black/[0.08] light:bg-white light:text-black"
                      >
                        <option value="">Wszystkie akcje</option>
                        {actions.map(action => (
                          <option key={action} value={action}>{getMeta(action).label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-[#777777]">Od daty</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(event) => {
                          setStartDate(event.target.value)
                          setPage(1)
                        }}
                        className="h-10 w-full rounded-md border border-white/[0.07] bg-[#0d0d0d] px-3 text-sm text-white outline-none focus:border-emerald-500/45 light:border-black/[0.08] light:bg-white light:text-black"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-[#777777]">Do daty</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(event) => {
                          setEndDate(event.target.value)
                          setPage(1)
                        }}
                        className="h-10 w-full rounded-md border border-white/[0.07] bg-[#0d0d0d] px-3 text-sm text-white outline-none focus:border-emerald-500/45 light:border-black/[0.08] light:bg-white light:text-black"
                      />
                    </label>

                    {hasFilters && (
                      <button
                        onClick={() => void clearFilters()}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-500/25 bg-red-500/10 px-3 text-xs text-red-300 transition-colors hover:bg-red-500/15 light:text-red-700"
                      >
                        <X className="h-4 w-4" />
                        Wyczyść
                      </button>
                    )}
                  </div>
                </div>
              )}

              {loading ? (
                <AuditLogSkeleton count={5} />
              ) : fetchError ? (
                <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
                  <AlertTriangle className="h-8 w-8 text-red-300 light:text-red-700" />
                  <p className="mt-4 text-sm font-medium text-white light:text-black">Nie udało się pobrać logów</p>
                  <p className="mt-2 text-xs text-[#777777] light:text-[#777777]">{fetchError}</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
                  <CheckCircle className="h-8 w-8 text-[#777777] light:text-[#777777]" />
                  <p className="mt-4 text-sm font-medium text-white light:text-black">Brak zdarzeń</p>
                  <p className="mt-2 max-w-sm text-xs text-[#777777] light:text-[#777777]">
                    {hasFilters ? 'Nie ma wyników dla aktualnych filtrów.' : 'Aktywność systemu pojawi się tutaj automatycznie.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.06] light:divide-black/[0.06]">
                  {logs.map((log) => {
                    const meta = getMeta(log.action)
                    const Icon = meta.icon
                    const details = log.details ? Object.entries(log.details).slice(0, 6) : []

                    return (
                      <article
                        key={log.id}
                        className="grid gap-4 px-4 py-4 transition-colors hover:bg-white/[0.025] light:hover:bg-black/[0.025] lg:grid-cols-[44px_minmax(0,1fr)_180px]"
                      >
                        <div className={`flex h-11 w-11 items-center justify-center rounded-md border ${meta.tone}`}>
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${meta.tone}`}>
                              {meta.label}
                            </span>
                            <span className="font-mono text-xs text-[#888888] light:text-[#666666]">
                              {log.action}
                            </span>
                          </div>

                          <div className="mt-3 grid gap-2 text-xs text-[#888888] light:text-[#666666] sm:grid-cols-2">
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-[#666666] light:text-[#888888]">Użytkownik</p>
                              <p className="mt-1 truncate font-mono text-white light:text-black">{log.user_email || 'system'}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-[#666666] light:text-[#888888]">Obiekt</p>
                              <p className="mt-1 truncate font-mono text-white light:text-black">
                                {log.entity_type || 'system'}
                                {log.entity_id ? ` / ${log.entity_id.substring(0, 8)}` : ''}
                              </p>
                            </div>
                          </div>

                          {details.length > 0 && (
                            <div className="mt-4 grid gap-2 rounded-md border border-white/[0.05] bg-white/[0.025] p-3 light:border-black/[0.06] light:bg-black/[0.025] sm:grid-cols-2 xl:grid-cols-3">
                              {details.map(([key, value]) => (
                                <div key={key} className="min-w-0">
                                  <p className="text-[9px] uppercase tracking-[0.16em] text-[#666666] light:text-[#888888]">{key}</p>
                                  <p className="mt-1 truncate font-mono text-[11px] text-[#aaaaaa] light:text-[#555555]">
                                    {formatDetailValue(value)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-start justify-between gap-3 lg:justify-end">
                          <div className="lg:text-right">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-[#666666] light:text-[#888888]">Czas</p>
                            <p className="mt-1 font-mono text-xs text-[#aaaaaa] light:text-[#555555]">
                              {formatDate(log.created_at)}
                            </p>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            {totalPages > 1 && (
              <div className="flex flex-col gap-3 rounded-md border border-white/[0.07] bg-[#0d0d0d]/85 p-3 light:border-black/[0.08] light:bg-white/90 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[#777777] light:text-[#777777]">
                  Wyświetlane {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} z {total} logów
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setPage(current => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-white/[0.07] px-3 text-xs text-[#999999] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40 light:border-black/[0.08] light:text-[#666666] light:hover:text-black"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Poprzednia
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = index + 1
                      } else if (page <= 3) {
                        pageNum = index + 1
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + index
                      } else {
                        pageNum = page - 2 + index
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`h-9 w-9 rounded-md text-xs transition-colors ${
                            page === pageNum
                              ? 'bg-white/[0.08] text-white light:bg-black/[0.08] light:text-black'
                              : 'text-[#999999] hover:bg-white/[0.03] hover:text-white light:text-[#666666] light:hover:bg-black/[0.03] light:hover:text-black'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                    disabled={page === totalPages}
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-white/[0.07] px-3 text-xs text-[#999999] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40 light:border-black/[0.08] light:text-[#666666] light:hover:text-black"
                  >
                    Następna
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </main>

          <aside className="space-y-5">
            <section className="rounded-md border border-white/[0.07] bg-[#0d0d0d]/85 p-5 light:border-black/[0.08] light:bg-white/90">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white light:text-black">Filtry aktywne</p>
                  <p className="mt-1 text-xs text-[#777777] light:text-[#777777]">
                    Zakres widoku logów
                  </p>
                </div>
                <span className={`h-2.5 w-2.5 rounded-full ${hasFilters ? 'bg-emerald-400 light:bg-emerald-600' : 'bg-[#444444] light:bg-[#b5b5b5]'}`} />
              </div>
              <div className="mt-4 space-y-2">
                <div className="rounded-md bg-white/[0.03] p-3 light:bg-black/[0.03]">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#777777]">Akcja</p>
                  <p className="mt-1 truncate text-sm text-white light:text-black">
                    {actionFilter ? getMeta(actionFilter).label : 'Wszystkie'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-white/[0.03] p-3 light:bg-black/[0.03]">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#777777]">Od</p>
                    <p className="mt-1 text-sm text-white light:text-black">{startDate || 'brak'}</p>
                  </div>
                  <div className="rounded-md bg-white/[0.03] p-3 light:bg-black/[0.03]">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#777777]">Do</p>
                    <p className="mt-1 text-sm text-white light:text-black">{endDate || 'brak'}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-md border border-white/[0.07] bg-[#0d0d0d]/85 p-5 light:border-black/[0.08] light:bg-white/90">
              <p className="text-sm font-medium text-white light:text-black">Szybkie akcje</p>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => void fetchLogs()}
                  className="flex w-full items-center justify-between rounded-md border border-white/[0.07] px-3 py-3 text-left text-sm text-white transition-colors hover:bg-white/[0.03] light:border-black/[0.08] light:text-black light:hover:bg-black/[0.03]"
                >
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-emerald-400 light:text-emerald-600" />
                    Odśwież logi
                  </span>
                  <span className="text-xs text-[#777777]">⌘R</span>
                </button>
                <button
                  onClick={() => setShowShortcuts(!showShortcuts)}
                  className="flex w-full items-center justify-between rounded-md border border-white/[0.07] px-3 py-3 text-left text-sm text-white transition-colors hover:bg-white/[0.03] light:border-black/[0.08] light:text-black light:hover:bg-black/[0.03]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Keyboard className="h-4 w-4 text-blue-300 light:text-blue-700" />
                    Skróty
                  </span>
                  <span className="text-xs text-[#777777]">{showShortcuts ? 'ukryj' : 'pokaż'}</span>
                </button>
              </div>
            </section>

            {showShortcuts && (
              <section className="rounded-md border border-white/[0.07] bg-[#0d0d0d]/85 p-5 light:border-black/[0.08] light:bg-white/90">
                <p className="text-sm font-medium text-white light:text-black">Skróty klawiszowe</p>
                <div className="mt-4 space-y-2">
                  <ShortcutCard label="Szukaj" keys="⌘K" />
                  <ShortcutCard label="Odśwież" keys="⌘R" />
                  <ShortcutCard label="Dashboard" keys="⌘⇧D" />
                  <ShortcutCard label="Profil" keys="⌘⇧P" />
                  <ShortcutCard label="Motyw" keys="⌘⇧T" />
                  {canAccessSettings && <ShortcutCard label="Ustawienia" keys="⌘⇧S" />}
                  <ShortcutCard label="Anuluj" keys="Esc" />
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
