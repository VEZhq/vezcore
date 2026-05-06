'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Home, User, Settings, Search, Filter, ChevronLeft, ChevronRight, Edit, Plus, X, Trash2, Download } from 'lucide-react'
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
  void userRole
  const router = useRouter()
  const searchParams = useSearchParams()
  const { preferences } = useUserPreferences()
  const { confirm } = useConfirm()
  const { token: csrfToken } = useCSRFToken()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [showFilters, setShowFilters] = useState(false)
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

  const page = initialPage
  const filteredUsers = users
  const paginatedUsers = filteredUsers
  const filteredTotal = total
  const filteredTotalPages = Math.ceil(filteredTotal / limit)

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
    <div className="min-h-screen bg-[#0a0a0a] light:bg-[#f5f5f5] transition-colors duration-300">
      <MobileNav currentPath="/konta" showKonta={true} showAudit={canAccessAudit} showSettings={canAccessSettings} />

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
            href="/konta"
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white light:text-black"
          >
            Konta
          </Link>
          {canAccessAudit && (
            <Link
              href="/audit"
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
            >
              Audit Log
            </Link>
          )}
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
              <h1 className="text-2xl font-medium text-white light:text-black transition-colors duration-300">
                Konta użytkowników
              </h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mt-1 transition-colors duration-300">
                Zarządzanie kontami systemu
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-[#666666] light:text-[#999999]">
                {filteredTotal} użytkowników
              </span>
              {canAddUsers && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-emerald-400 light:text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Dodaj
                </button>
              )}
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] border border-white/[0.06] light:border-black/[0.06] hover:bg-white/[0.02] light:hover:bg-black/[0.02] transition-colors"
              >
                <Download className="h-3 w-3" />
                Eksportuj
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#444444] light:text-[#888888]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Szukaj po email lub nazwie..."
                  className="w-full h-12 pl-12 pr-4 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.06] light:border-black/[0.06] text-white light:text-black text-sm placeholder:text-[#444444] light:placeholder:text-[#888888] focus:outline-none focus:border-white/[0.12] light:focus:border-black/[0.12] transition-colors duration-300"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 h-12 text-[10px] uppercase tracking-[0.2em] border transition-colors duration-300 ${
                  showFilters
                    ? 'bg-white/[0.05] light:bg-black/[0.05] border-white/[0.12] light:border-black/[0.12] text-white light:text-black'
                    : 'border-white/[0.06] light:border-black/[0.06] text-[#666666] light:text-[#999999] hover:bg-white/[0.02] light:hover:bg-black/[0.02]'
                }`}
              >
                <Filter className="h-3 w-3" />
                Filtry
              </button>
            </div>

            {showFilters && (
              <div className="flex items-center gap-4 p-4 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.06] light:border-black/[0.06] transition-colors duration-300">
                <div className="flex-1">
                  <p className="text-[10px] text-[#444444] light:text-[#888888]">
                    Filtry będą dostępne wkrótce
                  </p>
                </div>
              </div>
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-[#111111] light:bg-white border border-white/[0.06] light:border-black/[0.06] transition-colors duration-300">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999]">
                Zaznaczono {selectedIds.size} użytkowników
              </span>
              {canDeleteUsers && (
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkActionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Usuń zaznaczone
                </button>
              )}
              <button
                onClick={handleBulkExport}
                disabled={bulkActionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] border border-white/[0.06] light:border-black/[0.06] hover:bg-white/[0.02] light:hover:bg-black/[0.02] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="h-3 w-3" />
                Eksportuj zaznaczone
              </button>
              {canEditUsers && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={bulkRole}
                    onChange={(e) => setBulkRole(e.target.value)}
                    className="h-8 px-2 text-[10px] bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.06] light:border-black/[0.06] text-white light:text-black focus:outline-none focus:border-white/[0.12] light:focus:border-black/[0.12] transition-colors"
                  >
                    <option value="">Zmień rolę...</option>
                    <option value="client">client</option>
                    <option value="admin">admin</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                  {bulkRole && (
                    <button
                      onClick={handleBulkRoleChange}
                      disabled={bulkActionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-emerald-400 light:text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Zatwierdź
                    </button>
                  )}
                </div>
              )}
              <button
                onClick={clearSelection}
                className="ml-auto p-1.5 text-[#666666] light:text-[#999999] hover:text-white light:hover:text-black transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-colors duration-300">
            {deleteError && (
              <div className="px-6 py-3 border-b border-white/[0.06] light:border-black/[0.06] bg-red-500/10">
                <p className="text-xs text-red-400">{deleteError}</p>
              </div>
            )}
            {paginatedUsers.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
                  Brak użytkowników
                </p>
                <p className="text-xs text-[#666666] light:text-[#999999] mt-2">
                  {search
                    ? 'Brak wyników dla wyszukiwania'
                    : 'Nie znaleziono użytkowników'}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 px-4 lg:px-6 py-3 border-b border-white/[0.06] light:border-black/[0.06]">
                  <Checkbox
                    checked={paginatedUsers.length > 0 && selectedIds.size === paginatedUsers.length}
                    indeterminate={selectedIds.size > 0 && selectedIds.size < paginatedUsers.length}
                    onChange={toggleSelectAll}
                    aria-label="Zaznacz wszystkich użytkowników"
                    className="cursor-pointer"
                  />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888]">
                    {paginatedUsers.length > 0 && selectedIds.size === paginatedUsers.length
                      ? 'Odznacz wszystkie'
                      : 'Zaznacz wszystkie'}
                  </span>
                </div>
                <div className="divide-y divide-white/[0.06] light:divide-black/[0.06]">
                  {paginatedUsers.map((user) => (
                    <div key={user.id} className="p-4 lg:p-6 hover:bg-white/[0.02] light:hover:bg-black/[0.02] transition-colors duration-300">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={selectedIds.has(user.id)}
                            onChange={() => toggleSelect(user.id)}
                            aria-label={`Zaznacz użytkownika ${user.email}`}
                            className="cursor-pointer"
                          />
                          <div className={`w-10 h-10 rounded-lg ${getAvatarColor(user.full_name, user.email)} flex items-center justify-center text-sm font-medium flex-shrink-0`}>
                            {getInitials(user.full_name, user.email)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-white light:text-black font-medium truncate">
                              {user.full_name || user.email.split('@')[0]}
                            </p>
                            <p className="text-[10px] text-[#666666] light:text-[#999999] font-mono truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between lg:justify-end gap-4 lg:gap-6">
                          <div className="flex items-center gap-4 lg:gap-6">
                            <div className="text-left lg:text-right">
                              <p className="text-[9px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888]">
                                Rola
                              </p>
                              <p className="text-xs text-white light:text-black">
                                {user.role || 'user'}
                              </p>
                            </div>

                            <div className="hidden md:block text-right">
                              <p className="text-[9px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888]">
                                Data
                              </p>
                              <p className="text-xs text-[#666666] light:text-[#999999] font-mono">
                                {formatDate(user.created_at)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {canEditUsers && (
                              <Link
                                href={`/konta/${user.id}`}
                                className="p-2 text-[#666666] light:text-[#999999] hover:text-white light:hover:text-black transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                            )}
                            {canDeleteUsers && (
                              <button
                                onClick={() => handleDelete(user.id, user.email)}
                                disabled={deleteLoading === user.id}
                                className="p-2 text-[#666666] light:text-[#999999] hover:text-red-400 light:hover:text-red-600 transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {filteredTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[#444444] light:text-[#888888]">
                Wyświetlane {((page - 1) * limit) + 1}-{Math.min(page * limit, filteredTotal)} z {filteredTotal} użytkowników
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] border border-white/[0.06] light:border-black/[0.06] hover:bg-white/[0.02] light:hover:bg-black/[0.02] disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-300"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Poprzednia
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, filteredTotalPages) }, (_, i) => {
                    let pageNum: number
                    if (filteredTotalPages <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= filteredTotalPages - 2) {
                      pageNum = filteredTotalPages - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
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
                  onClick={() => handlePageChange(Math.min(filteredTotalPages, page + 1))}
                  disabled={page === filteredTotalPages}
                  className="flex items-center gap-1 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] border border-white/[0.06] light:border-black/[0.06] hover:bg-white/[0.02] light:hover:bg-black/[0.02] disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-300"
                >
                  Następna
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />

          <div className="relative bg-[#111111] light:bg-white border border-white/[0.06] light:border-black/[0.06] w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06] light:border-black/[0.06]">
              <h3 className="text-sm font-medium text-white light:text-black">
                Dodaj użytkownika
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#444444] hover:text-white light:hover:text-black transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {addError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
                  <p className="text-xs text-red-400">{addError}</p>
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full h-10 px-3 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.06] light:border-black/[0.06] text-white light:text-black text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] block mb-1">
                  Hasło
                </label>
                <input
                  type="password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  className="w-full h-10 px-3 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.06] light:border-black/[0.06] text-white light:text-black text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] block mb-1">
                  Imię i nazwisko
                </label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full h-10 px-3 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.06] light:border-black/[0.06] text-white light:text-black text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="Jan Kowalski"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-white/[0.06] light:border-black/[0.06]">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] border border-white/[0.06] light:border-black/[0.06] hover:bg-white/[0.02] light:hover:bg-black/[0.02] transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleAddUser}
                disabled={addLoading || !addEmail || !addPassword}
                className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-emerald-400 light:text-emerald-600 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {addLoading ? 'Dodawanie...' : 'Dodaj'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
