import { NextResponse } from 'next/server'
import { createActionClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { getVezVisionPrivilegedClient } from '@/lib/supabase/vezvision'
import { getCoreModulesPrivilegedClient } from '@/lib/supabase/core-modules'
import { sanitizeSearchTerm } from '@/lib/vezvision-security-utils'
import { getUserPermissions } from '@/lib/permissions'
import type { SearchResult } from '@/lib/search/types'
import { checkRateLimit } from '@/lib/rate-limit'
import { isAdminRole } from '@/lib/roles'
import { resolveClientIpFromHeaders } from '@/lib/server-utils'
import { ONE_MINUTE } from '@/lib/constants/time'
import { withCors } from '@/app/api/withCors'

function matchesQuery(value: string, query: string): boolean {
  return value.toLowerCase().includes(query.toLowerCase())
}

export const GET = withCors(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const rawQuery = searchParams.get('q') ?? ''

  if (!rawQuery || rawQuery.length < 2) {
    return NextResponse.json([] satisfies SearchResult[])
  }

  const safeQuery = sanitizeSearchTerm(rawQuery)
  if (safeQuery.length < 2) {
    return NextResponse.json([] satisfies SearchResult[])
  }

  const supabase = await createActionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json([] satisfies SearchResult[])
  }

  const ip = resolveClientIpFromHeaders(request.headers)
  const rateLimit = await checkRateLimit(`api_search:${user.id}:${ip}`, {
    maxRequests: 30,
    windowMs: ONE_MINUTE,
  })

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const permissions = await getUserPermissions()
  const results: SearchResult[] = []
  const canSearchUsers = isAdminRole(permissions.role) || permissions.canManagePermissions

  if (canSearchUsers) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .is('deleted_at', null)
      .ilike('full_name', `%${safeQuery}%`)
      .limit(5)

    if (profiles) {
      const adminClient = getAdminClient()
      const { data: authUsers } = await adminClient.auth.admin.listUsers()
      const emailMap = new Map((authUsers?.users || []).map((entry) => [entry.id, entry.email || '']))

      for (const profile of profiles) {
        const email = emailMap.get(profile.id) || ''
        if (matchesQuery(email, safeQuery) || matchesQuery(profile.full_name || '', safeQuery)) {
          results.push({
            type: 'user',
            id: profile.id,
            title: profile.full_name || email,
            subtitle: email,
            href: `/konta/${profile.id}`,
          })
        }
      }
    }
  }

  if (permissions.canAccessAudit) {
    const [{ data: actionLogs }, { data: emailLogs }] = await Promise.all([
      supabase
        .from('audit_log')
        .select('id, action, details, created_at')
        .ilike('action', `%${safeQuery}%`)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('audit_log')
        .select('id, action, details, created_at')
        .ilike('details->>email', `%${safeQuery}%`)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const seen = new Set<string>()
    for (const log of [...(actionLogs || []), ...(emailLogs || [])]) {
      if (seen.has(log.id)) continue
      seen.add(log.id)
      const email = (typeof log.details === 'object' && log.details !== null && !Array.isArray(log.details)
        ? (log.details as Record<string, unknown>).email as string | undefined
        : undefined) || ''
      results.push({
        type: 'log',
        id: log.id,
        title: log.action,
        subtitle: email,
        href: '/audit',
      })
    }
  }

  const vezVisionNavigationEntries: Array<SearchResult & { visible: boolean; keywords: string[] }> = [
    {
      type: 'navigation',
      id: 'vezvision-dashboard',
      title: 'VezVision Dashboard',
      subtitle: 'Ekosystem VezVision',
      href: '/vezvision',
      visible: permissions.canAccessVezVision,
      keywords: ['vezvision', 'cms', 'dashboard'],
    },
    {
      type: 'navigation',
      id: 'vezvision-blog',
      title: 'VezVision Blog',
      subtitle: 'Posty i publikacje',
      href: '/vezvision/blog',
      visible: permissions.canViewVezVisionBlog,
      keywords: ['vezvision', 'blog', 'posty', 'publikacje'],
    },
    {
      type: 'navigation',
      id: 'vezvision-portfolio',
      title: 'VezVision Portfolio',
      subtitle: 'Realizacje i projekty',
      href: '/vezvision/portfolio',
      visible: permissions.canViewVezVisionPortfolio,
      keywords: ['vezvision', 'portfolio', 'projekty', 'realizacje'],
    },
    {
      type: 'navigation',
      id: 'vezvision-services',
      title: 'VezVision Usługi',
      subtitle: 'Oferta i usługi',
      href: '/vezvision/services',
      visible: permissions.canViewVezVisionServices,
      keywords: ['vezvision', 'usługi', 'services', 'oferta'],
    },
    {
      type: 'navigation',
      id: 'vezvision-faq',
      title: 'VezVision FAQ',
      subtitle: 'Pytania i odpowiedzi',
      href: '/vezvision/faq',
      visible: permissions.canViewVezVisionFaq,
      keywords: ['vezvision', 'faq', 'pytania', 'odpowiedzi'],
    },
    {
      type: 'navigation',
      id: 'vezvision-newsletter',
      title: 'VezVision Newsletter',
      subtitle: 'Subskrybenci i kampanie',
      href: '/vezvision/newsletter',
      visible: permissions.canViewVezVisionNewsletter,
      keywords: ['vezvision', 'newsletter', 'subskrybenci', 'kampanie'],
    },
    {
      type: 'navigation',
      id: 'vezvision-files',
      title: 'VezVision Pliki',
      subtitle: 'Biblioteka plików',
      href: '/vezvision/files',
      visible: permissions.canViewVezVisionFiles,
      keywords: ['vezvision', 'pliki', 'media', 'assets'],
    },
    {
      type: 'navigation',
      id: 'vezvision-settings',
      title: 'VezVision Ustawienia',
      subtitle: 'Konfiguracja CMS',
      href: '/vezvision/settings',
      visible: permissions.canViewVezVisionSettings,
      keywords: ['vezvision', 'ustawienia', 'cms', 'konfiguracja'],
    },
  ]

  for (const entry of vezVisionNavigationEntries) {
    if (!entry.visible) continue

    const haystack = [entry.title, entry.subtitle, ...entry.keywords]
    if (haystack.some((value) => matchesQuery(value, safeQuery))) {
      results.push({
        type: entry.type,
        id: entry.id,
        title: entry.title,
        subtitle: entry.subtitle,
        href: entry.href,
      })
    }
  }

  if (permissions.canViewVezVisionBlog) {
    const vvClient = getVezVisionPrivilegedClient()
    const { data: posts } = await vvClient
      .from('vv_blog_posts')
      .select('id, title_pl, status')
      .ilike('title_pl', `%${safeQuery}%`)
      .limit(5)

    for (const post of posts ?? []) {
      results.push({
        type: 'navigation',
        id: `blog-${post.id}`,
        title: post.title_pl,
        subtitle: `VezVision Blog • ${post.status}`,
        href: `/vezvision/blog/${post.id}`,
      })
    }
  }

  if (permissions.canViewVezVisionPortfolio) {
    const vvClient = getVezVisionPrivilegedClient()
    const { data: projects } = await vvClient
      .from('vv_projects')
      .select('id, title_pl, status')
      .ilike('title_pl', `%${safeQuery}%`)
      .limit(5)

    for (const project of projects ?? []) {
      results.push({
        type: 'navigation',
        id: `portfolio-${project.id}`,
        title: project.title_pl,
        subtitle: `VezVision Portfolio • ${project.status}`,
        href: `/vezvision/portfolio/${project.id}`,
      })
    }
  }

  if (permissions.canViewVezVisionServices) {
    const vvClient = getVezVisionPrivilegedClient()
    const { data: services } = await vvClient
      .from('vv_services')
      .select('id, title_pl, status')
      .ilike('title_pl', `%${safeQuery}%`)
      .limit(5)

    for (const service of services ?? []) {
      results.push({
        type: 'navigation',
        id: `service-${service.id}`,
        title: service.title_pl,
        subtitle: `VezVision Usługi • ${service.status}`,
        href: `/vezvision/services/${service.id}`,
      })
    }
  }

  if (permissions.canViewVezVisionFaq) {
    const vvClient = getVezVisionPrivilegedClient()
    const { data: faqItems } = await vvClient
      .from('vv_faq_items')
      .select('id, question_pl, is_active')
      .ilike('question_pl', `%${safeQuery}%`)
      .limit(5)

    for (const item of faqItems ?? []) {
      results.push({
        type: 'navigation',
        id: `faq-${item.id}`,
        title: item.question_pl,
        subtitle: `VezVision FAQ • ${item.is_active ? 'active' : 'inactive'}`,
        href: `/vezvision/faq/${item.id}`,
      })
    }
  }

  if (permissions.canViewVezVisionNewsletter) {
    const vvClient = getCoreModulesPrivilegedClient()
    const { data: campaigns } = await vvClient
      .from('vv_newsletter_campaigns')
      .select('id, subject, status')
      .ilike('subject', `%${safeQuery}%`)
      .limit(5)

    for (const campaign of campaigns ?? []) {
      results.push({
        type: 'navigation',
        id: `newsletter-${campaign.id}`,
        title: campaign.subject,
        subtitle: `VezVision Newsletter • ${campaign.status}`,
        href: '/vezvision/newsletter',
      })
    }
  }

  return NextResponse.json(results.slice(0, 12))
})
