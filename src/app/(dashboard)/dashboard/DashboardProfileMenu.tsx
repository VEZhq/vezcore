'use client'

import Link from 'next/link'
import { Settings, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ProfileAvatar } from '@/components/ProfileAvatar'

export function DashboardProfileMenu({
  avatarUrl,
  label,
  canAccessSettings,
}: {
  avatarUrl?: string | null
  label: string
  canAccessSettings: boolean
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnPointerDown)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-8 items-center justify-center rounded-[8px] ring-1 ring-black/[0.07] transition-opacity hover:opacity-80 dark:ring-white/[0.1]"
        aria-label="Menu konta"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Menu konta"
      >
        <ProfileAvatar
          url={avatarUrl}
          label={label}
          className="h-8 w-8 rounded-[8px]"
          fallbackClassName="text-[9px]"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-[80] w-44 rounded-[8px] border border-black/[0.08] bg-white p-1.5 shadow-[0_12px_34px_rgba(20,22,21,0.14)] dark:border-white/[0.1] dark:bg-[#111311] dark:shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
        >
          <p className="truncate border-b border-black/[0.06] px-2 py-1.5 text-[9px] text-[#858b88] dark:border-white/[0.08] dark:text-[#929895]">
            {label}
          </p>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 flex h-8 items-center gap-2 rounded-[6px] px-2 text-[10px] font-medium text-[#4f5552] hover:bg-black/[0.04] dark:text-[#c1c5c3] dark:hover:bg-white/[0.07]"
          >
            <UserRound className="h-3.5 w-3.5" />
            Profil
          </Link>
          {canAccessSettings && (
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-8 items-center gap-2 rounded-[6px] px-2 text-[10px] font-medium text-[#4f5552] hover:bg-black/[0.04] dark:text-[#c1c5c3] dark:hover:bg-white/[0.07]"
            >
              <Settings className="h-3.5 w-3.5" />
              Ustawienia
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
