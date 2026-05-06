'use client'

import { useState } from 'react'
import { AlertTriangle, Bot, CheckCircle2, RefreshCw, Wrench } from 'lucide-react'
import { useConfirm } from '@/components/ConfirmDialog'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import { backfillDiscordUserThreads, sweepDiscordUserThreadMappings, type DiscordBackfillEntry, type DiscordSweepDuplicateSummary } from '@/lib/actions/discord-maintenance'

interface BackfillResult {
  total: number
  mapped: number
  alreadyMapped: number
  skipped: number
  failed: number
  entries: DiscordBackfillEntry[]
}

interface SweepResult {
  scannedUsers: number
  scannedThreads: number
  duplicateUsers: number
  updated: number
  alreadyCanonical: number
  archivedDuplicates: number
  duplicates: DiscordSweepDuplicateSummary[]
}

export function DiscordMaintenanceManager() {
  const { confirm } = useConfirm()
  const { token: csrfToken } = useCSRFToken()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<'backfill' | 'sweep' | null>(null)
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null)
  const [sweepResult, setSweepResult] = useState<SweepResult | null>(null)

  const handleBackfill = async () => {
    const confirmed = await confirm({
      title: 'Uruchomić backfill Discord thread IDs?',
      message: 'To utworzy lub odzyska mapowanie wątków profilu dla istniejących użytkowników.',
      confirmText: 'Uruchom',
      variant: 'warning',
    })

    if (!confirmed) return
    if (!csrfToken) {
      setError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    setLoading('backfill')
    setError(null)
    const result = await backfillDiscordUserThreads(csrfToken)
    if ('error' in result) {
      setError(result.error ?? 'Nie udało się wykonać backfillu Discord threadów.')
    } else {
      setBackfillResult(result)
    }
    setLoading(null)
  }

  const handleSweep = async () => {
    const confirmed = await confirm({
      title: 'Uruchomić sweep Discord thread mappings?',
      message: 'To wybierze canonical thread dla użytkowników z duplikatami, zapisze go w profilu i spróbuje zarchiwizować pozostałe duplikaty.',
      confirmText: 'Uruchom',
      variant: 'warning',
    })

    if (!confirmed) return
    if (!csrfToken) {
      setError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    setLoading('sweep')
    setError(null)
    const result = await sweepDiscordUserThreadMappings(csrfToken)
    if ('error' in result) {
      setError(result.error ?? 'Nie udało się wykonać sweepu Discord thread mappings.')
    } else {
      setSweepResult(result)
    }
    setLoading(null)
  }

  return (
    <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 transition-colors duration-300">
      <div className="p-6 border-b border-white/[0.06] light:border-black/[0.06]">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="h-4 w-4 text-[#444444] light:text-[#888888]" />
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
            Discord maintenance
          </p>
        </div>
        <p className="text-xs text-[#666666] light:text-[#999999] leading-relaxed">
          Backfill odzyskuje lub tworzy mapowanie wątków profilu i zapewnia główny wątek „Użytkownicy”. Sweep wybiera canonical thread dla użytkowników z duplikatami i archiwizuje pozostałe duplikaty.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border-b border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="p-6 space-y-6">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleBackfill}
            disabled={loading !== null}
            className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 disabled:opacity-50 transition-colors"
          >
            {loading === 'backfill' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
            Run Backfill
          </button>

          <button
            onClick={handleSweep}
            disabled={loading !== null}
            className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 disabled:opacity-50 transition-colors"
          >
            {loading === 'sweep' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
            Run Sweep
          </button>
        </div>

        {backfillResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Stat label="Profiles" value={backfillResult.total} accent="default" />
              <Stat label="Mapped" value={backfillResult.mapped} accent="emerald" />
              <Stat label="Already OK" value={backfillResult.alreadyMapped} accent="blue" />
              <Stat label="Skipped" value={backfillResult.skipped} accent="amber" />
              <Stat label="Failed" value={backfillResult.failed} accent="red" />
            </div>

            <div className="space-y-2">
              {backfillResult.entries.slice(0, 20).map((entry) => (
                <div key={`${entry.userId}-${entry.threadId ?? 'none'}`} className="flex items-start justify-between gap-4 p-3 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.04] light:border-black/[0.04]">
                  <div className="min-w-0">
                    <p className="text-sm text-white light:text-black break-all">{entry.email ?? entry.userId}</p>
                    <p className="text-[10px] text-[#666666] light:text-[#999999] font-mono break-all">{entry.userId}</p>
                    {entry.threadId && <p className="text-[10px] text-[#444444] light:text-[#888888] font-mono break-all">thread: {entry.threadId}</p>}
                    {entry.reason && <p className="text-[10px] text-amber-400 mt-1">{entry.reason}</p>}
                  </div>
                  <StatusBadge status={entry.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {sweepResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Stat label="Users" value={sweepResult.scannedUsers} accent="default" />
              <Stat label="Threads" value={sweepResult.scannedThreads} accent="default" />
              <Stat label="Duplicate users" value={sweepResult.duplicateUsers} accent="amber" />
              <Stat label="Updated" value={sweepResult.updated} accent="blue" />
              <Stat label="Archived" value={sweepResult.archivedDuplicates} accent="emerald" />
            </div>

            {sweepResult.duplicates.length === 0 ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-400">Nie wykryto duplikatów threadów użytkowników.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sweepResult.duplicates.map((duplicate) => (
                  <div key={duplicate.userId} className="p-4 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.04] light:border-black/[0.04] space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-white light:text-black break-all">{duplicate.email ?? duplicate.userId}</p>
                        <p className="text-[10px] text-[#666666] light:text-[#999999] font-mono break-all">{duplicate.userId}</p>
                      </div>
                      <div className="flex items-center gap-2 text-amber-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-[10px] uppercase tracking-[0.2em]">{duplicate.duplicateCount} wątki</span>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">Canonical thread</p>
                      <p className="text-sm text-white light:text-black mt-1 break-all">{duplicate.canonicalThreadName}</p>
                      <p className="text-[10px] text-[#666666] light:text-[#999999] font-mono break-all mt-1">{duplicate.canonicalThreadId}</p>
                    </div>

                    <div className="space-y-2">
                      {duplicate.duplicateThreadNames.map((name: string, index: number) => (
                        <div key={`${duplicate.userId}-${duplicate.duplicateThreadIds[index]}`} className="flex items-start justify-between gap-3 p-2 border border-white/[0.04] light:border-black/[0.04]">
                          <div className="min-w-0">
                            <p className="text-xs text-white light:text-black break-all">{name}</p>
                            <p className="text-[10px] text-[#666666] light:text-[#999999] font-mono break-all">{duplicate.duplicateThreadIds[index]}</p>
                          </div>
                          {duplicate.archivedDuplicateThreadIds.includes(duplicate.duplicateThreadIds[index]) && duplicate.duplicateThreadIds[index] !== duplicate.canonicalThreadId ? (
                            <span className="shrink-0 px-2 py-1 text-[9px] uppercase tracking-[0.2em] border text-emerald-400 border-emerald-500/20 bg-emerald-500/10">
                              Archived
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent: 'default' | 'emerald' | 'blue' | 'amber' | 'red' }) {
  const colorMap = {
    default: 'text-white light:text-black',
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  } as const

  return (
    <div className="p-4 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.04] light:border-black/[0.04]">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999]">{label}</p>
      <p className={`mt-2 text-2xl font-light ${colorMap[accent]}`}>{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: DiscordBackfillEntry['status'] }) {
  const labelMap: Record<DiscordBackfillEntry['status'], string> = {
    mapped: 'Mapped',
    already_mapped: 'Already OK',
    skipped: 'Skipped',
    failed: 'Failed',
  }

  const colorMap: Record<DiscordBackfillEntry['status'], string> = {
    mapped: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
    already_mapped: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
    skipped: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
    failed: 'text-red-400 border-red-500/20 bg-red-500/10',
  }

  return (
    <span className={`shrink-0 px-2 py-1 text-[9px] uppercase tracking-[0.2em] border ${colorMap[status]}`}>
      {labelMap[status]}
    </span>
  )
}
