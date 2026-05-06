'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Shield, Lock, AlertTriangle, CheckCircle, Activity, Trash2, Plus, Globe, Ban } from 'lucide-react'
import { MobileNav } from '@/components/MobileNav'
import { LoginChart } from '@/components/LoginChart'
import { GlobalSessionsManager } from '@/components/GlobalSessionsManager'
import { useConfirm } from '@/components/ConfirmDialog'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import { getIPLists, addToIPList, removeFromIPList, IPEntry } from '@/lib/actions/ip-lists'

interface SecurityStats {
  usersWith2FA: number
  totalUsers: number
  failedLogins24h: number
  blockedIPs: number
  recentAlerts: Array<{
    id: string
    type: string
    message: string
    timestamp: string
  }>
}

interface IPLists {
  whitelist: IPEntry[]
  blacklist: IPEntry[]
}

interface SecurityClientProps {
  stats: SecurityStats
  ipLists: IPLists
  canAccessKonta: boolean
}

export default function SecurityClient({ stats, ipLists, canAccessKonta }: SecurityClientProps) {
  const [activeIPTab, setActiveIPTab] = useState<'whitelist' | 'blacklist'>('whitelist')
  
  const [whitelist, setWhitelist] = useState<IPEntry[]>(ipLists.whitelist)
  const [blacklist, setBlacklist] = useState<IPEntry[]>(ipLists.blacklist)
  
  const [showAddWhitelistForm, setShowAddWhitelistForm] = useState(false)
  const [showAddBlacklistForm, setShowAddBlacklistForm] = useState(false)
  const [newWhitelistIP, setNewWhitelistIP] = useState('')
  const [newWhitelistReason, setNewWhitelistReason] = useState('')
  const [newBlacklistIP, setNewBlacklistIP] = useState('')
  const [newBlacklistReason, setNewBlacklistReason] = useState('')
  
  const [loadingAddWhitelist, setLoadingAddWhitelist] = useState(false)
  const [loadingAddBlacklist, setLoadingAddBlacklist] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  
  const [whitelistError, setWhitelistError] = useState<string | null>(null)
  const [blacklistError, setBlacklistError] = useState<string | null>(null)
  
  const { token: csrfToken } = useCSRFToken()
  const { confirm } = useConfirm()

  const securityScore = stats.totalUsers > 0 ? Math.round((stats.usersWith2FA / stats.totalUsers) * 100) : 0

  const handleAddWhitelist = async () => {
    if (!newWhitelistIP.trim()) return
    
    setLoadingAddWhitelist(true)
    setWhitelistError(null)
    
    if (!csrfToken) {
      setWhitelistError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      setLoadingAddWhitelist(false)
      return
    }

    const result = await addToIPList(newWhitelistIP.trim(), 'whitelist', csrfToken, newWhitelistReason.trim() || undefined)
    
    if ('error' in result) {
      setWhitelistError(result.error)
      setLoadingAddWhitelist(false)
      return
    }
    
    const lists = await getIPLists()
    setWhitelist(lists.whitelist)
    setNewWhitelistIP('')
    setNewWhitelistReason('')
    setShowAddWhitelistForm(false)
    setLoadingAddWhitelist(false)
  }

  const handleAddBlacklist = async () => {
    if (!newBlacklistIP.trim()) return
    
    setLoadingAddBlacklist(true)
    setBlacklistError(null)
    
    if (!csrfToken) {
      setBlacklistError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      setLoadingAddBlacklist(false)
      return
    }

    const result = await addToIPList(newBlacklistIP.trim(), 'blacklist', csrfToken, newBlacklistReason.trim() || undefined)
    
    if ('error' in result) {
      setBlacklistError(result.error)
      setLoadingAddBlacklist(false)
      return
    }
    
    const lists = await getIPLists()
    setBlacklist(lists.blacklist)
    setNewBlacklistIP('')
    setNewBlacklistReason('')
    setShowAddBlacklistForm(false)
    setLoadingAddBlacklist(false)
  }

  const handleRemoveWhitelist = async (id: string, ip: string) => {
    const confirmed = await confirm({
      title: 'Usunąć z białej listy?',
      message: `Czy na pewno chcesz usunąć ${ip} z białej listy?`,
      confirmText: 'Usuń',
      variant: 'danger',
    })
    
    if (!confirmed) return
    
    setRemovingId(id)
    setWhitelistError(null)
    
    if (!csrfToken) {
      setWhitelistError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      setRemovingId(null)
      return
    }

    const result = await removeFromIPList(id, csrfToken)
    
    if ('error' in result) {
      setWhitelistError(result.error)
      setRemovingId(null)
      return
    }
    
    const lists = await getIPLists()
    setWhitelist(lists.whitelist)
    setRemovingId(null)
  }

  const handleRemoveBlacklist = async (id: string, ip: string) => {
    const confirmed = await confirm({
      title: 'Usunąć z czarnej listy?',
      message: `Czy na pewno chcesz usunąć ${ip} z czarnej listy?`,
      confirmText: 'Usuń',
      variant: 'danger',
    })
    
    if (!confirmed) return
    
    setRemovingId(id)
    setBlacklistError(null)
    
    if (!csrfToken) {
      setBlacklistError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      setRemovingId(null)
      return
    }

    const result = await removeFromIPList(id, csrfToken)
    
    if ('error' in result) {
      setBlacklistError(result.error)
      setRemovingId(null)
      return
    }
    
    const lists = await getIPLists()
    setBlacklist(lists.blacklist)
    setRemovingId(null)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] light:bg-[#f5f5f5] transition-colors duration-300">
      <MobileNav currentPath="/security" showKonta={canAccessKonta} />
      
      <div className="hidden lg:flex fixed top-6 left-6 right-6 z-50 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors">
            Dashboard
          </Link>
          {canAccessKonta && (
            <Link href="/konta" className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors">
              Konta
            </Link>
          )}
          <Link href="/security" className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white light:text-black">
            Bezpieczeństwo
          </Link>
        </div>
      </div>

      <div className="p-4 lg:p-8 pt-20 lg:pt-24">
        <div className="max-w-6xl mx-auto space-y-6 lg:space-y-8">
          <div>
            <h1 className="text-2xl font-medium text-white light:text-black">Bezpieczeństwo</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mt-1">
              Panel bezpieczeństwa systemu
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 p-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                <p className="text-[9px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888]">Wynik bezpieczeństwa</p>
              </div>
              <p className="text-3xl font-light text-emerald-400">{securityScore}%</p>
            </div>

            <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 p-6">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-blue-400" />
                <p className="text-[9px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888]">2FA włączone</p>
              </div>
              <p className="text-3xl font-light text-blue-400">{stats.usersWith2FA}/{stats.totalUsers}</p>
            </div>

            <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 p-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <p className="text-[9px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888]">Nieudane logowania (24h)</p>
              </div>
              <p className="text-3xl font-light text-yellow-400">{stats.failedLogins24h}</p>
            </div>

            <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 p-6">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-red-400" />
                <p className="text-[9px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888]">Zablokowane IP</p>
              </div>
              <p className="text-3xl font-light text-red-400">{stats.blockedIPs}</p>
            </div>
          </div>

          <LoginChart />

          <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-[#444444] light:text-[#888888]" />
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">Ostatnie alerty</p>
              </div>

              {stats.recentAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-400">Brak alertów</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 bg-white/[0.02] light:bg-black/[0.02] rounded">
                      <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-white light:text-black">{alert.message}</p>
                        <p className="text-[10px] text-[#444444] light:text-[#888888]">{formatDate(alert.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90">
            <div className="p-6 border-b border-white/[0.06] light:border-black/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-[#444444] light:text-[#888888]" />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">Listy IP</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveIPTab('whitelist')}
                    className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-colors ${
                      activeIPTab === 'whitelist'
                        ? 'text-emerald-400 light:text-emerald-600 bg-emerald-500/10'
                        : 'text-[#666666] light:text-[#999999] hover:text-white light:hover:text-black'
                    }`}
                  >
                    Biała lista
                  </button>
                  <button
                    onClick={() => setActiveIPTab('blacklist')}
                    className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-colors ${
                      activeIPTab === 'blacklist'
                        ? 'text-red-400 light:text-red-600 bg-red-500/10'
                        : 'text-[#666666] light:text-[#999999] hover:text-white light:hover:text-black'
                    }`}
                  >
                    Czarna lista
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {activeIPTab === 'whitelist' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#666666] light:text-[#999999]">
                      {whitelist.length} {whitelist.length === 1 ? 'adres' : whitelist.length < 5 ? 'adresy' : 'adresów'} na białej liście
                    </p>
                    <button
                      onClick={() => setShowAddWhitelistForm(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-emerald-400 light:text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Dodaj IP
                    </button>
                  </div>

                  {showAddWhitelistForm && (
                    <div className="p-4 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.06] light:border-black/[0.06] space-y-3">
                      {whitelistError && (
                        <p className="text-xs text-red-400">{whitelistError}</p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={newWhitelistIP}
                          onChange={(e) => setNewWhitelistIP(e.target.value)}
                          placeholder="Adres IP (np. 192.168.1.1)"
                          className="h-10 px-3 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.06] light:border-black/[0.06] text-white light:text-black text-sm font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                        <input
                          type="text"
                          value={newWhitelistReason}
                          onChange={(e) => setNewWhitelistReason(e.target.value)}
                          placeholder="Powód (opcjonalnie)"
                          className="h-10 px-3 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.06] light:border-black/[0.06] text-white light:text-black text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleAddWhitelist}
                          disabled={loadingAddWhitelist || !newWhitelistIP.trim()}
                          className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-emerald-400 light:text-emerald-600 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loadingAddWhitelist ? 'Dodaję...' : 'Dodaj'}
                        </button>
                        <button
                          onClick={() => {
                            setShowAddWhitelistForm(false)
                            setNewWhitelistIP('')
                            setNewWhitelistReason('')
                            setWhitelistError(null)
                          }}
                          className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] border border-white/[0.06] light:border-black/[0.06] hover:bg-white/[0.02] light:hover:bg-black/[0.02] transition-colors"
                        >
                          Anuluj
                        </button>
                      </div>
                    </div>
                  )}

                  {whitelist.length === 0 ? (
                    <div className="text-center py-8">
                      <Globe className="h-8 w-8 text-[#333333] light:text-[#cccccc] mx-auto mb-2" />
                      <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">Brak adresów na białej liście</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {whitelist.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.04] light:border-black/[0.04]">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white light:text-black font-mono">{entry.ip}</p>
                            {entry.reason && (
                              <p className="text-[10px] text-[#666666] light:text-[#999999] truncate">{entry.reason}</p>
                            )}
                            <p className="text-[10px] text-[#444444] light:text-[#888888]">{formatDate(entry.created_at)}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveWhitelist(entry.id, entry.ip)}
                            disabled={removingId === entry.id}
                            className="p-2 text-[#666666] light:text-[#999999] hover:text-red-400 light:hover:text-red-600 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#666666] light:text-[#999999]">
                      {blacklist.length} {blacklist.length === 1 ? 'adres' : blacklist.length < 5 ? 'adresy' : 'adresów'} na czarnej liście
                    </p>
                    <button
                      onClick={() => setShowAddBlacklistForm(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-red-400 light:text-red-600 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Dodaj IP
                    </button>
                  </div>

                  {showAddBlacklistForm && (
                    <div className="p-4 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.06] light:border-black/[0.06] space-y-3">
                      {blacklistError && (
                        <p className="text-xs text-red-400">{blacklistError}</p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={newBlacklistIP}
                          onChange={(e) => setNewBlacklistIP(e.target.value)}
                          placeholder="Adres IP (np. 192.168.1.1)"
                          className="h-10 px-3 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.06] light:border-black/[0.06] text-white light:text-black text-sm font-mono focus:outline-none focus:border-red-500/50 transition-colors"
                        />
                        <input
                          type="text"
                          value={newBlacklistReason}
                          onChange={(e) => setNewBlacklistReason(e.target.value)}
                          placeholder="Powód (opcjonalnie)"
                          className="h-10 px-3 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.06] light:border-black/[0.06] text-white light:text-black text-sm focus:outline-none focus:border-red-500/50 transition-colors"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleAddBlacklist}
                          disabled={loadingAddBlacklist || !newBlacklistIP.trim()}
                          className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-red-400 light:text-red-600 bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loadingAddBlacklist ? 'Dodaję...' : 'Dodaj'}
                        </button>
                        <button
                          onClick={() => {
                            setShowAddBlacklistForm(false)
                            setNewBlacklistIP('')
                            setNewBlacklistReason('')
                            setBlacklistError(null)
                          }}
                          className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] border border-white/[0.06] light:border-black/[0.06] hover:bg-white/[0.02] light:hover:bg-black/[0.02] transition-colors"
                        >
                          Anuluj
                        </button>
                      </div>
                    </div>
                  )}

                  {blacklist.length === 0 ? (
                    <div className="text-center py-8">
                      <Ban className="h-8 w-8 text-[#333333] light:text-[#cccccc] mx-auto mb-2" />
                      <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">Brak adresów na czarnej liście</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {blacklist.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.04] light:border-black/[0.04]">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white light:text-black font-mono">{entry.ip}</p>
                            {entry.reason && (
                              <p className="text-[10px] text-[#666666] light:text-[#999999] truncate">{entry.reason}</p>
                            )}
                            <p className="text-[10px] text-[#444444] light:text-[#888888]">{formatDate(entry.created_at)}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveBlacklist(entry.id, entry.ip)}
                            disabled={removingId === entry.id}
                            className="p-2 text-[#666666] light:text-[#999999] hover:text-red-400 light:hover:text-red-600 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <GlobalSessionsManager />
        </div>
      </div>
    </div>
  )
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
