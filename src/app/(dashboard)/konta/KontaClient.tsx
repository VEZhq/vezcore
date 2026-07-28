'use client'

import { useCallback, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Home,
  KeyRound,
  Mail,
  Plus,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'
import { Checkbox } from '@/components/ui/checkbox'
import { createUser, deleteUser, updateUser } from '@/lib/actions/users'
import { getUsersForExport } from '@/lib/actions/export'
import { useConfirm } from '@/components/ConfirmDialog'
import { MobileNav } from '@/components/MobileNav'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import { formatDate as _formatDate, getInitials, getAvatarColor } from './konta-utils'
import { downloadUserCsv } from './konta-csv'

interface UserData {
  id: string
  email: string
  full_name: string | null
  role: string | null
  created_at: string
}

interface KontaClientProps {
  users: UserData[]
  total: number
  page: number
  limit: number
  userRole: string | null
  canAddUsers: boolean
  canDeleteUsers: boolean
  canEditUsers: boolean
  canAccessAudit: boolean
  canAccessSettings: boolean
}

function roleLabel(role: string | null) {
  if (!role) return 'user'
  if (role === 'super_admin') return 'super admin'
  return role
}

function roleTone(role: string | null) {
  if (role === 'super_admin') return 'border-[#d7bfd8]/25 bg-[#d7bfd8]/10 text-[#ead8e9] light:text-[#735671]'
  if (role === 'admin') return 'border-[#d7bfd8]/25 bg-[#d7bfd8]/10 text-[#d7bfd8] light:text-[#735671]'
  return 'border-white/[0.07] bg-white/[0.03] text-[#999999] light:border-black/[0.08] light:bg-black/[0.03] light:text-[#666666]'
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
}: {
  label: string
  value: string | number
  helper: string
  icon: LucideIcon
}) {
  return (
    <div className="rounded-md border border-white/[0.07] bg-[#141310]/[0.74] p-4 light:border-black/[0.08] light:bg-[#fffdfa]/[0.84]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#777777] light:text-[#888888]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white light:text-black">{value}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.03] light:border-black/[0.08] light:bg-black/[0.03]">
          <Icon className="h-4 w-4 text-[#e6c7a7] light:text-[#7d5a38]" />
        </div>
      </div>
      <p className="mt-3 text-xs text-[#777777] light:text-[#777777]">{helper}</p>
    </div>
  )
}

function PermissionPill({
  label,
  enabled,
}: {
  label: string
  enabled: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-3 last:border-b-0 light:border-black/[0.06]">
      <span className="text-xs text-[#888888] light:text-[#666666]">{label}</span>
      <span
        className={`inline-flex items-center gap-2 text-xs ${
          enabled ? 'text-[#e6c7a7] light:text-[#7d5a38]' : 'text-[#666666] light:text-[#999999]'
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${enabled ? 'bg-[#e6c7a7] light:bg-[#7d5a38]' : 'bg-[#444444] light:bg-[#b5b5b5]'}`} />
        {enabled ? 'aktywny' : 'brak'}
      </span>
    </div>
  )
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.03] light:border-black/[0.08] light:bg-black/[0.03]">
        <Users className="h-5 w-5 text-[#777777] light:text-[#777777]" />
      </div>
      <p className="mt-4 text-sm font-medium text-white light:text-black">Brak kont do wyświetlenia</p>
      <p className="mt-2 max-w-sm text-xs text-[#777777] light:text-[#777777]">
        {search ? 'Nie znaleziono kont pasujących do wpisanej frazy.' : 'Lista kont jest pusta albo nie została jeszcze zsynchronizowana.'}
      </p>
    </div>
  )
}

export default function KontaClient({
  users,
  total,
  page: initialPage,
  limit,
  userRole,
  canAddUsers,
  canDeleteUsers,
  canEditUsers,
  canAccessAudit,
  canAccessSettings,
}: KontaClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { preferences } = useUserPreferences()
  const { confirm } = useConfirm()
  const { token: csrfToken } = useCSRFToken()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addName, setAddName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [bulkRole, setBulkRole] = useState('')

  const page = initialPage
  const paginatedUsers = users
  const totalPages = Math.ceil(total / limit)
  const selectedCount = selectedIds.size
  const visibleAdmins = useMemo(
    () => users.filter(user => user.role === 'admin' || user.role === 'super_admin').length,
    [users]
  )
  const visibleClients = users.length - visibleAdmins

  const handleSearchChange = (value: string) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    params.set('page', '1')
    router.push(`/konta?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    setSelectedIds(new Set())
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`/konta?${params.toString()}`)
  }

  const formatDate = (dateStr: string | null) => _formatDate(dateStr, preferences.timezone)

  const handleAddUser = async () => {
    if (!csrfToken) {
      setAddError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    setAddLoading(true)
    setAddError(null)

    const result = await createUser({
      email: addEmail,
      password: addPassword,
      full_name: addName,
      csrfToken,
    })

    if (result.error) {
      setAddError(result.error)
    } else {
      setShowAddModal(false)
      setAddEmail('')
      setAddPassword('')
      setAddName('')
      router.refresh()
    }
    setAddLoading(false)
  }

  const handleDelete = async (userId: string, email: string) => {
    const confirmed = await confirm({
      title: 'Usunąć użytkownika?',
      message: `Czy na pewno chcesz TRWALE usunąć użytkownika ${email}? Tej akcji nie można cofnąć.`,
      confirmText: 'Usuń',
      variant: 'danger',
    })

    if (!confirmed) return

    setDeleteLoading(userId)
    if (!csrfToken) {
      setDeleteError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      setDeleteLoading(null)
      return
    }

    const result = await deleteUser(userId, csrfToken)
    if (result.error) {
      setDeleteError(result.error)
    } else {
      router.refresh()
    }
    setDeleteLoading(null)
  }

  const handleExport = async () => {
    if (!csrfToken) {
      setDeleteError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    const result = await getUsersForExport(csrfToken)
    if ('error' in result) {
      setDeleteError(result.error)
      return
    }

    downloadUserCsv(result as Array<{ email: string; full_name: string | null; role: string; created_at: string; last_sign_in: string | null }>)
  }

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === paginatedUsers.length) {
        return new Set()
      }
      return new Set(paginatedUsers.map(u => u.id))
    })
  }, [paginatedUsers])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: 'Usunąć zaznaczonych użytkowników?',
      message: `Czy na pewno chcesz TRWALE usunąć ${selectedIds.size} użytkowników? Tej akcji nie można cofnąć.`,
      confirmText: 'Usuń',
      variant: 'danger',
    })

    if (!confirmed) return

    setBulkActionLoading(true)
    if (!csrfToken) {
      setDeleteError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      setBulkActionLoading(false)
      return
    }

    const results = await Promise.allSettled(
      Array.from(selectedIds).map(id => deleteUser(id, csrfToken))
    )
    const failed = results.filter(
      (r): r is PromiseFulfilledResult<{ error: string }> =>
        r.status === 'fulfilled' && 'error' in r.value
    )
    if (failed.length > 0) {
      setDeleteError(`${failed.length}/${selectedIds.size} operacji nie powiodło się`)
    }
    setSelectedIds(new Set())
    setBulkActionLoading(false)
    router.refresh()
  }

  const handleBulkExport = async () => {
    if (!csrfToken) {
      setDeleteError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    const result = await getUsersForExport(csrfToken)
    if ('error' in result) {
      setDeleteError(result.error)
      return
    }

    const selectedEmails = new Set(
      paginatedUsers.filter(u => selectedIds.has(u.id)).map(u => u.email)
    )
    const selected = result.filter(u => selectedEmails.has(u.email))
    downloadUserCsv(selected as Array<{ email: string; full_name: string | null; role: string; created_at: string; last_sign_in: string | null }>)
  }

  const handleBulkRoleChange = async () => {
    if (!bulkRole) return

    setBulkActionLoading(true)
    if (!csrfToken) {
      setDeleteError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      setBulkActionLoading(false)
      return
    }

    const results = await Promise.allSettled(
      Array.from(selectedIds).map(id => updateUser(id, { role: bulkRole }, csrfToken))
    )
    const failed = results.filter(
      (r): r is PromiseFulfilledResult<{ error: string }> =>
        r.status === 'fulfilled' && 'error' in r.value
    )
    if (failed.length > 0) {
      setDeleteError(`${failed.length}/${selectedIds.size} operacji nie powiodło się`)
    }
    setSelectedIds(new Set())
    setBulkRole('')
    setBulkActionLoading(false)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-transparent transition-colors duration-300">
      <MobileNav currentPath="/konta" showKonta showAudit={canAccessAudit} showSettings={canAccessSettings} />

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
              Administracja
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white light:text-black">
              Konta użytkowników
            </h1>
          </div>

          <nav className="flex flex-wrap gap-2">
            <NavLink href="/dashboard" label="Dashboard" icon={ArrowLeft} />
            <NavLink href="/profile" label="Profil" icon={User} />
            <NavLink href="/konta" label="Konta" icon={Users} active />
            {canAccessAudit && <NavLink href="/audit" label="Audit Log" icon={ShieldCheck} />}
            {canAccessSettings && <NavLink href="/settings" label="Ustawienia" icon={Settings} />}
          </nav>
        </header>

        <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Wszystkie konta" value={total} helper="Łączna liczba kont w systemie" icon={Users} />
          <MetricCard label="Na tej stronie" value={paginatedUsers.length} helper={`Strona ${page}${totalPages > 0 ? ` z ${totalPages}` : ''}`} icon={Home} />
          <MetricCard label="Admini" value={visibleAdmins} helper="Widoczni admini i super admini" icon={Shield} />
          <MetricCard label="Zaznaczone" value={selectedCount} helper={selectedCount > 0 ? 'Gotowe do akcji zbiorczej' : 'Brak aktywnego zaznaczenia'} icon={Check} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <main className="space-y-5">
            <section className="rounded-md border border-white/[0.07] bg-[#141310]/[0.74] light:border-black/[0.08] light:bg-[#fffdfa]/[0.84]">
              <div className="border-b border-white/[0.06] p-4 light:border-black/[0.06]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white light:text-black">Lista kont</p>
                    <p className="mt-1 text-xs text-[#777777] light:text-[#777777]">
                      Szukaj, zaznaczaj i edytuj konta z jednego miejsca.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative min-w-0 sm:w-[320px]">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666666] light:text-[#888888]" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Szukaj po email lub nazwie"
                        className="h-10 w-full rounded-md border border-white/[0.07] bg-white/[0.03] pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-[#666666] focus:border-[#e6c7a7]/45 light:border-black/[0.08] light:bg-black/[0.03] light:text-black light:placeholder:text-[#999999]"
                      />
                    </div>
                    <button
                      onClick={handleExport}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/[0.07] px-3 text-xs text-[#999999] transition-colors hover:text-white light:border-black/[0.08] light:text-[#666666] light:hover:text-black"
                    >
                      <Download className="h-4 w-4" />
                      Eksport
                    </button>
                    {canAddUsers && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#e6c7a7]/25 bg-[#e6c7a7]/10 px-3 text-xs text-[#f0d9be] transition-colors hover:bg-[#e6c7a7]/15 light:text-[#7d5a38]"
                      >
                        <Plus className="h-4 w-4" />
                        Dodaj
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {deleteError && (
                <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-3">
                  <p className="text-xs text-red-300 light:text-red-700">{deleteError}</p>
                </div>
              )}

              {selectedCount > 0 && (
                <div className="border-b border-white/[0.06] bg-white/[0.03] px-4 py-3 light:border-black/[0.06] light:bg-black/[0.03]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-white/[0.07] px-3 py-2 text-xs text-white light:border-black/[0.08] light:text-black">
                      Zaznaczono: {selectedCount}
                    </span>
                    <button
                      onClick={handleBulkExport}
                      disabled={bulkActionLoading}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-white/[0.07] px-3 text-xs text-[#999999] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50 light:border-black/[0.08] light:text-[#666666] light:hover:text-black"
                    >
                      <Download className="h-4 w-4" />
                      Eksportuj
                    </button>
                    {canEditUsers && (
                      <>
                        <select
                          value={bulkRole}
                          onChange={(e) => setBulkRole(e.target.value)}
                          className="h-9 rounded-md border border-white/[0.07] bg-[#0d0d0d] px-3 text-xs text-white outline-none light:border-black/[0.08] light:bg-white light:text-black"
                        >
                          <option value="">Zmień rolę</option>
                          <option value="client">client</option>
                          <option value="admin">admin</option>
                          <option value="super_admin">super_admin</option>
                        </select>
                        {bulkRole && (
                          <button
                            onClick={handleBulkRoleChange}
                            disabled={bulkActionLoading}
                            className="inline-flex h-9 items-center rounded-md border border-[#e6c7a7]/25 bg-[#e6c7a7]/10 px-3 text-xs text-[#f0d9be] transition-colors hover:bg-[#e6c7a7]/15 disabled:cursor-not-allowed disabled:opacity-50 light:text-[#7d5a38]"
                          >
                            Zatwierdź
                          </button>
                        )}
                      </>
                    )}
                    {canDeleteUsers && (
                      <button
                        onClick={handleBulkDelete}
                        disabled={bulkActionLoading}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-red-500/25 bg-red-500/10 px-3 text-xs text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50 light:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Usuń
                      </button>
                    )}
                    <button
                      onClick={clearSelection}
                      className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.07] text-[#999999] transition-colors hover:text-white light:border-black/[0.08] light:text-[#666666] light:hover:text-black"
                      aria-label="Wyczyść zaznaczenie"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {paginatedUsers.length === 0 ? (
                <EmptyState search={search} />
              ) : (
                <div>
                  <div className="grid grid-cols-[34px_minmax(0,1.5fr)_120px_170px_96px] items-center gap-4 border-b border-white/[0.06] px-4 py-3 light:border-black/[0.06] max-lg:hidden">
                    <Checkbox
                      checked={paginatedUsers.length > 0 && selectedIds.size === paginatedUsers.length}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < paginatedUsers.length}
                      onChange={toggleSelectAll}
                      aria-label="Zaznacz wszystkich użytkowników"
                      className="cursor-pointer"
                    />
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#666666] light:text-[#888888]">Użytkownik</p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#666666] light:text-[#888888]">Rola</p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#666666] light:text-[#888888]">Utworzono</p>
                    <p className="text-right text-[10px] uppercase tracking-[0.18em] text-[#666666] light:text-[#888888]">Akcje</p>
                  </div>

                  <div className="divide-y divide-white/[0.06] light:divide-black/[0.06]">
                    {paginatedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="grid gap-4 px-4 py-4 transition-colors hover:bg-white/[0.025] light:hover:bg-black/[0.025] lg:grid-cols-[34px_minmax(0,1.5fr)_120px_170px_96px] lg:items-center"
                      >
                        <div className="flex items-center justify-between gap-3 lg:block">
                          <Checkbox
                            checked={selectedIds.has(user.id)}
                            onChange={() => toggleSelect(user.id)}
                            aria-label={`Zaznacz użytkownika ${user.email}`}
                            className="cursor-pointer"
                          />
                          <span className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.12em] lg:hidden ${roleTone(user.role)}`}>
                            {roleLabel(user.role)}
                          </span>
                        </div>

                        <div className="flex min-w-0 items-center gap-3">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-sm font-semibold ${getAvatarColor(user.full_name, user.email)}`}>
                            {getInitials(user.full_name, user.email)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white light:text-black">
                              {user.full_name || user.email.split('@')[0]}
                            </p>
                            <p className="mt-1 truncate font-mono text-xs text-[#777777] light:text-[#777777]">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        <div className="hidden lg:block">
                          <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${roleTone(user.role)}`}>
                            {roleLabel(user.role)}
                          </span>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-[0.16em] text-[#666666] light:text-[#888888] lg:hidden">
                            Utworzono
                          </p>
                          <p className="mt-1 font-mono text-xs text-[#888888] light:text-[#666666] lg:mt-0">
                            {formatDate(user.created_at)}
                          </p>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          {canEditUsers && (
                            <Link
                              href={`/konta/${user.id}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.07] text-[#999999] transition-colors hover:text-white light:border-black/[0.08] light:text-[#666666] light:hover:text-black"
                              aria-label={`Edytuj użytkownika ${user.email}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                          )}
                          {canDeleteUsers && (
                            <button
                              onClick={() => handleDelete(user.id, user.email)}
                              disabled={deleteLoading === user.id}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.07] text-[#999999] transition-colors hover:border-red-500/30 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50 light:border-black/[0.08] light:text-[#666666] light:hover:text-red-700"
                              aria-label={`Usuń użytkownika ${user.email}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {totalPages > 1 && (
              <div className="flex flex-col gap-3 rounded-md border border-white/[0.07] bg-[#141310]/[0.74] p-3 light:border-black/[0.08] light:bg-[#fffdfa]/[0.84] sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[#777777] light:text-[#777777]">
                  Wyświetlane {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} z {total} kont
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-white/[0.07] px-3 text-xs text-[#999999] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40 light:border-black/[0.08] light:text-[#666666] light:hover:text-black"
                  >
                    <ChevronLeft className="h-4 w-4" />
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
                          onClick={() => handlePageChange(pageNum)}
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
                    onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
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
            <section className="rounded-md border border-white/[0.07] bg-[#141310]/[0.74] p-5 light:border-black/[0.08] light:bg-[#fffdfa]/[0.84]">
              <p className="text-sm font-medium text-white light:text-black">Zakres dostępu</p>
              <p className="mt-1 text-xs text-[#777777] light:text-[#777777]">
                Twoja rola: <span className="text-white light:text-black">{roleLabel(userRole)}</span>
              </p>
              <div className="mt-4">
                <PermissionPill label="Dodawanie kont" enabled={canAddUsers} />
                <PermissionPill label="Edycja danych" enabled={canEditUsers} />
                <PermissionPill label="Usuwanie kont" enabled={canDeleteUsers} />
                <PermissionPill label="Audit log" enabled={canAccessAudit} />
                <PermissionPill label="Ustawienia" enabled={canAccessSettings} />
              </div>
            </section>

            <section className="rounded-md border border-white/[0.07] bg-[#141310]/[0.74] p-5 light:border-black/[0.08] light:bg-[#fffdfa]/[0.84]">
              <p className="text-sm font-medium text-white light:text-black">Szybkie akcje</p>
              <div className="mt-4 space-y-2">
                {canAddUsers && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex w-full items-center justify-between rounded-md border border-white/[0.07] px-3 py-3 text-left text-sm text-white transition-colors hover:bg-white/[0.03] light:border-black/[0.08] light:text-black light:hover:bg-black/[0.03]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Plus className="h-4 w-4 text-[#e6c7a7] light:text-[#7d5a38]" />
                      Nowe konto
                    </span>
                    <span className="text-xs text-[#777777]">formularz</span>
                  </button>
                )}
                <button
                  onClick={handleExport}
                  className="flex w-full items-center justify-between rounded-md border border-white/[0.07] px-3 py-3 text-left text-sm text-white transition-colors hover:bg-white/[0.03] light:border-black/[0.08] light:text-black light:hover:bg-black/[0.03]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Download className="h-4 w-4 text-[#d7bfd8] light:text-[#735671]" />
                    Eksport CSV
                  </span>
                  <span className="text-xs text-[#777777]">pełna lista</span>
                </button>
                {canAccessAudit && (
                  <Link
                    href="/audit"
                    className="flex w-full items-center justify-between rounded-md border border-white/[0.07] px-3 py-3 text-left text-sm text-white transition-colors hover:bg-white/[0.03] light:border-black/[0.08] light:text-black light:hover:bg-black/[0.03]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-amber-300 light:text-amber-600" />
                      Audit Log
                    </span>
                    <span className="text-xs text-[#777777]">zdarzenia</span>
                  </Link>
                )}
              </div>
            </section>

            <section className="rounded-md border border-white/[0.07] bg-[#141310]/[0.74] p-5 light:border-black/[0.08] light:bg-[#fffdfa]/[0.84]">
              <p className="text-sm font-medium text-white light:text-black">Widoczna strona</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-md bg-white/[0.03] p-3 light:bg-black/[0.03]">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#777777]">Admini</p>
                  <p className="mt-1 text-lg font-semibold text-white light:text-black">{visibleAdmins}</p>
                </div>
                <div className="rounded-md bg-white/[0.03] p-3 light:bg-black/[0.03]">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#777777]">Pozostałe</p>
                  <p className="mt-1 text-lg font-semibold text-white light:text-black">{visibleClients}</p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />

          <div className="relative w-full max-w-lg overflow-hidden rounded-md border border-white/[0.07] bg-[#0d0d0d] shadow-2xl light:border-black/[0.08] light:bg-white">
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] p-5 light:border-black/[0.06]">
              <div>
                <p className="text-sm font-medium text-white light:text-black">Dodaj konto</p>
                <p className="mt-1 text-xs text-[#777777] light:text-[#777777]">
                  Utwórz konto z hasłem startowym. Rolę można zmienić po dodaniu.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.07] text-[#999999] transition-colors hover:text-white light:border-black/[0.08] light:text-[#666666] light:hover:text-black"
                aria-label="Zamknij formularz"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {addError && (
                <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 p-3">
                  <p className="text-xs text-red-300 light:text-red-700">{addError}</p>
                </div>
              )}

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-[#777777] light:text-[#777777]">
                    Email
                  </span>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666666]" />
                    <input
                      type="email"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      className="h-11 w-full rounded-md border border-white/[0.07] bg-white/[0.03] pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-[#666666] focus:border-[#e6c7a7]/45 light:border-black/[0.08] light:bg-black/[0.03] light:text-black light:placeholder:text-[#999999]"
                      placeholder="user@example.com"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-[#777777] light:text-[#777777]">
                    Hasło startowe
                  </span>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666666]" />
                    <input
                      type="password"
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                      className="h-11 w-full rounded-md border border-white/[0.07] bg-white/[0.03] pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-[#666666] focus:border-[#e6c7a7]/45 light:border-black/[0.08] light:bg-black/[0.03] light:text-black light:placeholder:text-[#999999]"
                      placeholder="Minimum bezpiecznego hasła"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-[#777777] light:text-[#777777]">
                    Imię i nazwisko
                  </span>
                  <div className="relative">
                    <UserCog className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666666]" />
                    <input
                      type="text"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      className="h-11 w-full rounded-md border border-white/[0.07] bg-white/[0.03] pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-[#666666] focus:border-[#e6c7a7]/45 light:border-black/[0.08] light:bg-black/[0.03] light:text-black light:placeholder:text-[#999999]"
                      placeholder="Jan Kowalski"
                    />
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] p-5 light:border-black/[0.06]">
              <button
                onClick={() => setShowAddModal(false)}
                className="inline-flex h-10 items-center rounded-md border border-white/[0.07] px-4 text-xs text-[#999999] transition-colors hover:text-white light:border-black/[0.08] light:text-[#666666] light:hover:text-black"
              >
                Anuluj
              </button>
              <button
                onClick={handleAddUser}
                disabled={addLoading || !addEmail || !addPassword}
                className="inline-flex h-10 items-center rounded-md border border-[#e6c7a7]/25 bg-[#e6c7a7]/10 px-4 text-xs text-[#f0d9be] transition-colors hover:bg-[#e6c7a7]/15 disabled:cursor-not-allowed disabled:opacity-50 light:text-[#7d5a38]"
              >
                {addLoading ? 'Dodawanie...' : 'Dodaj konto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
