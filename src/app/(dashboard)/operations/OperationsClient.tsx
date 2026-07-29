'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Clipboard,
  Copy,
  DatabaseBackup,
  Eye,
  GitCommitHorizontal,
  Network,
  Play,
  Plus,
  ServerCog,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import {
  acknowledgeIncident,
  captureOperationsSnapshot,
  createMaintenanceWindow,
  markNotificationsRead,
  revealOperationsShortcut,
  updateMaintenanceStatus,
} from '@/lib/actions/operations'
import { setRolePreview } from '@/lib/actions/role-preview'
import type { OperationsOverview } from '@/lib/operations/types'
import type { SecurityAccountFinding } from '@/lib/operations/queries'

type Section = 'overview' | 'incidents' | 'deployments' | 'maintenance' | 'shortcuts' | 'snapshots' | 'security'

const sections: Array<{ id: Section; label: string; icon: typeof Activity }> = [
  { id: 'overview', label: 'Stan', icon: Activity },
  { id: 'incidents', label: 'Incydenty', icon: AlertTriangle },
  { id: 'deployments', label: 'Wdrożenia', icon: GitCommitHorizontal },
  { id: 'maintenance', label: 'Konserwacja', icon: Wrench },
  { id: 'shortcuts', label: 'Skróty', icon: ServerCog },
  { id: 'snapshots', label: 'Migawki', icon: DatabaseBackup },
  { id: 'security', label: 'Konta', icon: ShieldCheck },
]

const moduleLabels: Record<string, string> = {
  vez: 'VEZ',
  vezVision: 'VEZvision',
  vezLabs: 'VEZlabs',
  nably: 'Nably',
  vezWork: 'VEZwork',
  vezRent: 'VEZrent',
  vezStudio: 'VEZstudio',
  prodApi: 'Prod API',
  labApi: 'Lab API',
  database: 'Core DB',
  minio: 'MinIO',
  monitor: 'Monitor',
  vezcore: 'VEZcore',
}

function formatDate(value: string | null) {
  if (!value) return 'Brak daty'
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function relativeDuration(start: string, end: string | null) {
  const milliseconds = Math.max(0, new Date(end ?? Date.now()).getTime() - new Date(start).getTime())
  const minutes = Math.floor(milliseconds / 60_000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours} godz. ${minutes % 60} min`
  return `${Math.floor(hours / 24)} dni ${hours % 24} godz.`
}

function severityDot(severity: string) {
  if (severity === 'error') return 'bg-[#df6c65]'
  if (severity === 'warning') return 'bg-[#d4aa4f]'
  return 'bg-[#8c9691]'
}

function sectionFromQuery(value: string | null): Section {
  return sections.some((section) => section.id === value) ? value as Section : 'overview'
}

export default function OperationsClient({
  overview,
  securityReport,
  canManage,
  canPreviewRoles,
  canViewSecurityReport,
}: {
  overview: OperationsOverview
  securityReport: SecurityAccountFinding[]
  canManage: boolean
  canPreviewRoles: boolean
  canViewSecurityReport: boolean
}) {
  const router = useRouter()
  const params = useSearchParams()
  const { token } = useCSRFToken()
  const [section, setSection] = useState<Section>(() => sectionFromQuery(params.get('section')))
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [revealedAliases, setRevealedAliases] = useState<Record<string, string>>({})
  const [maintenanceFormOpen, setMaintenanceFormOpen] = useState(false)
  const [snapshotName, setSnapshotName] = useState('')

  const activeIncidents = overview.incidents.filter((incident) => incident.status !== 'resolved')
  const unreadNotifications = overview.notifications.filter((notification) => !notification.read)
  const impactedModules = useMemo(() => {
    const adjacency = new Map<string, string[]>()
    for (const dependency of overview.dependencies) {
      adjacency.set(dependency.parent_key, [...(adjacency.get(dependency.parent_key) ?? []), dependency.child_key])
    }
    const impacted = new Set<string>()
    const queue = activeIncidents.flatMap((incident) => [incident.service_key, incident.module_key])
    while (queue.length > 0) {
      const parent = queue.shift()
      if (!parent) continue
      for (const child of adjacency.get(parent) ?? []) {
        if (!impacted.has(child)) {
          impacted.add(child)
          queue.push(child)
        }
      }
    }
    return [...impacted]
  }, [activeIncidents, overview.dependencies])

  const changeSection = (next: Section) => {
    setSection(next)
    window.history.replaceState(null, '', `/operations?section=${next}`)
  }

  const run = async (key: string, task: () => Promise<{ success: true } | { error: string }>) => {
    if (!token) {
      setMessage('Token bezpieczeństwa nie jest jeszcze gotowy')
      return
    }
    setBusy(key)
    setMessage(null)
    const result = await task()
    if ('error' in result) setMessage(result.error)
    else router.refresh()
    setBusy(null)
  }

  const revealShortcut = async (id: string) => {
    if (!token) return
    setBusy(`shortcut:${id}`)
    const result = await revealOperationsShortcut(id, token)
    if ('error' in result) setMessage(result.error)
    else setRevealedAliases((current) => ({ ...current, [id]: result.data.alias }))
    setBusy(null)
  }

  const copyAlias = async (alias: string) => {
    await navigator.clipboard.writeText(alias)
    setMessage('Alias skopiowany')
  }

  const createMaintenance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return
    const form = new FormData(event.currentTarget)
    const start = new Date(String(form.get('start')))
    const end = new Date(String(form.get('end')))
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setMessage('Podaj prawidłowy zakres czasu')
      return
    }
    setBusy('maintenance:create')
    const result = await createMaintenanceWindow({
      moduleKey: String(form.get('module')) as 'vez',
      title: String(form.get('title')),
      reason: String(form.get('reason')),
      scheduledStart: start.toISOString(),
      scheduledEnd: end.toISOString(),
    }, token)
    if ('error' in result) setMessage(result.error)
    else {
      setMaintenanceFormOpen(false)
      router.refresh()
    }
    setBusy(null)
  }

  const createSnapshot = async () => {
    if (!token) return
    setBusy('snapshot:create')
    const result = await captureOperationsSnapshot(snapshotName, token)
    if ('error' in result) setMessage(result.error)
    else {
      setSnapshotName('')
      router.refresh()
    }
    setBusy(null)
  }

  const startPreview = async (role: 'client' | 'operator') => {
    if (!token) return
    setBusy(`preview:${role}`)
    const result = await setRolePreview(role, token)
    if ('error' in result) {
      setMessage(result.error)
      setBusy(null)
      return
    }
    window.location.assign('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#f4f4f2] text-[#242524] dark:bg-[#080908] dark:text-[#eceeec]">
      <header className="sticky top-0 z-40 border-b border-black/[0.08] bg-[#f8f8f6]/95 backdrop-blur dark:border-white/[0.09] dark:bg-[#0b0c0b]/95">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center px-4 sm:px-6">
          <Image src="/logo/vezcore_logo_black_full.svg" alt="VEZcore" width={104} height={42} className="h-auto w-[104px] dark:hidden" priority />
          <Image src="/logo/vezcore_logo_white_full.svg" alt="VEZcore" width={104} height={42} className="hidden h-auto w-[104px] dark:block" priority />
          <span className="mx-3 h-4 w-px bg-black/[0.09] dark:bg-white/[0.1]" />
          <span className="text-[10px] font-medium text-[#737875] dark:text-[#929895]">Centrum operacji</span>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <Link href="/dashboard" className="flex h-8 items-center gap-1.5 rounded-[7px] px-2.5 text-[10px] text-[#626764] hover:bg-black/[0.04] dark:text-[#abb0ad] dark:hover:bg-white/[0.06]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-48px)] max-w-[1400px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-black/[0.08] bg-[#eeeeeb]/65 px-3 py-5 dark:border-white/[0.08] dark:bg-[#0a0b0a] lg:border-b-0 lg:border-r">
          <div className="mb-4 px-2">
            <p className="text-[9px] uppercase text-[#8a8f8c]">Operations</p>
            <div className="mt-2 flex items-center gap-2 text-[10px]">
              <span className={`h-2 w-2 rounded-full ${activeIncidents.some((incident) => incident.severity === 'error') ? 'bg-[#df6c65]' : activeIncidents.length > 0 ? 'bg-[#d4aa4f]' : 'bg-[#5fb18b]'}`} />
              {activeIncidents.length === 0 ? 'System stabilny' : `${activeIncidents.length} aktywnych incydentów`}
            </div>
          </div>
          <nav className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1" aria-label="Centrum operacji">
            {sections
              .filter((item) => item.id !== 'security' || canViewSecurityReport)
              .map((item) => {
                const Icon = item.icon
                const active = section === item.id
                const badge = item.id === 'incidents'
                  ? activeIncidents.length
                  : item.id === 'overview'
                    ? unreadNotifications.length
                    : 0
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => changeSection(item.id)}
                    className={`flex h-10 items-center gap-2 rounded-[7px] px-2.5 text-left text-[10px] font-medium ${
                      active
                        ? 'bg-white text-[#242524] shadow-[0_1px_2px_rgba(20,20,20,0.05)] dark:bg-white/[0.08] dark:text-white'
                        : 'text-[#747975] hover:bg-white/60 dark:text-[#939995] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badge > 0 && <span className="min-w-5 rounded-full bg-[#e9e4d0] px-1.5 text-center text-[8px] text-[#665b31] dark:bg-[#5d5125]/45 dark:text-[#dfcf8e]">{badge}</span>}
                  </button>
                )
              })}
          </nav>
          {canPreviewRoles && (
            <div className="mt-6 border-t border-black/[0.08] px-2 pt-4 dark:border-white/[0.08]">
              <p className="text-[8px] uppercase text-[#949996]">Podgląd dostępu</p>
              <div className="mt-2 grid grid-cols-2 gap-1">
                <button type="button" onClick={() => startPreview('client')} className="h-8 rounded-[6px] border border-black/[0.08] bg-white/50 text-[9px] hover:bg-white dark:border-white/[0.09] dark:bg-white/[0.025] dark:hover:bg-white/[0.06]">Użytkownik</button>
                <button type="button" onClick={() => startPreview('operator')} className="h-8 rounded-[6px] border border-black/[0.08] bg-white/50 text-[9px] hover:bg-white dark:border-white/[0.09] dark:bg-white/[0.025] dark:hover:bg-white/[0.06]">Operator</button>
              </div>
            </div>
          )}
        </aside>

        <main className="min-w-0 px-4 py-6 sm:px-7 lg:px-10 lg:py-8">
          {message && (
            <div className="mb-5 flex items-center justify-between border-y border-black/[0.1] bg-white/45 px-3 py-2 text-[10px] dark:border-white/[0.1] dark:bg-white/[0.025]">
              {message}
              <button type="button" onClick={() => setMessage(null)} aria-label="Zamknij"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}

          {section === 'overview' && (
            <div>
              <PageHeading title="Stan operacyjny" description="Dostępność z ostatnich 30 dni, bieżące zdarzenia i przewidywany wpływ zależności." />
              <div className="grid border-b border-black/[0.09] py-6 dark:border-white/[0.09] sm:grid-cols-3">
                <Metric label="Aktywne incydenty" value={String(activeIncidents.length)} tone={activeIncidents.length > 0 ? 'warning' : 'normal'} />
                <Metric label="Nieprzeczytane" value={String(unreadNotifications.length)} />
                <Metric label="Moduły z wpływem" value={String(impactedModules.length)} />
              </div>

              <section className="py-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[12px] font-semibold">Dostępność usług</h2>
                  <span className="text-[9px] text-[#8a8f8c]">30 dni · próbki z VEZcore</span>
                </div>
                <div className="divide-y divide-black/[0.07] border-y border-black/[0.08] dark:divide-white/[0.07] dark:border-white/[0.08]">
                  {overview.uptime.length === 0 ? (
                    <EmptyRow text="Historia zacznie się wypełniać po kolejnych kontrolach statusu." />
                  ) : overview.uptime.map((item) => (
                    <div key={item.serviceKey} className="grid items-center gap-3 py-3 text-[10px] sm:grid-cols-[160px_minmax(0,1fr)_90px_120px]">
                      <span className="font-semibold">{moduleLabels[item.serviceKey] ?? item.serviceKey}</span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                        <span className="block h-full bg-[#6ba487]" style={{ width: `${item.percentage ?? 0}%` }} />
                      </span>
                      <span className="font-mono">{item.percentage === null ? 'brak' : `${item.percentage}%`}</span>
                      <span className="text-right text-[9px] text-[#858a87]">{formatDate(item.lastCheckedAt)}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="py-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[12px] font-semibold">Centrum powiadomień</h2>
                  {unreadNotifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => run('notifications', () => markNotificationsRead(unreadNotifications.map((item) => item.id), token ?? ''))}
                      className="text-[9px] font-medium text-[#6e716f] hover:text-black dark:text-[#a8adaa] dark:hover:text-white"
                    >
                      Oznacz wszystkie jako przeczytane
                    </button>
                  )}
                </div>
                <TimelineRows notifications={overview.notifications.slice(0, 12)} />
              </section>
            </div>
          )}

          {section === 'incidents' && (
            <div>
              <PageHeading title="Historia awarii" description="Pełna oś czasu od wykrycia problemu do przywrócenia działania." />
              <div className="mt-6 divide-y divide-black/[0.08] border-y border-black/[0.09] dark:divide-white/[0.08] dark:border-white/[0.09]">
                {overview.incidents.length === 0 ? <EmptyRow text="Nie zarejestrowano jeszcze incydentów." /> : overview.incidents.map((incident) => (
                  <div key={incident.id} className="grid gap-3 py-4 sm:grid-cols-[110px_minmax(0,1fr)_130px]">
                    <div className="flex items-start gap-2 text-[9px] text-[#858a87]">
                      <span className={`mt-1 h-2 w-2 rounded-full ${severityDot(incident.severity)}`} />
                      {formatDate(incident.started_at)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[12px] font-semibold">{incident.title}</h2>
                        <span className="rounded-[5px] bg-black/[0.04] px-1.5 py-0.5 text-[8px] uppercase dark:bg-white/[0.06]">{incident.status}</span>
                      </div>
                      <p className="mt-1 text-[10px] text-[#717673] dark:text-[#9aa09c]">{incident.detail}</p>
                      <p className="mt-2 text-[9px] text-[#8b908d]">
                        {moduleLabels[incident.module_key] ?? incident.module_key} · czas {relativeDuration(incident.started_at, incident.resolved_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      {incident.status === 'open' && canManage && (
                        <button
                          type="button"
                          disabled={busy === incident.id}
                          onClick={() => run(incident.id, () => acknowledgeIncident(incident.id, token ?? ''))}
                          className="h-8 rounded-[7px] border border-black/[0.09] px-2.5 text-[9px] hover:bg-white disabled:opacity-50 dark:border-white/[0.1] dark:hover:bg-white/[0.06]"
                        >
                          Potwierdź
                        </button>
                      )}
                      {incident.resolved_at && <span className="text-[9px] text-[#7f8581]">Zamknięto {formatDate(incident.resolved_at)}</span>}
                    </div>
                  </div>
                ))}
              </div>
              {impactedModules.length > 0 && (
                <section className="mt-7 border-y border-[#d4aa4f]/30 bg-[#fff9e5]/65 px-4 py-4 dark:bg-[#2a2412]/45">
                  <h2 className="flex items-center gap-2 text-[11px] font-semibold"><Network className="h-4 w-4" /> Automatycznie wykryty wpływ</h2>
                  <p className="mt-2 text-[10px] text-[#746a45] dark:text-[#c7b87d]">
                    Potencjalnie dotknięte: {impactedModules.map((item) => moduleLabels[item] ?? item).join(', ')}.
                  </p>
                </section>
              )}
            </div>
          )}

          {section === 'deployments' && (
            <div>
              <PageHeading title="Historia wdrożeń" description="Commit, wynik, czas i bezpośrednie przejście do przebiegu GitHub Actions." />
              <div className="mt-6 divide-y divide-black/[0.08] border-y border-black/[0.09] dark:divide-white/[0.08] dark:border-white/[0.09]">
                {overview.deployments.length === 0 ? <EmptyRow text="Brak zapisanych wdrożeń." /> : overview.deployments.map((deploy) => (
                  <div key={deploy.id} className="grid items-center gap-3 py-4 sm:grid-cols-[120px_90px_minmax(0,1fr)_150px]">
                    <span className="text-[10px] font-semibold">{moduleLabels[deploy.module_key] ?? deploy.module_key}</span>
                    <span className="font-mono text-[10px]">{deploy.short_sha}</span>
                    <span className="truncate text-[10px] text-[#707572] dark:text-[#9da29f]">{deploy.message}</span>
                    <span className="flex items-center justify-end gap-2 text-[9px] text-[#858a87]">
                      {formatDate(deploy.deployed_at ?? deploy.recorded_at)}
                      {deploy.url && <Link href={deploy.url} target="_blank" rel="noreferrer" aria-label={`GitHub ${deploy.short_sha}`}><ChevronRight className="h-3.5 w-3.5" /></Link>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'maintenance' && (
            <div>
              <PageHeading title="Tryb konserwacji" description="Planowane okna prac wyciszają automatyczne incydenty dla wybranego modułu." action={canManage ? (
                <button type="button" onClick={() => setMaintenanceFormOpen((value) => !value)} className="flex h-8 items-center gap-1.5 rounded-[7px] border border-black/[0.09] px-2.5 text-[9px] hover:bg-white dark:border-white/[0.1] dark:hover:bg-white/[0.06]">
                  <Plus className="h-3.5 w-3.5" /> Zaplanuj
                </button>
              ) : undefined} />
              {maintenanceFormOpen && (
                <form onSubmit={createMaintenance} className="mt-6 grid gap-3 border-y border-black/[0.1] bg-white/45 p-4 dark:border-white/[0.1] dark:bg-white/[0.025] sm:grid-cols-2">
                  <input name="title" required minLength={3} maxLength={120} placeholder="Nazwa prac" className="h-10 rounded-[7px] border border-black/[0.1] bg-white px-3 text-[10px] outline-none dark:border-white/[0.1] dark:bg-[#111311]" />
                  <select name="module" className="h-10 rounded-[7px] border border-black/[0.1] bg-white px-3 text-[10px] dark:border-white/[0.1] dark:bg-[#111311]">
                    {['vez', 'vezVision', 'vezLabs', 'nably', 'vezWork', 'vezRent', 'vezStudio'].map((key) => <option key={key} value={key}>{moduleLabels[key]}</option>)}
                  </select>
                  <input name="start" type="datetime-local" required className="h-10 rounded-[7px] border border-black/[0.1] bg-white px-3 text-[10px] dark:border-white/[0.1] dark:bg-[#111311]" />
                  <input name="end" type="datetime-local" required className="h-10 rounded-[7px] border border-black/[0.1] bg-white px-3 text-[10px] dark:border-white/[0.1] dark:bg-[#111311]" />
                  <textarea name="reason" required minLength={3} maxLength={1000} placeholder="Zakres i powód prac" className="min-h-20 rounded-[7px] border border-black/[0.1] bg-white p-3 text-[10px] outline-none dark:border-white/[0.1] dark:bg-[#111311] sm:col-span-2" />
                  <div className="flex justify-end sm:col-span-2">
                    <button type="submit" disabled={busy === 'maintenance:create'} className="h-9 rounded-[7px] bg-[#292a29] px-4 text-[9px] font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black">Zapisz okno</button>
                  </div>
                </form>
              )}
              <div className="mt-6 divide-y divide-black/[0.08] border-y border-black/[0.09] dark:divide-white/[0.08] dark:border-white/[0.09]">
                {overview.maintenance.length === 0 ? <EmptyRow text="Nie zaplanowano prac konserwacyjnych." /> : overview.maintenance.map((window) => (
                  <div key={window.id} className="grid gap-3 py-4 sm:grid-cols-[140px_minmax(0,1fr)_180px]">
                    <span className="text-[10px] font-semibold">{moduleLabels[window.module_key] ?? window.module_key}</span>
                    <div>
                      <h2 className="text-[11px] font-semibold">{window.title}</h2>
                      <p className="mt-1 text-[9px] text-[#777c79] dark:text-[#9ca19e]">{window.reason}</p>
                      <p className="mt-1 text-[9px] text-[#8a8f8c]">{formatDate(window.scheduled_start)} – {formatDate(window.scheduled_end)}</p>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[8px] uppercase text-[#858a87]">{window.status}</span>
                      {canManage && window.status === 'scheduled' && (
                        <button type="button" onClick={() => run(`maintenance:${window.id}`, () => updateMaintenanceStatus(window.id, 'active', token ?? ''))} className="flex h-8 items-center gap-1 rounded-[7px] border border-black/[0.09] px-2 text-[9px] dark:border-white/[0.1]"><Play className="h-3 w-3" /> Start</button>
                      )}
                      {canManage && window.status === 'active' && (
                        <button type="button" onClick={() => run(`maintenance:${window.id}`, () => updateMaintenanceStatus(window.id, 'completed', token ?? ''))} className="flex h-8 items-center gap-1 rounded-[7px] border border-black/[0.09] px-2 text-[9px] dark:border-white/[0.1]"><Check className="h-3 w-3" /> Zakończ</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'shortcuts' && (
            <div>
              <PageHeading title="Skróty administracyjne" description="Alias jest rozwiązywany dopiero po autoryzacji. Każde odsłonięcie trafia do Audit Log." />
              <div className="mt-6 divide-y divide-black/[0.08] border-y border-black/[0.09] dark:divide-white/[0.08] dark:border-white/[0.09]">
                {overview.shortcuts.length === 0 ? <EmptyRow text="Brak dostępu do chronionych skrótów." /> : overview.shortcuts.map((shortcut) => (
                  <div key={shortcut.id} className="grid items-center gap-3 py-4 sm:grid-cols-[130px_minmax(0,1fr)_minmax(180px,300px)]">
                    <span className="text-[10px] font-semibold">{moduleLabels[shortcut.module_key] ?? shortcut.module_key}</span>
                    <span>
                      <span className="block text-[11px] font-semibold">{shortcut.label}</span>
                      <span className="mt-0.5 block text-[9px] text-[#808582]">{shortcut.description}</span>
                    </span>
                    <span className="flex items-center justify-end gap-2">
                      {shortcut.href && <Link href={shortcut.href} target="_blank" rel="noreferrer" className="h-8 rounded-[7px] px-2.5 py-2 text-[9px] hover:bg-white dark:hover:bg-white/[0.06]">Otwórz</Link>}
                      {revealedAliases[shortcut.id] ? (
                        <button type="button" onClick={() => copyAlias(revealedAliases[shortcut.id])} className="flex h-8 max-w-[220px] items-center gap-2 rounded-[7px] border border-black/[0.09] px-2.5 font-mono text-[9px] dark:border-white/[0.1]">
                          <span className="truncate">{revealedAliases[shortcut.id]}</span><Copy className="h-3 w-3 shrink-0" />
                        </button>
                      ) : (
                        <button type="button" disabled={busy === `shortcut:${shortcut.id}`} onClick={() => revealShortcut(shortcut.id)} className="flex h-8 items-center gap-1.5 rounded-[7px] border border-black/[0.09] px-2.5 text-[9px] disabled:opacity-50 dark:border-white/[0.1]">
                          <Eye className="h-3.5 w-3.5" /> Odsłoń alias
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'snapshots' && (
            <div>
              <PageHeading title="Migawki systemu" description="Zapis statusów, aktywnych incydentów, wdrożeń i konserwacji w jednym momencie." />
              {canManage && (
                <div className="mt-6 flex max-w-xl gap-2">
                  <input value={snapshotName} onChange={(event) => setSnapshotName(event.target.value)} maxLength={120} placeholder="Nazwa migawki, np. przed migracją DB" className="h-10 flex-1 rounded-[7px] border border-black/[0.1] bg-white/70 px-3 text-[10px] outline-none dark:border-white/[0.1] dark:bg-white/[0.035]" />
                  <button type="button" onClick={createSnapshot} disabled={busy === 'snapshot:create'} className="flex h-10 items-center gap-1.5 rounded-[7px] bg-[#292a29] px-3 text-[9px] font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"><Clipboard className="h-3.5 w-3.5" /> Utwórz</button>
                </div>
              )}
              <div className="mt-6 divide-y divide-black/[0.08] border-y border-black/[0.09] dark:divide-white/[0.08] dark:border-white/[0.09]">
                {overview.snapshots.length === 0 ? <EmptyRow text="Nie utworzono jeszcze żadnej migawki." /> : overview.snapshots.map((snapshot) => (
                  <div key={snapshot.id} className="flex items-center justify-between gap-4 py-4">
                    <span className="flex items-center gap-3"><DatabaseBackup className="h-4 w-4 text-[#7e8480]" /><span className="text-[11px] font-semibold">{snapshot.name}</span></span>
                    <span className="text-[9px] text-[#858a87]">{formatDate(snapshot.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'security' && (
            <div>
              <PageHeading title="Raport bezpieczeństwa kont" description="2FA, potwierdzenie e-mail, aktywność, liczba sesji i nietypowy zakres uprawnień." />
              <div className="mt-6 divide-y divide-black/[0.08] border-y border-black/[0.09] dark:divide-white/[0.08] dark:border-white/[0.09]">
                {securityReport.map((finding) => (
                  <div key={finding.userId} className="grid gap-3 py-4 sm:grid-cols-[minmax(180px,1fr)_90px_110px_minmax(220px,1.4fr)]">
                    <span>
                      <span className="block truncate text-[11px] font-semibold">{finding.email}</span>
                      <span className="mt-0.5 block text-[8px] uppercase text-[#8b908d]">{finding.role}</span>
                    </span>
                    <span className="text-[9px]">{finding.activeSessions} sesji</span>
                    <span className="text-[9px]">{finding.permissionsCount} uprawnień</span>
                    <span className="flex items-start gap-2 text-[9px] text-[#747975] dark:text-[#a0a5a2]">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${severityDot(finding.severity)}`} />
                      {finding.issues.length > 0 ? finding.issues.join(' · ') : 'Brak wykrytych problemów'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function PageHeading({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <header className="flex items-end justify-between gap-5 border-b border-black/[0.1] pb-5 dark:border-white/[0.09]">
      <div>
        <p className="text-[9px] font-semibold uppercase text-[#878c89]">VEZcore Operations</p>
        <h1 className="mt-1 text-[25px] font-semibold">{title}</h1>
        <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-[#747975] dark:text-[#999f9b]">{description}</p>
      </div>
      {action}
    </header>
  )
}

function Metric({ label, value, tone = 'normal' }: { label: string; value: string; tone?: 'normal' | 'warning' }) {
  return (
    <div className="border-black/[0.08] px-4 py-2 first:pl-0 sm:border-r sm:last:border-r-0 dark:border-white/[0.08]">
      <p className="text-[9px] text-[#858a87]">{label}</p>
      <p className={`mt-1 text-[24px] font-semibold ${tone === 'warning' ? 'text-[#a77a28] dark:text-[#d3ad62]' : ''}`}>{value}</p>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <div className="py-10 text-center text-[10px] text-[#858a87]">{text}</div>
}

function TimelineRows({ notifications }: { notifications: OperationsOverview['notifications'] }) {
  if (notifications.length === 0) return <EmptyRow text="Brak powiadomień operacyjnych." />
  return (
    <div className="relative border-y border-black/[0.08] py-2 dark:border-white/[0.08]">
      <span className="absolute bottom-3 left-[6px] top-3 w-px bg-black/[0.1] dark:bg-white/[0.1]" />
      {notifications.map((notification) => (
        <div key={notification.id} className="relative grid gap-3 py-3 pl-6 sm:grid-cols-[135px_minmax(0,1fr)_100px]">
          <span className={`absolute left-[3px] top-[17px] h-[7px] w-[7px] rounded-full ring-4 ring-[#f4f4f2] dark:ring-[#080908] ${severityDot(notification.severity)}`} />
          <span className="text-[9px] text-[#858a87]">{formatDate(notification.created_at)}</span>
          <span>
            <span className={`block text-[10px] font-semibold ${notification.read ? 'opacity-60' : ''}`}>{notification.title}</span>
            <span className="mt-0.5 block text-[9px] text-[#777c79] dark:text-[#9aa09c]">{notification.body}</span>
          </span>
          <span className="text-right text-[8px] uppercase text-[#8b908d]">{notification.kind.replaceAll('_', ' ')}</span>
        </div>
      ))}
    </div>
  )
}
