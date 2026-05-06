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
  { path: '/audit', label: 'Audit Log' },
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
    <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 transition-colors duration-300">
      <div className="p-6 border-b border-white/[0.06] light:border-black/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[#444444] light:text-[#888888]" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
              Zarządzanie cache
            </p>
          </div>
            <button
              onClick={handleClearAll}
              disabled={clearing}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-red-400 light:text-red-600 border border-red-500/20 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            Wyczyść wszystko
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border-b border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="divide-y divide-white/[0.04] light:divide-black/[0.04]">

        {paths.map(({ path, label }) => (
          <div key={path} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-white light:text-black">{label}</p>
              <p className="text-[10px] text-[#444444] light:text-[#888888] font-mono">{path}</p>
            </div>
            <button
              onClick={() => handleClearPath(path)}
              disabled={clearing}
              className="p-2 text-[#666666] light:text-[#999999] hover:text-white light:hover:text-black disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${clearing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        ))}
      </div>

      {lastCleared && (
        <div className="p-4 border-t border-white/[0.06] light:border-black/[0.06]">
          <p className="text-[10px] text-[#444444] light:text-[#888888]">
            Ostatnie czyszczenie: {formatDate(lastCleared)}
          </p>
        </div>
      )}
    </div>
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
