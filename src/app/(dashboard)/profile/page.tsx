import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { ArrowLeft, User, Mail, Shield, Calendar, Clock, CheckCircle, XCircle, Lock } from 'lucide-react'
import { NeuralBackground } from '@/components/NeuralBackground'
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm'
import { TwoFactorForm } from '@/components/profile/TwoFactorForm'
import { SessionsManager } from '@/components/SessionsManager'
import { AvatarUpload } from '@/components/AvatarUpload'
import { LogoutButton } from '@/components/LogoutButton'
import { getDashboardAuthUser } from '@/lib/queries/auth'
import { getProfilePageData } from '@/lib/queries/profile'

export default async function ProfilePage() {
  const user = await getDashboardAuthUser()
  if (!user) redirect('/login')

  const { profile, tenant, twoFactors } = await getProfilePageData(user)

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] light:bg-[#f5f5f5] transition-colors duration-300">
      <NeuralBackground />

      <div
        className="fixed inset-0 pointer-events-none opacity-20 light:opacity-10 transition-opacity duration-300"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px',
          color: 'rgba(100, 100, 100, 0.3)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-start min-h-screen px-4 py-8">
        <div className="mb-8">
          <Image
            src="/logo/vezcore_logo_white_full.svg"
            alt="vezCore"
            width={180}
            height={50}
            className="opacity-80 light:opacity-0 light:hidden transition-opacity duration-300"
            style={{ width: 'auto' }}
            priority
          />
          <Image
            src="/logo/vezcore_logo_black_full.svg"
            alt="vezCore"
            width={180}
            height={50}
            className="opacity-0 light:opacity-80 dark:hidden transition-opacity duration-300"
            style={{ width: 'auto' }}
            priority
          />
          <p className="text-center text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mt-3 transition-colors duration-300">
            Profil użytkownika
          </p>
        </div>

        <div className="w-full max-w-2xl space-y-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300 mb-4"
          >
            <ArrowLeft className="h-3 w-3" />
            Dashboard
          </Link>

          <div className="bg-[#111111]/80 light:bg-white/90 backdrop-blur-xl border border-white/[0.06] light:border-black/[0.08] p-6 transition-all duration-300">
            <div className="flex items-center gap-4">
              <AvatarUpload 
                currentAvatarUrl={profile?.avatar_url ?? null}
                userId={user.id}
              />
              <div className="flex-1">
                <p className="text-lg font-medium text-white light:text-black transition-colors duration-300">
                  {profile?.full_name || user.email?.split('@')[0]}
                </p>
                <p className="text-xs text-[#666666] light:text-[#999999] font-mono">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9px] uppercase tracking-wider text-[#444444] light:text-[#888888] bg-white/[0.03] light:bg-black/[0.03] px-2 py-0.5 rounded">
                    {profile?.role || 'user'}
                  </span>
                  {tenant && (
                    <span className="text-[9px] uppercase tracking-wider text-[#444444] light:text-[#888888] bg-white/[0.03] light:bg-black/[0.03] px-2 py-0.5 rounded">
                      {tenant.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#111111]/80 light:bg-white/90 backdrop-blur-xl border border-white/[0.06] light:border-black/[0.08] transition-all duration-300">
            <div className="p-6 border-b border-white/[0.06] light:border-black/[0.06]">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mb-4">Informacje o koncie</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] flex items-center justify-center">
                    <Mail className="h-5 w-5 text-emerald-400 light:text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999]">Email</p>
                    <p className="text-sm text-white light:text-black font-mono transition-colors duration-300">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-400 light:text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999]">Nazwa</p>
                    <p className="text-sm text-white light:text-black transition-colors duration-300">{profile?.full_name || 'Nie ustawiono'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] flex items-center justify-center">
                    <Shield className="h-5 w-5 text-purple-400 light:text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999]">Rola</p>
                    <p className="text-sm text-white light:text-black transition-colors duration-300">{profile?.role || 'Nie przypisano'}</p>
                  </div>
                </div>

                {tenant && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] flex items-center justify-center">
                      <Shield className="h-5 w-5 text-orange-400 light:text-orange-600" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999]">Organizacja</p>
                      <p className="text-sm text-white light:text-black transition-colors duration-300">{tenant.name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-b border-white/[0.06] light:border-black/[0.06]">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mb-4">Status</p>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  {user.email_confirmed_at ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-xs text-[#999999] light:text-[#666666]">
                    {user.email_confirmed_at ? 'Email potwierdzony' : 'Email niepotwierdzony'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                  <span className="text-xs text-[#999999] light:text-[#666666]">Konto aktywne</span>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mb-4">Daty</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-[#444444] light:text-[#888888]" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999]">Utworzenie</p>
                    <p className="text-sm text-white light:text-black font-mono transition-colors duration-300">
                      {new Date(user.created_at).toLocaleDateString('pl-PL', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-[#444444] light:text-[#888888]" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999]">Ostatnie logowanie</p>
                    <p className="text-sm text-white light:text-black font-mono transition-colors duration-300">
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString('pl-PL', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Brak'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#111111]/80 light:bg-white/90 backdrop-blur-xl border border-white/[0.06] light:border-black/[0.08] p-6 transition-all duration-300">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mb-4 flex items-center gap-2">
              <Lock className="h-3 w-3" />
              Zmiana hasła
            </p>
            <ChangePasswordForm />
          </div>

          <div className="bg-[#111111]/80 light:bg-white/90 backdrop-blur-xl border border-white/[0.06] light:border-black/[0.08] p-6 transition-all duration-300">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mb-4 flex items-center gap-2">
              <Shield className="h-3 w-3" />
              2FA
            </p>
            <TwoFactorForm isEnabled={twoFactors.length > 0} factorId={twoFactors[0]?.id} />
          </div>

          <SessionsManager />

          <LogoutButton />
        </div>

        <p className="mt-8 text-[9px] uppercase tracking-[0.4em] text-[#333333] light:text-[#cccccc] transition-colors duration-300">
          NEURAL INTERFACE ACTIVE
        </p>
      </div>
    </div>
  )
}
