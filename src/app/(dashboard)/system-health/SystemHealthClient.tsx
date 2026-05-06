'use client'

import Link from 'next/link'
import { Database, Users, AlertTriangle, Activity } from 'lucide-react'
import { MobileNav } from '@/components/MobileNav'
import type { SystemHealthData } from '@/lib/actions/health'

interface SystemHealthClientProps {
  data: SystemHealthData
  canAccessKonta: boolean
}

export default function SystemHealthClient({ data, canAccessKonta }: SystemHealthClientProps) {
  const dbColor = data.database.status === 'healthy' 
    ? 'text-emerald-400' 
    : data.database.status === 'degraded' 
    ? 'text-yellow-400' 
    : 'text-red-400'

  const uptimeColor = data.uptime.status === 'operational' 
    ? 'text-emerald-400' 
    : data.uptime.status === 'degraded' 
    ? 'text-yellow-400' 
    : 'text-red-400'

  return (
    <div className="min-h-screen bg-[#0a0a0a] light:bg-[#f5f5f5] transition-colors duration-300">
      <MobileNav currentPath="/system-health" showKonta={canAccessKonta} />
      
      <div className="hidden lg:flex fixed top-6 left-6 right-6 z-50 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors">
            Dashboard
          </Link>
          <Link href="/system-health" className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white light:text-black">
            Health
          </Link>
        </div>
      </div>

      <div className="p-4 lg:p-8 pt-20 lg:pt-24">
        <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8">
          <div>
            <h1 className="text-2xl font-medium text-white light:text-black">System Health</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mt-1">
              Status systemu
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 p-6">
              <div className="flex items-center gap-2 mb-2">
                <Database className={`h-4 w-4 ${dbColor}`} />
                <p className="text-[9px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888]">Baza danych</p>
              </div>
              <p className={`text-2xl font-light ${dbColor}`}>{data.database.latency}ms</p>
              <p className="text-[10px] text-[#666666] light:text-[#999999]">{data.database.status}</p>
            </div>

            <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 p-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-400" />
                <p className="text-[9px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888]">Użytkownicy</p>
              </div>
              <p className="text-2xl font-light text-blue-400">{data.users.total}</p>
              <p className="text-[10px] text-[#666666] light:text-[#999999]">{data.users.active_24h} aktywnych 24h</p>
            </div>

            <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 p-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <p className="text-[9px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888]">Błędy 24h</p>
              </div>
              <p className="text-2xl font-light text-yellow-400">{data.errors.total_24h}</p>
            </div>

            <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 p-6">
              <div className="flex items-center gap-2 mb-2">
                <Activity className={`h-4 w-4 ${uptimeColor}`} />
                <p className="text-[9px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888]">Uptime</p>
              </div>
              <p className={`text-lg font-light ${uptimeColor}`}>{data.uptime.status}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
