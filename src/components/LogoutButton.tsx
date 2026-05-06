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
      className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-red-400 light:text-red-600 bg-red-500/[0.05] light:bg-red-500/[0.08] border border-red-500/20 light:border-red-500/30 rounded-md hover:bg-red-500/10 light:hover:bg-red-500/15 hover:text-red-300 light:hover:text-red-500 transition-all duration-300 disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      {isLoggingOut ? 'Wylogowywanie...' : 'Wyloguj się'}
    </button>
  )
}
