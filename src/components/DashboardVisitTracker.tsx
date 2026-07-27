'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export type RecentDashboardPage = {
  href: string
  visitedAt: string
}

const MAX_RECENT_PAGES = 10

function getStorageKey(userId: string) {
  return `vezcore-recent-pages:${userId}`
}

export function DashboardVisitTracker({ userId }: { userId: string }) {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return

    const storageKey = getStorageKey(userId)
    const current: RecentDashboardPage = {
      href: pathname,
      visitedAt: new Date().toISOString(),
    }

    try {
      const stored = window.localStorage.getItem(storageKey)
      const existing = stored ? JSON.parse(stored) as RecentDashboardPage[] : []
      const next = [
        current,
        ...existing.filter((item) => item.href !== pathname),
      ].slice(0, MAX_RECENT_PAGES)

      window.localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      // localStorage can be unavailable in restricted browser contexts.
    }
  }, [pathname, userId])

  return null
}

export function getRecentPagesStorageKey(userId: string) {
  return getStorageKey(userId)
}
