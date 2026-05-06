'use server'
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, MIN_PAGE_LIMIT, MAX_TITLE_LENGTH, MAX_SLUG_LENGTH, MAX_EXCERPT_LENGTH, MAX_CONTENT_LENGTH_KB, MAX_QUESTION_LENGTH, MAX_ANSWER_LENGTH_KB, MAX_CATEGORY_LENGTH, MAX_SUBJECT_LENGTH, MAX_EVENT_TITLE_LENGTH } from '@/lib/constants/pagination'

import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { getVezVisionPrivilegedClient } from '@/lib/supabase/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { logError } from '@/lib/logger'
import type { ActionResult } from '../types'

export interface NewsletterAnalytics {
  campaigns: Array<{
    id: string
    subject: string
    status: string
    recipient_count: number
    sent_count: number
    sent_at: string | null
    created_at: string
  }>
  stats: {
    totalSubscribers: number
    activeSubscribers: number
    inactiveSubscribers: number
    totalSent: number
    totalFailed: number
    totalCampaigns: number
  }
}

export async function getNewsletterAnalytics(): Promise<ActionResult<NewsletterAnalytics>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()

  const [campaignsResult, totalSubResult, activeSubResult, logsResult] = await Promise.all([
    vv
      .from('vv_newsletter_campaigns')
      .select('id,subject,status,recipient_count,sent_count,sent_at,created_at')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(DEFAULT_PAGE_LIMIT),
    vv.from('vv_newsletter_subscribers').select('*', { count: 'exact', head: true }),
    vv.from('vv_newsletter_subscribers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    vv
      .from('vv_newsletter_campaigns')
      .select('sent_count,recipient_count')
      .eq('status', 'sent'),
  ])

  if (campaignsResult.error || totalSubResult.error || activeSubResult.error || logsResult.error) {
    logError('newsletter.getNewsletterAnalytics', campaignsResult.error || totalSubResult.error || activeSubResult.error || logsResult.error)
    return { success: false, error: 'Błąd podczas pobierania analiz' }
  }

  const campaigns = campaignsResult.data ?? []
  const totalSubscribers = totalSubResult.count ?? 0
  const activeSubscribers = activeSubResult.count ?? 0
  const logs = logsResult.data ?? []

  const totalSent = logs.reduce((sum, c) => sum + (c.sent_count ?? 0), 0)
  const totalFailed = logs.reduce((sum, c) => sum + ((c.recipient_count ?? 0) - (c.sent_count ?? 0)), 0)

  return {
    success: true,
    data: {
      campaigns: campaigns as NewsletterAnalytics['campaigns'],
      stats: {
        totalSubscribers,
        activeSubscribers,
        inactiveSubscribers: totalSubscribers - activeSubscribers,
        totalSent,
        totalFailed,
        totalCampaigns: campaigns.length,
      },
    },
  }
}
