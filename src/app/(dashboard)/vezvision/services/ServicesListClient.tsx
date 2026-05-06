'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Search, Plus, Edit, Trash2, Copy, Eye, ArrowUpDown, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { useConfirm } from '@/components/ConfirmDialog'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import { useDataList } from '@/hooks/useDataList'
import { deleteService, duplicateService, reorderServices, setServiceStatus } from '@/lib/actions/vezvision/services'
import { getServiceIcon, getServiceIconTextFallback } from './serviceIcons'
import type { VVService, VVServiceStatus } from '@/lib/actions/vezvision/types'

interface ServicesListClientProps {
  services: VVService[]
  canManage: boolean
}

type StatusFilter = 'all' | VVService['status']

const STATUS_META: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  active: {
    label: 'Aktywna',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  archived: {
    label: 'Archiwum',
    dot: 'bg-orange-400',
    text: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  draft: {
    label: 'Szkic',
    dot: 'bg-slate-400',
    text: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
  },
}

function StatusBadge({ status }: { status: VVService['status'] }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${meta.text} ${meta.bg} border ${meta.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

function getNextStatus(status: VVServiceStatus): VVServiceStatus {
  if (status === 'draft') return 'active'
  if (status === 'active') return 'archived'
  return 'draft'
}

export default function ServicesListClient({ services: initialServices, canManage }: ServicesListClientProps) {
  const { confirm } = useConfirm()
  const { token: csrfToken } = useCSRFToken()

  const list = useDataList<VVService>({
    initialData: initialServices,
    getId: (item) => item.id,
    perPage: 10,
    sortBy: 'created_at',
    sortOrder: 'desc',
  })

  const statusFilter = list.filterValue as StatusFilter

  const handleStatusToggle = async (service: VVService) => {
    if (!canManage) return
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    const nextStatus = getNextStatus(service.status)
    list.setActionLoadingId(service.id)
    const result = await setServiceStatus(service.id, nextStatus, csrfToken)
    if (result.success) {
      toast.success(`Status zmieniony na: ${STATUS_META[nextStatus]?.label ?? nextStatus}`)
      list.updateItem(service.id, (s) => ({ ...s, status: nextStatus }))
    } else {
      toast.error(result.error)
    }
    list.setActionLoadingId(null)
  }

  const handleDelete = async (service: VVService) => {
    const confirmed = await confirm({
      title: 'Usunąć usługę?',
      message: `Czy na pewno chcesz trwale usunąć "${service.title_pl}"? Tej akcji nie można cofnąć.`,
      confirmText: 'Usuń',
      variant: 'danger',
    })
    if (!confirmed) return

    list.setActionLoadingId(service.id)
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      list.setActionLoadingId(null)
      return
    }
    const result = await deleteService(service.id, csrfToken)
    if (result.success) {
      toast.success('Usłaga usunięta')
      list.removeItem(service.id)
    } else {
      toast.error(result.error)
    }
    list.setActionLoadingId(null)
  }

  const handleDuplicate = async (service: VVService) => {
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }
    list.setActionLoadingId(service.id)
    try {
      const result = await duplicateService(service.id, csrfToken)
      if (result.success) {
        toast.success('Usługa skopiowana')
        list.addItem(result.data)
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Wystąpił nieoczekiwany błąd. Spróbuj ponownie.')
    } finally {
      list.setActionLoadingId(null)
    }
  }

  const handleMoveUp = async (index: number) => {
    if (!csrfToken || index <= 0) return
    const newServices = [...list.data]
    const temp = newServices[index]
    newServices[index] = newServices[index - 1]
    newServices[index - 1] = temp
    list.setData(newServices)
    const ids = newServices.map((s) => s.id)
    await reorderServices(ids, csrfToken)
  }

  const handleMoveDown = async (index: number) => {
    if (!csrfToken || index >= list.data.length - 1) return
    const newServices = [...list.data]
    const temp = newServices[index]
    newServices[index] = newServices[index + 1]
    newServices[index + 1] = temp
    list.setData(newServices)
    const ids = newServices.map((s) => s.id)
    await reorderServices(ids, csrfToken)
  }

  const handleBulkDelete = async () => {
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }
    const confirmed = await confirm({
      title: 'Usunąć zaznaczone usługi?',
      message: `Czy na pewno chcesz trwale usunąć ${list.selectedIds.size} usług? Tej akcji nie można cofnąć.`,
      confirmText: 'Usuń',
      variant: 'danger',
    })
    if (!confirmed) return

    list.setBulkLoading(true)
    const deletedIds = new Set<string>()
    let failed = 0
    for (const id of list.selectedIds) {
      try {
        const result = await deleteService(id, csrfToken)
        if (result.success) deletedIds.add(id)
        else failed++
      } catch { failed++ }
    }
    list.setBulkLoading(false)
    if (deletedIds.size > 0) {
      list.removeItems(Array.from(deletedIds))
      for (const id of deletedIds) {
        if (list.selectedIds.has(id)) {
          list.toggleSelection(id)
        }
      }
      toast.success(`Usunięto ${deletedIds.size} usług`)
    }
    if (failed > 0) toast.error(`Nie udało się usunąć ${failed} usług`)
  }

  const handleBulkStatus = async (status: VVService['status']) => {
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }
    list.setBulkLoading(true)
    const updatedIds = new Set<string>()
    let failed = 0
    for (const id of list.selectedIds) {
      try {
        const result = await setServiceStatus(id, status, csrfToken)
        if (result.success) updatedIds.add(id)
        else failed++
      } catch { failed++ }
    }
    list.setBulkLoading(false)
    if (updatedIds.size > 0) {
      for (const id of updatedIds) {
        list.updateItem(id, (s) => ({ ...s, status }))
      }
    }
    list.clearSelection()
    const label = STATUS_META[status]?.label ?? status
    if (updatedIds.size > 0) toast.success(`Zmieniono status ${updatedIds.size} usług na: ${label}`)
    if (failed > 0) toast.error(`Nie udało się zmienić statusu ${failed} usług`)
  }

  const filtered = useMemo(() => {
    const normalizedSearch = list.search.toLowerCase()
    return list.data.filter((s) => {
      const matchesSearch =
        s.title_pl.toLowerCase().includes(normalizedSearch) ||
        (s.title_en ?? '').toLowerCase().includes(normalizedSearch) ||
        (s.short_desc_pl ?? '').toLowerCase().includes(normalizedSearch)
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [list.data, list.search, statusFilter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (list.sortBy === 'title_pl') {
        cmp = a.title_pl.localeCompare(b.title_pl)
      } else if (list.sortBy === 'order_index') {
        cmp = (a.order_index ?? 0) - (b.order_index ?? 0)
      } else {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      return list.sortOrder === 'asc' ? cmp : -cmp
    })
  }, [filtered, list.sortBy, list.sortOrder])

  const totalPages = Math.max(1, Math.ceil(sorted.length / list.perPage))
  const paginated = useMemo(() => {
    const start = (list.page - 1) * list.perPage
    return sorted.slice(start, start + list.perPage)
  }, [sorted, list.page, list.perPage])

  const statusCounts = useMemo(() => ({
    active: list.data.filter((s) => s.status === 'active').length,
    draft: list.data.filter((s) => s.status === 'draft').length,
    archived: list.data.filter((s) => s.status === 'archived').length,
  }), [list.data])

  const filterTabs: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'Wszystkie', count: list.data.length },
    { value: 'active', label: 'Aktywne', count: statusCounts.active },
    { value: 'draft', label: 'Szkice', count: statusCounts.draft },
    { value: 'archived', label: 'Archiwum', count: statusCounts.archived },
  ]

  return (
    <div className="w-full space-y-5 px-5 py-4 xl:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[21px] font-medium tracking-[-0.04em] text-[#111111]">Usługi</h1>
          <p className="mt-1 max-w-xl text-[12px] leading-5 text-[#656b76]">
            Zarządzaj usługami, publikacją i szkicami VezVision.
          </p>
        </div>
        {canManage && (
          <Link
            href="/vezvision/services/new"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] bg-[#111111] px-3 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-[#262626]"
          >
            <Plus className="h-3.5 w-3.5" />
            Nowa usługa
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-[6px] border border-[#e7e8ee] bg-white shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-[#ececf1] p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[#555b66]">
            {filterTabs.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => { list.setFilterValue(filter.value); list.setPage(1) }}
                className={`rounded-[4px] px-2.5 py-1 transition-colors ${
                  statusFilter === filter.value
                    ? 'bg-[#ececf1] text-[#111111]'
                    : 'text-[#555b66] hover:bg-[#f7f7f9] hover:text-[#111111]'
                }`}
              >
                {filter.label} {filter.count}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const was = list.sortBy === 'created_at'
                list.handleSort('created_at')
                if (!was) list.setSortOrder('desc')
                list.setPage(1)
              }}
              className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-[11px] transition-colors ${list.sortBy === 'created_at' ? 'bg-[#ececf1] text-[#111111]' : 'text-[#555b66] hover:bg-[#f7f7f9]'}`}
            >
              <ArrowUpDown className="h-3 w-3" />
              Data
            </button>
            <button
              type="button"
              onClick={() => {
                const was = list.sortBy === 'title_pl'
                list.handleSort('title_pl')
                if (!was) list.setSortOrder('asc')
                list.setPage(1)
              }}
              className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-[11px] transition-colors ${list.sortBy === 'title_pl' ? 'bg-[#ececf1] text-[#111111]' : 'text-[#555b66] hover:bg-[#f7f7f9]'}`}
            >
              <ArrowUpDown className="h-3 w-3" />
              Nazwa
            </button>
            <button
              type="button"
              onClick={() => {
                const was = list.sortBy === 'order_index'
                list.handleSort('order_index')
                if (!was) list.setSortOrder('asc')
                list.setPage(1)
              }}
              className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-[11px] transition-colors ${list.sortBy === 'order_index' ? 'bg-[#ececf1] text-[#111111]' : 'text-[#555b66] hover:bg-[#f7f7f9]'}`}
            >
              <ArrowUpDown className="h-3 w-3" />
              Kolejność
            </button>
            <div className="h-4 w-px bg-[#ececf1]" />
            <div className="relative w-full md:w-48">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8b9098]" />
              <input
                type="text"
                aria-label="Szukaj usług"
                value={list.search}
                onChange={(e) => { list.setSearch(e.target.value); list.setPage(1) }}
                placeholder="Szukaj po nazwie lub opisie..."
                className="h-9 w-full rounded-[4px] border border-[#ececf1] bg-[#fbfbfc] pl-9 pr-3 text-[12px] text-[#555b66] transition-colors placeholder:text-[#9ca3af] focus:border-[#d7d9e2] focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {list.selectedIds.size > 0 && canManage && (
          <div className="flex items-center gap-3 border-b border-[#ececf1] bg-[#fbfbfc] px-3 py-2">
            <span className="text-[12px] font-medium text-[#111111]">
              {list.selectedIds.size} zaznaczonych
            </span>
            <button
              type="button"
              onClick={() => handleBulkStatus('active')}
              disabled={list.bulkLoading}
              className="rounded-[4px] px-2.5 py-1 text-[11px] text-[#22a06b] transition-colors hover:bg-emerald-50 disabled:opacity-40"
            >
              Aktywuj
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatus('archived')}
              disabled={list.bulkLoading}
              className="rounded-[4px] px-2.5 py-1 text-[11px] text-orange-600 transition-colors hover:bg-orange-50 disabled:opacity-40"
            >
              Archiwizuj
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={list.bulkLoading}
              className="rounded-[4px] px-2.5 py-1 text-[11px] text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
            >
              Usuń
            </button>
            <button
              type="button"
              onClick={list.clearSelection}
              className="ml-auto text-[11px] text-[#8b9098] transition-colors hover:text-[#111111]"
            >
              Wyczyść
            </button>
          </div>
        )}

        {paginated.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              {list.search ? 'Brak wyników' : 'Brak usług'}
            </p>
            {!list.search && canManage && (
              <Link
                href="/vezvision/services/new"
                className="mt-4 inline-block text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-900"
              >
                Utwórz pierwszą usługę →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((service) => {
              const Icon = getServiceIcon(service.icon)
              return (
                <div
                  key={service.id}
                  className="group overflow-hidden rounded-[6px] border border-[#e7e8ee] bg-white transition-colors hover:border-[#d7d9e2]"
                >
                  <div className="flex items-start gap-3 p-4">
                    <div className="relative flex-shrink-0">
                      {canManage && (
                        <input
                          type="checkbox"
                          checked={list.selectedIds.has(service.id)}
                          onChange={() => list.toggleSelection(service.id)}
                          className={`absolute -left-1.5 -top-1.5 z-10 h-4 w-4 rounded-[3px] border-[#c5c8d4] accent-[#111111] transition-opacity ${list.selectedIds.has(service.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                          aria-label={`Zaznacz ${service.title_pl}`}
                        />
                      )}
                      <div className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc] text-[#656b76]">
                        {Icon ? <Icon className="h-5 w-5" /> : <span className="text-sm">{getServiceIconTextFallback(service.icon)}</span>}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[13px] font-medium text-[#111111]">
                          {service.title_pl}
                        </p>
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(service)}
                            disabled={list.actionLoadingId === service.id}
                            className="flex-shrink-0 disabled:opacity-40"
                            title="Kliknij, aby zmienić status"
                          >
                            <StatusBadge status={service.status} />
                          </button>
                        ) : (
                          <StatusBadge status={service.status} />
                        )}
                      </div>
                      {service.short_desc_pl && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-[#8b9098]">
                          {service.short_desc_pl}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#ececf1] px-4 py-2.5">
                    <span className="font-mono text-[11px] text-[#8b9098]">
                      #{service.order_index}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleMoveUp(list.data.findIndex((s) => s.id === service.id))}
                            disabled={list.actionLoadingId === service.id || list.data.findIndex((s) => s.id === service.id) <= 0}
                            className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111] disabled:opacity-30"
                            title="Przesuń w górę"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(list.data.findIndex((s) => s.id === service.id))}
                            disabled={list.actionLoadingId === service.id || list.data.findIndex((s) => s.id === service.id) >= list.data.length - 1}
                            className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111] disabled:opacity-30"
                            title="Przesuń w dół"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {canManage && (
                        <Link
                          href={`/vezvision/services/${service.id}`}
                          className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]"
                          title="Edytuj"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Link>
                      )}
                      <Link
                        href={`/vezvision/services/preview?id=${service.id}`}
                        target="_blank"
                        className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]"
                        title="Podgląd"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleDuplicate(service)}
                          disabled={list.actionLoadingId === service.id}
                          className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111] disabled:opacity-40"
                          title="Duplikuj"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleDelete(service)}
                          disabled={list.actionLoadingId === service.id}
                          className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          title="Usuń"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#ececf1] px-3 py-3">
            <span className="text-[11px] text-[#8b9098]">
              {sorted.length} usług · strona {list.page} z {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => list.setPage((p) => Math.max(1, p - 1))}
                disabled={list.page === 1}
                className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#656b76] transition-colors hover:bg-[#f0f0f4] disabled:opacity-30"
                aria-label="Poprzednia strona"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => list.setPage(p)}
                  className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-[4px] px-1.5 text-[11px] transition-colors ${
                    p === list.page
                      ? 'bg-[#111111] text-white'
                      : 'text-[#656b76] hover:bg-[#f0f0f4]'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => list.setPage((p) => Math.min(totalPages, p + 1))}
                disabled={list.page === totalPages}
                className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#656b76] transition-colors hover:bg-[#f0f0f4] disabled:opacity-30"
                aria-label="Następna strona"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
