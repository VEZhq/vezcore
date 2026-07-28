'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  Clock,
  Database,
  Globe,
  Monitor,
  Moon,
  Palette,
  Settings,
  Shield,
  Sun,
  User,
  Users,
} from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'
import { MobileNav } from '@/components/MobileNav'
import { CacheManager } from '@/components/CacheManager'

const timezones = [
  { value: 'Europe/Warsaw', label: 'Warszawa', helper: 'CET / CEST' },
  { value: 'Europe/London', label: 'Londyn', helper: 'GMT / BST' },
  { value: 'Europe/Berlin', label: 'Berlin', helper: 'CET / CEST' },
  { value: 'America/New_York', label: 'Nowy Jork', helper: 'EST / EDT' },
  { value: 'America/Los_Angeles', label: 'Los Angeles', helper: 'PST / PDT' },
  { value: 'Asia/Tokyo', label: 'Tokio', helper: 'JST' },
]

const dateFormats = [
  { value: 'DD/MM/YYYY', label: '31/12/2024' },
  { value: 'MM/DD/YYYY', label: '12/31/2024' },
  { value: 'YYYY-MM-DD', label: '2024-12-31' },
]

const sessionTimeouts = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 godz.' },
  { value: 120, label: '2 godz.' },
]

type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'

const panelClass = 'rounded-md border border-white/[0.07] bg-[#14110e]/[0.62] shadow-[0_18px_70px_rgba(0,0,0,0.18)] backdrop-blur-md light:border-black/[0.08] light:bg-[#fffdf8]/[0.86] light:shadow-[0_18px_70px_rgba(88,73,53,0.08)]'
const labelClass = 'text-[10px] uppercase tracking-[0.18em] text-[#bba992] light:text-[#7b6d5e]'
const titleClass = 'text-sm font-medium text-[#f0ddc4] light:text-[#4f3f2d]'
const helperClass = 'text-xs leading-relaxed text-[#a79a8a] light:text-[#71685f]'

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon?: LucideIcon
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-xs transition-colors ${
        active
          ? 'border-[#e8cfae]/30 bg-[#e8cfae]/10 text-[#f1dcc0] light:border-[#7d5a38]/[0.24] light:bg-[#7d5a38]/[0.08] light:text-[#5b3f25]'
          : 'border-white/[0.07] text-[#9b9188] hover:border-[#e8cfae]/[0.22] hover:text-[#f1dcc0] light:border-black/[0.08] light:text-[#71685f] light:hover:border-[#7d5a38]/[0.22] light:hover:text-[#4f3f2d]'
      }`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </Link>
  )
}

function Section({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string
  subtitle: string
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <section className={`${panelClass} overflow-hidden`}>
      <div className="grid gap-4 border-b border-white/[0.055] px-5 py-4 light:border-black/[0.055] sm:grid-cols-[42px_minmax(0,1fr)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#e8cfae]/[0.18] bg-[#e8cfae]/[0.07] light:border-[#7d5a38]/[0.16] light:bg-[#7d5a38]/[0.07]">
          <Icon className="h-4 w-4 text-[#e6c7a7] light:text-[#7d5a38]" />
        </div>
        <div>
          <p className={titleClass}>{title}</p>
          <p className={`mt-1 ${helperClass}`}>{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function StatusRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: LucideIcon
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-3 last:border-b-0 light:border-black/[0.055]">
      <span className="inline-flex items-center gap-2 text-xs text-[#a79a8a] light:text-[#71685f]">
        <Icon className="h-4 w-4 text-[#d6bea0] light:text-[#7d5a38]" />
        {label}
      </span>
      <span className="truncate text-right text-xs text-[#eedcc7] light:text-[#4f3f2d]">{value}</span>
    </div>
  )
}

function ChoiceButton({
  selected,
  onClick,
  title,
  helper,
  icon: Icon,
}: {
  selected: boolean
  onClick: () => void
  title: string
  helper?: string
  icon?: LucideIcon
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-20 rounded-md border p-4 text-left transition-colors ${
        selected
          ? 'border-[#e8cfae]/35 bg-[#e8cfae]/10 light:border-[#7d5a38]/[0.24] light:bg-[#7d5a38]/[0.08]'
          : 'border-white/[0.065] bg-white/[0.025] hover:border-[#e8cfae]/20 hover:bg-[#e8cfae]/[0.045] light:border-black/[0.075] light:bg-black/[0.02] light:hover:border-[#7d5a38]/[0.18] light:hover:bg-[#7d5a38]/[0.045]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={`truncate ${selected ? 'text-sm font-medium text-[#f0ddc4] light:text-[#5b3f25]' : titleClass}`}>{title}</p>
          {helper && <p className={`mt-1 truncate ${helperClass}`}>{helper}</p>}
        </div>
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-[#e6c7a7] light:text-[#7d5a38]' : 'text-[#9b9188] light:text-[#7b6d5e]'}`} />}
      </div>
      {selected && <span className="mt-3 block h-1 w-8 rounded-full bg-[#e6c7a7] light:bg-[#7d5a38]" />}
    </button>
  )
}

export default function SettingsClient({
  canAccessKonta,
  canManageDiscordMaintenance,
  canManageCache,
}: {
  canAccessKonta: boolean
  canManageDiscordMaintenance: boolean
  canManageCache: boolean
}) {
  const { theme, toggleTheme } = useTheme()
  const { preferences, updatePreferences } = useUserPreferences()
  const selectedTimezone = timezones.find((timezone) => timezone.value === preferences.timezone)

  return (
    <div className="min-h-screen bg-transparent transition-colors duration-300">
      <MobileNav currentPath="/settings" showKonta={canAccessKonta} showSettings />

      <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:py-10">
        <header className="mb-6 flex flex-col gap-5 border-b border-white/[0.07] pb-5 light:border-black/[0.08] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Image
              src="/logo/vezcore_logo_white_full.svg"
              alt="vezCore"
              width={178}
              height={52}
              className="h-auto w-[178px] max-w-[60vw] opacity-85 light:hidden"
              priority
            />
            <Image
              src="/logo/vezcore_logo_black_full.svg"
              alt="vezCore"
              width={178}
              height={52}
              className="hidden h-auto w-[178px] max-w-[60vw] opacity-85 light:block"
              priority
            />
            <p className={`mt-4 ${labelClass}`}>
              System
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[#f0ddc4] light:text-[#4f3f2d]">
              Ustawienia
            </h1>
          </div>

          <nav className="flex flex-wrap gap-2">
            <NavLink href="/dashboard" label="Dashboard" icon={ArrowLeft} />
            <NavLink href="/profile" label="Profil" icon={User} />
            {canAccessKonta && <NavLink href="/konta" label="Konta" icon={Users} />}
            <NavLink href="/settings" label="Ustawienia" icon={Settings} active />
          </nav>
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <main className="space-y-5">
            <Section
              title="Wygląd"
              subtitle="Motyw panelu i czytelność w codziennej pracy."
              icon={Palette}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => theme === 'light' && toggleTheme()}
                  className={`rounded-md border p-4 text-left transition-colors ${
                    theme === 'dark'
                      ? 'border-[#e6c7a7]/35 bg-[#e6c7a7]/10'
                      : 'border-white/[0.07] bg-white/[0.02] hover:border-[#e8cfae]/20 hover:bg-[#e8cfae]/[0.045] light:border-black/[0.08] light:bg-black/[0.02] light:hover:border-[#7d5a38]/[0.18] light:hover:bg-[#7d5a38]/[0.045]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-[#f0ddc4] light:text-[#4f3f2d]">Ciemny</p>
                      <p className="mt-1 text-xs text-[#a79a8a]">Domyślny tryb operacyjny.</p>
                    </div>
                    <Moon className="h-5 w-5 shrink-0 text-[#e6c7a7] light:text-[#7d5a38]" />
                  </div>
                  <div className="mt-5 grid grid-cols-[1fr_38px] gap-2">
                    <span className="h-1.5 rounded-full bg-[#e8cfae]/35" />
                    <span className="h-1.5 rounded-full bg-white/[0.12]" />
                    <span className="h-1.5 rounded-full bg-white/[0.08]" />
                    <span className="h-1.5 rounded-full bg-[#d7bfd8]/25" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => theme === 'dark' && toggleTheme()}
                  className={`rounded-md border p-4 text-left transition-colors ${
                    theme === 'light'
                      ? 'border-[#e6c7a7]/35 bg-[#e6c7a7]/10'
                      : 'border-white/[0.07] bg-white/[0.02] hover:border-[#e8cfae]/20 hover:bg-[#e8cfae]/[0.045] light:border-black/[0.08] light:bg-black/[0.02] light:hover:border-[#7d5a38]/[0.18] light:hover:bg-[#7d5a38]/[0.045]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-[#f0ddc4] light:text-[#4f3f2d]">Jasny</p>
                      <p className="mt-1 text-xs text-[#a79a8a]">Lepszy do pracy w dzień.</p>
                    </div>
                    <Sun className="h-5 w-5 shrink-0 text-[#e6c7a7] light:text-[#7d5a38]" />
                  </div>
                  <div className="mt-5 grid grid-cols-[1fr_38px] gap-2">
                    <span className="h-1.5 rounded-full bg-[#7d5a38]/25" />
                    <span className="h-1.5 rounded-full bg-black/[0.12]" />
                    <span className="h-1.5 rounded-full bg-black/[0.08]" />
                    <span className="h-1.5 rounded-full bg-[#735671]/[0.18]" />
                  </div>
                </button>
              </div>
            </Section>

            <Section
              title="Region"
              subtitle="Daty i godziny w panelu, logach oraz aktywności."
              icon={Globe}
            >
              <div className="space-y-5">
                <label className="block">
                  <span className={`mb-2 block ${labelClass}`}>
                    Strefa czasowa
                  </span>
                  <select
                    value={preferences.timezone}
                    onChange={(event) => updatePreferences({ timezone: event.target.value })}
                    className="h-11 w-full rounded-md border border-white/[0.07] bg-white/[0.03] px-3 text-sm text-[#f0ddc4] outline-none transition-colors focus:border-[#e6c7a7]/45 light:border-black/[0.08] light:bg-black/[0.03] light:text-[#4f3f2d]"
                  >
                    {timezones.map((timezone) => (
                      <option key={timezone.value} value={timezone.value}>
                        {timezone.label} ({timezone.helper})
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <p className={`mb-2 ${labelClass}`}>
                    Format daty
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {dateFormats.map((format) => (
                      <ChoiceButton
                        key={format.value}
                        selected={preferences.dateFormat === format.value}
                        onClick={() => updatePreferences({ dateFormat: format.value as DateFormat })}
                        title={format.label}
                        icon={CalendarDays}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            <Section
              title="Sesja"
              subtitle="Automatyczne wygaszanie i zachowanie panelu po zmianie sieci."
              icon={Shield}
            >
              <div className="space-y-5">
                <div>
                  <p className={`mb-2 ${labelClass}`}>
                    Timeout sesji
                  </p>
                  <div className="grid gap-2 sm:grid-cols-4">
                    {sessionTimeouts.map((timeout) => (
                      <ChoiceButton
                        key={timeout.value}
                        selected={preferences.sessionTimeout === timeout.value}
                        onClick={() => updatePreferences({ sessionTimeout: timeout.value })}
                        title={timeout.label}
                        icon={Clock}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-[#a79a8a] light:text-[#71685f]">
                    Automatyczne wylogowanie po {preferences.sessionTimeout} minutach bezczynności.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => updatePreferences({ autoLogoutOnIpChange: !preferences.autoLogoutOnIpChange })}
                  className="flex w-full items-center justify-between gap-4 rounded-md border border-white/[0.07] bg-white/[0.02] p-4 text-left transition-colors hover:bg-white/[0.04] light:border-black/[0.08] light:bg-black/[0.02] light:hover:bg-black/[0.04]"
                >
                  <div>
                    <p className="text-sm font-medium text-[#f0ddc4] light:text-[#4f3f2d]">Wyloguj przy zmianie IP</p>
                    <p className="mt-1 text-xs text-[#a79a8a] light:text-[#71685f]">
                      Dodatkowa ochrona przy zmianie adresu sieciowego.
                    </p>
                  </div>
                  <span
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      preferences.autoLogoutOnIpChange ? 'bg-[#e6c7a7]' : 'bg-[#333333] light:bg-[#cccccc]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                        preferences.autoLogoutOnIpChange ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                </button>
              </div>
            </Section>

            {canManageCache && <CacheManager />}

            {canManageDiscordMaintenance && (
              <Section
                title="Discord maintenance"
                subtitle="Narzędzia administracyjne dla wątków i profili Discord."
                icon={Bot}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-xl text-xs leading-relaxed text-[#a79a8a] light:text-[#71685f]">
                    Backfill i sweep wątków profili użytkowników są w osobnym panelu administracyjnym.
                  </p>
                  <Link
                    href="/settings/discord"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-[#e6c7a7]/25 bg-[#e6c7a7]/10 px-4 text-xs text-[#e6c7a7] transition-colors hover:bg-[#e6c7a7]/15 light:text-[#7d5a38]"
                  >
                    Otwórz panel
                  </Link>
                </div>
              </Section>
            )}
          </main>

          <aside className="space-y-5">
            <section className={`${panelClass} p-5`}>
              <p className="text-sm font-medium text-[#f0ddc4] light:text-[#4f3f2d]">Podsumowanie</p>
              <p className="mt-1 text-xs text-[#a79a8a] light:text-[#71685f]">
                Aktualna konfiguracja widoku.
              </p>
              <div className="mt-4">
                <StatusRow label="Motyw" value={theme === 'dark' ? 'Ciemny' : 'Jasny'} icon={theme === 'dark' ? Moon : Sun} />
                <StatusRow label="Strefa" value={selectedTimezone?.label || preferences.timezone} icon={Globe} />
                <StatusRow label="Data" value={preferences.dateFormat} icon={CalendarDays} />
                <StatusRow label="Sesja" value={`${preferences.sessionTimeout} min`} icon={Clock} />
                <StatusRow label="Zmiana IP" value={preferences.autoLogoutOnIpChange ? 'wyloguj' : 'ignoruj'} icon={Shield} />
              </div>
            </section>

            <section className={`${panelClass} p-5`}>
              <p className="text-sm font-medium text-[#f0ddc4] light:text-[#4f3f2d]">Widoczne sekcje</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-md bg-white/[0.03] px-3 py-3 light:bg-black/[0.03]">
                  <span className="inline-flex items-center gap-2 text-sm text-[#f0ddc4] light:text-[#4f3f2d]">
                    <Monitor className="h-4 w-4 text-[#e6c7a7] light:text-[#7d5a38]" />
                    Preferencje
                  </span>
                  <span className="text-xs text-[#a79a8a]">aktywne</span>
                </div>
                {canManageCache && (
                  <div className="flex items-center justify-between rounded-md bg-white/[0.03] px-3 py-3 light:bg-black/[0.03]">
                    <span className="inline-flex items-center gap-2 text-sm text-[#f0ddc4] light:text-[#4f3f2d]">
                      <Database className="h-4 w-4 text-[#d7bfd8] light:text-[#735671]" />
                      Cache
                    </span>
                    <span className="text-xs text-[#a79a8a]">admin</span>
                  </div>
                )}
                {canManageDiscordMaintenance && (
                  <div className="flex items-center justify-between rounded-md bg-white/[0.03] px-3 py-3 light:bg-black/[0.03]">
                    <span className="inline-flex items-center gap-2 text-sm text-[#f0ddc4] light:text-[#4f3f2d]">
                      <Bot className="h-4 w-4 text-amber-300 light:text-amber-700" />
                      Discord
                    </span>
                    <span className="text-xs text-[#a79a8a]">admin</span>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
