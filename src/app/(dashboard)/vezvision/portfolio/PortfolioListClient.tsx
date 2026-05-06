'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Plus, Edit, Trash2, Copy, Eye, Image as ImageIcon, ArrowUpDown, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { useConfirm } from '@/components/ConfirmDialog'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import { useDataList } from '@/hooks/useDataList'
import { deleteProject, duplicateProject, reorderProjects, setProjectStatus } from '@/lib/actions/vezvision/portfolio'
import type { VVProject } from '@/lib/actions/vezvision/types'

interface PortfolioListClientProps {
  projects: VVProject[]
  canManage: boolean
}

type StatusFilter = 'all' | VVProject['status']

const STATUS_META: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  published: {
    label: 'Opublikowany',
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

function StatusBadge({ status }: { status: VVProject['status'] }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${meta.text} ${meta.bg} border ${meta.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

export default function PortfolioListClient({ projects: initialProjects, canManage }: PortfolioListClientProps) {
  const { confirm } = useConfirm()
  const { token: csrfToken } = useCSRFToken()
  const {
    data,
    setData,
    search,
    setSearch,
    filterValue,
    setFilterValue,
    page,
    setPage,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    selectedIds,
    setSelectedIds,
    toggleSelection,
    toggleAll,
    clearSelection,
    actionLoadingId,
    setActionLoadingId,
    bulkLoading,
    setBulkLoading,
    normalizedSearch,
    updateItem,
    removeItem,
    addItem,
    removeItems,
    perPage,
  } = useDataList<VVProject>({
    initialData: initialProjects,
    getId: (item) => item.id,
    perPage: 9,
    sortBy: 'created_at',
    sortOrder: 'desc',
  })

  const getNextStatus = (status: VVProject['status']): VVProject['status'] => {
    if (status === 'draft') return 'published'
    if (status === 'published') return 'archived'
    return 'draft'
  }

  const handleStatusToggle = async (project: VVProject) => {
    if (!canManage) return
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    const nextStatus = getNextStatus(project.status)
    setActionLoadingId(project.id)
    const result = await setProjectStatus(project.id, nextStatus, csrfToken)
    if (result.success) {
      toast.success(`Status zmieniony na: ${STATUS_META[nextStatus]?.label ?? nextStatus}`)
      updateItem(project.id, (p) => ({ ...p, status: nextStatus }))
    } else {
      toast.error(result.error)
    }
    setActionLoadingId(null)
  }

  const handleDelete = async (project: VVProject) => {
    const confirmed = await confirm({
      title: 'Usunąć projekt?',
      message: `Czy na pewno chcesz trwale usunąć "${project.title_pl}"? Tej akcji nie można cofnąć.`,
      confirmText: 'Usuń',
      variant: 'danger',
    })
    if (!confirmed) return

    setActionLoadingId(project.id)
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      setActionLoadingId(null)
      return
    }
    const result = await deleteProject(project.id, csrfToken)
    if (result.success) {
      toast.success('Projekt usunięty')
      removeItem(project.id)
    } else {
      toast.error(result.error)
    }
    setActionLoadingId(null)
  }

  const handleDuplicate = async (project: VVProject) => {
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }
    setActionLoadingId(project.id)
    try {
      const result = await duplicateProject(project.id, csrfToken)
      if (result.success) {
        toast.success('Projekt skopiowany')
        addItem(result.data)
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Wystąpił nieoczekiwany błąd. Spróbuj ponownie.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleMoveUp = async (index: number) => {
    if (!csrfToken || index <= 0) return
    const newProjects = [...data]
    const temp = newProjects[index]
    newProjects[index] = newProjects[index - 1]
    newProjects[index - 1] = temp
    setData(newProjects)
    const ids = newProjects.map((p) => p.id)
    await reorderProjects(ids, csrfToken)
  }

  const handleMoveDown = async (index: number) => {
    if (!csrfToken || index >= data.length - 1) return
    const newProjects = [...data]
    const temp = newProjects[index]
    newProjects[index] = newProjects[index + 1]
    newProjects[index + 1] = temp
    setData(newProjects)
    const ids = newProjects.map((p) => p.id)
    await reorderProjects(ids, csrfToken)
  }

  const handleBulkDelete = async () => {
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }
    const confirmed = await confirm({
      title: 'Usunąć zaznaczone projekty?',
      message: `Czy na pewno chcesz trwale usunąć ${selectedIds.size} projektów? Tej akcji nie można cofnąć.`,
      confirmText: 'Usuń',
      variant: 'danger',
    })
    if (!confirmed) return

    setBulkLoading(true)
    const deletedIds = new Set<string>()
    let failed = 0
    for (const id of selectedIds) {
      try {
        const result = await deleteProject(id, csrfToken)
        if (result.success) deletedIds.add(id)
        else failed++
      } catch { failed++ }
    }
    setBulkLoading(false)
    if (deletedIds.size > 0) {
      removeItems(Array.from(deletedIds))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const id of deletedIds) next.delete(id)
        return next
      })
      toast.success(`Usunięto ${deletedIds.size} projektów`)
    }
    if (failed > 0) toast.error(`Nie udało się usunąć ${failed} projektów`)
  }

  const handleBulkStatus = async (status: VVProject['status']) => {
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }
    setBulkLoading(true)
    const updatedIds = new Set<string>()
    let failed = 0
    for (const id of selectedIds) {
      try {
        const result = await setProjectStatus(id, status, csrfToken)
        if (result.success) updatedIds.add(id)
        else failed++
      } catch { failed++ }
    }
    setBulkLoading(false)
    if (updatedIds.size > 0) {
      for (const id of updatedIds) {
        updateItem(id, (p) => ({ ...p, status }))
      }
    }
    clearSelection()
    const label = STATUS_META[status]?.label ?? status
    if (updatedIds.size > 0) toast.success(`Zmieniono status ${updatedIds.size} projektów na: ${label}`)
    if (failed > 0) toast.error(`Nie udało się zmienić statusu ${failed} projektów`)
  }

  const filtered = useMemo(() => {
    return data.filter((p) => {
      const matchesSearch =
        p.title_pl.toLowerCase().includes(normalizedSearch) ||
        (p.title_en ?? '').toLowerCase().includes(normalizedSearch) ||
        (p.client_name ?? '').toLowerCase().includes(normalizedSearch)
      const matchesStatus = filterValue === 'all' || p.status === filterValue
      return matchesSearch && matchesStatus
    })
  }, [data, normalizedSearch, filterValue])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'title_pl') {
        cmp = a.title_pl.localeCompare(b.title_pl)
      } else if (sortBy === 'order_index') {
        cmp = a.order_index - b.order_index
      } else {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortBy, sortOrder])

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage
    return sorted.slice(start, start + perPage)
  }, [sorted, page, perPage])

  const statusCounts = useMemo(() => ({
    published: data.filter((p) => p.status === 'published').length,
    draft: data.filter((p) => p.status === 'draft').length,
    archived: data.filter((p) => p.status === 'archived').length,
  }), [data])

  const filterTabs: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'Wszystkie', count: data.length },
    { value: 'published', label: 'Opublikowane', count: statusCounts.published },
    { value: 'draft', label: 'Szkice', count: statusCounts.draft },
    { value: 'archived', label: 'Archiwum', count: statusCounts.archived },
  ]

  return (
    <div className="w-full space-y-5 px-5 py-4 xl:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[21px] font-medium tracking-[-0.04em] text-[#111111]">Portfolio</h1>
          <p className="mt-1 max-w-xl text-[12px] leading-5 text-[#656b76]">
            Zarządzaj projektami, publikacją i szkicami VezVision.
          </p>
        </div>
        {canManage && (
          <Link
            href="/vezvision/portfolio/new"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] bg-[#111111] px-3 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-[#262626]"
          >
            <Plus className="h-3.5 w-3.5" />
            Nowy projekt
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
                onClick={() => { setFilterValue(filter.value); setPage(1) }}
                className={`rounded-[4px] px-2.5 py-1 transition-colors ${
                  filterValue === filter.value
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
                  checked={paginated.length > 0 && paginated.every((p) => selectedIds.has(p.id))}
                  onChange={() => toggleAll(paginated.map((p) => p.id))}
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
                if (sortBy === 'created_at') {
                  setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
                } else {
                  setSortBy('created_at')
                  setSortOrder('desc')
                }
                setPage(1)
              }}
              className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-[11px] transition-colors ${sortBy === 'created_at' ? 'bg-[#ececf1] text-[#111111]' : 'text-[#555b66] hover:bg-[#f7f7f9]'}`}
              title="Sortuj po dacie"
            >
              <ArrowUpDown className="h-3 w-3" />
              Data
            </button>
            <button
              type="button"
              onClick={() => {
                if (sortBy === 'title_pl') {
                  setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
                } else {
                  setSortBy('title_pl')
                  setSortOrder('asc')
                }
                setPage(1)
              }}
              className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-[11px] transition-colors ${sortBy === 'title_pl' ? 'bg-[#ececf1] text-[#111111]' : 'text-[#555b66] hover:bg-[#f7f7f9]'}`}
              title="Sortuj po nazwie"
            >
              <ArrowUpDown className="h-3 w-3" />
              Nazwa
            </button>
            <button
              type="button"
              onClick={() => {
                if (sortBy === 'order_index') {
                  setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
                } else {
                  setSortBy('order_index')
                  setSortOrder('asc')
                }
                setPage(1)
              }}
              className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-[11px] transition-colors ${sortBy === 'order_index' ? 'bg-[#ececf1] text-[#111111]' : 'text-[#555b66] hover:bg-[#f7f7f9]'}`}
              title="Sortuj po kolejności"
            >
              <ArrowUpDown className="h-3 w-3" />
              Kolejność
            </button>
            <div className="h-4 w-px bg-[#ececf1]" />
            <div className="relative w-full md:w-48">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8b9098]" />
              <input
                type="text"
                aria-label="Szukaj projektów"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Szukaj po nazwie lub kliencie..."
                className="h-9 w-full rounded-[4px] border border-[#ececf1] bg-[#fbfbfc] pl-9 pr-3 text-[12px] text-[#555b66] transition-colors placeholder:text-[#9ca3af] focus:border-[#d7d9e2] focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {selectedIds.size > 0 && canManage && (
          <div className="flex items-center gap-3 border-b border-[#ececf1] bg-[#fbfbfc] px-3 py-2">
            <span className="text-[12px] font-medium text-[#111111]">
              {selectedIds.size} zaznaczonych
            </span>
            <button
              type="button"
              onClick={() => handleBulkStatus('published')}
              disabled={bulkLoading}
              className="rounded-[4px] px-2.5 py-1 text-[11px] text-[#22a06b] transition-colors hover:bg-emerald-50 disabled:opacity-40"
            >
              Opublikuj
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatus('archived')}
              disabled={bulkLoading}
              className="rounded-[4px] px-2.5 py-1 text-[11px] text-orange-600 transition-colors hover:bg-orange-50 disabled:opacity-40"
            >
              Archiwizuj
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkLoading}
              className="rounded-[4px] px-2.5 py-1 text-[11px] text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
            >
              Usuń
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="ml-auto text-[11px] text-[#8b9098] transition-colors hover:text-[#111111]"
            >
              Wyczyść
            </button>
          </div>
        )}

        {paginated.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              {search ? 'Brak wyników' : 'Brak projektów'}
            </p>
            {!search && canManage && (
              <Link
                href="/vezvision/portfolio/new"
                className="mt-4 inline-block text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-900"
              >
                Utwórz pierwszy projekt →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((project) => (
              <div
                key={project.id}
                className="group overflow-hidden rounded-[6px] border border-[#e7e8ee] bg-white transition-colors hover:border-[#d7d9e2]"
              >
                <div className="relative aspect-video overflow-hidden border-b border-[#ececf1] bg-[#fbfbfc]">
                  {project.cover_image ? (
                    <Image
                      src={project.cover_image}
                      alt={project.title_pl}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-[#c5c8d4]" />
                    </div>
                  )}
                  {canManage && (
                    <div className="absolute left-2 top-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(project.id)}
                        onChange={() => toggleSelection(project.id)}
                        className="h-4 w-4 rounded-[3px] border-[#c5c8d4] accent-[#111111]"
                        aria-label={`Zaznacz ${project.title_pl}`}
                      />
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-[#111111]">
                        {project.title_pl}
                      </p>
                      {project.client_name && (
                        <p className="mt-0.5 truncate text-[11px] text-[#8b9098]">
                          {project.client_name}
                        </p>
                      )}
                    </div>
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => handleStatusToggle(project)}
                        disabled={actionLoadingId === project.id}
                        className="disabled:opacity-40"
                        title="Kliknij, aby zmienić status"
                      >
                        <StatusBadge status={project.status} />
                      </button>
                    ) : (
                      <StatusBadge status={project.status} />
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-[#ececf1] pt-3">
                    <span className="font-mono text-[11px] text-[#8b9098]">
                      #{project.order_index}
                    </span>
                    <div className="flex items-center gap-1">
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleMoveUp(data.findIndex((p) => p.id === project.id))}
                            disabled={actionLoadingId === project.id || data.findIndex((p) => p.id === project.id) <= 0}
                            className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111] disabled:opacity-30"
                            title="Przesuń w górę"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(data.findIndex((p) => p.id === project.id))}
                            disabled={actionLoadingId === project.id || data.findIndex((p) => p.id === project.id) >= data.length - 1}
                            className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111] disabled:opacity-30"
                            title="Przesuń w dół"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {canManage && (
                        <Link
                          href={`/vezvision/portfolio/${project.id}`}
                          className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]"
                          title="Edytuj"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Link>
                      )}
                      <Link
                        href={`/vezvision/portfolio/preview?id=${project.id}`}
                        target="_blank"
                        className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]"
                        title="Podgląd"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleDuplicate(project)}
                          disabled={actionLoadingId === project.id}
                          className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111] disabled:opacity-40"
                          title="Duplikuj"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleDelete(project)}
                          disabled={actionLoadingId === project.id}
                          className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          title="Usuń"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#ececf1] px-3 py-3">
            <span className="text-[11px] text-[#8b9098]">
              {sorted.length} projektów · strona {page} z {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#656b76] transition-colors hover:bg-[#f0f0f4] disabled:opacity-30"
                aria-label="Poprzednia strona"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-[4px] px-1.5 text-[11px] transition-colors ${
                    p === page
                      ? 'bg-[#111111] text-white'
                      : 'text-[#656b76] hover:bg-[#f0f0f4]'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
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
