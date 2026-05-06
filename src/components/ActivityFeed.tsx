'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LogIn, LogOut, User, Lock, Shield, ExternalLink } from 'lucide-react'

interface AuditEntry {
  id: string
  action: string
  details: Record<string, unknown> | null
  created_at: string
}

interface ActivityFeedProps {
  entries: AuditEntry[]
  showViewAll?: boolean
  canViewAll?: boolean
}

const actionIcons: Record<string, typeof LogIn> = {
  login: LogIn,
  logout: LogOut,
  profile_update: User,
  password_change: Lock,
  '2fa_verify': Shield,
  '2fa_enable': Shield,
  '2fa_disable': Shield,
  user_create: User,
  user_update: User,
  user_delete: User,
  email_change: User,
  permission_grant: Shield,
  permission_revoke: Shield,
}

const actionLabels: Record<string, string> = {
  login: 'Zalogował się',
  logout: 'Wylogował się',
  profile_update: 'Zaktualizował profil',
  password_change: 'Zmienił hasło',
  '2fa_verify': 'Zweryfikował 2FA',
  '2fa_enable': 'Włączył 2FA',
  '2fa_disable': 'Wyłączył 2FA',
  user_create: 'Utworzył użytkownika',
  user_update: 'Zaktualizował użytkownika',
  user_delete: 'Usunął użytkownika',
  email_change: 'Zmienił email',
  permission_grant: 'Nadał uprawnienie',
  permission_revoke: 'Usunął uprawnienie',
}

const actionColors: Record<string, string> = {
  login: 'bg-emerald-500/20 text-emerald-400',
  logout: 'bg-red-500/20 text-red-400',
  profile_update: 'bg-blue-500/20 text-blue-400',
  password_change: 'bg-yellow-500/20 text-yellow-400',
  '2fa_verify': 'bg-purple-500/20 text-purple-400',
  '2fa_enable': 'bg-purple-500/20 text-purple-400',
  '2fa_disable': 'bg-orange-500/20 text-orange-400',
  user_create: 'bg-emerald-500/20 text-emerald-400',
  user_update: 'bg-blue-500/20 text-blue-400',
  user_delete: 'bg-red-500/20 text-red-400',
  email_change: 'bg-cyan-500/20 text-cyan-400',
  permission_grant: 'bg-emerald-500/20 text-emerald-400',
  permission_revoke: 'bg-red-500/20 text-red-400',
}

export function ActivityFeed({ entries, showViewAll = true, canViewAll = false }: ActivityFeedProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const diff = currentTime - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Teraz'
    if (minutes < 60) return `${minutes}min temu`
    if (hours < 24) return `${hours}h temu`
    return `${days}d temu`
  }

  return (
    <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-colors duration-300">
      <div className="p-4 border-b border-white/[0.06] light:border-black/[0.06]">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
            Ostatnia aktywność
          </p>
          {showViewAll && canViewAll && (
            <Link
              href="/audit"
              className="flex items-center gap-1 text-[10px] text-[#666666] light:text-[#999999] hover:text-white light:hover:text-black transition-colors"
            >
              Zobacz wszystkie
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      <div className="divide-y divide-white/[0.04] light:divide-black/[0.04]">
        {entries.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
              Brak aktywności
            </p>
          </div>
        ) : (
          entries.map((entry) => {
            const Icon = actionIcons[entry.action] || User
            const label = actionLabels[entry.action] || entry.action
            const color = actionColors[entry.action] || 'bg-gray-500/20 text-gray-400'
            const email = entry.details?.email as string || 'System'

            return (
              <div key={entry.id} className="flex items-center gap-3 p-4 hover:bg-white/[0.02] light:hover:bg-black/[0.02] transition-colors">
                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white light:text-black truncate">
                    {label}
                  </p>
                  <p className="text-[10px] text-[#666666] light:text-[#999999] truncate">
                    {email}
                  </p>
                </div>
                <span className="text-[10px] text-[#444444] light:text-[#888888] flex-shrink-0">
                  {formatTimeAgo(entry.created_at)}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
