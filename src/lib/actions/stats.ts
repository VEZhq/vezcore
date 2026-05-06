'use server'

import { createActionClient } from '@/lib/supabase/server'
import { isAdminRole } from '@/lib/roles'

export interface LoginStats {
  date: string
  successful: number
  failed: number
}

export async function getLoginStats(days: number = 7): Promise<LoginStats[]> {
  const supabase = await createActionClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isAdminRole(profile?.role)) {
    return []
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  const { data: logs } = await supabase
    .from('audit_log')
    .select('action, created_at')
    .in('action', ['login', 'failed_login'])
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  const statsByDate: Record<string, { successful: number; failed: number }> = {}

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    statsByDate[dateStr] = { successful: 0, failed: 0 }
  }

  if (logs) {
    for (const log of logs) {
      const dateStr = log.created_at.split('T')[0]
      if (statsByDate[dateStr]) {
        if (log.action === 'login') {
          statsByDate[dateStr].successful++
        } else if (log.action === 'failed_login') {
          statsByDate[dateStr].failed++
        }
      }
    }
  }

  return Object.entries(statsByDate).map(([date, stats]) => ({
    date,
    successful: stats.successful,
    failed: stats.failed,
  }))
}
