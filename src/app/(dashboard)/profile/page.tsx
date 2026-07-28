import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { ArrowLeft, Calendar, CheckCircle, Clock, Mail, Shield, User, XCircle } from 'lucide-react'
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm'
import { TwoFactorForm } from '@/components/profile/TwoFactorForm'
import { SessionsManager } from '@/components/SessionsManager'
import { AvatarUpload } from '@/components/AvatarUpload'
import { LogoutButton } from '@/components/LogoutButton'
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

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof Mail
}) {
  return (
    <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-3 border-b border-white/[0.05] light:border-black/[0.06] py-3 last:border-b-0">
      <Icon className="mt-0.5 h-4 w-4 text-[#666666] light:text-[#888888]" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#666666] light:text-[#999999]">{label}</p>
        <p className="mt-1 truncate text-sm text-white light:text-black">{value}</p>
      </div>
    </div>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="border border-white/[0.07] light:border-black/[0.08] bg-[#111118]/[0.72] light:bg-white/[0.82]">
      <div className="border-b border-white/[0.06] light:border-black/[0.06] px-5 py-4">
        <p className="text-sm font-medium text-white light:text-black">{title}</p>
        {subtitle && <p className="mt-1 text-xs text-[#777777] light:text-[#777777]">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
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
    <div className="min-h-screen bg-transparent transition-colors duration-300">
      <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:py-10">
        <header className="mb-6 flex flex-col gap-5 border-b border-white/[0.07] light:border-black/[0.08] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Image
              src="/logo/vezcore_logo_white_full.svg"
              alt="vezCore"
              width={178}
              height={52}
              className="h-auto w-[178px] max-w-[60vw] opacity-85 light:opacity-0 light:hidden"
              priority
            />
            <Image
              src="/logo/vezcore_logo_black_full.svg"
              alt="vezCore"
              width={178}
              height={52}
              className="h-auto w-[178px] max-w-[60vw] opacity-0 light:opacity-85 dark:hidden"
              priority
            />
            <p className="mt-4 text-[10px] uppercase tracking-[0.26em] text-[#666666] light:text-[#888888]">
              Profil
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white light:text-black">
              Konto i bezpieczeństwo
            </h1>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-white/[0.07] light:border-black/[0.08] px-3 text-xs text-[#999999] light:text-[#666666] transition-colors hover:text-white light:hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </header>

        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="border border-white/[0.07] light:border-black/[0.08] bg-[#111118]/[0.72] light:bg-white/[0.82] p-5">
              <div className="flex items-start gap-4">
                <AvatarUpload currentAvatarUrl={profile?.avatar_url ?? null} userId={user.id} />
              </div>

              <div className="mt-5 border-t border-white/[0.06] light:border-black/[0.06] pt-5">
                <p className="truncate text-xl font-semibold text-white light:text-black">{displayName}</p>
                <p className="mt-1 truncate font-mono text-xs text-[#888888] light:text-[#666666]">{user.email}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded border border-white/[0.07] light:border-black/[0.08] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[#999999] light:text-[#666666]">
                    {role}
                  </span>
                  {tenant && (
                    <span className="rounded border border-white/[0.07] light:border-black/[0.08] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[#999999] light:text-[#666666]">
                      {tenant.name}
                    </span>
                  )}
                </div>
              </div>
            </section>

            <section className="border border-white/[0.07] light:border-black/[0.08] bg-[#111118]/[0.72] light:bg-white/[0.82] p-5">
              <p className="mb-2 text-sm font-medium text-white light:text-black">Stan konta</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3 py-2">
                  <span className="text-xs text-[#777777] light:text-[#777777]">Email</span>
                  <span className={`inline-flex items-center gap-2 text-xs ${user.email_confirmed_at ? 'text-emerald-400 light:text-emerald-600' : 'text-red-400 light:text-red-600'}`}>
                    {user.email_confirmed_at ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {user.email_confirmed_at ? 'potwierdzony' : 'niepotwierdzony'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <span className="text-xs text-[#777777] light:text-[#777777]">2FA</span>
                  <span className={`inline-flex items-center gap-2 text-xs ${has2FA ? 'text-emerald-400 light:text-emerald-600' : 'text-amber-300 light:text-amber-600'}`}>
                    <span className={`h-2 w-2 rounded-full ${has2FA ? 'bg-emerald-400 light:bg-emerald-600' : 'bg-amber-300 light:bg-amber-500'}`} />
                    {has2FA ? 'włączone' : 'wyłączone'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <span className="text-xs text-[#777777] light:text-[#777777]">Konto</span>
                  <span className="inline-flex items-center gap-2 text-xs text-emerald-400 light:text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 light:bg-emerald-600" />
                    aktywne
                  </span>
                </div>
              </div>
            </section>

            <LogoutButton />
          </aside>

          <main className="space-y-5">
            <Section title="Dane konta">
              <div className="grid gap-x-6 md:grid-cols-2">
                <InfoRow label="Email" value={user.email ?? 'Brak'} icon={Mail} />
                <InfoRow label="Nazwa" value={profile?.full_name || 'Nie ustawiono'} icon={User} />
                <InfoRow label="Rola" value={role} icon={Shield} />
                <InfoRow label="Organizacja" value={tenant?.name || 'Brak'} icon={Shield} />
                <InfoRow label="Utworzenie" value={formatDate(user.created_at)} icon={Calendar} />
                <InfoRow label="Ostatnie logowanie" value={formatDate(user.last_sign_in_at, true)} icon={Clock} />
              </div>
            </Section>

            <Section title="Hasło" subtitle="Zmiana hasła wymaga aktualnego hasła. Przy włączonym 2FA wymagany jest też kod.">
              <ChangePasswordForm />
            </Section>

            <Section title="Uwierzytelnianie dwuskładnikowe" subtitle={has2FA ? 'Konto ma dodatkową warstwę ochrony.' : 'Warto włączyć 2FA dla kont z dostępem do panelu.'}>
              <TwoFactorForm isEnabled={has2FA} factorId={twoFactors[0]?.id} />
            </Section>

            <SessionsManager />
          </main>
        </div>
      </div>
    </div>
  )
}
