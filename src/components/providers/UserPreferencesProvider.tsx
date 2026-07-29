'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react'
import {
  defaultUserPreferences,
  sanitizeUserPreferences,
  type UserPreferences,
} from '@/lib/preferences'

interface UserPreferencesContextType {
  preferences: UserPreferences
  updatePreferences: (updates: Partial<UserPreferences>) => void
}

const UserPreferencesContext = createContext<UserPreferencesContextType>({
  preferences: defaultUserPreferences,
  updatePreferences: () => {},
})

const STORAGE_KEY = 'vezcore-user-preferences'

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (typeof window === 'undefined') {
      return defaultUserPreferences
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return sanitizeUserPreferences(parsed)
      }
    } catch {
      // localStorage unavailable or corrupt — use defaults
    }

    return defaultUserPreferences
  })
  const [accountSyncReady, setAccountSyncReady] = useState(false)
  const saveTimerRef = useRef<number | null>(null)
  const csrfTokenRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetch('/api/preferences', { cache: 'no-store' }),
      fetch('/api/csrf', { cache: 'no-store' }),
    ])
      .then(async ([preferencesResponse, csrfResponse]) => {
        const preferencesPayload = preferencesResponse.ok
          ? await preferencesResponse.json() as { preferences?: unknown; readOnly?: boolean }
          : null
        const csrfPayload = csrfResponse.ok
          ? await csrfResponse.json() as { token?: string }
          : null
        return { preferencesPayload, csrfToken: csrfPayload?.token ?? null }
      })
      .then(({ preferencesPayload, csrfToken }) => {
        if (cancelled) return
        csrfTokenRef.current = csrfToken
        if (preferencesPayload?.preferences) {
          setPreferences(sanitizeUserPreferences(preferencesPayload.preferences))
        }
        setAccountSyncReady(Boolean(preferencesPayload && csrfToken && !preferencesPayload.readOnly))
      })
      .catch(() => {
        if (!cancelled) setAccountSyncReady(false)
      })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch {
      // Browser storage is an optional offline fallback.
    }

    if (!accountSyncReady) return
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      if (!csrfTokenRef.current) return
      fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrfTokenRef.current,
        },
        body: JSON.stringify({ preferences }),
      }).catch(() => {
        // The local copy remains available and a later change retries synchronization.
      })
    }, 600)

    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    }
  }, [accountSyncReady, preferences])

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }))
  }

  const contextValue = useMemo(
    () => ({ preferences, updatePreferences }),
    [preferences]
  )

  return (
    <UserPreferencesContext.Provider value={contextValue}>
      {children}
    </UserPreferencesContext.Provider>
  )
}

export const useUserPreferences = () => useContext(UserPreferencesContext)

export function formatDateOnly(
  date: Date | string,
  dateFormat: UserPreferences['dateFormat'],
  timezone: string
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const locale = dateFormat === 'MM/DD/YYYY' ? 'en-US' : dateFormat === 'YYYY-MM-DD' ? 'sv-SE' : 'pl-PL'

  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }

  return d.toLocaleDateString(locale, options)
}

export function formatTimeOnly(
  date: Date | string,
  timezone: string
): string {
  const d = typeof date === 'string' ? new Date(date) : date

  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  }

  return d.toLocaleTimeString('pl-PL', options)
}
