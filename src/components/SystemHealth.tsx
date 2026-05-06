'use client'

import { Users, LogIn, Shield, Activity } from 'lucide-react'

interface SystemHealthProps {
  totalUsers: number
  recentLogins: number
  activeSessions: number
  systemStatus: 'healthy' | 'warning' | 'error'
  errorsCount?: number
}

export function SystemHealth({
  totalUsers,
  recentLogins,
  activeSessions,
  systemStatus,
  errorsCount = 0
}: SystemHealthProps) {
  const stats = [
    {
      label: 'Użytkownicy',
      value: totalUsers,
      icon: Users,
      color: 'text-blue-400 light:text-blue-600',
      tooltip: 'Całkowita liczba kont w systemie'
    },
    {
      label: 'Logowania (24h)',
      value: recentLogins,
      icon: LogIn,
      color: 'text-emerald-400 light:text-emerald-600',
      tooltip: 'Pomyślne logowania w ostatnich 24 godzinach'
    },
    {
      label: 'Aktywne sesje',
      value: activeSessions,
      icon: Shield,
      color: 'text-purple-400 light:text-purple-600',
      tooltip: 'Sesje z aktywnością w ciągu ostatniej doby'
    },
    {
      label: 'Status systemu',
      value: systemStatus === 'healthy' ? 'OK' : systemStatus === 'warning' ? 'Uwaga' : 'Błąd',
      icon: Activity,
      color: systemStatus === 'healthy'
        ? 'text-emerald-400 light:text-emerald-600'
        : systemStatus === 'warning'
        ? 'text-yellow-400 light:text-yellow-600'
        : 'text-red-400 light:text-red-600',
      tooltip: systemStatus === 'healthy' 
        ? 'System działa poprawnie' 
        : systemStatus === 'warning'
        ? `Wykryto ${errorsCount} problemów w ciągu 24h`
        : `Wykryto ${errorsCount} błędów - sprawdź audit log`,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="group relative border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl p-4 transition-colors duration-300"
        >
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888]">
              {stat.label}
            </p>
          </div>
          <p className={`text-2xl font-light ${stat.color}`}>
            {stat.value}
          </p>
          
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 pointer-events-none z-[9999] transition-opacity duration-200">
            <div className="bg-[#222222] light:bg-[#f0f0f0] border border-white/10 light:border-black/10 px-3 py-2 rounded shadow-xl whitespace-nowrap">
              <p className="text-[11px] text-[#cccccc] light:text-[#333333]">{stat.tooltip}</p>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#222222] light:border-t-[#f0f0f0]"></div>
          </div>
        </div>
      ))}
    </div>
  )
}
