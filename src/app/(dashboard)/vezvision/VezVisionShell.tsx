'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Wrench,
  MessageCircleQuestion,
  Mail,
  Settings,
  ChevronLeft,
  Menu,
  X,
  Bell,
  Link2,
  PanelRight,
  Files,
  Calendar,
} from 'lucide-react'
import VezVisionIcon from '@/components/VezVisionIcon'

interface NavItemConfig {
  href: string
  label: string
  icon: React.ElementType
  visible: boolean
}

const navItemsBase: Omit<NavItemConfig, 'visible'>[] = [
  { href: '/vezvision', label: 'Przegląd', icon: LayoutDashboard },
  { href: '/vezvision/blog', label: 'Blog', icon: FileText },
  { href: '/vezvision/portfolio', label: 'Portfolio', icon: FolderOpen },
  { href: '/vezvision/services', label: 'Usługi', icon: Wrench },
  { href: '/vezvision/faq', label: 'FAQ', icon: MessageCircleQuestion },
  { href: '/vezvision/newsletter', label: 'Newsletter', icon: Mail },
  { href: '/vezvision/calendar', label: 'Kalendarz', icon: Calendar },
  { href: '/vezvision/settings', label: 'Ustawienia', icon: Settings },
]

const toolItems = [
  { label: 'Powiadomienia', icon: Bell, indicator: '2' },
  { label: 'Skróty', icon: Link2 },
  { label: 'Widok', icon: PanelRight },
]

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onClick,
  onPrefetch,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
  onClick?: () => void
  onPrefetch?: (href: string) => void
}) {
  return (
    <Link
      href={href}
      prefetch
      onMouseEnter={() => onPrefetch?.(href)}
      onFocus={() => onPrefetch?.(href)}
      onClick={onClick}
      className={`group flex items-center justify-between rounded-[5px] px-2.5 py-2 text-[12px] font-normal transition-all duration-150 ${
        active
          ? 'bg-[#ececf1] text-[#111111] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
          : 'text-[#555b66] hover:bg-[#f0f0f4] hover:text-[#111111]'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon
          className={`h-3.5 w-3.5 flex-shrink-0 transition-colors ${
            active ? 'text-[#111111]' : 'text-[#7a808a] group-hover:text-[#111111]'
          }`}
        />
        <span className="truncate">{label}</span>
      </span>
    </Link>
  )
}

function Sidebar({ onClose, navItems, onPrefetch }: { onClose?: () => void; navItems: NavItemConfig[]; onPrefetch: (href: string) => void }) {
  const pathname = usePathname()
  const sidebarSectionTitleCls = 'px-2.5 pb-1.5 text-[10px] font-normal tracking-[-0.01em] text-[#8b9098]'

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-3.5 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-white shadow-[0_6px_18px_rgba(15,15,15,0.08)] ring-1 ring-black/[0.04]">
          <VezVisionIcon className="h-5 w-5 text-[#111111]" />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-medium leading-none text-[#111111]">VezVision</p>
          <p className="mt-1 text-[10px] leading-none text-[#8b9098]">content studio</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-[5px] p-1.5 text-[#7a808a] transition-colors hover:bg-white hover:text-[#111111]"
            aria-label="Zamknij menu VezVision"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-2">
        <div>
        <p className={sidebarSectionTitleCls}>Overview</p>
        <div className="space-y-1">
        {navItems.filter((item) => item.visible).map((item) => {
          const active = item.href === '/vezvision' ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={active}
              onPrefetch={onPrefetch}
              onClick={onClose}
            />
          )
        })}
        </div>
        </div>

        <div>
          <p className={sidebarSectionTitleCls}>Tools</p>
          <div className="space-y-1">
            {toolItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className="flex w-full items-center justify-between rounded-[5px] px-2.5 py-2 text-left text-[12px] font-normal text-[#555b66] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]"
              >
                <span className="flex items-center gap-2.5">
                  <item.icon className="h-3.5 w-3.5 text-[#7a808a]" />
                  {item.label}
                </span>
                {item.indicator && (
                  <span className="rounded-full bg-[#ff3b30] px-1.5 py-0.5 text-[9px] font-medium text-white">{item.indicator}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="space-y-2 px-2.5 py-3">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-2.5 rounded-[5px] px-2.5 py-2 text-[12px] font-normal text-[#555b66] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]"
        >
          <ChevronLeft className="h-3.5 w-3.5 flex-shrink-0" />
          Wróć do vezcore
        </Link>
        <div className="flex items-center gap-2 rounded-[6px] bg-white/65 p-2 ring-1 ring-black/[0.04]">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#f2d7c8] to-[#d7e0ff]" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-[#111111]">VezVision</p>
            <p className="truncate text-[10px] text-[#8b9098]">admin workspace</p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface VezVisionShellProps {
  children: React.ReactNode
  canAccessDashboard: boolean
  canViewBlog: boolean
  canViewPortfolio: boolean
  canViewServices: boolean
  canViewFaq: boolean
  canViewNewsletter: boolean
  canViewSettings: boolean
  canViewCalendar: boolean
}

export default function VezVisionShell({
  children,
  canAccessDashboard,
  canViewBlog,
  canViewPortfolio,
  canViewServices,
  canViewFaq,
  canViewNewsletter,
  canViewSettings,
  canViewCalendar,
}: VezVisionShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems: NavItemConfig[] = useMemo(() => navItemsBase.map((item) => ({
    ...item,
    visible:
      (item.href === '/vezvision' && canAccessDashboard) ||
      (item.href === '/vezvision/blog' && canViewBlog) ||
      (item.href === '/vezvision/portfolio' && canViewPortfolio) ||
      (item.href === '/vezvision/services' && canViewServices) ||
      (item.href === '/vezvision/faq' && canViewFaq) ||
      (item.href === '/vezvision/newsletter' && canViewNewsletter) ||
      (item.href === '/vezvision/settings' && canViewSettings) ||
      (item.href === '/vezvision/calendar' && canViewCalendar),
  })), [canAccessDashboard, canViewBlog, canViewCalendar, canViewFaq, canViewNewsletter, canViewPortfolio, canViewServices, canViewSettings])

  const visibleNavItems = useMemo(() => navItems.filter((item) => item.visible), [navItems])
  const currentItem = visibleNavItems.find((item) => item.href === '/vezvision' ? pathname === item.href : pathname.startsWith(item.href)) ?? visibleNavItems[0]

  const prefetchRoute = (href: string) => {
    router.prefetch(href)
  }

  return (
    <div className="h-screen overflow-hidden bg-[#dedee4] p-3 text-[#111111] sm:p-5">
      <div className="flex h-full overflow-hidden rounded-[14px] border border-white/80 bg-[#fbfbfc] shadow-[0_26px_80px_rgba(27,31,42,0.16)]">
        <aside className="hidden w-[216px] flex-shrink-0 flex-col border-r border-[#e7e7ec] bg-[#f5f5f8] lg:flex">
          <Sidebar navItems={navItems} onPrefetch={prefetchRoute} />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-label="Zamknij menu VezVision"
            />
            <aside className="absolute bottom-0 left-0 top-0 z-10 flex w-[216px] flex-col border-r border-[#e7e7ec] bg-[#f5f5f8]">
              <Sidebar navItems={navItems} onClose={() => setMobileOpen(false)} onPrefetch={prefetchRoute} />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#fbfbfc]">
          <header className="grid min-h-[58px] flex-shrink-0 grid-cols-1 gap-3 border-b border-[#ececf1] bg-[#fbfbfc] px-4 py-3 md:grid-cols-[1fr_auto_1fr] md:items-center xl:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-[5px] border border-[#e5e6eb] bg-white p-2 text-[#6b7280] shadow-sm transition-colors hover:text-[#111111] lg:hidden"
                aria-label="Otwórz menu VezVision"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-normal text-[#8b9098]">
                  <span>VezVision</span>
                  <span>›</span>
                  <span className="truncate text-[#555b66]">{currentItem?.label ?? 'Panel'}</span>
                </div>
              </div>
            </div>

            <div className="relative w-full md:w-[260px]">
            </div>

            <div className="flex items-center justify-start gap-2 md:justify-end">
              <button type="button" className="hidden h-9 items-center gap-2 rounded-[5px] border border-[#ececf1] bg-white px-3 text-[12px] text-[#555b66] transition-colors hover:text-[#111111] sm:inline-flex">
                <FolderOpen className="h-3.5 w-3.5" />
                Manage
              </button>
              <Link
                href="/vezvision/files"
                prefetch
                className="hidden h-9 items-center gap-2 rounded-[5px] border border-[#ececf1] bg-white px-3 text-[12px] text-[#555b66] transition-colors hover:text-[#111111] sm:inline-flex"
              >
                <Files className="h-3.5 w-3.5" />
                Pliki
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center justify-center rounded-[5px] bg-[#111111] px-3 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-[#262626]"
              >
                Vezcore
              </Link>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-[#fbfbfc]">{children}</main>
        </div>
      </div>
    </div>
  )
}
