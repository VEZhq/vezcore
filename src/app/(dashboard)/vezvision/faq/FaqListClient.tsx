'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Edit, Plus, Search, Trash2, Copy, ArrowUpDown, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { useDataList } from '@/hooks/useDataList'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import { useConfirm } from '@/components/ConfirmDialog'
import { deleteFaqItem, duplicateFaqItem, reorderFaqItems, setFaqItemStatus } from '@/lib/actions/vezvision/faq'
import type { VVFaqItem } from '@/lib/actions/vezvision/types'

interface FaqListClientProps {
  items: VVFaqItem[]
  canManage: boolean
}

type StatusFilter = 'all' | 'active' | 'hidden'

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-700 bg-emerald-50 border border-emerald-200">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Aktywny
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600 bg-slate-100 border border-slate-200">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Ukryty
    </span>
  )
}

export default function FaqListClient({ items: initialItems, canManage }: FaqListClientProps) {
  const { confirm } = useConfirm()
  const { token: csrfToken } = useCSRFToken()
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null)

  const list = useDataList<VVFaqItem>({
    initialData: initialItems,
    getId: (item) => item.id,
    perPage: 10,
    sortBy: 'created_at',
    sortOrder: 'desc',
  })

  const handleStatusToggle = async (item: VVFaqItem) => {
    if (!canManage) return
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    const nextActive = !item.is_active
    setStatusLoadingId(item.id)
    const result = await setFaqItemStatus(item.id, nextActive, csrfToken)
    if (result.success) {
      toast.success(`Status zmieniony na: ${nextActive ? 'Aktywny' : 'Ukryty'}`)
      list.updateItem(item.id, (i) => ({ ...i, is_active: nextActive }))
    } else {
      toast.error(result.error)
    }
    setStatusLoadingId(null)
  }

  const handleDelete = async (item: VVFaqItem) => {
    const confirmed = await confirm({
      title: 'Usunąć wpis FAQ?',
      message: `Czy na pewno chcesz trwale usunąć "${item.question_pl}"? Tej akcji nie można cofnąć.`,
      confirmText: 'Usuń',
      variant: 'danger',
    })
    if (!confirmed) return

    list.setActionLoadingId(item.id)
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      list.setActionLoadingId(null)
      return
    }
    const result = await deleteFaqItem(item.id, csrfToken)
    if (result.success) {
      toast.success('Wpis usunięty')
      list.removeItem(item.id)
    } else {
      toast.error(result.error)
    }
    list.setActionLoadingId(null)
  }

  const handleDuplicate = async (item: VVFaqItem) => {
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }
    list.setActionLoadingId(item.id)
    try {
      const result = await duplicateFaqItem(item.id, csrfToken)
      if (result.success) {
        toast.success('Wpis skopiowany')
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
    const newItems = [...list.data]
    const temp = newItems[index]
    newItems[index] = newItems[index - 1]
    newItems[index - 1] = temp
    list.setData(newItems)
    const ids = newItems.map((i) => i.id)
    await reorderFaqItems(ids, csrfToken)
  }

  const handleMoveDown = async (index: number) => {
    if (!csrfToken || index >= list.data.length - 1) return
    const newItems = [...list.data]
    const temp = newItems[index]
    newItems[index] = newItems[index + 1]
    newItems[index + 1] = temp
    list.setData(newItems)
    const ids = newItems.map((i) => i.id)
    await reorderFaqItems(ids, csrfToken)
  }

  const handleBulkDelete = async () => {
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }
    const confirmed = await confirm({
      title: 'Usunąć zaznaczone wpisy?',
      message: `Czy na pewno chcesz trwale usunąć ${list.selectedIds.size} wpisów? Tej akcji nie można cofnąć.`,
      confirmText: 'Usuń',
      variant: 'danger',
    })
    if (!confirmed) return

    list.setBulkLoading(true)
    const deletedIds = new Set<string>()
    let failed = 0
    for (const id of list.selectedIds) {
      try {
        const result = await deleteFaqItem(id, csrfToken)
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
      toast.success(`Usunięto ${deletedIds.size} wpisów`)
    }
    if (failed > 0) toast.error(`Nie udało się usunąć ${failed} wpisów`)
  }

  const handleBulkStatus = async (active: boolean) => {
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }
    list.setBulkLoading(true)
    const updatedIds = new Set<string>()
    let failed = 0
    for (const id of list.selectedIds) {
      try {
        const result = await setFaqItemStatus(id, active, csrfToken)
        if (result.success) updatedIds.add(id)
        else failed++
      } catch { failed++ }
    }
    list.setBulkLoading(false)
    if (updatedIds.size > 0) {
      for (const id of updatedIds) {
        list.updateItem(id, (i) => ({ ...i, is_active: active }))
      }
    }
    list.clearSelection()
    if (updatedIds.size > 0) toast.success(`Zmieniono status ${updatedIds.size} wpisów na: ${active ? 'Aktywny' : 'Ukryty'}`)
    if (failed > 0) toast.error(`Nie udało się zmienić statusu ${failed} wpisów`)
  }

  const filtered = useMemo(() => {
    const normalizedSearch = list.search.toLowerCase()
    return list.data.filter((item) => {
      const matchesSearch =
        item.question_pl.toLowerCase().includes(normalizedSearch) ||
        (item.question_en ?? '').toLowerCase().includes(normalizedSearch) ||
        item.answer_pl.toLowerCase().includes(normalizedSearch)
      const matchesStatus = list.filterValue === 'all' || (list.filterValue === 'active' ? item.is_active : !item.is_active)
      return matchesSearch && matchesStatus
    })
  }, [list.data, list.search, list.filterValue])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (list.sortBy === 'question_pl') {
        cmp = a.question_pl.localeCompare(b.question_pl)
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
    active: list.data.filter((i) => i.is_active).length,
    hidden: list.data.filter((i) => !i.is_active).length,
  }), [list.data])

  const filterTabs: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'Wszystkie', count: list.data.length },
    { value: 'active', label: 'Aktywne', count: statusCounts.active },
    { value: 'hidden', label: 'Ukryte', count: statusCounts.hidden },
  ]

  return (
    <div className="w-full space-y-5 px-5 py-4 xl:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[21px] font-medium tracking-[-0.04em] text-[#111111]">FAQ</h1>
          <p className="mt-1 max-w-xl text-[12px] leading-5 text-[#656b76]">
            Zarządzaj pytaniami i odpowiedziami VezVision.
          </p>
        </div>
        {canManage && (
          <Link
            href="/vezvision/faq/new"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] bg-[#111111] px-3 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-[#262626]"
          >
            <Plus className="h-3.5 w-3.5" />
            Nowy wpis
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
                  list.filterValue === filter.value
                    ? 'bg-[#ececf1] text-[#111111]'
                    : 'text-[#555b66] hover:bg-[#f7f7f9] hover:text-[#111111]'
                }`}
              >
                {filter.label} {filter.count}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-[#555b66]">
                <input
                  type="checkbox"
                  checked={paginated.length > 0 && paginated.every((i) => list.selectedIds.has(i.id))}
                  onChange={() => list.toggleAll(paginated.map((i) => i.id))}
                  className="h-3.5 w-3.5 rounded-[3px] border-[#c5c8d4] accent-[#111111]"
                  aria-label="Zaznacz wszystkie na stronie"
                />
                Zaznacz wszystkie
              </label>
            )}
            <div className="h-4 w-px bg-[#ececf1]" />
            <button
              type="button"
              onClick={() => {
                if (list.sortBy === 'created_at') {
                  list.setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
                } else {
                  list.setSortBy('created_at')
                  list.setSortOrder('desc')
                }
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
                if (list.sortBy === 'question_pl') {
                  list.setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
                } else {
                  list.setSortBy('question_pl')
                  list.setSortOrder('asc')
                }
                list.setPage(1)
              }}
              className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-[11px] transition-colors ${list.sortBy === 'question_pl' ? 'bg-[#ececf1] text-[#111111]' : 'text-[#555b66] hover:bg-[#f7f7f9]'}`}
            >
              <ArrowUpDown className="h-3 w-3" />
              Pytanie
            </button>
            <button
              type="button"
              onClick={() => {
                if (list.sortBy === 'order_index') {
                  list.setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
                } else {
                  list.setSortBy('order_index')
                  list.setSortOrder('asc')
                }
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
                aria-label="Szukaj w FAQ"
                value={list.search}
                onChange={(e) => { list.setSearch(e.target.value); list.setPage(1) }}
                placeholder="Szukaj po pytaniu lub odpowiedzi..."
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
              onClick={() => handleBulkStatus(true)}
              disabled={list.bulkLoading}
              className="rounded-[4px] px-2.5 py-1 text-[11px] text-[#22a06b] transition-colors hover:bg-emerald-50 disabled:opacity-40"
            >
              Aktywuj
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatus(false)}
              disabled={list.bulkLoading}
              className="rounded-[4px] px-2.5 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              Ukryj
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
              {list.search ? 'Brak wyników' : 'Brak wpisów FAQ'}
            </p>
            {!list.search && canManage && (
              <Link
                href="/vezvision/faq/new"
                className="mt-4 inline-block text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-900"
              >
                Utwórz pierwszy wpis →
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#ececf1]">
            {paginated.map((item) => (
              <div
                key={item.id}
                className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[#fbfbfc] md:px-6 md:py-4"
              >
                  {canManage && (
                    <input
                      type="checkbox"
                      checked={list.selectedIds.has(item.id)}
                      onChange={() => list.toggleSelection(item.id)}
                      className={`mt-1 h-4 w-4 flex-shrink-0 rounded-[3px] border-[#c5c8d4] accent-[#111111] transition-opacity ${list.selectedIds.has(item.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      aria-label={`Zaznacz ${item.question_pl}`}
                    />
                  )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-medium text-[#111111]">
                      {item.question_pl}
                    </p>
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => handleStatusToggle(item)}
                        disabled={statusLoadingId === item.id}
                        className="flex-shrink-0 disabled:opacity-40"
                        title="Kliknij, aby zmienić status"
                      >
                        <StatusBadge active={item.is_active} />
                      </button>
                    ) : (
                      <StatusBadge active={item.is_active} />
                    )}
                  </div>
                  {item.question_en && (
                    <p className="mt-0.5 text-[11px] text-[#8b9098]">{item.question_en}</p>
                  )}
                  <p className="mt-1 line-clamp-2 text-[12px] text-[#656b76]">
                    {item.answer_pl}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-0.5">
                  <span className="mr-2 font-mono text-[11px] text-[#8b9098]">
                    #{item.order_index}
                  </span>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleMoveUp(list.data.findIndex((i) => i.id === item.id))}
                        disabled={list.actionLoadingId === item.id || list.data.findIndex((i) => i.id === item.id) <= 0}
                        className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111] disabled:opacity-30"
                        title="Przesuń w górę"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(list.data.findIndex((i) => i.id === item.id))}
                        disabled={list.actionLoadingId === item.id || list.data.findIndex((i) => i.id === item.id) >= list.data.length - 1}
                        className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111] disabled:opacity-30"
                        title="Przesuń w dół"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  {canManage && (
                    <Link
                      href={`/vezvision/faq/${item.id}`}
                      className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]"
                      title="Edytuj"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDuplicate(item)}
                      disabled={list.actionLoadingId === item.id}
                      className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111] disabled:opacity-40"
                      title="Duplikuj"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={list.actionLoadingId === item.id}
                      className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      title="Usuń"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#ececf1] px-3 py-3">
            <span className="text-[11px] text-[#8b9098]">
              {sorted.length} wpisów · strona {list.page} z {totalPages}
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
