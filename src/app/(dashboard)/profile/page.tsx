import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { AvatarUpload } from '@/components/AvatarUpload'
import { LogoutButton } from '@/components/LogoutButton'
import { SessionsManager } from '@/components/SessionsManager'
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm'
import { TwoFactorForm } from '@/components/profile/TwoFactorForm'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { getDashboardAuthUser } from '@/lib/queries/auth'
import { getProfilePageData } from '@/lib/queries/profile'

function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return 'Brak danych'
  return new Intl.DateTimeFormat('pl-PL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value))
}

function AccountRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof Mail
}) {
  return (
    <div className="grid grid-cols-[34px_minmax(0,1fr)] gap-3 border-b border-black/[0.08] py-4 last:border-b-0 dark:border-white/[0.08]">
      <span className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-black/[0.035] text-[#737a77] dark:bg-white/[0.055] dark:text-[#9aa09d]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[9px] uppercase text-[#939996]">{label}</p>
        <p className="mt-1 truncate text-[13px] font-medium text-[#292d2b] dark:text-[#e7e9e8]">{value}</p>
      </div>
    </div>
  )
}

function SecuritySection({
  number,
  title,
  subtitle,
  children,
}: {
  number: string
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-5 border-t border-black/[0.1] py-7 first:border-t-0 first:pt-0 dark:border-white/[0.09] md:grid-cols-[210px_minmax(0,1fr)]">
      <div>
        <p className="font-mono text-[9px] text-[#9ba19e]">{number}</p>
        <h2 className="mt-2 text-[15px] font-semibold text-[#292d2b] dark:text-[#eef0ef]">{title}</h2>
        <p className="mt-1 max-w-[190px] text-[11px] leading-relaxed text-[#747b78] dark:text-[#8d9490]">{subtitle}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

export default async function ProfilePage() {
  const user = await getDashboardAuthUser()
  if (!user) redirect('/login')

  const { profile, tenant, twoFactors } = await getProfilePageData(user)
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Użytkownik'
  const role = profile?.role || 'user'
  const has2FA = twoFactors.length > 0

  return (
    <div className="min-h-screen bg-[#f1f3f2] text-[#242725] dark:bg-[#070807] dark:text-[#eceeed]">
      <header className="border-b border-black/[0.07] bg-white/45 dark:border-white/[0.08] dark:bg-[#090a09]">
        <div className="mx-auto flex h-12 w-full max-w-[1180px] items-center px-4 sm:px-6">
          <Image
            src="/logo/vezcore_logo_black_full.svg"
            alt="VEZcore"
            width={104}
            height={42}
            className="h-auto w-[104px] dark:hidden"
            priority
          />
          <Image
            src="/logo/vezcore_logo_white_full.svg"
            alt="VEZcore"
            width={104}
            height={42}
            className="hidden h-auto w-[104px] dark:block"
            priority
          />
          <span className="mx-3 h-4 w-px bg-black/[0.08] dark:bg-white/[0.1]" />
          <span className="text-[10px] font-medium text-[#747b78] dark:text-[#8f9692]">Konto</span>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[10px] font-medium text-[#626966] transition-colors hover:bg-black/[0.04] hover:text-black dark:text-[#aab0ad] dark:hover:bg-white/[0.07] dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
        <section className="border-b border-black/[0.1] pb-8 dark:border-white/[0.09]">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase text-[#808783] dark:text-[#8f9692]">Profil</p>
              <p className="mt-1 text-[11px] text-[#777e7a] dark:text-[#8e9591]">
                Tożsamość, dostęp i bezpieczeństwo konta
              </p>
            </div>
            <span className="hidden font-mono text-[9px] text-[#9aa09d] sm:block">
              Utworzono {formatDate(user.created_at)}
            </span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <AvatarUpload
                currentAvatarUrl={profile?.avatar_url ?? null}
                userId={user.id}
                fallbackLabel={displayName}
              />
              <div className="min-w-0">
                <h1 className="truncate text-[28px] font-semibold leading-tight text-[#252927] dark:text-[#f0f2f1]">
                  {displayName}
                </h1>
                <p className="mt-1.5 truncate font-mono text-[11px] text-[#747b78] dark:text-[#8d9490]">{user.email}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px]">
                  <span className="font-semibold uppercase text-[#626966] dark:text-[#a2a8a5]">{role}</span>
                  {tenant && (
                    <span className="flex items-center gap-1.5 text-[#747b78] dark:text-[#909693]">
                      <Building2 className="h-3 w-3" />
                      {tenant.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="border-l border-black/[0.08] pl-0 dark:border-white/[0.08] lg:pl-7">
              {[
                ['Adres e-mail', user.email_confirmed_at ? 'Potwierdzony' : 'Wymaga potwierdzenia', Boolean(user.email_confirmed_at)],
                ['Weryfikacja 2FA', has2FA ? 'Aktywna' : 'Wyłączona', has2FA],
                ['Dostęp do konta', 'Aktywny', true],
              ].map(([label, value, positive]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between border-b border-black/[0.07] py-3 first:pt-0 last:border-b-0 last:pb-0 dark:border-white/[0.07]"
                >
                  <span className="text-[10px] text-[#7b827e] dark:text-[#909692]">{label}</span>
                  <span className="flex items-center gap-2 text-[10px] font-medium text-[#3f4542] dark:text-[#c7cbc9]">
                    <span className={`h-1.5 w-1.5 rounded-full ${positive ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-10 py-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside>
            <div className="flex items-center justify-between border-b border-black/[0.1] pb-3 dark:border-white/[0.09]">
              <h2 className="text-[14px] font-semibold">Dane konta</h2>
              <UserRound className="h-4 w-4 text-[#969c99]" />
            </div>
            <AccountRow label="Email" value={user.email ?? 'Brak'} icon={Mail} />
            <AccountRow label="Nazwa" value={profile?.full_name || 'Nie ustawiono'} icon={UserRound} />
            <AccountRow label="Rola" value={role} icon={ShieldCheck} />
            <AccountRow label="Organizacja" value={tenant?.name || 'Brak'} icon={Building2} />
            <AccountRow label="Utworzenie" value={formatDate(user.created_at)} icon={CalendarDays} />
            <AccountRow label="Ostatnie logowanie" value={formatDate(user.last_sign_in_at, true)} icon={Clock3} />
            <div className="mt-6">
              <LogoutButton />
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-6 flex items-center justify-between border-b border-black/[0.1] pb-3 dark:border-white/[0.09]">
              <h2 className="text-[14px] font-semibold">Bezpieczeństwo</h2>
              <div className="flex items-center gap-1.5 text-[9px] text-[#747b78] dark:text-[#929895]">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Kontrola dostępu aktywna
              </div>
            </div>

            <SecuritySection
              number="01"
              title="Hasło"
              subtitle="Zmiana wymaga aktualnego hasła oraz kodu 2FA, jeśli jest aktywny."
            >
              <ChangePasswordForm />
            </SecuritySection>

            <SecuritySection
              number="02"
              title="Uwierzytelnianie 2FA"
              subtitle={has2FA ? 'Dodatkowa warstwa ochrony jest aktywna.' : 'Włącz kod jednorazowy dla dostępu do panelu.'}
            >
              <TwoFactorForm isEnabled={has2FA} factorId={twoFactors[0]?.id} />
            </SecuritySection>

            <SecuritySection
              number="03"
              title="Aktywne sesje"
              subtitle="Sprawdź urządzenia i wycofaj dostęp, którego już nie rozpoznajesz."
            >
              <SessionsManager />
            </SecuritySection>
          </div>
        </div>
      </main>
    </div>
  )
}
