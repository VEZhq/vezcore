'use server'

import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { getVezVisionPrivilegedClient } from '@/lib/supabase/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { logError } from '@/lib/logger'
import type { ActionResult } from './types'

export interface VezVisionDashboardStats {
  blog: { total: number; published: number; draft: number }
  portfolio: { total: number; published: number; draft: number }
  services: { total: number; active: number; inactive: number }
  faq: { total: number; active: number; inactive: number }
  newsletter: { total: number; active: number; inactive: number }
  files: { total: number; private: number; public: number }
}

interface VezVisionDashboardStatsRpcRow {
  blog_total: number
  blog_published: number
  portfolio_total: number
  portfolio_published: number
  services_total: number
  services_active: number
  faq_total: number
  faq_active: number
  newsletter_total: number
  newsletter_active: number
  files_total: number
  files_public: number
}

type VezVisionTable =
  | 'vv_blog_posts'
  | 'vv_projects'
  | 'vv_services'
  | 'vv_faq_items'
  | 'vv_newsletter_subscribers'
  | 'vv_files'

async function countRows(table: VezVisionTable, filters: Record<string, string | boolean> = {}): Promise<number> {
  const vv = getVezVisionPrivilegedClient()
  let query = vv.from(table).select('id', { count: 'exact', head: true })
  for (const [column, value] of Object.entries(filters)) {
    query = query.eq(column, value)
  }
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

export async function getVezVisionDashboardStats(): Promise<ActionResult<VezVisionDashboardStats>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.ACCESS)
  if ('error' in auth) return { success: false, error: auth.error }

  try {
    const vv = getVezVisionPrivilegedClient()
    const { data: rpcStats, error: rpcError } = await vv.rpc('vv_dashboard_stats').single()

    if (!rpcError && rpcStats) {
      const stats = rpcStats as VezVisionDashboardStatsRpcRow
      return {
        success: true,
        data: {
          blog: { total: stats.blog_total, published: stats.blog_published, draft: stats.blog_total - stats.blog_published },
          portfolio: { total: stats.portfolio_total, published: stats.portfolio_published, draft: stats.portfolio_total - stats.portfolio_published },
          services: { total: stats.services_total, active: stats.services_active, inactive: stats.services_total - stats.services_active },
          faq: { total: stats.faq_total, active: stats.faq_active, inactive: stats.faq_total - stats.faq_active },
          newsletter: { total: stats.newsletter_total, active: stats.newsletter_active, inactive: stats.newsletter_total - stats.newsletter_active },
          files: { total: stats.files_total, private: stats.files_total - stats.files_public, public: stats.files_public },
        },
      }
    }

    const [
      blogTotal,
      blogPublished,
      portfolioTotal,
      portfolioPublished,
      servicesTotal,
      servicesActive,
      faqTotal,
      faqActive,
      newsletterTotal,
      newsletterActive,
      filesTotal,
      filesPublic,
    ] = await Promise.all([
      countRows('vv_blog_posts'),
      countRows('vv_blog_posts', { status: 'published' }),
      countRows('vv_projects'),
      countRows('vv_projects', { status: 'published' }),
      countRows('vv_services'),
      countRows('vv_services', { status: 'active' }),
      countRows('vv_faq_items'),
      countRows('vv_faq_items', { is_active: true }),
      countRows('vv_newsletter_subscribers'),
      countRows('vv_newsletter_subscribers', { is_active: true }),
      countRows('vv_files'),
      countRows('vv_files', { is_public: true }),
    ])

    return {
      success: true,
      data: {
        blog: { total: blogTotal, published: blogPublished, draft: blogTotal - blogPublished },
        portfolio: { total: portfolioTotal, published: portfolioPublished, draft: portfolioTotal - portfolioPublished },
        services: { total: servicesTotal, active: servicesActive, inactive: servicesTotal - servicesActive },
        faq: { total: faqTotal, active: faqActive, inactive: faqTotal - faqActive },
        newsletter: { total: newsletterTotal, active: newsletterActive, inactive: newsletterTotal - newsletterActive },
        files: { total: filesTotal, private: filesTotal - filesPublic, public: filesPublic },
      },
    }
  } catch (error) {
    logError('stats.getVezVisionDashboardStats', error)
    return { success: false, error: 'Błąd podczas pobierania statystyk VezVision' }
  }
}
