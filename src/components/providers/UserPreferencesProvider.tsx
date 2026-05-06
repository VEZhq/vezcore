'use client'

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react'

interface UserPreferences {
  timezone: string
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  sessionTimeout: number // in minutes
  autoLogoutOnIpChange: boolean
  hiddenModules: string[]
}

interface UserPreferencesContextType {
  preferences: UserPreferences
  updatePreferences: (updates: Partial<UserPreferences>) => void
}

const VALID_TIMEZONES = [
  'Europe/Warsaw', 'Europe/London', 'Europe/Berlin',
  'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo',
]

const VALID_DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const

const VALID_SESSION_TIMEOUTS = [15, 30, 60, 120]

const VALID_MODULE_NAMES = ['vezVision', 'vezCRM', 'vezBrain', 'vezAI', 'vezHome', 'vezLab']

const defaultPreferences: UserPreferences = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Warsaw',
  dateFormat: 'DD/MM/YYYY',
  sessionTimeout: 15,
  autoLogoutOnIpChange: false,
  hiddenModules: [],
}

function sanitizePreferences(raw: unknown): UserPreferences {
  if (!raw || typeof raw !== 'object') return defaultPreferences

  const obj = raw as Record<string, unknown>

  return {
    timezone: VALID_TIMEZONES.includes(obj.timezone as string)
      ? (obj.timezone as string)
      : defaultPreferences.timezone,
    dateFormat: (VALID_DATE_FORMATS as readonly unknown[]).includes(obj.dateFormat)
      ? (obj.dateFormat as UserPreferences['dateFormat'])
      : defaultPreferences.dateFormat,
    sessionTimeout: VALID_SESSION_TIMEOUTS.includes(obj.sessionTimeout as number)
      ? (obj.sessionTimeout as number)
      : defaultPreferences.sessionTimeout,
    autoLogoutOnIpChange: typeof obj.autoLogoutOnIpChange === 'boolean'
      ? obj.autoLogoutOnIpChange
      : defaultPreferences.autoLogoutOnIpChange,
    hiddenModules: Array.isArray(obj.hiddenModules)
      ? (obj.hiddenModules as unknown[]).filter(
          (m): m is string => typeof m === 'string' && VALID_MODULE_NAMES.includes(m)
        )
      : defaultPreferences.hiddenModules,
  }
}

const UserPreferencesContext = createContext<UserPreferencesContextType>({
  preferences: defaultPreferences,
  updatePreferences: () => {},
})

const STORAGE_KEY = 'vezcore-user-preferences'

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (typeof window === 'undefined') {
      return defaultPreferences
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return sanitizePreferences(parsed)
      }
    } catch {
      // localStorage unavailable or corrupt — use defaults
    }

    return defaultPreferences
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  }, [preferences])

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
