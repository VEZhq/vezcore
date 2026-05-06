'use client'

import Link from 'next/link'
import { Bot, Home, User, Settings, Palette, Moon, Sun, Globe, Shield } from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'
import { MobileNav } from '@/components/MobileNav'
import { CacheManager } from '@/components/CacheManager'

const timezones = [
  { value: 'Europe/Warsaw', label: 'Warszawa (CET/CEST)' },
  { value: 'Europe/London', label: 'Londyn (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'America/New_York', label: 'Nowy Jork (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'Asia/Tokyo', label: 'Tokio (JST)' },
]

const dateFormats = [
  { value: 'DD/MM/YYYY', label: '31/12/2024' },
  { value: 'MM/DD/YYYY', label: '12/31/2024' },
  { value: 'YYYY-MM-DD', label: '2024-12-31' },
]

const sessionTimeouts = [
  { value: 15, label: '15 minut' },
  { value: 30, label: '30 minut' },
  { value: 60, label: '1 godzina' },
  { value: 120, label: '2 godziny' },
]

export default function SettingsClient({ canAccessAudit, canManageDiscordMaintenance, canManageCache }: { canAccessAudit: boolean; canManageDiscordMaintenance: boolean; canManageCache: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const { preferences, updatePreferences } = useUserPreferences()

  return (
    <div className="min-h-screen bg-[#0a0a0a] light:bg-[#f5f5f5] transition-colors duration-300">
      <MobileNav currentPath="/settings" showAudit={canAccessAudit} showSettings={true} />
      
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
          {canAccessAudit && (
            <Link
              href="/audit"
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
            >
              Audit Log
            </Link>
          )}
          <Link
            href="/settings"
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white light:text-black"
          >
            <Settings className="h-3 w-3" />
            Ustawienia
          </Link>
        </div>
      </div>

      <div className="p-4 lg:p-8 pt-20 lg:pt-24">
        <div className="max-w-2xl mx-auto space-y-6 lg:space-y-8">
          <div>
            <h1 className="text-2xl font-medium text-white light:text-black transition-colors duration-300">
              Ustawienia
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mt-1 transition-colors duration-300">
              Preferencje interfejsu
            </p>
          </div>

          <div className="space-y-6">
            <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-colors duration-300">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="h-4 w-4 text-[#444444] light:text-[#888888]" />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
                    Wygląd
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => theme === 'light' && toggleTheme()}
                    className={`flex-1 p-4 border transition-colors duration-300 ${
                      theme === 'dark'
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-white/[0.06] light:border-black/[0.06] hover:bg-white/[0.02] light:hover:bg-black/[0.02]'
                    }`}
                  >
                    <div className="w-full h-20 bg-[#0a0a0a] border border-white/[0.06] rounded mb-3 flex items-center justify-center">
                      <Moon className="h-6 w-6 text-[#444444]" />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      {theme === 'dark' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999]">
                        Ciemny
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => theme === 'dark' && toggleTheme()}
                    className={`flex-1 p-4 border transition-colors duration-300 ${
                      theme === 'light'
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-white/[0.06] light:border-black/[0.06] hover:bg-white/[0.02] light:hover:bg-black/[0.02]'
                    }`}
                  >
                    <div className="w-full h-20 bg-[#f5f5f5] border border-black/[0.06] rounded mb-3 flex items-center justify-center">
                      <Sun className="h-6 w-6 text-[#888888]" />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      {theme === 'light' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999]">
                        Jasny
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-colors duration-300">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-4 w-4 text-[#444444] light:text-[#888888]" />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
                    Region
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] block mb-2">
                      Strefa czasowa
                    </label>
                    <select
                      value={preferences.timezone}
                      onChange={(e) => updatePreferences({ timezone: e.target.value })}
                      className="w-full h-10 px-3 bg-white/[0.02] light:bg-white border border-white/[0.06] light:border-black/[0.06] text-white light:text-black text-sm focus:outline-none focus:border-emerald-500/50 transition-colors duration-300"
                    >
                      {timezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] block mb-2">
                      Format daty
                    </label>
                    <div className="flex gap-2">
                      {dateFormats.map((format) => (
                        <button
                          key={format.value}
                          onClick={() => updatePreferences({ dateFormat: format.value as 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' })}
                          className={`flex-1 p-3 border transition-colors duration-300 ${
                            preferences.dateFormat === format.value
                              ? 'border-emerald-500/50 bg-emerald-500/10'
                              : 'border-white/[0.06] light:border-black/[0.06] hover:bg-white/[0.02] light:hover:bg-black/[0.02]'
                          }`}
                        >
                          <p className="text-[10px] text-[#666666] light:text-[#999999] font-mono text-center">
                            {format.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-colors duration-300">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4 text-[#444444] light:text-[#888888]" />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
                    Sesja
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] block mb-2">
                      Timeout sesji
                    </label>
                    <div className="flex gap-2">
                      {sessionTimeouts.map((timeout) => (
                        <button
                          key={timeout.value}
                          onClick={() => updatePreferences({ sessionTimeout: timeout.value })}
                          className={`flex-1 p-3 border transition-colors duration-300 ${
                            preferences.sessionTimeout === timeout.value
                              ? 'border-emerald-500/50 bg-emerald-500/10'
                              : 'border-white/[0.06] light:border-black/[0.06] hover:bg-white/[0.02] light:hover:bg-black/[0.02]'
                          }`}
                        >
                          <p className="text-[10px] text-[#666666] light:text-[#999999] text-center">
                            {timeout.label}
                          </p>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-[#444444] light:text-[#888888] mt-2">
                      Automatyczne wylogowanie po {preferences.sessionTimeout} minutach bezczynności
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.04] light:border-black/[0.04] rounded transition-colors duration-300">
                    <div>
                      <p className="text-sm text-white light:text-black">Wyloguj przy zmianie IP</p>
                      <p className="text-[10px] text-[#666666] light:text-[#999999]">
                        Wyloguje Cię automatycznie jeśli adres IP się zmieni
                      </p>
                    </div>
                    <button
                      onClick={() => updatePreferences({ autoLogoutOnIpChange: !preferences.autoLogoutOnIpChange })}
                      className={`w-12 h-6 rounded-full transition-colors duration-300 ${
                        preferences.autoLogoutOnIpChange ? 'bg-emerald-500' : 'bg-[#333333] light:bg-[#cccccc]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                        preferences.autoLogoutOnIpChange ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {canManageCache && <CacheManager />}

          {canManageDiscordMaintenance && (
            <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-colors duration-300">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="h-4 w-4 text-[#444444] light:text-[#888888]" />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888]">
                    Discord maintenance
                  </p>
                </div>

                <p className="text-xs text-[#666666] light:text-[#999999] leading-relaxed mb-4">
                  Backfill i sweep wątków profili użytkowników na Discordzie zostały przeniesione do osobnej podstrony administracyjnej.
                </p>

                <Link
                  href="/settings/discord"
                  className="inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors"
                >
                  Otwórz panel Discord
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
