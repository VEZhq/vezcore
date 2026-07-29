'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
	ArrowLeft, Mail, Shield, Calendar,
	Trash2, Edit, Save, X, Lock, ShieldOff, Activity,
	LogIn, LogOut, KeyRound, BadgeCheck, ShieldCheck, ShieldMinus, PencilLine, Circle,
	ChevronRight
} from 'lucide-react'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'
import { useConfirm } from '@/components/ConfirmDialog'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import { updateUser, deleteUser, changeUserEmail } from '@/lib/actions/users'
import { MobileNav } from '@/components/MobileNav'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

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
      return { label: 'Aktualizacja profilu', icon: PencilLine, iconClassName: 'text-[#d7bfd8] light:text-[#735671]' }
    case 'password_change':
      return { label: 'Zmiana hasła', icon: KeyRound, iconClassName: 'text-amber-400 light:text-amber-600' }
    case '2fa_verify':
      return { label: 'Weryfikacja 2FA', icon: BadgeCheck, iconClassName: 'text-[#d7bfd8] light:text-[#735671]' }
    case '2fa_enable':
      return { label: 'Włączenie 2FA', icon: ShieldCheck, iconClassName: 'text-emerald-400 light:text-emerald-600' }
    case '2fa_disable':
      return { label: 'Wyłączenie 2FA', icon: ShieldMinus, iconClassName: 'text-orange-400 light:text-orange-600' }
    default:
      return { label: action, icon: Circle, iconClassName: 'text-[#666666] light:text-[#999999]' }
  }
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
      'bg-[#d7bfd8]/16 text-[#d7bfd8] light:text-[#735671]',
      'bg-[#d7bfd8]/16 text-[#d7bfd8] light:text-[#735671]',
      'bg-orange-500/20 text-orange-400 light:text-orange-600',
      'bg-pink-500/20 text-pink-400 light:text-pink-600',
      'bg-[#c9d8c5]/16 text-[#c9d8c5] light:text-[#5f7358]',
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

  const accountRows = [
    { label: 'Adres e-mail', value: user.email, icon: Mail },
    { label: 'Rola', value: user.role || 'client', icon: Shield },
    { label: 'Utworzono', value: formatDate(user.created_at), icon: Calendar },
  ]

  return (
    <div className="min-h-screen bg-[#f1f3f2] text-[#252927] dark:bg-[#070807] dark:text-[#eef0ef]">
      <MobileNav currentPath="/konta" showKonta showAudit={canAccessAudit} showSettings={canAccessSettings} />

      <header className="border-b border-black/[0.07] bg-white/45 dark:border-white/[0.08] dark:bg-[#090a09]">
        <div className="mx-auto flex h-12 w-full max-w-[1180px] items-center px-4 sm:px-6">
          <Image src="/logo/vezcore_logo_black_full.svg" alt="VEZcore" width={104} height={42} className="h-auto w-[104px] dark:hidden" priority />
          <Image src="/logo/vezcore_logo_white_full.svg" alt="VEZcore" width={104} height={42} className="hidden h-auto w-[104px] dark:block" priority />
          <span className="mx-3 h-4 w-px bg-black/[0.08] dark:bg-white/[0.1]" />
          <span className="text-[10px] font-medium text-[#747b78] dark:text-[#8f9692]">Konto użytkownika</span>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <Link href="/konta" className="flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[10px] text-[#626966] hover:bg-black/[0.04] dark:text-[#aab0ad] dark:hover:bg-white/[0.07]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Lista kont
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
        {error && <div className="mb-5 border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[10px] text-red-600 dark:text-red-300">{error}</div>}

        <section className="border-b border-black/[0.1] pb-7 dark:border-white/[0.09]">
          <p className="text-[9px] font-semibold uppercase text-[#808783] dark:text-[#8f9692]">Użytkownik</p>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-[14px] text-[20px] font-semibold ${getAvatarColor(user.full_name, user.email)}`}>
              {getInitials(user.full_name, user.email)}
            </div>

            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="grid max-w-xl gap-2 sm:grid-cols-[minmax(0,1fr)_170px]">
                  <input
                    type="text"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    placeholder="Imię i nazwisko"
                    className="h-9 rounded-[8px] border border-black/[0.08] bg-white/65 px-3 text-[11px] outline-none focus:border-[#779182] dark:border-white/[0.09] dark:bg-white/[0.045]"
                  />
                  <select
                    value={editRole}
                    onChange={(event) => setEditRole(event.target.value)}
                    className="h-9 rounded-[8px] border border-black/[0.08] bg-white px-3 text-[11px] outline-none dark:border-white/[0.09] dark:bg-[#111311]"
                  >
                    <option value="client">Client</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              ) : (
                <>
                  <h1 className="truncate text-[27px] font-semibold leading-tight">{user.full_name || user.email.split('@')[0]}</h1>
                  <p className="mt-1.5 truncate font-mono text-[11px] text-[#747b78] dark:text-[#8d9490]">{user.email}</p>
                </>
              )}
            </div>

            <div className="flex items-center gap-1">
              {isEditing ? (
                <>
                  <button onClick={handleSave} disabled={loading} className="flex h-8 w-8 items-center justify-center rounded-[7px] text-emerald-600 hover:bg-emerald-500/[0.08] disabled:opacity-50" aria-label="Zapisz">
                    <Save className="h-4 w-4" />
                  </button>
                  <button onClick={() => setIsEditing(false)} className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#777e7a] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]" aria-label="Anuluj">
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : canEditUsers ? (
                <button onClick={() => setIsEditing(true)} className="flex h-8 items-center gap-1.5 rounded-[7px] px-2.5 text-[10px] text-[#68706c] hover:bg-black/[0.04] dark:text-[#a2a8a5] dark:hover:bg-white/[0.06]">
                  <Edit className="h-3.5 w-3.5" />
                  Edytuj
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 border-y border-black/[0.07] dark:border-white/[0.07] sm:grid-cols-4">
            {accountRows.map(({ label, value, icon: Icon }, index) => (
              <div key={label} className={`flex min-w-0 items-center gap-2.5 px-4 py-3 first:pl-0 ${index > 0 ? 'sm:border-l sm:border-black/[0.07] sm:dark:border-white/[0.07]' : ''}`}>
                <Icon className="h-3.5 w-3.5 shrink-0 text-[#8c938f]" />
                <div className="min-w-0">
                  <p className="text-[8px] uppercase text-[#989e9b]">{label}</p>
                  <p className="mt-0.5 truncate text-[10px] font-medium">{value}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2.5 px-4 py-3 sm:border-l sm:border-black/[0.07] sm:dark:border-white/[0.07]">
              {has2FA ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> : <ShieldOff className="h-3.5 w-3.5 text-amber-500" />}
              <div>
                <p className="text-[8px] uppercase text-[#989e9b]">2FA</p>
                <p className="mt-0.5 text-[10px] font-medium">{has2FA ? 'Aktywne' : 'Wyłączone'}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <div className="flex items-center justify-between border-b border-black/[0.09] pb-3 dark:border-white/[0.09]">
              <div>
                <h2 className="text-[14px] font-semibold">Ostatnia aktywność</h2>
                <p className="mt-1 text-[10px] text-[#858c88]">Najnowsze zdarzenia dotyczące tego konta</p>
              </div>
              <Link href={`/konta/${user.id}/activity`} className="flex h-8 items-center gap-1 text-[10px] text-[#68706c] hover:text-black dark:text-[#9ca29f] dark:hover:text-white">
                Pełna historia
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <p className="py-10 text-center text-[10px] text-[#929895]">Brak zapisanej aktywności</p>
            ) : (
              <div>
                {recentActivity.map((activity, index) => {
                  const activityIp = typeof activity.details?.ip === 'string' ? activity.details.ip : null
                  const activityMeta = getActivityMeta(activity.action)
                  const ActivityIcon = activityMeta.icon
                  return (
                    <div key={`${activity.created_at}-${index}`} className="grid grid-cols-[30px_minmax(0,1fr)_auto] gap-3 border-b border-black/[0.07] py-3.5 last:border-b-0 dark:border-white/[0.07]">
                      <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-black/[0.035] dark:bg-white/[0.05]">
                        <ActivityIcon className={`h-3.5 w-3.5 ${activityMeta.iconClassName}`} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium">{activityMeta.label}</p>
                        {activityIp && <p className="mt-1 font-mono text-[9px] text-[#8b918e]">IP {activityIp}</p>}
                      </div>
                      <time className="font-mono text-[9px] text-[#8b918e]">{formatDate(activity.created_at)}</time>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <aside>
            <div className="border-b border-black/[0.09] pb-3 dark:border-white/[0.09]">
              <h2 className="text-[14px] font-semibold">Zarządzanie kontem</h2>
              <p className="mt-1 text-[10px] text-[#858c88]">Dane logowania, dostęp i operacje administracyjne</p>
            </div>

            <button onClick={() => setShowEmailModal(true)} disabled={loading} className="flex w-full items-center gap-3 border-b border-black/[0.07] py-4 text-left dark:border-white/[0.07]">
              <Mail className="h-4 w-4 text-[#8b918e]" />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-medium">Zmień adres e-mail</span>
                <span className="mt-0.5 block text-[9px] text-[#8b918e]">Aktualizuje login i adres kontaktowy</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-[#989e9b]" />
            </button>

            {canManagePermissions && (
              <Link href={`/konta/${user.id}/permissions`} className="flex items-center gap-3 border-b border-black/[0.07] py-4 dark:border-white/[0.07]">
                <Lock className="h-4 w-4 text-[#768d80]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-medium">Uprawnienia</span>
                  <span className="mt-0.5 block text-[9px] text-[#8b918e]">Moduły i operacje dostępne dla użytkownika</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[#989e9b]" />
              </Link>
            )}

            <Link href={`/konta/${user.id}/activity`} className="flex items-center gap-3 border-b border-black/[0.07] py-4 dark:border-white/[0.07]">
              <Activity className="h-4 w-4 text-[#768d80]" />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-medium">Aktywność i sesje</span>
                <span className="mt-0.5 block text-[9px] text-[#8b918e]">Zdarzenia, urządzenia i historia adresów IP</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-[#989e9b]" />
            </Link>

            {canDeleteUsers && (
              <button onClick={handleDelete} disabled={loading} className="flex w-full items-center gap-3 py-4 text-left text-red-600 disabled:opacity-50 dark:text-red-400">
                <Trash2 className="h-4 w-4" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-medium">Usuń użytkownika</span>
                  <span className="mt-0.5 block text-[9px] text-red-500/70">Operacja jest trwała i nieodwracalna</span>
                </span>
              </button>
            )}
          </aside>
        </div>
      </main>

      {showEmailModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <button className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => setShowEmailModal(false)} aria-label="Zamknij" />
          <div className="relative w-full max-w-md overflow-hidden rounded-[12px] border border-black/[0.09] bg-[#f8faf8] shadow-2xl dark:border-white/[0.1] dark:bg-[#111311]">
            <div className="flex items-start justify-between border-b border-black/[0.08] p-5 dark:border-white/[0.08]">
              <div>
                <h3 className="text-[14px] font-semibold">Zmień adres e-mail</h3>
                <p className="mt-1 font-mono text-[9px] text-[#858c88]">{user.email}</p>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#7d8480] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]" aria-label="Zamknij">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              {emailError && <p className="mb-3 border border-red-500/20 bg-red-500/[0.06] p-3 text-[10px] text-red-600 dark:text-red-300">{emailError}</p>}
              <label className="block">
                <span className="mb-1.5 block text-[9px] uppercase text-[#7d8480]">Nowy adres e-mail</span>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  className="h-10 w-full rounded-[8px] border border-black/[0.08] bg-white px-3 text-[11px] outline-none focus:border-[#779182] dark:border-white/[0.09] dark:bg-white/[0.045]"
                  placeholder="nowy@example.com"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-black/[0.08] p-4 dark:border-white/[0.08]">
              <button onClick={() => setShowEmailModal(false)} className="h-9 rounded-[8px] px-3 text-[10px] text-[#727975] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">Anuluj</button>
              <button onClick={handleChangeEmail} disabled={loading || !newEmail} className="h-9 rounded-[8px] bg-[#26332c] px-4 text-[10px] font-medium text-white disabled:opacity-50 dark:bg-[#dce7e0] dark:text-[#172019]">
                {loading ? 'Zapisywanie...' : 'Zapisz zmianę'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
