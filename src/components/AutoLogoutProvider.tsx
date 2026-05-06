'use client'

import { useAutoLogout } from '@/hooks/useAutoLogout'
import { useIPChangeDetection } from '@/hooks/useIPChangeDetection'

export function AutoLogoutProvider({ children }: { children: React.ReactNode }) {
  useAutoLogout()
  useIPChangeDetection()
  return <>{children}</>
}
