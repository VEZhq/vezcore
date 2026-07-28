'use client'

import Link from 'next/link'
import { Bot, Home, Settings, User, Users } from 'lucide-react'
import { DiscordMaintenanceManager } from '@/components/DiscordMaintenanceManager'
import { MobileNav } from '@/components/MobileNav'

export default function DiscordSettingsClient({ canAccessKonta }: { canAccessKonta: boolean }) {
  return (
    <div className="min-h-screen bg-transparent transition-colors duration-300">
      <MobileNav currentPath="/settings" showKonta={canAccessKonta} showSettings={true} />

      <div className="hidden lg:flex fixed top-6 left-6 right-6 z-50 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
          >
            <Home className="h-3 w-3" />
            Dashboard
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
          >
            <User className="h-3 w-3" />
            Profil
          </Link>
          {canAccessKonta && (
            <Link
              href="/konta"
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
            >
              <Users className="h-3 w-3" />
              Konta
            </Link>
          )}
          <Link
            href="/settings"
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
          >
            <Settings className="h-3 w-3" />
            Ustawienia
          </Link>
          <Link
            href="/settings/discord"
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white light:text-black"
          >
            <Bot className="h-3 w-3" />
            Discord
          </Link>
        </div>
      </div>

      <div className="p-4 lg:p-8 pt-20 lg:pt-24">
        <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8">
          <div>
            <h1 className="text-2xl font-medium text-white light:text-black transition-colors duration-300">
              Discord Maintenance
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mt-1 transition-colors duration-300">
              Profile threads / backfill / deduplication
            </p>
          </div>

          <DiscordMaintenanceManager />
        </div>
      </div>
    </div>
  )
}
