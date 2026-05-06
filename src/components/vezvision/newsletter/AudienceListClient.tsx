'use client'

import { useState } from 'react'
import { Search, Plus, Trash2, Eye, EyeOff, Tag, X } from 'lucide-react'
import { toast } from 'sonner'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import { useConfirm } from '@/components/ConfirmDialog'
import {
  createNewsletterSubscriber,
  deleteNewsletterSubscriber,
  updateNewsletterSubscriber,
  bulkUpdateSubscribers,
} from '@/lib/actions/vezvision/newsletter/audiences'
import type { VVNewsletterSubscriber } from '@/lib/actions/vezvision/types'

interface AudienceListClientProps {
  subscribers: VVNewsletterSubscriber[]
  total: number
  canManage: boolean
}

export default function AudienceListClient({ subscribers: initialSubscribers, total: initialTotal, canManage }: AudienceListClientProps) {
  const { token: csrfToken } = useCSRFToken()
  const { confirm } = useConfirm()
  const [subscribers, setSubscribers] = useState<VVNewsletterSubscriber[]>(initialSubscribers)
  const [total, setTotal] = useState(initialTotal)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [newTag, setNewTag] = useState('')

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    const allIds = filteredSubscribers.map((s) => s.id)
    const allSelected = allIds.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        allIds.forEach((id) => next.delete(id))
      } else {
        allIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const normalizedSearch = search.toLowerCase()
  const filteredSubscribers = subscribers.filter((s) =>
    s.email.toLowerCase().includes(normalizedSearch) ||
    (s.first_name ?? '').toLowerCase().includes(normalizedSearch) ||
    (s.last_name ?? '').toLowerCase().includes(normalizedSearch) ||
    (s.tags ?? []).some((t) => t.toLowerCase().includes(normalizedSearch))
  )

  const handleAdd = async () => {
    if (!canManage || !csrfToken) return
    const email = newEmail.trim()
    if (!email) {
      toast.error('Email jest wymagany')
      return
    }

    setLoadingId('new')
    const result = await createNewsletterSubscriber({ email }, csrfToken)
    if (result.success) {
      toast.success('Odbiorca dodany')
      setNewEmail('')
      setSubscribers((prev) => [result.data, ...prev])
      setTotal((prev) => prev + 1)
    } else {
      toast.error(result.error)
    }
    setLoadingId(null)
  }

  const handleToggleActive = async (subscriber: VVNewsletterSubscriber) => {
    if (!canManage || !csrfToken) return
    setLoadingId(subscriber.id)
    const result = await updateNewsletterSubscriber(
      subscriber.id,
      { is_active: !subscriber.is_active },
      csrfToken
    )
    if (result.success) {
      toast.success(result.data.is_active ? 'Odbiorca aktywowany' : 'Odbiorca wypisany')
      setSubscribers((prev) => prev.map((s) => s.id === subscriber.id ? { ...s, is_active: !s.is_active } : s))
    } else {
      toast.error(result.error)
    }
    setLoadingId(null)
  }

  const handleDelete = async (subscriber: VVNewsletterSubscriber) => {
    if (!canManage || !csrfToken) return
    const accepted = await confirm({
      title: 'Usunąć odbiorcę?',
      message: `Czy na pewno chcesz usunąć ${subscriber.email}?`,
      confirmText: 'Usuń',
      variant: 'danger',
    })
    if (!accepted) return

    setLoadingId(subscriber.id)
    const result = await deleteNewsletterSubscriber(subscriber.id, csrfToken)
    if (result.success) {
      toast.success('Odbiorca usunięty')
      setSubscribers((prev) => prev.filter((s) => s.id !== subscriber.id))
      setTotal((prev) => prev - 1)
    } else {
      toast.error(result.error)
    }
    setLoadingId(null)
  }

  const handleBulkTag = async () => {
    if (!canManage || !csrfToken || !newTag.trim()) return
    const result = await bulkUpdateSubscribers(
      Array.from(selectedIds),
      { addTags: [newTag.trim()] },
      csrfToken
    )
    if (result.success) {
      toast.success(`Dodano tag ${newTag.trim()} do ${result.data.updated} odbiorców`)
      setNewTag('')
      clearSelection()
    } else {
      toast.error(result.error)
    }
  }

  const handleBulkDelete = async () => {
    if (!canManage || !csrfToken) return
    const accepted = await confirm({
      title: 'Usunąć zaznaczonych?',
      message: `Czy na pewno chcesz usunąć ${selectedIds.size} odbiorców?`,
      confirmText: 'Usuń',
      variant: 'danger',
    })
    if (!accepted) return

    const deletedIds = new Set<string>()
    for (const id of selectedIds) {
      const result = await deleteNewsletterSubscriber(id, csrfToken)
      if (result.success) deletedIds.add(id)
    }
    toast.success(`Usunięto ${deletedIds.size} odbiorców`)
    setSubscribers((prev) => prev.filter((s) => !deletedIds.has(s.id)))
    setTotal((prev) => prev - deletedIds.size)
    clearSelection()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-medium text-[#111111]">Odbiorcy</h2>
          <p className="text-[12px] text-[#656b76]">
            {total} odbiorców
          </p>
        </div>
      </div>

      {canManage && (
        <div className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@domena.com"
            className="h-9 flex-1 rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc] px-3 text-[13px] text-[#111111] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#d7d9e2] focus:bg-white"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={loadingId === 'new'}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[4px] bg-[#111111] px-3 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-[#262626] disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Dodaj
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8b9098]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj po email, imieniu lub tagu..."
            className="h-9 w-full rounded-[4px] border border-[#ececf1] bg-[#fbfbfc] pl-9 pr-3 text-[12px] text-[#555b66] transition-colors placeholder:text-[#9ca3af] focus:border-[#d7d9e2] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {selectedIds.size > 0 && canManage && (
        <div className="flex items-center gap-3 rounded-[6px] border border-[#e7e8ee] bg-[#fbfbfc] px-3 py-2">
          <span className="text-[12px] font-medium text-[#111111]">
            {selectedIds.size} zaznaczonych
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Nowy tag"
              className="h-7 rounded-[4px] border border-[#ececf1] bg-white px-2 text-[11px] text-[#111111] outline-none focus:border-[#d7d9e2]"
              onKeyDown={(e) => e.key === 'Enter' && handleBulkTag()}
            />
            <button
              type="button"
              onClick={handleBulkTag}
              className="inline-flex h-7 items-center gap-1 rounded-[4px] bg-emerald-50 px-2 text-[11px] text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <Tag className="h-3 w-3" />
              Tag
            </button>
          </div>
          <button
            type="button"
            onClick={handleBulkDelete}
            className="inline-flex h-7 items-center gap-1 rounded-[4px] bg-red-50 px-2 text-[11px] text-red-700 transition-colors hover:bg-red-100"
          >
            <Trash2 className="h-3 w-3" />
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

      <div className="overflow-hidden rounded-[6px] border border-[#e7e8ee] bg-white shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
        {filteredSubscribers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              Brak odbiorców
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#ececf1]">
            {filteredSubscribers.map((subscriber) => (
              <div
                key={subscriber.id}
                className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[#fbfbfc]"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(subscriber.id)}
                  onChange={() => toggleSelection(subscriber.id)}
                  className={`h-4 w-4 flex-shrink-0 rounded-[3px] border-[#c5c8d4] accent-[#111111] transition-opacity ${selectedIds.has(subscriber.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  aria-label={`Zaznacz ${subscriber.email}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[#111111]">{subscriber.email}</p>
                  {(subscriber.first_name || subscriber.last_name) && (
                    <p className="text-[11px] text-[#8b9098]">
                      {`${subscriber.first_name ?? ''} ${subscriber.last_name ?? ''}`.trim()}
                    </p>
                  )}
                </div>
                <div>
                  <span className={`inline-block rounded-[3px] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                    subscriber.language === 'en'
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {subscriber.language ?? 'pl'}
                  </span>
                </div>
                <div>
                  <span className="truncate text-[11px] text-[#8b9098]">
                    {subscriber.source ?? '—'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {subscriber.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-[3px] bg-[#f0f0f4] px-1.5 py-0.5 text-[9px] text-[#656b76]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleToggleActive(subscriber)}
                      disabled={loadingId === subscriber.id}
                      className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111] disabled:opacity-40"
                    >
                      {subscriber.is_active ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDelete(subscriber)}
                      disabled={loadingId === subscriber.id}
                      className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
