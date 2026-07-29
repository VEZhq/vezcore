'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { logout } from '@/lib/actions/auth'
import { useCSRFToken } from '@/hooks/useCSRFToken'

export function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { token: csrfToken } = useCSRFToken()

  async function handleLogout() {
    if (!csrfToken) return
    setIsLoggingOut(true)
    try {
      await logout(csrfToken)
    } catch {
      console.error('Logout action failed')
    }
    window.location.href = '/login'
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="flex h-9 w-full items-center justify-center gap-2 rounded-[7px] border border-red-500/20 bg-red-500/[0.04] px-4 text-[9px] font-medium text-red-600 transition-colors hover:bg-red-500/[0.08] dark:text-red-400 dark:hover:bg-red-500/[0.1] disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      {isLoggingOut ? 'Wylogowywanie...' : 'Wyloguj się'}
    </button>
  )
}
