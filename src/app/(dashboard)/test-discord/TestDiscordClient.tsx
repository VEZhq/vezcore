'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Home, Play, RefreshCw } from 'lucide-react'
import { testDiscordIntegrations } from '@/lib/actions/test-discord'
import { useCSRFToken } from '@/hooks/useCSRFToken'

export default function TestDiscordClient() {
  const { token: csrfToken } = useCSRFToken()
  const [results, setResults] = useState<Record<string, boolean> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const runTests = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!csrfToken) {
        setLoading(false)
        return
      }

      const result = await testDiscordIntegrations(csrfToken)
      if (!('error' in result)) {
        setResults(result)
      } else {
        setError(String(result.error))
      }
    } catch {
      setError('Nie udało się uruchomić testów Discord')
      console.error('Discord integration test failed')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] light:bg-[#f5f5f5] p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-[#444444] hover:text-white">
            <Home className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-medium text-white light:text-black">
            Test Discord Integrations
          </h1>
        </div>

        <button
          onClick={runTests}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {loading ? 'Testing...' : 'Run Tests'}
        </button>

        {error && (
          <p className="text-sm text-red-400 light:text-red-600">{error}</p>
        )}

        {results && (
          <div className="border border-white/[0.06] p-6 space-y-4">
            <h2 className="text-sm font-medium text-white light:text-black">
              Results:
            </h2>
            <div className="space-y-2">
              {Object.entries(results).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${value ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-sm text-white light:text-black font-mono">
                    {key}
                  </span>
                  <span className={`text-xs ${value ? 'text-emerald-400' : 'text-red-400'}`}>
                    {value ? '✓ OK' : '✗ FAIL'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
