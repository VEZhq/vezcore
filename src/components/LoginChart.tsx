'use client'

import { useState, useEffect } from 'react'
import { Activity } from 'lucide-react'
import { getLoginStats, type LoginStats } from '@/lib/actions/stats'

interface LoginChartProps {
  days?: number
}

export function LoginChart({ days = 7 }: LoginChartProps) {
  const [stats, setStats] = useState<LoginStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getLoginStats(days).then((data) => {
      if (!cancelled) {
        setStats(data)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [days])

  const maxValue = Math.max(...stats.flatMap(s => [s.successful, s.failed]), 1)

  if (loading) {
    return (
      <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-[#444444] light:text-[#888888]" />
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
            Próby logowania
          </p>
        </div>
        <div className="h-40 flex items-center justify-center">
          <p className="text-[10px] text-[#444444]">Ładowanie...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#444444] light:text-[#888888]" />
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
            Próby logowania
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-[#666666] light:text-[#999999]">Sukces</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-[#666666] light:text-[#999999]">Błąd</span>
          </div>
        </div>
      </div>

      <div className="h-40 flex items-end gap-1">
        {stats.map((stat, index) => {
          const successHeight = (stat.successful / maxValue) * 100
          const failHeight = (stat.failed / maxValue) * 100

          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex flex-col items-center gap-0.5" style={{ height: '140px' }}>
                <div 
                  className="w-full bg-emerald-500/30 rounded-t"
                  style={{ height: `${successHeight}%`, minHeight: stat.successful > 0 ? '2px' : '0' }}
                />
                <div 
                  className="w-full bg-red-500/30 rounded-b"
                  style={{ height: `${failHeight}%`, minHeight: stat.failed > 0 ? '2px' : '0' }}
                />
              </div>
              <span className="text-[8px] text-[#444444] light:text-[#888888] mt-1">
                {stat.date.split('-')[2]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
