'use client'

import { useMemo, useDeferredValue } from 'react'
import Link from 'next/link'
import { Search, Plus, Edit, Trash2, Eye, EyeOff, Clock3, CalendarDays, Tags, Copy, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useConfirm } from '@/components/ConfirmDialog'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import { useDataList } from '@/hooks/useDataList'
import { deleteBlogPost, duplicateBlogPost, publishBlogPost, unpublishBlogPost, updateBlogPostStatus } from '@/lib/actions/vezvision/blog'
import type { VVBlogPost } from '@/lib/actions/vezvision/types'
import { StatusBadge, StatusButton, formatDate, pageWrapCls, listPanelCls, primaryBtnCls, iconBtnCls, STATUS_META } from './blog-list-utils'

interface BlogListClientProps {
  posts: VVBlogPost[]
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canPublish: boolean
}

type StatusFilter = 'all' | VVBlogPost['status']

export default function BlogListClient({ posts: initialPosts, canCreate, canEdit, canDelete, canPublish }: BlogListClientProps) {
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
    toggleSelection,
    toggleAll: listToggleAll,
    clearSelection,
    actionLoadingId,
    setActionLoadingId,
    bulkLoading,
    setBulkLoading,
    updateItem,
    removeItem,
    addItem,
    removeItems,
    perPage,
  } = useDataList<VVBlogPost>({
    initialData: initialPosts,
    getId: (item) => item.id,
    perPage: 10,
    sortBy: 'created_at',
    sortOrder: 'desc',
  })

  const deferredSearch = useDeferredValue(search)

  const filtered = useMemo(() => {
    const normalizedSearch = deferredSearch.toLowerCase()
    return data.filter((p) => {
      const matchesSearch = p.title_pl.toLowerCase().includes(normalizedSearch) ||
        (p.title_en ?? '').toLowerCase().includes(normalizedSearch)
      const matchesStatus = filterValue === 'all' || p.status === filterValue
      return matchesSearch && matchesStatus
    })
  }, [data, deferredSearch, filterValue])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'title_pl') {
        cmp = a.title_pl.localeCompare(b.title_pl)
      } else if (sortBy === 'views_count') {
        cmp = a.views_count - b.views_count
      } else if (sortBy === 'reading_time') {
        cmp = a.reading_time - b.reading_time
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
    published: data.filter((post) => post.status === 'published').length,
    draft: data.filter((post) => post.status === 'draft').length,
    archived: data.filter((post) => post.status === 'archived').length,
    scheduled: data.filter((post) => post.status === 'scheduled').length,
  }), [data])

  const handleDuplicate = async (post: VVBlogPost) => {
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }
    setActionLoadingId(post.id)
    try {
      const result = await duplicateBlogPost(post.id, csrfToken)
      if (result.success) {
        toast.success('Post skopiowany')
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

  const handleDelete = async (post: VVBlogPost) => {
    const confirmed = await confirm({
      title: 'Usunąć post?',
      message: `Czy na pewno chcesz trwale usunąć "${post.title_pl}"? Tej akcji nie można cofnąć.`,
      confirmText: 'Usuń',
      variant: 'danger',
    })
    if (!confirmed) return

    setActionLoadingId(post.id)
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      setActionLoadingId(null)
      return
    }
    const result = await deleteBlogPost(post.id, csrfToken)
    if (result.success) {
      toast.success('Post usunięty')
      removeItem(post.id)
      if (selectedIds.has(post.id)) {
        toggleSelection(post.id)
      }
    } else {
      toast.error(result.error)
    }
    setActionLoadingId(null)
  }

  const handleTogglePublish = async (post: VVBlogPost) => {
    setActionLoadingId(post.id)
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      setActionLoadingId(null)
      return
    }
    const action = post.status === 'published' ? unpublishBlogPost : publishBlogPost
    const result = await action(post.id, csrfToken)
    if (result.success) {
      const newStatus = post.status === 'published' ? 'draft' : 'published'
      toast.success(post.status === 'published' ? 'Post wycofany do szkicu' : 'Post opublikowany')
      updateItem(post.id, (p) => ({ ...p, status: newStatus }))
    } else {
      toast.error(result.error)
    }
    setActionLoadingId(null)
  }

  const handleStatusChange = async (post: VVBlogPost, status: VVBlogPost['status']) => {
    setActionLoadingId(post.id)
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      setActionLoadingId(null)
      return
    }
    try {
      const result = await updateBlogPostStatus(post.id, status, csrfToken)
      if (result.success) {
        const label = STATUS_META[status]?.label ?? status
        toast.success(`Status zmieniony na: ${label}`)
        updateItem(post.id, (p) => ({ ...p, status }))
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Wystąpił nieoczekiwany błąd. Spróbuj ponownie.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleToggleAll = () => {
    const allPageIds = paginated.map((p) => p.id)
    listToggleAll(allPageIds)
  }

  const handleBulkDelete = async () => {
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }
    const confirmed = await confirm({
      title: 'Usunąć zaznaczone posty?',
      message: `Czy na pewno chcesz trwale usunąć ${selectedIds.size} postów? Tej akcji nie można cofnąć.`,
      confirmText: 'Usuń',
      variant: 'danger',
    })
    if (!confirmed) return

    setBulkLoading(true)
    const deletedIds = new Set<string>()
    let failed = 0
    for (const id of selectedIds) {
      try {
        const result = await deleteBlogPost(id, csrfToken)
        if (result.success) {
          deletedIds.add(id)
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }
    setBulkLoading(false)
    if (deletedIds.size > 0) {
      removeItems([...deletedIds])
      for (const id of deletedIds) {
        if (selectedIds.has(id)) {
          toggleSelection(id)
        }
      }
      toast.success(`Usunięto ${deletedIds.size} postów`)
    }
    if (failed > 0) toast.error(`Nie udało się usunąć ${failed} postów`)
  }

  const handleBulkStatus = async (status: VVBlogPost['status']) => {
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }
    setBulkLoading(true)
    const updatedIds = new Set<string>()
    let failed = 0
    for (const id of selectedIds) {
      try {
        const result = await updateBlogPostStatus(id, status, csrfToken)
        if (result.success) updatedIds.add(id)
        else failed++
      } catch {
        failed++
      }
    }
    setBulkLoading(false)
    if (updatedIds.size > 0) {
      for (const id of updatedIds) {
        updateItem(id, (p) => ({ ...p, status }))
      }
    }
    clearSelection()
    const label = STATUS_META[status]?.label ?? status
    if (updatedIds.size > 0) toast.success(`Zmieniono status ${updatedIds.size} postów na: ${label}`)
    if (failed > 0) toast.error(`Nie udało się zmienić statusu ${failed} postów`)
  }

  const filterTabs: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'Wszystkie', count: data.length },
    { value: 'published', label: 'Opublikowane', count: statusCounts.published },
    { value: 'draft', label: 'Szkice', count: statusCounts.draft },
    { value: 'scheduled', label: 'Zaplanowane', count: statusCounts.scheduled },
    { value: 'archived', label: 'Archiwum', count: statusCounts.archived },
  ]

  return (
    <div className={pageWrapCls}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[21px] font-medium tracking-[-0.04em] text-[#111111]">Blog</h1>
          <p className="mt-1 max-w-xl text-[12px] leading-5 text-[#656b76]">
            Zarządzaj wpisami, publikacją i szkicami VezVision.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/vezvision/blog/new"
            className={primaryBtnCls}
          >
            <Plus className="h-3.5 w-3.5" />
            Nowy post
          </Link>
        )}
      </div>

      <div className={listPanelCls}>
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
              title="Sortuj po tytule"
            >
              <ArrowUpDown className="h-3 w-3" />
              Tytuł
            </button>
            <button
              type="button"
              onClick={() => {
                if (sortBy === 'views_count') {
                  setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
                } else {
                  setSortBy('views_count')
                  setSortOrder('desc')
                }
                setPage(1)
              }}
              className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-[11px] transition-colors ${sortBy === 'views_count' ? 'bg-[#ececf1] text-[#111111]' : 'text-[#555b66] hover:bg-[#f7f7f9]'}`}
              title="Sortuj po wyświetleniach"
            >
              <ArrowUpDown className="h-3 w-3" />
              Views
            </button>
            <div className="h-4 w-px bg-[#ececf1]" />
            <div className="relative w-full md:w-48">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8b9098]" />
              <input
                type="text"
                aria-label="Szukaj postów po tytule"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Szukaj po tytule..."
                className="h-9 w-full rounded-[4px] border border-[#ececf1] bg-[#fbfbfc] pl-9 pr-3 text-[12px] text-[#555b66] transition-colors placeholder:text-[#9ca3af] focus:border-[#d7d9e2] focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 border-b border-[#ececf1] bg-[#f7f7f9] px-3 py-2">
            <span className="text-[11px] text-[#555b66]">Zaznaczono: {selectedIds.size}</span>
            <div className="ml-auto flex items-center gap-1.5">
              {canPublish && (
                <button
                  type="button"
                  onClick={() => handleBulkStatus('published')}
                  disabled={bulkLoading}
                  className="rounded-[4px] bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40"
                >
                  Opublikuj
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleBulkStatus('archived')}
                  disabled={bulkLoading}
                  className="rounded-[4px] bg-orange-50 px-2.5 py-1 text-[11px] text-orange-700 transition-colors hover:bg-orange-100 disabled:opacity-40"
                >
                  Archiwizuj
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={bulkLoading}
                  className="rounded-[4px] bg-red-50 px-2.5 py-1 text-[11px] text-red-600 transition-colors hover:bg-red-100 disabled:opacity-40"
                >
                  Usuń
                </button>
              )}
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-[4px] px-2 py-1 text-[11px] text-[#656b76] transition-colors hover:bg-[#ececf1]"
              >
                Anuluj
              </button>
            </div>
          </div>
        )}

        {paginated.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              {search ? 'Brak wyników' : 'Brak postów'}
            </p>
            {!search && canCreate && (
              <Link
                href="/vezvision/blog/new"
                className="mt-4 inline-block text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-900"
              >
                Utwórz pierwszy post →
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#ececf1]">
            <div className="hidden items-center gap-3 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8b9098] lg:grid lg:grid-cols-[20px_minmax(0,1fr)_132px_90px_92px_112px]">
              <input
                type="checkbox"
                checked={paginated.every((p) => selectedIds.has(p.id))}
                onChange={handleToggleAll}
                className="h-3.5 w-3.5 rounded border-[#d7d9e2] accent-[#111111]"
                aria-label="Zaznacz wszystkie na stronie"
              />
              <span>Post</span>
              <span>Status</span>
              <span>Czas</span>
              <span>Data</span>
              <span className="text-right">Akcje</span>
            </div>
            {paginated.map((post) => (
              <article key={post.id} className="grid gap-3 px-3 py-3 transition-colors hover:bg-[#fbfbfc] lg:grid-cols-[20px_minmax(0,1fr)_132px_90px_92px_112px] lg:items-center">
                <input
                  type="checkbox"
                  checked={selectedIds.has(post.id)}
                  onChange={() => toggleSelection(post.id)}
                  className="h-3.5 w-3.5 rounded border-[#d7d9e2] accent-[#111111]"
                  aria-label={`Zaznacz post ${post.title_pl}`}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {canEdit ? (
                      <Link href={`/vezvision/blog/${post.id}`} className="truncate text-[13px] font-medium text-[#111111] transition-colors hover:text-[#22a06b]">
                        {post.title_pl}
                      </Link>
                    ) : (
                      <p className="truncate text-[13px] font-medium text-[#111111]">{post.title_pl}</p>
                    )}
                    {post.featured && <span className="rounded-[4px] bg-[#fff4d8] px-1.5 py-0.5 text-[10px] text-[#946200]">Wyróżniony</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#8b9098]">
                    {post.title_en && <span className="truncate">{post.title_en}</span>}
                    <span className="inline-flex items-center gap-1"><Tags className="h-3 w-3" />{post.tags_pl.length}</span>
                    <span>{post.views_count} views</span>
                  </div>
                </div>

                <StatusButton
                  post={post}
                  canManage={canEdit}
                  canPublish={canPublish}
                  onChange={handleStatusChange}
                  disabled={actionLoadingId === post.id}
                />

                <span className="inline-flex items-center gap-1 text-[12px] text-[#656b76]">
                  <Clock3 className="h-3.5 w-3.5" />
                  {post.reading_time} min
                </span>

                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#656b76]">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {post.status === 'scheduled'
                    ? (post.scheduled_for ? new Date(post.scheduled_for).toLocaleDateString('pl-PL') : '—')
                    : formatDate(post.published_at)
                  }
                </span>

                <div className="flex items-center gap-1 lg:justify-end">
                  {canEdit && (
                    <Link href={`/vezvision/blog/${post.id}`} className={iconBtnCls} title="Edytuj" aria-label={`Edytuj post ${post.title_pl}`}>
                      <Edit className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleDuplicate(post)}
                      disabled={actionLoadingId === post.id}
                      className={iconBtnCls}
                      title="Duplikuj"
                      aria-label={`Duplikuj post ${post.title_pl}`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canPublish && (
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(post)}
                      disabled={actionLoadingId === post.id}
                      className={iconBtnCls}
                      title={post.status === 'published' ? 'Wycofaj' : 'Opublikuj'}
                      aria-label={post.status === 'published' ? `Wycofaj post ${post.title_pl}` : `Opublikuj post ${post.title_pl}`}
                    >
                      {post.status === 'published'
                        ? <EyeOff className="h-3.5 w-3.5" />
                        : <Eye className="h-3.5 w-3.5" />
                      }
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(post)}
                      disabled={actionLoadingId === post.id}
                      className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      title="Usuń"
                      aria-label={`Usuń post ${post.title_pl}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#ececf1] px-3 py-3">
            <span className="text-[11px] text-[#8b9098]">
              {sorted.length} postów · strona {page} z {totalPages}
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
