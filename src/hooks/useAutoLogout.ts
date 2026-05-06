'use client'

import { useEffect, useRef } from 'react'
import { logout } from '@/lib/actions/auth'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'
import { useCSRFToken } from '@/hooks/useCSRFToken'

export function useAutoLogout() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { preferences } = useUserPreferences()
  const { token: csrfToken } = useCSRFToken()

  useEffect(() => {
    if (!csrfToken) return

    const timeoutMs = preferences.sessionTimeout * 60 * 1000

    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
	timeoutRef.current = setTimeout(async () => {
			await logout(csrfToken)
			window.location.href = '/login'
		}, timeoutMs)
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']

    events.forEach((event) => {
      window.addEventListener(event, resetTimer)
    })

    resetTimer()

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer)
      })
    }
  }, [preferences.sessionTimeout])
}
