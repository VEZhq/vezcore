'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Home, User, ClipboardList, Settings, Users } from 'lucide-react'

interface MobileNavProps {
  currentPath: string
  showKonta?: boolean
  showAudit?: boolean
  showSettings?: boolean
}

export function MobileNav({ currentPath, showKonta = false, showAudit = false, showSettings = false }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/profile', label: 'Profil', icon: User },
    ...(showKonta ? [{ href: '/konta', label: 'Konta', icon: Users }] : []),
    ...(showAudit ? [{ href: '/audit', label: 'Audit', icon: ClipboardList }] : []),
    ...(showSettings ? [{ href: '/settings', label: 'Ustawienia', icon: Settings }] : []),
  ]

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-6 left-6 z-50 p-2 text-[#666666] hover:text-white transition-colors"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}

      <nav
        className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-[#111111] light:bg-white border-r border-white/[0.06] light:border-black/[0.06] z-40 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 pt-16 space-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.2em] rounded transition-colors ${
                currentPath === link.href
                  ? 'bg-white/[0.05] light:bg-black/[0.05] text-white light:text-black'
                  : 'text-[#666666] light:text-[#999999] hover:text-white light:hover:text-black'
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
