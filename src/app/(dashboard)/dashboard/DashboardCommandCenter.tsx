'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Activity,
  CalendarDays,
  Command,
  FileText,
  History,
  Layers3,
  LogIn,
  Search,
  Shield,
  StickyNote,
  User,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SearchResult } from '@/lib/search/types'
import { getRecentPagesStorageKey, type RecentDashboardPage } from '@/components/DashboardVisitTracker'

type DashboardAccess = {
  canAccessKonta: boolean
  canAccessAudit: boolean
  canAccessSettings: boolean
  canAccessInfrastructure: boolean
  canAccessVezVision: boolean
  canViewVezVisionBlog: boolean
  canViewVezVisionPortfolio: boolean
  canViewVezVisionServices: boolean
  canViewVezVisionFaq: boolean
  canViewVezVisionNewsletter: boolean
  canViewVezVisionFiles: boolean
  canViewVezVisionSettings: boolean
  canViewVezVisionCalendar: boolean
  role: string | null
}

type DashboardUser = {
  id: string
  email?: string
  lastSignInAt?: string
}

type ActionItem = {
  id: string
  title: string
  subtitle: string
  href: string
  icon: LucideIcon
  keywords: string[]
}

type CommandItem = ActionItem | (SearchResult & { icon: LucideIcon; keywords?: string[] })

const noteLimit = 160

function isAdminRole(role: string | null) {
  return role === 'admin' || role === 'super_admin'
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return 'Brak danych'
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatToday() {
  return new Intl.DateTimeFormat('pl-PL', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date())
}

function matchesAction(action: ActionItem, query: string) {
  const normalized = query.toLowerCase()
  return [action.title, action.subtitle, ...action.keywords].some((value) => value.toLowerCase().includes(normalized))
}

function getRecentLabel(href: string) {
  if (href === '/dashboard') return 'Dashboard'
  if (href === '/profile') return 'Profil'
  if (href === '/konta') return 'Konta'
  if (href.startsWith('/konta/')) return 'Konto użytkownika'
  if (href === '/audit') return 'Audit Log'
  if (href === '/settings') return 'Ustawienia'
  if (href === '/security') return 'Bezpieczeństwo'
  if (href === '/vezvision') return 'VEZvision'
  if (href.startsWith('/vezvision/blog')) return 'VEZvision Blog'
  if (href.startsWith('/vezvision/portfolio')) return 'VEZvision Portfolio'
  if (href.startsWith('/vezvision/services')) return 'VEZvision Usługi'
  if (href.startsWith('/vezvision/faq')) return 'VEZvision FAQ'
  if (href.startsWith('/vezvision/newsletter')) return 'VEZvision Newsletter'
  if (href.startsWith('/vezvision/files')) return 'VEZvision Pliki'
  if (href.startsWith('/vezvision/settings')) return 'VEZvision Ustawienia'
  if (href.startsWith('/vezvision/calendar')) return 'VEZvision Kalendarz'
  return href
}

function canShowRecent(href: string, access: DashboardAccess) {
  if (href === '/dashboard' || href === '/profile') return true
  if (href.startsWith('/konta')) return access.canAccessKonta
  if (href === '/audit') return access.canAccessAudit
  if (href.startsWith('/settings')) return access.canAccessSettings
  if (href === '/security') return isAdminRole(access.role)
  if (href === '/vezvision') return access.canAccessVezVision
  if (href.startsWith('/vezvision/blog')) return access.canViewVezVisionBlog
  if (href.startsWith('/vezvision/portfolio')) return access.canViewVezVisionPortfolio
  if (href.startsWith('/vezvision/services')) return access.canViewVezVisionServices
  if (href.startsWith('/vezvision/faq')) return access.canViewVezVisionFaq
  if (href.startsWith('/vezvision/newsletter')) return access.canViewVezVisionNewsletter
  if (href.startsWith('/vezvision/files')) return access.canViewVezVisionFiles
  if (href.startsWith('/vezvision/settings')) return access.canViewVezVisionSettings
  if (href.startsWith('/vezvision/calendar')) return access.canViewVezVisionCalendar
  return false
}

function buildActions(access: DashboardAccess): ActionItem[] {
  return [
    { id: 'dashboard', title: 'Dashboard', subtitle: 'Centrum VEZcore', href: '/dashboard', icon: Layers3, keywords: ['home', 'start', 'centrum'] },
    { id: 'profile', title: 'Profil', subtitle: 'Konto i sesja', href: '/profile', icon: User, keywords: ['konto', 'sesja', 'hasło'] },
    ...(access.canAccessKonta ? [
      { id: 'konta', title: 'Konta', subtitle: 'Użytkownicy i pozwolenia', href: '/konta', icon: Users, keywords: ['użytkownicy', 'permissions', 'pozwolenia'] },
    ] : []),
    ...(access.canAccessAudit ? [
      { id: 'audit', title: 'Audit Log', subtitle: 'Zdarzenia i aktywność', href: '/audit', icon: Activity, keywords: ['logi', 'aktywność', 'zdarzenia'] },
    ] : []),
    ...(access.canAccessSettings ? [
      { id: 'settings', title: 'Ustawienia', subtitle: 'Konfiguracja VEZcore', href: '/settings', icon: Shield, keywords: ['konfiguracja', 'settings'] },
    ] : []),
    ...(access.canAccessInfrastructure ? [
      { id: 'infra', title: 'Infrastruktura', subtitle: 'Hetzner, Labs, Monitor', href: '/dashboard#infrastructure', icon: Activity, keywords: ['hetzner', 'labs', 'monitor', 'ssh'] },
    ] : []),
    ...(isAdminRole(access.role) ? [
      { id: 'security', title: 'Bezpieczeństwo', subtitle: 'Alerty i listy IP', href: '/security', icon: Shield, keywords: ['security', 'alerty', 'ip'] },
    ] : []),
    ...(access.canAccessVezVision ? [
      { id: 'vezvision', title: 'VEZvision', subtitle: 'Panel główny', href: '/vezvision', icon: Layers3, keywords: ['cms', 'vezvision'] },
    ] : []),
    ...(access.canViewVezVisionBlog ? [
      { id: 'vv-blog', title: 'VEZvision Blog', subtitle: 'Posty i publikacje', href: '/vezvision/blog', icon: FileText, keywords: ['blog', 'posty'] },
    ] : []),
    ...(access.canViewVezVisionFiles ? [
      { id: 'vv-files', title: 'VEZvision Pliki', subtitle: 'Biblioteka plików', href: '/vezvision/files', icon: FileText, keywords: ['pliki', 'media'] },
    ] : []),
  ]
}

function resultIcon(type: SearchResult['type']) {
  if (type === 'user') return Users
  if (type === 'log') return Activity
  return Search
}

export function DashboardCommandCenter({
  access,
  user,
}: {
  access: DashboardAccess
  user: DashboardUser
}) {
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [apiResults, setApiResults] = useState<SearchResult[]>([])
  const [recentPages, setRecentPages] = useState<RecentDashboardPage[]>([])
  const [note, setNote] = useState('')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const actions = useMemo(() => buildActions(access), [access])
  const localMatches = useMemo(
    () => query.trim().length < 2 ? actions.slice(0, 6) : actions.filter((action) => matchesAction(action, query)).slice(0, 6),
    [actions, query]
  )
  const commandItems: CommandItem[] = useMemo(() => {
    const seen = new Set(localMatches.map((item) => item.href))
    const remoteResults = query.trim().length < 2 ? [] : apiResults
    const remote = remoteResults
      .filter((result) => !seen.has(result.href))
      .map((result) => ({ ...result, icon: resultIcon(result.type) }))

    return [...localMatches, ...remote].slice(0, 10)
  }, [apiResults, localMatches, query])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const modifier = isMac ? event.metaKey : event.ctrlKey
      if (modifier && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
        window.setTimeout(() => searchInputRef.current?.focus(), 0)
      }

      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const safeQuery = query.trim()
    if (safeQuery.length < 2) {
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(safeQuery)}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
        .then((response) => response.ok ? response.json() : [])
        .then((results: SearchResult[]) => setApiResults(Array.isArray(results) ? results : []))
        .catch(() => setApiResults([]))
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [query])

  useEffect(() => {
    let cancelled = false

    const timeout = window.setTimeout(() => {
      if (cancelled) return

      try {
        const storedRecent = window.localStorage.getItem(getRecentPagesStorageKey(user.id))
        setRecentPages(storedRecent ? JSON.parse(storedRecent) as RecentDashboardPage[] : [])

        const noteKey = `vezcore-dashboard-note:${user.id}`
        const storedNote = window.localStorage.getItem(noteKey)
        if (storedNote) {
          const parsed = JSON.parse(storedNote) as { body?: string; updatedAt?: string }
          setNote(parsed.body ?? '')
          setLastUpdated(parsed.updatedAt ?? null)
        }
      } catch {
        setRecentPages([])
      }
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [user.id])

  const allowedRecentPages = recentPages
    .filter((page) => canShowRecent(page.href, access))
    .filter((page, index, pages) => pages.findIndex((item) => item.href === page.href) === index)
    .slice(0, 4)

  const primaryActions = actions
    .filter((action) => ['vezvision', 'infra', 'audit', 'konta', 'settings', 'profile'].includes(action.id))
    .slice(0, 4)

  const openItem = (href: string) => {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  const saveNote = (value: string) => {
    const next = value.slice(0, noteLimit)
    const updatedAt = new Date().toISOString()
    setNote(next)
    setLastUpdated(updatedAt)

    try {
      window.localStorage.setItem(
        `vezcore-dashboard-note:${user.id}`,
        JSON.stringify({ body: next, updatedAt })
      )
    } catch {
      // localStorage can be unavailable in restricted browser contexts.
    }
  }

  return (
    <aside className="w-full space-y-3 xl:sticky xl:top-8">
      <section className="relative border border-white/[0.06] light:border-black/[0.08] bg-[#0b0b0b]/80 light:bg-white/90 p-4 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#777777] light:text-[#777777]">Operacje</p>
          <button
            type="button"
            onClick={() => {
              setOpen(true)
              window.setTimeout(() => searchInputRef.current?.focus(), 0)
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.06] light:border-black/[0.08] text-[#777777] light:text-[#777777] hover:text-white light:hover:text-black"
            aria-label="Otwórz command palette"
          >
            <Command className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-white/[0.06] light:border-black/[0.08] bg-black/25 light:bg-black/[0.02] px-3">
          <Search className="h-4 w-4 shrink-0 text-[#555555] light:text-[#999999]" />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && commandItems[0]) {
                event.preventDefault()
                openItem(commandItems[0].href)
              }
            }}
            placeholder="Szukaj"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-white light:text-black placeholder:text-[#555555] light:placeholder:text-[#999999] focus:outline-none"
          />
        </div>

        {open && (
          <div className="absolute left-0 right-0 top-[116px] z-30 mx-4 border border-white/[0.08] light:border-black/[0.08] bg-[#070707] light:bg-white p-1.5 shadow-2xl">
            <div className="max-h-80 overflow-y-auto">
              {commandItems.length === 0 ? (
                <p className="px-2 py-3 text-xs text-[#666666] light:text-[#999999]">Brak wyników</p>
              ) : (
                commandItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={`${item.href}-${item.id}`}
                      type="button"
                      onClick={() => openItem(item.href)}
                      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-white/[0.05] light:hover:bg-black/[0.04]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.06] light:border-black/[0.08] bg-white/[0.02] light:bg-black/[0.02]">
                        <Icon className="h-4 w-4 text-emerald-400 light:text-emerald-600" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-white light:text-black">{item.title}</span>
                        <span className="block truncate text-[11px] text-[#666666] light:text-[#999999]">{item.subtitle}</span>
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}

        {primaryActions.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {primaryActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/[0.06] light:border-black/[0.08] bg-white/[0.02] light:bg-black/[0.02] px-3 text-xs text-[#b5b5b5] light:text-[#444444] hover:border-emerald-400/25 light:hover:border-emerald-600/25 hover:text-white light:hover:text-black transition-colors"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-emerald-400 light:text-emerald-600" />
                  <span className="truncate">{action.title}</span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section className="border border-white/[0.06] light:border-black/[0.08] bg-[#0b0b0b]/70 light:bg-white/90 p-4 backdrop-blur-xl">
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#777777] light:text-[#777777]">Sesja</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Dzisiaj', value: formatToday(), icon: CalendarDays },
            { label: 'Login', value: formatShortDate(user.lastSignInAt), icon: LogIn },
            { label: 'Rola', value: access.role ?? 'user', icon: Shield },
            { label: 'Konto', value: user.email ?? 'konto', icon: User },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="min-w-0 rounded-md bg-white/[0.025] light:bg-black/[0.025] px-3 py-2">
                <p className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-[#555555] light:text-[#999999]">
                  <Icon className="h-3 w-3" />
                  {item.label}
                </p>
                <p className="mt-1 truncate text-xs text-white light:text-black">{item.value}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="border border-white/[0.06] light:border-black/[0.08] bg-[#0b0b0b]/70 light:bg-white/90 p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#777777] light:text-[#777777]">
            <StickyNote className="h-3.5 w-3.5" />
            Notatka
          </p>
          <span className="shrink-0 text-[10px] text-[#555555] light:text-[#999999]">
            {lastUpdated && access.canAccessSettings ? formatShortDate(lastUpdated) : `${note.length}/${noteLimit}`}
          </span>
        </div>

        {access.canAccessSettings ? (
          <textarea
            value={note}
            onChange={(event) => saveNote(event.target.value)}
            maxLength={noteLimit}
            rows={3}
            placeholder="Krótki kontekst na teraz"
            className="mt-3 min-h-[92px] w-full resize-none rounded-md border border-white/[0.06] light:border-black/[0.08] bg-black/20 light:bg-black/[0.02] px-3 py-2 text-sm leading-relaxed text-white light:text-black placeholder:text-[#555555] light:placeholder:text-[#999999] focus:outline-none"
          />
        ) : (
          <p className="mt-3 text-sm text-[#666666] light:text-[#999999]">Brak dostępu do notatki operacyjnej.</p>
        )}
      </section>

      <section className="border border-white/[0.06] light:border-black/[0.08] bg-[#0b0b0b]/70 light:bg-white/90 p-4 backdrop-blur-xl">
        <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#777777] light:text-[#777777]">
          <History className="h-3.5 w-3.5" />
          Ostatnio
        </p>

        <div className="mt-3 grid gap-1.5">
          {allowedRecentPages.length === 0 ? (
            <p className="text-sm text-[#666666] light:text-[#999999]">Brak historii</p>
          ) : (
            allowedRecentPages.map((page) => (
              <Link
                key={`${page.href}-${page.visitedAt}`}
                href={page.href}
                className="flex min-h-8 items-center justify-between gap-3 rounded-md px-2 text-xs hover:bg-white/[0.04] light:hover:bg-black/[0.04]"
              >
                <span className="truncate text-white light:text-black">{getRecentLabel(page.href)}</span>
                <span className="shrink-0 text-[10px] text-[#555555] light:text-[#999999]">{formatShortDate(page.visitedAt)}</span>
              </Link>
            ))
          )}
        </div>
      </section>
    </aside>
  )
}
