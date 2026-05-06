import Link from 'next/link'
import { Suspense, type ComponentType } from 'react'
import { FileText, FolderOpen, Wrench, Plus, MessageCircleQuestion, Mail, Files, MoreVertical, Filter, Rows3 } from 'lucide-react'
import { hasVezVisionPermission, requireAnyVezVisionPermission } from '@/lib/auth/vezvision-permissions'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { getVezVisionDashboardStats, type VezVisionDashboardStats } from '@/lib/actions/vezvision/stats'

interface VezVisionCardAccess {
  canViewBlog: boolean
  canManageBlog: boolean
  canViewPortfolio: boolean
  canManagePortfolio: boolean
  canViewServices: boolean
  canManageServices: boolean
  canViewFaq: boolean
  canManageFaq: boolean
  canViewNewsletter: boolean
  canManageNewsletter: boolean
  canViewFiles: boolean
  canManageFiles: boolean
}

interface VezVisionCard {
  visible: boolean
  canAdd: boolean
  href: string
  addHref: string
  icon: ComponentType<{ className?: string }>
  label: string
  total: number
  primary: { count: number; label: string }
  secondary: { count: number; label: string }
}

export default async function VezVisionDashboardPage() {
  const state = await requireAnyVezVisionPermission([
    VEZVISION_PERMISSIONS.ACCESS,
    VEZVISION_PERMISSIONS.BLOG_VIEW,
    VEZVISION_PERMISSIONS.PORTFOLIO_VIEW,
    VEZVISION_PERMISSIONS.SERVICES_VIEW,
    VEZVISION_PERMISSIONS.FAQ_VIEW,
    VEZVISION_PERMISSIONS.NEWSLETTER_VIEW,
    VEZVISION_PERMISSIONS.FILES_VIEW,
    VEZVISION_PERMISSIONS.FILES_MANAGE,
    VEZVISION_PERMISSIONS.FILES_PERMISSIONS_MANAGE,
  ])

  const access: VezVisionCardAccess = {
    canViewBlog: hasVezVisionPermission(state, VEZVISION_PERMISSIONS.BLOG_VIEW),
    canManageBlog: hasVezVisionPermission(state, VEZVISION_PERMISSIONS.BLOG_MANAGE),
    canViewPortfolio: hasVezVisionPermission(state, VEZVISION_PERMISSIONS.PORTFOLIO_VIEW),
    canManagePortfolio: hasVezVisionPermission(state, VEZVISION_PERMISSIONS.PORTFOLIO_MANAGE),
    canViewServices: hasVezVisionPermission(state, VEZVISION_PERMISSIONS.SERVICES_VIEW),
    canManageServices: hasVezVisionPermission(state, VEZVISION_PERMISSIONS.SERVICES_MANAGE),
    canViewFaq: hasVezVisionPermission(state, VEZVISION_PERMISSIONS.FAQ_VIEW),
    canManageFaq: hasVezVisionPermission(state, VEZVISION_PERMISSIONS.FAQ_MANAGE),
    canViewNewsletter: hasVezVisionPermission(state, VEZVISION_PERMISSIONS.NEWSLETTER_VIEW),
    canManageNewsletter: hasVezVisionPermission(state, VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE),
    canViewFiles:
      hasVezVisionPermission(state, VEZVISION_PERMISSIONS.FILES_VIEW) ||
      hasVezVisionPermission(state, VEZVISION_PERMISSIONS.FILES_MANAGE) ||
      hasVezVisionPermission(state, VEZVISION_PERMISSIONS.FILES_PERMISSIONS_MANAGE),
    canManageFiles: hasVezVisionPermission(state, VEZVISION_PERMISSIONS.FILES_MANAGE),
  }

  return (
    <Suspense fallback={<VezVisionCards access={access} dashboardStats={null} />}>
      <VezVisionCardsWithStats access={access} />
    </Suspense>
  )
}

async function VezVisionCardsWithStats({ access }: { access: VezVisionCardAccess }) {
  const statsResult = await getVezVisionDashboardStats()
  const dashboardStats = statsResult.success ? statsResult.data : null
  return <VezVisionCards access={access} dashboardStats={dashboardStats} />
}

function buildStats(access: VezVisionCardAccess, dashboardStats: VezVisionDashboardStats | null): VezVisionCard[] {
  return [
    {
      visible: access.canViewBlog,
      canAdd: access.canManageBlog,
      href: '/vezvision/blog',
      addHref: '/vezvision/blog/new',
      icon: FileText,
      label: 'Blog',
      total: dashboardStats?.blog.total ?? 0,
      primary: { count: dashboardStats?.blog.published ?? 0, label: 'opublikowane' },
      secondary: { count: dashboardStats?.blog.draft ?? 0, label: 'szkice' },
    },
    {
      visible: access.canViewPortfolio,
      canAdd: access.canManagePortfolio,
      href: '/vezvision/portfolio',
      addHref: '/vezvision/portfolio/new',
      icon: FolderOpen,
      label: 'Portfolio',
      total: dashboardStats?.portfolio.total ?? 0,
      primary: { count: dashboardStats?.portfolio.published ?? 0, label: 'opublikowane' },
      secondary: { count: dashboardStats?.portfolio.draft ?? 0, label: 'szkice' },
    },
    {
      visible: access.canViewServices,
      canAdd: access.canManageServices,
      href: '/vezvision/services',
      addHref: '/vezvision/services/new',
      icon: Wrench,
      label: 'Usługi',
      total: dashboardStats?.services.total ?? 0,
      primary: { count: dashboardStats?.services.active ?? 0, label: 'aktywne' },
      secondary: { count: dashboardStats?.services.inactive ?? 0, label: 'nieaktywne' },
    },
    {
      visible: access.canViewFaq,
      canAdd: access.canManageFaq,
      href: '/vezvision/faq',
      addHref: '/vezvision/faq/new',
      icon: MessageCircleQuestion,
      label: 'FAQ',
      total: dashboardStats?.faq.total ?? 0,
      primary: { count: dashboardStats?.faq.active ?? 0, label: 'aktywne' },
      secondary: { count: dashboardStats?.faq.inactive ?? 0, label: 'wyłączone' },
    },
    {
      visible: access.canViewNewsletter,
      canAdd: access.canManageNewsletter,
      href: '/vezvision/newsletter',
      addHref: '/vezvision/newsletter',
      icon: Mail,
      label: 'Newsletter',
      total: dashboardStats?.newsletter.total ?? 0,
      primary: { count: dashboardStats?.newsletter.active ?? 0, label: 'aktywne' },
      secondary: { count: dashboardStats?.newsletter.inactive ?? 0, label: 'wypisane' },
    },
    {
      visible: access.canViewFiles,
      canAdd: access.canManageFiles,
      href: '/vezvision/files',
      addHref: '/vezvision/files',
      icon: Files,
      label: 'Pliki',
      total: dashboardStats?.files.total ?? 0,
      primary: { count: dashboardStats?.files.private ?? 0, label: 'prywatne' },
      secondary: { count: dashboardStats?.files.public ?? 0, label: 'publiczne' },
    },
  ].filter((stat) => stat.visible)
}

function VezVisionCards({ access, dashboardStats }: { access: VezVisionCardAccess; dashboardStats: VezVisionDashboardStats | null }) {
  const stats = buildStats(access, dashboardStats)
  const totalModules = stats.length
  const totalItems = stats.reduce((sum, stat) => sum + stat.total, 0)
  const activeItems = stats.reduce((sum, stat) => sum + stat.primary.count, 0)
  const waitingItems = stats.reduce((sum, stat) => sum + stat.secondary.count, 0)
  const widgetCls = 'rounded-[4px] border border-[#ececf1] bg-white p-4 shadow-[0_8px_26px_rgba(25,29,42,0.04)]'
  const moduleCardCls = 'group rounded-[5px] border border-[#ececf1] bg-white p-3 shadow-[0_6px_18px_rgba(25,29,42,0.035)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(25,29,42,0.08)]'

  return (
    <div className="w-full space-y-5 px-5 py-4 xl:px-6">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[21px] font-medium tracking-[-0.04em] text-[#111111]">VezVision report</h1>
          <p className="mt-1 max-w-xl text-[12px] leading-5 text-[#656b76]">
            Podgląd treści, publikacji i modułów panelu. Zarządzaj naszymi sekcjami bez zmiany kontekstu pracy.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[#555b66]">
          <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-[4px] px-2 transition-colors hover:bg-[#f0f0f4]">
            <Rows3 className="h-3.5 w-3.5" />
            Widgets
          </button>
          <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-[4px] px-2 transition-colors hover:bg-[#f0f0f4]">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </button>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1fr_0.78fr_1.2fr]">
        <div className={widgetCls}>
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-[#111111]">Content status</p>
            <MoreVertical className="h-4 w-4 text-[#a0a4ad]" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[20px] font-medium tracking-[-0.05em] text-[#111111]">{totalItems}</p>
              <p className="text-[11px] text-[#656b76]">records</p>
            </div>
            <div>
              <p className="text-[20px] font-medium tracking-[-0.05em] text-[#111111]">{activeItems}</p>
              <p className="text-[11px] text-[#656b76]">active</p>
            </div>
            <div>
              <p className="text-[20px] font-medium tracking-[-0.05em] text-[#111111]">{waitingItems}</p>
              <p className="text-[11px] text-[#656b76]">drafts</p>
            </div>
          </div>
          <div className="mt-6 flex h-11 overflow-hidden rounded-[3px]" aria-hidden="true">
            <span className="flex-[0.8] bg-[#6f64e7]" />
            <span className="flex-[0.35] bg-[#8c7cf0]" />
            <span className="flex-[1.15] bg-[#b893f4]" />
            <span className="flex-[0.7] bg-[#d695ef]" />
            <span className="flex-[0.45] bg-[#f4a7da]" />
          </div>
        </div>

        <div className="grid gap-3">
          <div className={widgetCls}>
            <p className="text-[12px] font-medium text-[#111111]">Modules</p>
            <div className="mt-3 flex items-end justify-between">
              <p className="text-[24px] font-medium tracking-[-0.06em] text-[#111111]">{totalModules}</p>
              <span className="text-[11px] text-[#22a06b]">+ ready</span>
            </div>
          </div>
          <div className={widgetCls}>
            <p className="text-[12px] font-medium text-[#111111]">Attention</p>
            <div className="mt-3 flex items-end justify-between">
              <p className="text-[24px] font-medium tracking-[-0.06em] text-[#111111]">{waitingItems}</p>
              <div className="flex items-end gap-1" aria-hidden="true">
                <span className="h-3 w-1.5 rounded-[2px] bg-[#f2d6b3]" />
                <span className="h-5 w-1.5 rounded-[2px] bg-[#f0a451]" />
                <span className="h-8 w-1.5 rounded-[2px] bg-[#ea7a32]" />
                <span className="h-4 w-1.5 rounded-[2px] bg-[#f4d1a9]" />
              </div>
            </div>
          </div>
        </div>

        <div className={widgetCls}>
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-[#111111]">Publishing flow</p>
            <span className="text-[11px] text-[#8b9098]">estimate points</span>
          </div>
          <div className="mt-5 h-[118px] rounded-[4px] border border-dashed border-[#e5e6eb] bg-[linear-gradient(#f2f2f5_1px,transparent_1px)] bg-[size:100%_28px] p-3" aria-hidden="true">
            <div className="relative h-full">
              <span className="absolute left-0 top-3 h-px w-[26%] bg-[#7d75e8]" />
              <span className="absolute left-[25%] top-8 h-px w-[22%] bg-[#7d75e8]" />
              <span className="absolute left-[46%] top-14 h-px w-[22%] bg-[#7d75e8]" />
              <span className="absolute left-[67%] top-[74px] h-px w-[25%] bg-[#7d75e8]" />
              <span className="absolute left-0 top-5 h-px w-[38%] bg-[#e8a05b]" />
              <span className="absolute left-[37%] top-10 h-px w-[30%] bg-[#e8a05b]" />
              <span className="absolute left-[66%] top-[62px] h-px w-[32%] bg-[#e8a05b]" />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-1 border-b border-[#ececf1] pb-2 text-[12px] text-[#555b66]">
          <span className="rounded-[4px] bg-[#ececf1] px-2 py-1 text-[#111111]">Board</span>
          <span className="px-2 py-1">Spreadsheet</span>
          <span className="px-2 py-1">Calendar</span>
          <span className="px-2 py-1">Timeline</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {stats.map(({ href, addHref, icon: Icon, label, total, primary, secondary, canAdd }) => (
          <div key={href}>
            <div className="mb-2 flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-2 text-[#111111]">
                <Icon className="h-3.5 w-3.5 text-[#656b76]" />
                <span>{label}</span>
                <span className="text-[#8b9098]">{total}</span>
              </div>
              <MoreVertical className="h-4 w-4 text-[#a0a4ad]" />
            </div>
            <div className={moduleCardCls}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={href} className="text-[12px] font-medium text-[#111111] transition-colors hover:text-[#22a06b]">
                    Zarządzaj {label}
                  </Link>
                  <p className="mt-1 text-[11px] text-[#8b9098]">VezVision module</p>
                </div>
              {canAdd && (
                <Link
                  href={addHref}
                  className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-[#ececf1] bg-[#fbfbfc] text-[#656b76] transition-colors hover:text-[#111111]"
                  title={`Dodaj ${label}`}
                  aria-label={`Dodaj ${label}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Link>
              )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-[4px] bg-[#f7f7f9] px-2 py-1.5">
                  <p className="text-[16px] font-medium tracking-[-0.04em] text-[#111111]">{primary.count}</p>
                  <p className="text-[10px] text-[#656b76]">{primary.label}</p>
                </div>
                <div className="rounded-[4px] bg-[#f7f7f9] px-2 py-1.5">
                  <p className="text-[16px] font-medium tracking-[-0.04em] text-[#111111]">{secondary.count}</p>
                  <p className="text-[10px] text-[#656b76]">{secondary.label}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-[#ececf1] pt-2 text-[11px] text-[#656b76]">
                <span>Due: today</span>
                <span>{total} items</span>
              </div>
            </div>
          </div>
        ))}
        </div>
      </section>
    </div>
  )
}
