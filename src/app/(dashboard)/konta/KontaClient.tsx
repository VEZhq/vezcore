'use client'

import { useCallback, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  KeyRound,
  Mail,
  Plus,
  Search,
  Shield,
  Trash2,
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
import { ThemeToggle } from '@/components/theme/ThemeToggle'
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
    <div className="min-h-screen bg-[#f1f3f2] text-[#252927] dark:bg-[#070807] dark:text-[#eef0ef]">
      <MobileNav currentPath="/konta" showKonta showAudit={canAccessAudit} showSettings={canAccessSettings} />

      <header className="border-b border-black/[0.07] bg-white/45 dark:border-white/[0.08] dark:bg-[#090a09]">
        <div className="mx-auto flex h-12 w-full max-w-[1240px] items-center px-4 sm:px-6">
          <div className="flex items-center">
            <Image
              src="/logo/vezcore_logo_black_full.svg"
              alt="VEZcore"
              width={104}
              height={42}
              className="h-auto w-[104px] dark:hidden"
              priority
            />
            <Image
              src="/logo/vezcore_logo_white_full.svg"
              alt="VEZcore"
              width={104}
              height={42}
              className="hidden h-auto w-[104px] dark:block"
              priority
            />
            <span className="mx-3 h-4 w-px bg-black/[0.08] dark:bg-white/[0.1]" />
            <span className="text-[10px] font-medium text-[#747b78] dark:text-[#8f9692]">Konta</span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[10px] font-medium text-[#626966] transition-colors hover:bg-black/[0.04] hover:text-black dark:text-[#aab0ad] dark:hover:bg-white/[0.07] dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8">
        <section className="border-b border-black/[0.1] pb-6 dark:border-white/[0.09]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase text-[#808783] dark:text-[#8f9692]">Administracja</p>
              <h1 className="mt-1 text-[28px] font-semibold leading-tight">Konta użytkowników</h1>
              <p className="mt-2 text-[11px] text-[#777e7a] dark:text-[#8e9591]">
                Użytkownicy, role i zakres dostępu do ekosystemu.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-[310px]">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8b918e]" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Szukaj po nazwie lub e-mailu"
                  className="h-9 w-full rounded-[8px] border border-black/[0.08] bg-white/65 pl-9 pr-3 text-[11px] text-[#2a2e2c] outline-none transition-colors placeholder:text-[#9aa09d] focus:border-[#779182] dark:border-white/[0.09] dark:bg-white/[0.045] dark:text-[#e9ebe9] dark:focus:border-[#70877a]"
                />
              </div>
              <button
                onClick={handleExport}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-black/[0.08] px-3 text-[10px] text-[#68706c] transition-colors hover:bg-white dark:border-white/[0.09] dark:text-[#a4aaa7] dark:hover:bg-white/[0.06]"
              >
                <Download className="h-3.5 w-3.5" />
                Eksport
              </button>
              {canAddUsers && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[#26332c] px-3.5 text-[10px] font-medium text-white transition-colors hover:bg-[#33453b] dark:bg-[#dce7e0] dark:text-[#172019] dark:hover:bg-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nowe konto
                </button>
              )}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 border-y border-black/[0.07] py-4 dark:border-white/[0.07] sm:grid-cols-4">
            {[
              ['Wszystkie', total],
              ['Na stronie', paginatedUsers.length],
              ['Administratorzy', visibleAdmins],
              ['Zaznaczone', selectedCount],
            ].map(([label, value], index) => (
              <div
                key={String(label)}
                className={`px-4 first:pl-0 last:pr-0 ${index > 0 ? 'border-l border-black/[0.07] dark:border-white/[0.07]' : ''}`}
              >
                <p className="text-[9px] uppercase text-[#969c99]">{label}</p>
                <p className="mt-1 font-mono text-[18px] font-semibold text-[#303532] dark:text-[#e5e8e6]">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3 border-b border-black/[0.08] py-4 dark:border-white/[0.08] lg:flex-row lg:items-center">
          <div className="mr-auto flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-[#7b827e]" />
            <span className="text-[10px] text-[#747b78] dark:text-[#929895]">Twój zakres:</span>
            <strong className="text-[10px] font-semibold uppercase text-[#353a37] dark:text-[#d5d9d7]">{roleLabel(userRole)}</strong>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {[
              ['Dodawanie', canAddUsers],
              ['Edycja', canEditUsers],
              ['Usuwanie', canDeleteUsers],
              ['Audit', canAccessAudit],
              ['Ustawienia', canAccessSettings],
            ].map(([label, enabled]) => (
              <span key={String(label)} className="flex items-center gap-1.5 text-[9px] text-[#7c837f] dark:text-[#929895]">
                <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-[#b5bbb8] dark:bg-[#555b58]'}`} />
                {label}
              </span>
            ))}
          </div>
        </section>

        {deleteError && (
          <div className="mt-5 border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[10px] text-red-600 dark:text-red-300">
            {deleteError}
          </div>
        )}

        {selectedCount > 0 && (
          <section className="mt-5 flex flex-wrap items-center gap-2 border border-black/[0.08] bg-white/55 px-3 py-2.5 dark:border-white/[0.09] dark:bg-white/[0.035]">
            <strong className="mr-2 text-[10px] font-medium">{selectedCount} zaznaczonych</strong>
                    <button
                      onClick={handleBulkExport}
                      disabled={bulkActionLoading}
              className="inline-flex h-8 items-center gap-1.5 rounded-[7px] px-2.5 text-[10px] text-[#69706c] hover:bg-black/[0.04] disabled:opacity-50 dark:text-[#a4aaa7] dark:hover:bg-white/[0.06]"
                    >
              <Download className="h-3.5 w-3.5" />
              Eksport
                    </button>
                    {canEditUsers && (
                      <>
                        <select
                          value={bulkRole}
                          onChange={(e) => setBulkRole(e.target.value)}
                  className="h-8 rounded-[7px] border border-black/[0.08] bg-white px-2.5 text-[10px] outline-none dark:border-white/[0.09] dark:bg-[#111311]"
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
                    className="inline-flex h-8 items-center rounded-[7px] bg-[#26332c] px-3 text-[10px] text-white disabled:opacity-50 dark:bg-[#dce7e0] dark:text-[#172019]"
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
                className="inline-flex h-8 items-center gap-1.5 rounded-[7px] px-2.5 text-[10px] text-red-600 hover:bg-red-500/[0.06] disabled:opacity-50 dark:text-red-300"
                      >
                <Trash2 className="h-3.5 w-3.5" />
                        Usuń
                      </button>
                    )}
                    <button
                      onClick={clearSelection}
              className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-[#7c837f] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      aria-label="Wyczyść zaznaczenie"
                    >
              <X className="h-3.5 w-3.5" />
                    </button>
          </section>
        )}

        <section className="mt-6 overflow-hidden border-y border-black/[0.09] bg-white/35 dark:border-white/[0.09] dark:bg-white/[0.018]">
              {paginatedUsers.length === 0 ? (
                <EmptyState search={search} />
              ) : (
                <div>
              <div className="grid grid-cols-[34px_minmax(0,1.5fr)_120px_170px_96px] items-center gap-4 border-b border-black/[0.07] px-4 py-3 dark:border-white/[0.07] max-lg:hidden">
                    <Checkbox
                      checked={paginatedUsers.length > 0 && selectedIds.size === paginatedUsers.length}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < paginatedUsers.length}
                      onChange={toggleSelectAll}
                      aria-label="Zaznacz wszystkich użytkowników"
                      className="cursor-pointer"
                    />
                <p className="text-[9px] uppercase text-[#8d9490]">Użytkownik</p>
                <p className="text-[9px] uppercase text-[#8d9490]">Rola</p>
                <p className="text-[9px] uppercase text-[#8d9490]">Utworzono</p>
                <p className="text-right text-[9px] uppercase text-[#8d9490]">Akcje</p>
                  </div>

              <div className="divide-y divide-black/[0.065] dark:divide-white/[0.065]">
                    {paginatedUsers.map((user) => (
                      <div
                        key={user.id}
                    className="grid gap-4 px-4 py-3.5 transition-colors hover:bg-white/70 dark:hover:bg-white/[0.035] lg:grid-cols-[34px_minmax(0,1.5fr)_120px_170px_96px] lg:items-center"
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
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] text-[12px] font-semibold ${getAvatarColor(user.full_name, user.email)}`}>
                            {getInitials(user.full_name, user.email)}
                          </div>
                          <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-[#2c312e] dark:text-[#e8ebe9]">
                              {user.full_name || user.email.split('@')[0]}
                            </p>
                        <p className="mt-0.5 truncate font-mono text-[10px] text-[#7b827e] dark:text-[#8e9591]">
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
                      <p className="mt-1 font-mono text-[10px] text-[#7d8480] dark:text-[#929895] lg:mt-0">
                            {formatDate(user.created_at)}
                          </p>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          {canEditUsers && (
                            <Link
                              href={`/konta/${user.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-[#7b827e] transition-colors hover:bg-black/[0.05] hover:text-black dark:text-[#969c99] dark:hover:bg-white/[0.07] dark:hover:text-white"
                              aria-label={`Edytuj użytkownika ${user.email}`}
                            >
                          <Edit className="h-3.5 w-3.5" />
                            </Link>
                          )}
                          {canDeleteUsers && (
                            <button
                              onClick={() => handleDelete(user.id, user.email)}
                              disabled={deleteLoading === user.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-[#8b918e] transition-colors hover:bg-red-500/[0.06] hover:text-red-600 disabled:opacity-50 dark:hover:text-red-300"
                              aria-label={`Usuń użytkownika ${user.email}`}
                            >
                          <Trash2 className="h-3.5 w-3.5" />
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
          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] text-[#777e7a] dark:text-[#8e9591]">
                  Wyświetlane {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} z {total} kont
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                className="inline-flex h-8 items-center gap-1 rounded-[7px] px-2.5 text-[10px] text-[#747b78] hover:bg-black/[0.04] disabled:opacity-35 dark:text-[#9ca29f] dark:hover:bg-white/[0.06]"
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
                    className={`h-8 w-8 rounded-[7px] text-[10px] transition-colors ${
                            page === pageNum
                        ? 'bg-[#26332c] text-white dark:bg-[#dce7e0] dark:text-[#172019]'
                        : 'text-[#747b78] hover:bg-black/[0.04] dark:text-[#9ca29f] dark:hover:bg-white/[0.06]'
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
                className="inline-flex h-8 items-center gap-1 rounded-[7px] px-2.5 text-[10px] text-[#747b78] hover:bg-black/[0.04] disabled:opacity-35 dark:text-[#9ca29f] dark:hover:bg-white/[0.06]"
                  >
                    Następna
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
        <p className="mt-5 text-right text-[9px] text-[#979d9a]">
          Widoczna strona: {visibleAdmins} administratorów · {visibleClients} pozostałych kont
        </p>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <button
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={() => setShowAddModal(false)}
            aria-label="Zamknij formularz"
          />

          <div className="relative w-full max-w-lg overflow-hidden rounded-[12px] border border-black/[0.09] bg-[#f8faf8] shadow-2xl dark:border-white/[0.1] dark:bg-[#111311]">
            <div className="flex items-start justify-between gap-4 border-b border-black/[0.08] p-5 dark:border-white/[0.08]">
              <div>
                <p className="text-[14px] font-semibold">Nowe konto</p>
                <p className="mt-1 text-[10px] text-[#7d8480]">
                  Utwórz konto z hasłem startowym. Rolę można zmienić po dodaniu.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-[#7d8480] transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
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
                  <span className="mb-1.5 block text-[9px] uppercase text-[#7d8480]">
                    Adres e-mail
                  </span>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8a918d]" />
                    <input
                      type="email"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      className="h-10 w-full rounded-[8px] border border-black/[0.08] bg-white pl-9 pr-3 text-[11px] outline-none focus:border-[#779182] dark:border-white/[0.09] dark:bg-white/[0.045]"
                      placeholder="user@example.com"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[9px] uppercase text-[#7d8480]">
                    Hasło startowe
                  </span>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8a918d]" />
                    <input
                      type="password"
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                      className="h-10 w-full rounded-[8px] border border-black/[0.08] bg-white pl-9 pr-3 text-[11px] outline-none focus:border-[#779182] dark:border-white/[0.09] dark:bg-white/[0.045]"
                      placeholder="Minimum bezpiecznego hasła"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[9px] uppercase text-[#7d8480]">
                    Imię i nazwisko
                  </span>
                  <div className="relative">
                    <UserCog className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8a918d]" />
                    <input
                      type="text"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      className="h-10 w-full rounded-[8px] border border-black/[0.08] bg-white pl-9 pr-3 text-[11px] outline-none focus:border-[#779182] dark:border-white/[0.09] dark:bg-white/[0.045]"
                      placeholder="Jan Kowalski"
                    />
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-black/[0.08] p-4 dark:border-white/[0.08]">
              <button
                onClick={() => setShowAddModal(false)}
                className="inline-flex h-9 items-center rounded-[8px] px-3 text-[10px] text-[#727975] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                Anuluj
              </button>
              <button
                onClick={handleAddUser}
                disabled={addLoading || !addEmail || !addPassword}
                className="inline-flex h-9 items-center rounded-[8px] bg-[#26332c] px-4 text-[10px] font-medium text-white disabled:opacity-50 dark:bg-[#dce7e0] dark:text-[#172019]"
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
