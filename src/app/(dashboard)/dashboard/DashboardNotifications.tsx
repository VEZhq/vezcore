'use client'

import Link from 'next/link'
import { Bell, ChevronRight, Wrench, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type NotificationItem = {
  id: string
  severity: string
  title: string
  body: string
  href: string | null
  created_at: string
  read: boolean
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function severityClass(severity: string) {
  if (severity === 'error') return 'bg-[#d75f59]'
  if (severity === 'warning') return 'bg-[#c99a42]'
  return 'bg-[#7f8984]'
}

export function DashboardNotifications({
  unreadCount,
  hasError,
  items,
  canManage,
}: {
  unreadCount: number
  hasError: boolean
  items: NotificationItem[]
  canManage: boolean
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-8 w-8 items-center justify-center rounded-[8px] text-[#69706e] transition-colors hover:bg-white hover:text-[#202020] dark:text-[#a7adaa] dark:hover:bg-white/[0.08] dark:hover:text-white"
        aria-label="Centrum powiadomień"
        aria-expanded={open}
        title="Centrum powiadomień"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className={`absolute right-1 top-1 flex min-w-3.5 items-center justify-center rounded-full px-1 text-[7px] font-medium text-white ${
            hasError ? 'bg-[#d65f59]' : 'bg-[#b48a3d]'
          }`}>
            {Math.min(unreadCount, 99)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-[80] w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-[10px] border border-black/[0.09] bg-[#fbfbfa] shadow-[0_18px_48px_rgba(24,28,26,0.16)] dark:border-white/[0.11] dark:bg-[#111311] dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between border-b border-black/[0.07] px-3.5 py-3 dark:border-white/[0.08]">
            <div>
              <p className="text-[11px] font-medium">Centrum powiadomień</p>
              <p className="mt-0.5 text-[9px] text-[#858c88]">
                {unreadCount > 0 ? `${unreadCount} nieprzeczytanych` : 'Wszystko sprawdzone'}
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[#868d89] hover:bg-black/[0.05] dark:hover:bg-white/[0.07]" aria-label="Zamknij">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="max-h-[310px] divide-y divide-black/[0.06] overflow-y-auto dark:divide-white/[0.07]">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-[10px] text-[#858c88]">Brak nowych zdarzeń operacyjnych.</p>
            ) : items.map((item) => (
              <Link
                key={item.id}
                href={item.href || '/operations'}
                onClick={() => setOpen(false)}
                className="grid grid-cols-[8px_minmax(0,1fr)] gap-2.5 px-3.5 py-3 transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.04]"
              >
                <span className={`mt-1.5 h-2 w-2 rounded-full ${severityClass(item.severity)} ${item.read ? 'opacity-35' : ''}`} />
                <span className="min-w-0">
                  <span className="flex items-start justify-between gap-3">
                    <span className="truncate text-[10px] font-medium">{item.title}</span>
                    <span className="shrink-0 text-[8px] text-[#929895]">{formatTime(item.created_at)}</span>
                  </span>
                  <span className="mt-1 line-clamp-2 block text-[9px] leading-relaxed text-[#737a76] dark:text-[#9ca29e]">{item.body}</span>
                </span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1 border-t border-black/[0.07] p-2 dark:border-white/[0.08]">
            {canManage && (
              <Link
                href="/operations?section=maintenance&create=1"
                onClick={() => setOpen(false)}
                className="flex h-8 items-center gap-1.5 rounded-[7px] px-2.5 text-[9px] font-medium text-[#666d69] hover:bg-black/[0.04] dark:text-[#aab0ac] dark:hover:bg-white/[0.06]"
              >
                <Wrench className="h-3.5 w-3.5" />
                Zaplanuj prace
              </Link>
            )}
            <Link
              href="/operations"
              onClick={() => setOpen(false)}
              className="ml-auto flex h-8 items-center gap-1 rounded-[7px] px-2.5 text-[9px] font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              Pokaż więcej
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
