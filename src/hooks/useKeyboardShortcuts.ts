'use client'

import { useEffect, useCallback } from 'react'

interface ShortcutHandlers {
  onSearch?: () => void
  onRefresh?: () => void
  onNew?: () => void
  onSave?: () => void
  onCancel?: () => void
  onDelete?: () => void
  onToggleTheme?: () => void
  onGoDashboard?: () => void
  onGoProfile?: () => void
  onGoSettings?: () => void
  onGoAudit?: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifier = isMac ? event.metaKey : event.ctrlKey

      if (modifier) {
        switch (event.key.toLowerCase()) {
          case 'k':
            event.preventDefault()
            handlers.onSearch?.()
            break
          case 'r':
            if (!event.shiftKey) {
              event.preventDefault()
              handlers.onRefresh?.()
            }
            break
          case 'n':
            event.preventDefault()
            handlers.onNew?.()
            break
          case 's':
            event.preventDefault()
            handlers.onSave?.()
            break
        }
      }

      if (event.key === 'Escape') {
        handlers.onCancel?.()
      }

      if (modifier && event.shiftKey) {
        switch (event.key.toLowerCase()) {
          case 'd':
            event.preventDefault()
            handlers.onGoDashboard?.()
            break
          case 'p':
            event.preventDefault()
            handlers.onGoProfile?.()
            break
          case 'a':
            event.preventDefault()
            handlers.onGoAudit?.()
            break
          case 's':
            event.preventDefault()
            handlers.onGoSettings?.()
            break
          case 't':
            event.preventDefault()
            handlers.onToggleTheme?.()
            break
        }
      }

      if (event.key === 'Delete' || (event.key === 'Backspace' && modifier)) {
        handlers.onDelete?.()
      }
    },
    [handlers]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}


