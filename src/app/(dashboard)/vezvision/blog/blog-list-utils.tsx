import { memo } from 'react'
import type { VVBlogPost } from '@/lib/actions/vezvision/types'

export const STATUS_META: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
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
  scheduled: {
    label: 'Zaplanowany',
    dot: 'bg-blue-400',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  draft: {
    label: 'Szkic',
    dot: 'bg-slate-400',
    text: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
  },
}

export const pageWrapCls = 'w-full space-y-5 px-5 py-4 xl:px-6'
export const listPanelCls = 'overflow-hidden rounded-[6px] border border-[#e7e8ee] bg-white shadow-[0_8px_26px_rgba(25,29,42,0.04)]'
export const primaryBtnCls = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] bg-[#111111] px-3 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-[#262626]'
export const iconBtnCls = 'rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]'

export function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export const StatusBadge = memo(function StatusBadge({ status }: { status: VVBlogPost['status'] }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${meta.text} ${meta.bg} border ${meta.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
})

export function getNextStatus(post: VVBlogPost, canManage: boolean, canPublish: boolean): VVBlogPost['status'] | null {
  const order: VVBlogPost['status'][] = ['published', 'draft', 'archived']
  const currentIndex = order.indexOf(post.status)
  if (currentIndex === -1) return null

  for (let i = 1; i <= order.length; i++) {
    const nextIndex = (currentIndex + i) % order.length
    const nextStatus = order[nextIndex]
    if (nextStatus === 'published' && !canPublish) continue
    if ((nextStatus === 'draft' || nextStatus === 'archived') && !canManage) continue
    return nextStatus
  }
  return null
}

interface StatusButtonProps {
  post: VVBlogPost
  canManage: boolean
  canPublish: boolean
  onChange: (post: VVBlogPost, status: VVBlogPost['status']) => void
  disabled: boolean
}

export const StatusButton = memo(function StatusButton({ post, canManage, canPublish, onChange, disabled }: StatusButtonProps) {
  const nextStatus = getNextStatus(post, canManage, canPublish)

  if (!nextStatus) {
    return <StatusBadge status={post.status} />
  }

  const meta = STATUS_META[post.status] ?? STATUS_META.draft
  const nextLabel = STATUS_META[nextStatus]?.label ?? nextStatus

  return (
    <button
      type="button"
      onClick={() => onChange(post, nextStatus)}
      disabled={disabled}
      title={`Zmień na: ${nextLabel}`}
      aria-label={`Zmień status posta ${post.title_pl} na ${nextLabel}`}
      className={`inline-flex w-fit items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${meta.text} ${meta.bg} border ${meta.border} transition-colors hover:bg-white disabled:opacity-40`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </button>
  )
})
