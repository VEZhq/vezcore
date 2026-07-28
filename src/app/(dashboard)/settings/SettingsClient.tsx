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
          ? 'border-white/[0.12] bg-white/[0.06] text-white light:border-black/[0.12] light:bg-black/[0.05] light:text-black'
          : 'border-white/[0.07] text-[#888888] hover:text-white light:border-black/[0.08] light:text-[#666666] light:hover:text-black'
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
    <section className="rounded-md border border-white/[0.07] bg-[#111118]/[0.72] light:border-black/[0.08] light:bg-white/[0.82]">
      <div className="flex items-start gap-3 border-b border-white/[0.06] px-5 py-4 light:border-black/[0.06]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.03] light:border-black/[0.08] light:bg-black/[0.03]">
          <Icon className="h-4 w-4 text-sky-400 light:text-sky-700" />
        </div>
        <div>
          <p className="text-sm font-medium text-white light:text-black">{title}</p>
          <p className="mt-1 text-xs text-[#777777] light:text-[#777777]">{subtitle}</p>
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
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-3 last:border-b-0 light:border-black/[0.06]">
      <span className="inline-flex items-center gap-2 text-xs text-[#888888] light:text-[#666666]">
        <Icon className="h-4 w-4 text-[#666666] light:text-[#888888]" />
        {label}
      </span>
      <span className="truncate text-right text-xs text-white light:text-black">{value}</span>
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
          ? 'border-sky-300/35 bg-sky-300/10'
          : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] light:border-black/[0.08] light:bg-black/[0.02] light:hover:bg-black/[0.04]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white light:text-black">{title}</p>
          {helper && <p className="mt-1 truncate text-xs text-[#777777] light:text-[#777777]">{helper}</p>}
        </div>
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-sky-400 light:text-sky-700' : 'text-[#777777]'}`} />}
      </div>
      {selected && <span className="mt-3 block h-1 w-8 rounded-full bg-sky-400 light:bg-sky-700" />}
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
            <p className="mt-4 text-[10px] uppercase tracking-[0.26em] text-[#666666] light:text-[#888888]">
              System
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white light:text-black">
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
                      ? 'border-sky-300/35 bg-sky-300/10'
                      : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] light:border-black/[0.08] light:bg-black/[0.02] light:hover:bg-black/[0.04]'
                  }`}
                >
                  <div className="mb-4 flex h-24 items-center justify-center rounded-md border border-white/[0.07] bg-[#080808]">
                    <Moon className="h-6 w-6 text-[#777777]" />
                  </div>
                  <p className="text-sm font-medium text-white light:text-black">Ciemny</p>
                  <p className="mt-1 text-xs text-[#777777]">Domyślny tryb operacyjny.</p>
                </button>

                <button
                  type="button"
                  onClick={() => theme === 'dark' && toggleTheme()}
                  className={`rounded-md border p-4 text-left transition-colors ${
                    theme === 'light'
                      ? 'border-sky-300/35 bg-sky-300/10'
                      : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] light:border-black/[0.08] light:bg-black/[0.02] light:hover:bg-black/[0.04]'
                  }`}
                >
                  <div className="mb-4 flex h-24 items-center justify-center rounded-md border border-black/[0.08] bg-[#f6f6f6]">
                    <Sun className="h-6 w-6 text-[#777777]" />
                  </div>
                  <p className="text-sm font-medium text-white light:text-black">Jasny</p>
                  <p className="mt-1 text-xs text-[#777777]">Lepszy do pracy w dzień.</p>
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
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-[#777777]">
                    Strefa czasowa
                  </span>
                  <select
                    value={preferences.timezone}
                    onChange={(event) => updatePreferences({ timezone: event.target.value })}
                    className="h-11 w-full rounded-md border border-white/[0.07] bg-white/[0.03] px-3 text-sm text-white outline-none transition-colors focus:border-sky-300/45 light:border-black/[0.08] light:bg-black/[0.03] light:text-black"
                  >
                    {timezones.map((timezone) => (
                      <option key={timezone.value} value={timezone.value}>
                        {timezone.label} ({timezone.helper})
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#777777]">
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
                  <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#777777]">
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
                  <p className="mt-3 text-xs text-[#777777] light:text-[#777777]">
                    Automatyczne wylogowanie po {preferences.sessionTimeout} minutach bezczynności.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => updatePreferences({ autoLogoutOnIpChange: !preferences.autoLogoutOnIpChange })}
                  className="flex w-full items-center justify-between gap-4 rounded-md border border-white/[0.07] bg-white/[0.02] p-4 text-left transition-colors hover:bg-white/[0.04] light:border-black/[0.08] light:bg-black/[0.02] light:hover:bg-black/[0.04]"
                >
                  <div>
                    <p className="text-sm font-medium text-white light:text-black">Wyloguj przy zmianie IP</p>
                    <p className="mt-1 text-xs text-[#777777] light:text-[#777777]">
                      Dodatkowa ochrona przy zmianie adresu sieciowego.
                    </p>
                  </div>
                  <span
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      preferences.autoLogoutOnIpChange ? 'bg-sky-300' : 'bg-[#333333] light:bg-[#cccccc]'
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
                  <p className="max-w-xl text-xs leading-relaxed text-[#777777] light:text-[#777777]">
                    Backfill i sweep wątków profili użytkowników są w osobnym panelu administracyjnym.
                  </p>
                  <Link
                    href="/settings/discord"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-sky-300/25 bg-sky-300/10 px-4 text-xs text-sky-300 transition-colors hover:bg-sky-300/15 light:text-sky-700"
                  >
                    Otwórz panel
                  </Link>
                </div>
              </Section>
            )}
          </main>

          <aside className="space-y-5">
            <section className="rounded-md border border-white/[0.07] bg-[#111118]/[0.72] p-5 light:border-black/[0.08] light:bg-white/[0.82]">
              <p className="text-sm font-medium text-white light:text-black">Podsumowanie</p>
              <p className="mt-1 text-xs text-[#777777] light:text-[#777777]">
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

            <section className="rounded-md border border-white/[0.07] bg-[#111118]/[0.72] p-5 light:border-black/[0.08] light:bg-white/[0.82]">
              <p className="text-sm font-medium text-white light:text-black">Widoczne sekcje</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-md bg-white/[0.03] px-3 py-3 light:bg-black/[0.03]">
                  <span className="inline-flex items-center gap-2 text-sm text-white light:text-black">
                    <Monitor className="h-4 w-4 text-sky-400 light:text-sky-700" />
                    Preferencje
                  </span>
                  <span className="text-xs text-[#777777]">aktywne</span>
                </div>
                {canManageCache && (
                  <div className="flex items-center justify-between rounded-md bg-white/[0.03] px-3 py-3 light:bg-black/[0.03]">
                    <span className="inline-flex items-center gap-2 text-sm text-white light:text-black">
                      <Database className="h-4 w-4 text-blue-300 light:text-blue-700" />
                      Cache
                    </span>
                    <span className="text-xs text-[#777777]">admin</span>
                  </div>
                )}
                {canManageDiscordMaintenance && (
                  <div className="flex items-center justify-between rounded-md bg-white/[0.03] px-3 py-3 light:bg-black/[0.03]">
                    <span className="inline-flex items-center gap-2 text-sm text-white light:text-black">
                      <Bot className="h-4 w-4 text-amber-300 light:text-amber-700" />
                      Discord
                    </span>
                    <span className="text-xs text-[#777777]">admin</span>
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
