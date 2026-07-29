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

const panelClass = 'border-y border-black/[0.09] bg-white/35 dark:border-white/[0.09] dark:bg-white/[0.018]'
const labelClass = 'text-[9px] font-semibold uppercase text-[#858c88] dark:text-[#929895]'
const titleClass = 'text-[13px] font-semibold text-[#2b302d] dark:text-[#eceeed]'
const helperClass = 'text-[10px] leading-relaxed text-[#7d8480] dark:text-[#959b98]'

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
      className={`inline-flex h-8 items-center gap-2 rounded-[8px] px-2.5 text-[10px] transition-colors ${
        active
          ? 'bg-white text-[#28302c] shadow-sm dark:bg-white/[0.09] dark:text-white'
          : 'text-[#737a77] hover:bg-white/70 hover:text-[#252927] dark:text-[#989e9b] dark:hover:bg-white/[0.06] dark:hover:text-white'
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
    <section className={`${panelClass}`}>
      <div className="grid gap-4 border-b border-black/[0.065] px-5 py-4 dark:border-white/[0.065] sm:grid-cols-[36px_minmax(0,1fr)]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#e8eeea] text-[#60776a] dark:bg-white/[0.055] dark:text-[#aab9b0]">
          <Icon className="h-4 w-4" />
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
    <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] py-3 last:border-b-0 dark:border-white/[0.06]">
      <span className="inline-flex items-center gap-2 text-[10px] text-[#747b78] dark:text-[#969c99]">
        <Icon className="h-3.5 w-3.5 text-[#71877a]" />
        {label}
      </span>
      <span className="truncate text-right font-mono text-[10px] text-[#343936] dark:text-[#d7dad8]">{value}</span>
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
      className={`min-h-16 rounded-[8px] border p-3 text-left transition-colors ${
        selected
          ? 'border-[#81998b]/30 bg-[#e2ebe5] dark:border-white/[0.12] dark:bg-white/[0.09]'
          : 'border-black/[0.07] bg-white/40 hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.025] dark:hover:bg-white/[0.055]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={`truncate ${selected ? 'text-[11px] font-semibold text-[#34463c] dark:text-white' : titleClass}`}>{title}</p>
          {helper && <p className={`mt-1 truncate ${helperClass}`}>{helper}</p>}
        </div>
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-[#668071]' : 'text-[#959c98]'}`} />}
      </div>
      {selected && <span className="mt-2 block h-1 w-6 rounded-full bg-[#718a7b]" />}
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
    <div className="min-h-screen bg-[#f1f3f2] text-[#252927] dark:bg-[#070807] dark:text-[#eef0ef]">
      <MobileNav currentPath="/settings" showKonta={canAccessKonta} showSettings />

      <header className="border-b border-black/[0.07] bg-white/45 dark:border-white/[0.08] dark:bg-[#090a09]">
        <div className="mx-auto flex h-12 w-full max-w-[1180px] items-center px-4 sm:px-6">
            <Image
              src="/logo/vezcore_logo_white_full.svg"
              alt="vezCore"
              width={104}
              height={42}
              className="hidden h-auto w-[104px] dark:block"
              priority
            />
            <Image
              src="/logo/vezcore_logo_black_full.svg"
              alt="vezCore"
              width={104}
              height={42}
              className="h-auto w-[104px] dark:hidden"
              priority
            />
            <span className="mx-3 h-4 w-px bg-black/[0.08] dark:bg-white/[0.1]" />
            <span className="text-[10px] text-[#747b78] dark:text-[#8f9692]">Ustawienia systemu</span>

          <nav className="ml-auto hidden items-center gap-1 sm:flex">
            <NavLink href="/dashboard" label="Dashboard" icon={ArrowLeft} />
            <NavLink href="/profile" label="Profil" icon={User} />
            {canAccessKonta && <NavLink href="/konta" label="Konta" icon={Users} />}
            <NavLink href="/settings" label="Ustawienia" icon={Settings} active />
          </nav>
        </div>
      </header>

      <div className="mx-auto min-h-[calc(100vh-48px)] w-full max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-7 flex flex-col gap-5 border-b border-black/[0.1] pb-6 dark:border-white/[0.09] sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={labelClass}>Preferencje i administracja</p>
            <h1 className="mt-1 text-[28px] font-semibold">Ustawienia</h1>
            <p className="mt-1.5 text-[10px] text-[#7c837f] dark:text-[#929895]">Wygląd panelu, region, sesja i narzędzia systemowe.</p>
          </div>
          <div className="grid grid-cols-3 gap-5 sm:flex">
            <div>
              <p className="font-mono text-[16px] font-semibold">{theme === 'dark' ? 'Dark' : 'Light'}</p>
              <p className="text-[8px] uppercase text-[#959c98]">Motyw</p>
            </div>
            <div className="border-l border-black/[0.08] pl-5 dark:border-white/[0.08]">
              <p className="font-mono text-[16px] font-semibold">{preferences.timezone.split('/').at(-1)}</p>
              <p className="text-[8px] uppercase text-[#959c98]">Strefa</p>
            </div>
            <div className="border-l border-black/[0.08] pl-5 dark:border-white/[0.08]">
              <p className="font-mono text-[16px] font-semibold">{preferences.sessionTimeout}m</p>
              <p className="text-[8px] uppercase text-[#959c98]">Sesja</p>
            </div>
          </div>
        </header>

        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_300px]">
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
                  className={`rounded-[8px] border p-4 text-left transition-colors ${
                    theme === 'dark'
                      ? 'border-[#81998b]/30 bg-[#e2ebe5] dark:border-white/[0.12] dark:bg-white/[0.09]'
                      : 'border-black/[0.07] bg-white/40 hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.025] dark:hover:bg-white/[0.055]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold">Ciemny</p>
                      <p className="mt-1 text-[10px] text-[#7d8480] dark:text-[#959b98]">Tryb operacyjny przy słabym świetle.</p>
                    </div>
                    <Moon className="h-5 w-5 shrink-0 text-[#71877a]" />
                  </div>
                  <div className="mt-5 grid grid-cols-[1fr_38px] gap-2">
                    <span className="h-1.5 rounded-full bg-[#26302b]" />
                    <span className="h-1.5 rounded-full bg-[#65706b]" />
                    <span className="h-1.5 rounded-full bg-[#9ca5a1]" />
                    <span className="h-1.5 rounded-full bg-[#71877a]" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => theme === 'dark' && toggleTheme()}
                  className={`rounded-[8px] border p-4 text-left transition-colors ${
                    theme === 'light'
                      ? 'border-[#81998b]/30 bg-[#e2ebe5] dark:border-white/[0.12] dark:bg-white/[0.09]'
                      : 'border-black/[0.07] bg-white/40 hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.025] dark:hover:bg-white/[0.055]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold">Jasny</p>
                      <p className="mt-1 text-[10px] text-[#7d8480] dark:text-[#959b98]">Czytelny widok do pracy w dzień.</p>
                    </div>
                    <Sun className="h-5 w-5 shrink-0 text-[#71877a]" />
                  </div>
                  <div className="mt-5 grid grid-cols-[1fr_38px] gap-2">
                    <span className="h-1.5 rounded-full bg-[#dfe5e1]" />
                    <span className="h-1.5 rounded-full bg-[#aeb8b2]" />
                    <span className="h-1.5 rounded-full bg-[#717a75]" />
                    <span className="h-1.5 rounded-full bg-[#81998b]" />
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
                    className="h-10 w-full rounded-[8px] border border-black/[0.08] bg-white/70 px-3 text-[11px] outline-none transition-colors focus:border-[#789083] dark:border-white/[0.09] dark:bg-white/[0.045]"
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
                  <p className="mt-3 text-[10px] text-[#7d8480] dark:text-[#959b98]">
                    Automatyczne wylogowanie po {preferences.sessionTimeout} minutach bezczynności.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => updatePreferences({ autoLogoutOnIpChange: !preferences.autoLogoutOnIpChange })}
                  className="flex w-full items-center justify-between gap-4 rounded-[8px] border border-black/[0.07] bg-white/40 p-4 text-left transition-colors hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.025] dark:hover:bg-white/[0.055]"
                >
                  <div>
                    <p className="text-[11px] font-semibold">Wyloguj przy zmianie IP</p>
                    <p className="mt-1 text-[10px] text-[#7d8480] dark:text-[#959b98]">
                      Dodatkowa ochrona przy zmianie adresu sieciowego.
                    </p>
                  </div>
                  <span
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      preferences.autoLogoutOnIpChange ? 'bg-[#6f8a7a]' : 'bg-[#c6cbc8] dark:bg-[#3d423f]'
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
                  <p className="max-w-xl text-[10px] leading-relaxed text-[#7d8480] dark:text-[#959b98]">
                    Backfill i sweep wątków profili użytkowników są w osobnym panelu administracyjnym.
                  </p>
                  <Link
                    href="/settings/discord"
                    className="inline-flex h-9 items-center justify-center rounded-[8px] border border-[#789083]/25 bg-[#e2ebe5] px-4 text-[10px] font-medium text-[#50675a] transition-colors hover:bg-[#d8e4dc] dark:border-white/[0.1] dark:bg-white/[0.07] dark:text-[#c8d3cc] dark:hover:bg-white/[0.1]"
                  >
                    Otwórz panel
                  </Link>
                </div>
              </Section>
            )}
          </main>

          <aside className="space-y-5">
            <section className={`${panelClass} p-5`}>
              <p className="text-[13px] font-semibold">Podsumowanie</p>
              <p className="mt-1 text-[10px] text-[#7d8480] dark:text-[#959b98]">
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
              <p className="text-[13px] font-semibold">Dostępne narzędzia</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-[8px] bg-black/[0.025] px-3 py-3 dark:bg-white/[0.035]">
                  <span className="inline-flex items-center gap-2 text-[10px] font-medium">
                    <Monitor className="h-4 w-4 text-[#71877a]" />
                    Preferencje
                  </span>
                  <span className="text-[9px] text-[#8e9591]">aktywne</span>
                </div>
                {canManageCache && (
                  <div className="flex items-center justify-between rounded-[8px] bg-black/[0.025] px-3 py-3 dark:bg-white/[0.035]">
                    <span className="inline-flex items-center gap-2 text-[10px] font-medium">
                      <Database className="h-4 w-4 text-[#806a82]" />
                      Cache
                    </span>
                    <span className="text-[9px] text-[#8e9591]">admin</span>
                  </div>
                )}
                {canManageDiscordMaintenance && (
                  <div className="flex items-center justify-between rounded-[8px] bg-black/[0.025] px-3 py-3 dark:bg-white/[0.035]">
                    <span className="inline-flex items-center gap-2 text-[10px] font-medium">
                      <Bot className="h-4 w-4 text-[#92734e]" />
                      Discord
                    </span>
                    <span className="text-[9px] text-[#8e9591]">admin</span>
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
