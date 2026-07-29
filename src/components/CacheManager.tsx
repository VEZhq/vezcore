'use client'

import { useState } from 'react'
import { Database, RefreshCw, Trash2 } from 'lucide-react'
import { clearAllCache, clearPathCache } from '@/lib/actions/cache'
import { useConfirm } from '@/components/ConfirmDialog'
import { useCSRFToken } from '@/hooks/useCSRFToken'

const paths = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/profile', label: 'Profil' },
  { path: '/konta', label: 'Konta' },
  { path: '/settings', label: 'Ustawienia' },
  { path: '/security', label: 'Bezpieczeństwo' },
]

export function CacheManager() {
  const { confirm } = useConfirm()
  const { token: csrfToken } = useCSRFToken()
  const [clearing, setClearing] = useState(false)
  const [lastCleared, setLastCleared] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClearAll = async () => {
    const confirmed = await confirm({
      title: 'Wyczyścić cały cache?',
      message: 'To spowoduje odświeżenie wszystkich stron.',
      confirmText: 'Wyczyść',
      variant: 'warning',
    })

    if (!confirmed) return

    if (!csrfToken) {
      setError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    setClearing(true)
    const result = await clearAllCache(csrfToken)
    if ('success' in result && result.clearedAt) {
      setLastCleared(result.clearedAt)
      setError(null)
    } else if ('error' in result) {
      setError(result.error)
    }
    setClearing(false)
  }

  const handleClearPath = async (path: string) => {
    if (!csrfToken) {
      setError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    setClearing(true)
    const result = await clearPathCache(path, csrfToken)
    if ('error' in result) {
      setError(result.error)
    } else {
      setError(null)
    }
    setClearing(false)
  }

  return (
    <section className="border-y border-black/[0.09] bg-white/35 dark:border-white/[0.09] dark:bg-white/[0.018]">
      <div className="border-b border-black/[0.065] px-5 py-4 dark:border-white/[0.065]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#eee8f0] text-[#806a82] dark:bg-white/[0.055] dark:text-[#c7b6c9]">
              <Database className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13px] font-semibold">Cache aplikacji</p>
              <p className="mt-0.5 text-[10px] text-[#7d8480] dark:text-[#959b98]">Odśwież dane wybranej części panelu.</p>
            </div>
          </div>
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className="flex h-8 items-center gap-1.5 rounded-[7px] px-2.5 text-[9px] text-red-600 transition-colors hover:bg-red-500/[0.07] disabled:opacity-50 dark:text-red-300"
          >
            <Trash2 className="h-3 w-3" />
            Wyczyść wszystko
          </button>
        </div>
      </div>

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/[0.06] px-5 py-3">
          <p className="text-[10px] text-red-600 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="divide-y divide-black/[0.06] px-5 dark:divide-white/[0.06]">
        {paths.map(({ path, label }) => (
          <div key={path} className="flex items-center justify-between py-3">
            <div>
              <p className="text-[11px] font-medium">{label}</p>
              <p className="mt-0.5 font-mono text-[9px] text-[#8c9390]">{path}</p>
            </div>
            <button
              onClick={() => handleClearPath(path)}
              disabled={clearing}
              className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#7c837f] transition-colors hover:bg-black/[0.04] hover:text-black disabled:opacity-50 dark:hover:bg-white/[0.06] dark:hover:text-white"
              aria-label={`Wyczyść cache: ${label}`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${clearing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        ))}
      </div>

      {lastCleared && (
        <div className="border-t border-black/[0.06] px-5 py-3 dark:border-white/[0.06]">
          <p className="text-[9px] text-[#8c9390]">
            Ostatnie czyszczenie: {formatDate(lastCleared)}
          </p>
        </div>
      )}
    </section>
  )
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
