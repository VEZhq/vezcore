'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Megaphone,
  Users,
  BarChart3,
  Settings,
} from 'lucide-react'

interface Tab {
  href: string
  label: string
  icon: React.ElementType
}

const tabs: Tab[] = [
  { href: '/vezvision/newsletter/campaigns', label: 'Kampanie', icon: Megaphone },
  { href: '/vezvision/newsletter/audiences', label: 'Odbiorcy', icon: Users },
  { href: '/vezvision/newsletter/analytics', label: 'Analizy', icon: BarChart3 },
  { href: '/vezvision/newsletter/settings', label: 'Ustawienia', icon: Settings },
]

export default function NewsletterNav() {
  const pathname = usePathname()

  return (
    <nav className="mt-4 flex gap-1">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={false}
            className={`flex items-center gap-2 rounded-[4px] px-3 py-2 text-[12px] transition-colors ${
              isActive
                ? 'bg-[#ececf1] text-[#111111] font-medium'
                : 'text-[#656b76] hover:bg-[#f7f7f9] hover:text-[#111111]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
