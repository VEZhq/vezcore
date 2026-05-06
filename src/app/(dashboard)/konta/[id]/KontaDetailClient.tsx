'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
	Home, User, Settings, ArrowLeft, Mail, Shield, Calendar,
	Trash2, Edit, Save, X, Lock, ShieldOff, Activity,
	LogIn, LogOut, KeyRound, BadgeCheck, ShieldCheck, ShieldMinus, PencilLine, Circle,
	ChevronRight
} from 'lucide-react'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'
import { useConfirm } from '@/components/ConfirmDialog'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import { updateUser, deleteUser, changeUserEmail } from '@/lib/actions/users'
import { MobileNav } from '@/components/MobileNav'

interface UserData {
  id: string
  email: string
  full_name: string | null
  role: string | null
  created_at: string
}

interface AuditLogEntry {
  action: string
  details: Record<string, unknown> | null
  created_at: string
}

function getActivityMeta(action: string) {
  switch (action) {
    case 'login':
      return { label: 'Logowanie', icon: LogIn, iconClassName: 'text-emerald-400 light:text-emerald-600' }
    case 'logout':
      return { label: 'Wylogowanie', icon: LogOut, iconClassName: 'text-zinc-400 light:text-zinc-600' }
    case 'profile_update':
      return { label: 'Aktualizacja profilu', icon: PencilLine, iconClassName: 'text-blue-400 light:text-blue-600' }
    case 'password_change':
      return { label: 'Zmiana hasła', icon: KeyRound, iconClassName: 'text-amber-400 light:text-amber-600' }
    case '2fa_verify':
      return { label: 'Weryfikacja 2FA', icon: BadgeCheck, iconClassName: 'text-violet-400 light:text-violet-600' }
    case '2fa_enable':
      return { label: 'Włączenie 2FA', icon: ShieldCheck, iconClassName: 'text-emerald-400 light:text-emerald-600' }
    case '2fa_disable':
      return { label: 'Wyłączenie 2FA', icon: ShieldMinus, iconClassName: 'text-orange-400 light:text-orange-600' }
    default:
      return { label: action, icon: Circle, iconClassName: 'text-[#666666] light:text-[#999999]' }
  }
}

function ActionRow({
  icon: Icon,
  title,
  description,
  accentClassName,
  action,
}: {
	icon: typeof Mail
	title: string
	description: string
	accentClassName: string
  action: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 light:border-black/[0.06] light:bg-black/[0.02]">
      <div className="min-w-0 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] light:border-black/[0.06] light:bg-black/[0.03]">
          <Icon className={`h-4 w-4 ${accentClassName}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white light:text-black">{title}</p>
          <p className="text-xs text-[#666666] light:text-[#888888]">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

interface KontaDetailClientProps {
  user: UserData
  recentActivity: AuditLogEntry[]
  canDeleteUsers: boolean
  canEditUsers: boolean
  canManagePermissions: boolean
  has2FA: boolean
  canAccessAudit: boolean
  canAccessSettings: boolean
}

export default function KontaDetailClient({
	user,
	recentActivity,
	canDeleteUsers,
	canEditUsers,
	canManagePermissions,
	has2FA,
	canAccessAudit,
	canAccessSettings,
}: KontaDetailClientProps) {
	const router = useRouter()
	const { preferences } = useUserPreferences()
	const { confirm } = useConfirm()
	const { token: csrfToken } = useCSRFToken()
	const [isEditing, setIsEditing] = useState(false)
	const [editName, setEditName] = useState(user.full_name || '')
	const [editRole, setEditRole] = useState(user.role || 'user')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [showEmailModal, setShowEmailModal] = useState(false)
	const [newEmail, setNewEmail] = useState('')
	const [emailError, setEmailError] = useState<string | null>(null)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nigdy'
    const date = new Date(dateStr)
    return date.toLocaleDateString('pl-PL', {
      timeZone: preferences.timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      const parts = name.trim().split(' ')
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  const getAvatarColor = (name: string | null, email: string) => {
    const str = name || email
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const colors = [
      'bg-emerald-500/20 text-emerald-400 light:text-emerald-600',
      'bg-blue-500/20 text-blue-400 light:text-blue-600',
      'bg-purple-500/20 text-purple-400 light:text-purple-600',
      'bg-orange-500/20 text-orange-400 light:text-orange-600',
      'bg-pink-500/20 text-pink-400 light:text-pink-600',
      'bg-cyan-500/20 text-cyan-400 light:text-cyan-600',
    ]
    return colors[Math.abs(hash) % colors.length]
  }

  const handleSave = async () => {
    if (!csrfToken) {
      setError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    setLoading(true)
    setError(null)

    const result = await updateUser(user.id, {
      full_name: editName,
      role: editRole,
    }, csrfToken)

    if (result.error) {
      setError(result.error)
    } else {
      setIsEditing(false)
    }
    setLoading(false)
  }

	const handleDelete = async () => {
		const confirmed = await confirm({
			title: 'Usunąć użytkownika?',
			message: `Czy na pewno chcesz TRWALE usunąć użytkownika ${user.email}? Tej akcji nie można cofnąć.`,
			confirmText: 'Usuń',
			variant: 'danger',
		})

		if (!confirmed) return

		setLoading(true)
		if (!csrfToken) {
			setError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
			setLoading(false)
			return
		}

		const result = await deleteUser(user.id, csrfToken)
		if (result.error) {
			setError(result.error)
		} else {
			router.push('/konta')
		}
		setLoading(false)
	}

	const handleChangeEmail = async () => {
		const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
		if (!newEmail || !emailRegex.test(newEmail)) {
			setEmailError('Podaj prawidłowy email')
			return
		}

		setLoading(true)
		setEmailError(null)
		if (!csrfToken) {
			setEmailError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
			setLoading(false)
			return
		}

		const result = await changeUserEmail(user.id, newEmail, csrfToken)
		if (result.error) {
			setEmailError(result.error)
		} else {
			setShowEmailModal(false)
			setNewEmail('')
			router.refresh()
		}
		setLoading(false)
	}

  return (
    <div className="min-h-screen bg-[#0a0a0a] light:bg-[#f5f5f5] transition-colors duration-300">
	      <MobileNav currentPath="/konta" showKonta={true} showAudit={canAccessAudit} showSettings={canAccessSettings} />
      
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
          <Link
            href="/konta"
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
          >
            Konta
          </Link>
	          {canAccessAudit && (
	            <Link
	              href="/audit"
	              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
	            >
	              Audit Log
	            </Link>
	          )}
	          {canAccessSettings && (
	            <Link
	              href="/settings"
	              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#444444] light:text-[#888888] hover:text-white light:hover:text-black transition-colors duration-300"
	            >
	              <Settings className="h-3 w-3" />
	              Ustawienia
	            </Link>
	          )}
        </div>
      </div>

      <div className="p-4 lg:p-8 pt-20 lg:pt-24">
        <div className="max-w-6xl mx-auto space-y-6 lg:space-y-8">
          <div className="flex items-center gap-4">
            <Link
              href="/konta"
              className="text-[#444444] hover:text-white light:hover:text-black transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-medium text-white light:text-black transition-colors duration-300">
                Szczegóły użytkownika
              </h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mt-1 transition-colors duration-300">
                {user.email}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)] xl:items-start">
            <div className="space-y-6">
              <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-colors duration-300">
                <div className="p-6 lg:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className={`w-16 h-16 rounded-lg ${getAvatarColor(user.full_name, user.email)} flex items-center justify-center text-xl font-medium`}>
                      {getInitials(user.full_name, user.email)}
                    </div>
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Imię i nazwisko"
                            className="w-full h-10 px-3 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.06] light:border-black/[0.06] text-white light:text-black text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                          />
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="w-full h-10 px-3 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.06] light:border-black/[0.06] text-white light:text-black text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                          >
                            <option value="client">Client</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        </div>
                      ) : (
                        <>
                          <p className="text-xl font-medium text-white light:text-black">
                            {user.full_name || user.email.split('@')[0]}
                          </p>
                          <p className="mt-1 text-xs text-[#666666] light:text-[#999999] font-mono">{user.email}</p>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleSave}
                            disabled={loading}
                            className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded transition-colors disabled:opacity-50"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="p-2 text-[#666666] hover:bg-white/[0.05] rounded transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        canEditUsers && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="p-2 text-[#666666] hover:text-white hover:bg-white/[0.05] rounded transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6 lg:p-8 border-t border-white/[0.06] light:border-black/[0.06]">
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 light:border-black/[0.06] light:bg-black/[0.02]">
                      <div className="w-10 h-10 rounded-md bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] flex items-center justify-center">
                        <Shield className="h-5 w-5 text-purple-400 light:text-purple-600" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999]">Rola</p>
                        <p className="text-sm text-white light:text-black">{user.role || 'client'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 light:border-black/[0.06] light:bg-black/[0.02]">
                      <div className="w-10 h-10 rounded-md bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-orange-400 light:text-orange-600" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999]">Data rejestracji</p>
                        <p className="text-xs text-white light:text-black font-mono">{formatDate(user.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 light:border-black/[0.06] light:bg-black/[0.02] sm:col-span-2 xl:col-span-1">
                      <div className="w-10 h-10 rounded-md bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] flex items-center justify-center">
                        {has2FA ? (
                          <Shield className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <ShieldOff className="h-5 w-5 text-[#666666]" />
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999]">2FA</p>
                        <p className={`text-sm ${has2FA ? 'text-emerald-400' : 'text-[#666666]'}`}>
                          {has2FA ? '2FA Aktywne' : 'Brak 2FA'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {recentActivity.length > 0 && (
                <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-colors duration-300">
                  <div className="p-6 lg:p-8">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mb-4">
                      Ostatnia aktywność
                    </p>
                    <div className="space-y-3">
                      {recentActivity.map((activity, index) => {
                        const activityIp = typeof activity.details?.ip === 'string' ? activity.details.ip : null
                        const activityMeta = getActivityMeta(activity.action)
                        const ActivityIcon = activityMeta.icon
                        return (
                          <div key={index} className="flex items-start justify-between gap-4 py-3 border-b border-white/[0.04] light:border-black/[0.04] last:border-0">
                            <div className="min-w-0 flex items-start gap-3">
                              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.03] light:border-black/[0.06] light:bg-black/[0.03]">
                                <ActivityIcon className={`h-3.5 w-3.5 ${activityMeta.iconClassName}`} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-white light:text-black">
                                  {activityMeta.label}
                                </p>
                                {activityIp && (
                                  <p className="mt-1 text-[10px] text-[#444444] light:text-[#888888] font-mono">
                                    IP: {activityIp}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="shrink-0 pt-0.5 text-[10px] text-[#444444] light:text-[#888888] font-mono text-right">
                              {formatDate(activity.created_at)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6 xl:sticky xl:top-24">
              <div className="border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-colors duration-300">
                <div className="p-6">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#444444] light:text-[#888888] mb-4">
                    Akcje
                  </p>
                  <div className="space-y-6">
					<div className="space-y-3">
						<p className="text-[10px] uppercase tracking-[0.24em] text-[#444444] light:text-[#888888]">Konto</p>
						<div className="space-y-2">
							<ActionRow
								icon={Mail}
								title="Zmień email"
                      description="Podmień adres logowania i kontaktowy przypisany do konta."
                      accentClassName="text-blue-400 light:text-blue-600"
                      action={
                        <button
                          onClick={() => setShowEmailModal(true)}
                          disabled={loading}
                          className="inline-flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-50 light:text-blue-600"
                        >
                          Edytuj
                        </button>
								}
							/>
						</div>
					</div>

                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[#444444] light:text-[#888888]">Dostęp</p>
                  <div className="space-y-2">
                    {canManagePermissions && (
                      <ActionRow
                        icon={Lock}
                        title="Pozwolenia"
                        description="Zarządzaj zakresem uprawnień i dostępem użytkownika."
                        accentClassName="text-cyan-400 light:text-cyan-600"
                        action={
                          <Link
                            href={`/konta/${user.id}/permissions`}
                            className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-cyan-400 transition-colors hover:bg-cyan-500/20 light:text-cyan-600"
                          >
                            Otwórz
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        }
                      />
                    )}

                    <ActionRow
                      icon={Activity}
                      title="Aktywność"
                      description="Podejrzyj pełną historię zdarzeń powiązanych z tym kontem."
                      accentClassName="text-cyan-400 light:text-cyan-600"
                      action={
                        <Link
                          href={`/konta/${user.id}/activity`}
                          className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-cyan-400 transition-colors hover:bg-cyan-500/20 light:text-cyan-600"
                        >
                          Otwórz
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      }
                    />
                  </div>
                </div>

                {canDeleteUsers && (
                  <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-red-400/80 light:text-red-600/80">Strefa ryzyka</p>
                    <ActionRow
                      icon={Trash2}
                      title="Usuń użytkownika"
                      description="Trwale usuń konto użytkownika i powiązane dane profilu."
                      accentClassName="text-red-400 light:text-red-600"
                      action={
                        <button
                          onClick={handleDelete}
                          disabled={loading}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50 light:text-red-600"
                        >
                          Usuń
                        </button>
                      }
                    />
                  </div>
                )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEmailModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEmailModal(false)}
          />
          
          <div className="relative bg-[#111111] light:bg-white border border-white/[0.06] light:border-black/[0.06] w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06] light:border-black/[0.06]">
              <h3 className="text-sm font-medium text-white light:text-black">
                Zmień email
              </h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-[#444444] hover:text-white light:hover:text-black transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {emailError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
                  <p className="text-xs text-red-400">{emailError}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-[#666666] light:text-[#999999] mb-2">
                  Aktualny email: <span className="text-white light:text-black font-mono">{user.email}</span>
                </p>
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] block mb-1">
                  Nowy email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full h-10 px-3 bg-white/[0.02] light:bg-black/[0.02] border border-white/[0.06] light:border-black/[0.06] text-white light:text-black text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="nowy@example.com"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-4 border-t border-white/[0.06] light:border-black/[0.06]">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] border border-white/[0.06] light:border-black/[0.06] hover:bg-white/[0.02] light:hover:bg-black/[0.02] transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleChangeEmail}
                disabled={loading || !newEmail}
                className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-blue-400 light:text-blue-600 bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Zmieniam...' : 'Zmień'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
