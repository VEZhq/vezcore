'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  ChevronRight,
  Clock3,
  Globe2,
  Moon,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CacheManager } from '@/components/CacheManager'
import { MobileNav } from '@/components/MobileNav'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useTheme } from '@/components/theme/ThemeProvider'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'

const timezones = [
  { value: 'Europe/Warsaw', label: 'Warszawa', helper: 'CET / CEST' },
  { value: 'Europe/London', label: 'Londyn', helper: 'GMT / BST' },
  { value: 'Europe/Berlin', label: 'Berlin', helper: 'CET / CEST' },
  { value: 'America/New_York', label: 'Nowy Jork', helper: 'EST / EDT' },
  { value: 'America/Los_Angeles', label: 'Los Angeles', helper: 'PST / PDT' },
  { value: 'Asia/Tokyo', label: 'Tokio', helper: 'JST' },
]

const dateFormats = [
  { value: 'DD/MM/YYYY' as const, label: '31/12/2026' },
  { value: 'MM/DD/YYYY' as const, label: '12/31/2026' },
  { value: 'YYYY-MM-DD' as const, label: '2026-12-31' },
]

const sessionTimeouts = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 godz.' },
  { value: 120, label: '2 godz.' },
]

type SettingsSection = 'appearance' | 'locale' | 'security' | 'system'

const sections: Array<{
  id: SettingsSection
  label: string
  description: string
  icon: LucideIcon
}> = [
  { id: 'appearance', label: 'Wygląd', description: 'Motyw interfejsu', icon: Palette },
  { id: 'locale', label: 'Region', description: 'Czas i format daty', icon: Globe2 },
  { id: 'security', label: 'Sesja', description: 'Czas i zmiana sieci', icon: ShieldCheck },
  { id: 'system', label: 'System', description: 'Cache i integracje', icon: Wrench },
]

function SegmentedOption({
  selected,
  onClick,
  label,
  detail,
  icon: Icon,
}: {
  selected: boolean
  onClick: () => void
  label: string
  detail?: string
  icon?: LucideIcon
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 min-w-0 items-center gap-3 rounded-[8px] border px-3 text-left transition-colors ${
        selected
          ? 'border-[#aa9dac]/45 bg-[#efebf0] text-[#3f3a40] dark:border-white/[0.15] dark:bg-white/[0.1] dark:text-white'
          : 'border-black/[0.08] bg-white/55 text-[#606461] hover:border-black/[0.14] hover:bg-white dark:border-white/[0.09] dark:bg-white/[0.025] dark:text-[#a2a6a3] dark:hover:border-white/[0.15] dark:hover:bg-white/[0.055]'
      }`}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-semibold">{label}</span>
        {detail && <span className="mt-0.5 block truncate text-[9px] opacity-65">{detail}</span>}
      </span>
    </button>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <header className="border-b border-black/[0.1] pb-6 dark:border-white/[0.09]">
      <p className="text-[9px] font-semibold uppercase text-[#858c88] dark:text-[#929895]">{eyebrow}</p>
      <h1 className="mt-1 text-[26px] font-semibold">{title}</h1>
      <p className="mt-1.5 max-w-xl text-[10px] leading-relaxed text-[#747b78] dark:text-[#969c99]">{description}</p>
    </header>
  )
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-4 border-b border-black/[0.08] py-6 dark:border-white/[0.08] lg:grid-cols-[220px_minmax(0,1fr)]">
      <div>
        <h2 className="text-[12px] font-semibold">{title}</h2>
        <p className="mt-1 max-w-[210px] text-[9px] leading-relaxed text-[#858c88] dark:text-[#929895]">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

export default function SettingsWorkspace({
  canAccessKonta,
  canManageDiscordMaintenance,
  canManageCache,
}: {
  canAccessKonta: boolean
  canManageDiscordMaintenance: boolean
  canManageCache: boolean
}) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance')
  const { theme, toggleTheme } = useTheme()
  const { preferences, updatePreferences } = useUserPreferences()
  const selectedTimezone = timezones.find((timezone) => timezone.value === preferences.timezone)

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-[#252625] dark:bg-[#080908] dark:text-[#eef0ef]">
      <MobileNav currentPath="/settings" showKonta={canAccessKonta} showSettings />

      <header className="border-b border-black/[0.08] bg-[#fafaf9]/95 dark:border-white/[0.09] dark:bg-[#0b0c0b]">
        <div className="mx-auto flex h-12 w-full max-w-[1240px] items-center px-4 sm:px-6">
          <Image src="/logo/vezcore_logo_black_full.svg" alt="VEZcore" width={104} height={42} className="h-auto w-[104px] dark:hidden" priority />
          <Image src="/logo/vezcore_logo_white_full.svg" alt="VEZcore" width={104} height={42} className="hidden h-auto w-[104px] dark:block" priority />
          <span className="mx-3 h-4 w-px bg-black/[0.08] dark:bg-white/[0.1]" />
          <span className="text-[10px] text-[#747b78] dark:text-[#8f9692]">Panel ustawień</span>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[10px] text-[#626966] hover:bg-white dark:text-[#aab0ad] dark:hover:bg-white/[0.07]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-48px)] w-full max-w-[1240px] lg:grid-cols-[224px_minmax(0,1fr)]">
        <aside className="border-b border-black/[0.08] bg-[#efefed]/55 px-4 py-6 dark:border-white/[0.08] dark:bg-[#0a0b0a] sm:px-6 lg:border-b-0 lg:border-r lg:py-8">
          <div className="mb-6 hidden lg:block">
            <p className="text-[9px] font-semibold uppercase text-[#8a918d]">VEZcore</p>
            <p className="mt-1 text-[15px] font-semibold">Ustawienia</p>
          </div>

          <nav className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1" aria-label="Kategorie ustawień">
            {sections.map((section) => {
              const Icon = section.icon
              const active = activeSection === section.id
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex min-w-0 items-center gap-3 rounded-[8px] px-2.5 py-2.5 text-left transition-colors ${
                    active
                      ? 'bg-white text-[#292829] shadow-[0_1px_2px_rgba(25,25,25,0.06)] dark:bg-white/[0.08] dark:text-white'
                      : 'text-[#747b78] hover:bg-white/55 dark:text-[#969c99] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${
                    active ? 'bg-[#eee9ef] text-[#776a78] dark:bg-white/[0.08] dark:text-[#d1c8d2]' : 'bg-black/[0.025] dark:bg-white/[0.035]'
                  }`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10px] font-semibold">{section.label}</span>
                    <span className="mt-0.5 hidden truncate text-[8px] opacity-60 sm:block">{section.description}</span>
                  </span>
                  <ChevronRight className={`hidden h-3.5 w-3.5 lg:block ${active ? 'opacity-70' : 'opacity-25'}`} />
                </button>
              )
            })}
          </nav>

          <div className="mt-8 hidden border-t border-black/[0.08] pt-5 dark:border-white/[0.08] lg:block">
            <p className="text-[8px] uppercase text-[#969c99]">Bieżąca konfiguracja</p>
            <dl className="mt-3 space-y-2.5 text-[9px]">
              <div className="flex justify-between gap-3"><dt className="text-[#8b918e]">Motyw</dt><dd className="font-mono">{theme === 'dark' ? 'ciemny' : 'jasny'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[#8b918e]">Strefa</dt><dd className="truncate font-mono">{selectedTimezone?.label}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[#8b918e]">Sesja</dt><dd className="font-mono">{preferences.sessionTimeout} min</dd></div>
            </dl>
          </div>
        </aside>

        <main className="min-w-0 bg-[#fafaf9]/45 px-4 py-7 sm:px-8 lg:px-11 lg:py-9 dark:bg-transparent">
          {activeSection === 'appearance' && (
            <>
              <SectionHeading eyebrow="Interfejs" title="Wygląd" description="Wybierz wariant dopasowany do warunków pracy. Zmiana jest zapisywana automatycznie." />
              <SettingRow title="Motyw panelu" description="Wpływa na wszystkie widoki VEZcore.">
                <div className="grid gap-2 sm:grid-cols-2">
                  <SegmentedOption
                    selected={theme === 'light'}
                    onClick={() => theme === 'dark' && toggleTheme()}
                    label="Jasny"
                    detail="Wysoki kontrast w dzień"
                    icon={Sun}
                  />
                  <SegmentedOption
                    selected={theme === 'dark'}
                    onClick={() => theme === 'light' && toggleTheme()}
                    label="Ciemny"
                    detail="Spokojniejszy widok operacyjny"
                    icon={Moon}
                  />
                </div>
              </SettingRow>
            </>
          )}

          {activeSection === 'locale' && (
            <>
              <SectionHeading eyebrow="Lokalizacja" title="Region" description="Ustawienia używane przy wyświetlaniu dat w logach, aktywności i danych kont." />
              <SettingRow title="Strefa czasowa" description="Wszystkie godziny są przeliczane do tej strefy.">
                <label className="relative block max-w-md">
                  <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777a78]" />
                  <select
                    value={preferences.timezone}
                    onChange={(event) => updatePreferences({ timezone: event.target.value })}
                    className="h-11 w-full appearance-none rounded-[8px] border border-black/[0.1] bg-white/80 pl-10 pr-10 text-[11px] outline-none transition-colors focus:border-[#918493] dark:border-white/[0.1] dark:bg-white/[0.045] dark:focus:border-white/[0.28]"
                  >
                    {timezones.map((timezone) => (
                      <option key={timezone.value} value={timezone.value}>{timezone.label} ({timezone.helper})</option>
                    ))}
                  </select>
                  <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-[#8e9591]" />
                </label>
              </SettingRow>
              <SettingRow title="Format daty" description="Sposób zapisu dat w tabelach i podsumowaniach.">
                <div className="grid gap-2 sm:grid-cols-3">
                  {dateFormats.map((format) => (
                    <SegmentedOption
                      key={format.value}
                      selected={preferences.dateFormat === format.value}
                      onClick={() => updatePreferences({ dateFormat: format.value })}
                      label={format.label}
                      icon={CalendarDays}
                    />
                  ))}
                </div>
              </SettingRow>
            </>
          )}

          {activeSection === 'security' && (
            <>
              <SectionHeading eyebrow="Bezpieczeństwo" title="Sesja" description="Kontroluj czas bezczynności i reakcję panelu na zmianę adresu sieciowego." />
              <SettingRow title="Limit bezczynności" description="Po tym czasie użytkownik zostanie automatycznie wylogowany.">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {sessionTimeouts.map((timeout) => (
                    <SegmentedOption
                      key={timeout.value}
                      selected={preferences.sessionTimeout === timeout.value}
                      onClick={() => updatePreferences({ sessionTimeout: timeout.value })}
                      label={timeout.label}
                      icon={Clock3}
                    />
                  ))}
                </div>
              </SettingRow>
              <SettingRow title="Zmiana adresu IP" description="Opcjonalnie zakończ sesję, gdy zmieni się adres sieciowy.">
                <button
                  type="button"
                  onClick={() => updatePreferences({ autoLogoutOnIpChange: !preferences.autoLogoutOnIpChange })}
                  className="flex w-full max-w-xl items-center justify-between gap-5 rounded-[8px] border border-black/[0.07] bg-white/45 p-4 text-left hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.025] dark:hover:bg-white/[0.055]"
                >
                  <span>
                    <span className="block text-[11px] font-semibold">Wyloguj po zmianie IP</span>
                    <span className="mt-1 block text-[9px] text-[#858c88]">Dodatkowa ochrona dla kont administracyjnych.</span>
                  </span>
                  <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${preferences.autoLogoutOnIpChange ? 'bg-[#756b76] dark:bg-[#a89daa]' : 'bg-[#c6c8c6] dark:bg-[#3d403e]'}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${preferences.autoLogoutOnIpChange ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </span>
                </button>
              </SettingRow>
            </>
          )}

          {activeSection === 'system' && (
            <>
              <SectionHeading eyebrow="Administracja" title="System" description="Narzędzia techniczne są widoczne wyłącznie dla kont z odpowiednią rolą." />
              {!canManageCache && !canManageDiscordMaintenance && (
                <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                  <SlidersHorizontal className="h-6 w-6 text-[#8e9591]" />
                  <p className="mt-3 text-[12px] font-semibold">Brak narzędzi administracyjnych</p>
                  <p className="mt-1 text-[10px] text-[#858c88]">Twoja rola nie udostępnia operacji systemowych.</p>
                </div>
              )}
              <div className="space-y-6 pt-6">
                {canManageCache && <CacheManager />}
                {canManageDiscordMaintenance && (
                  <section className="flex items-center justify-between gap-5 border-y border-black/[0.09] bg-white/35 px-5 py-5 dark:border-white/[0.09] dark:bg-white/[0.018]">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#f0e9df] text-[#92734e] dark:bg-white/[0.055] dark:text-[#d0b693]">
                        <Bot className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[12px] font-semibold">Discord maintenance</span>
                        <span className="mt-1 block text-[9px] text-[#858c88]">Backfill oraz synchronizacja wątków profili.</span>
                      </span>
                    </div>
                    <Link href="/settings/discord" className="flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-[10px] font-medium text-[#646064] hover:bg-black/[0.04] dark:text-[#bbb7bc] dark:hover:bg-white/[0.06]">
                      Otwórz
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </section>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
