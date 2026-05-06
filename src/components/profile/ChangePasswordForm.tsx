'use client'

import { useState, useEffect } from 'react'
import { changePassword } from '@/lib/actions/profile'
import { get2FAFactors } from '@/lib/actions/twoFactor'
import { Lock, Eye, EyeOff, Shield } from 'lucide-react'
import { useCSRFToken } from '@/hooks/useCSRFToken'

export function ChangePasswordForm() {
	const { refreshToken } = useCSRFToken()
  const [isOpen, setIsOpen] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [has2FA, setHas2FA] = useState(false)

  useEffect(() => {
    async function check2FA() {
      const { factors } = await get2FAFactors()
      setHas2FA(factors.length > 0)
    }
    check2FA()
  }, [])

	async function handleSubmit(formData: FormData) {
		setError(null)
		setSuccess(false)

		const csrfToken = await refreshToken()
		if (!csrfToken) {
      setError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    formData.set('csrfToken', csrfToken)

    const result = await changePassword(formData)

    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setIsOpen(false)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 text-emerald-500 text-xs">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Hasło zostało zmienione
      </div>
    )
  }

  if (isOpen) {
    return (
      <form action={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="currentPassword" className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999] block mb-1">
            Aktualne hasło
          </label>
          <div className="relative">
            <input
              id="currentPassword"
              name="currentPassword"
              type={showCurrentPassword ? 'text' : 'password'}
              required
              className="w-full h-10 px-3 pr-10 bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] rounded-md text-sm text-white light:text-black font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444444] hover:text-white transition-colors"
            >
              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="newPassword" className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999] block mb-1">
            Nowe hasło
          </label>
          <div className="relative">
            <input
              id="newPassword"
              name="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              required
              minLength={6}
              className="w-full h-10 px-3 pr-10 bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] rounded-md text-sm text-white light:text-black font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444444] hover:text-white transition-colors"
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999] block mb-1">
            Potwierdź nowe hasło
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            className="w-full h-10 px-3 bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] rounded-md text-sm text-white light:text-black font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
            placeholder="••••••••"
          />
        </div>

        {has2FA && (
          <div>
            <label htmlFor="code2FA" className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999] block mb-1 flex items-center gap-2">
              <Shield className="h-3 w-3" />
              Kod 2FA
            </label>
            <input
              id="code2FA"
              name="code2FA"
              type="text"
              required
              pattern="[0-9]{6}"
              maxLength={6}
              className="w-full h-10 px-3 bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] rounded-md text-sm text-white light:text-black font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
              placeholder="123456"
            />
            <p className="text-[10px] text-[#444444] light:text-[#888888] mt-1">
              Wprowadź kod z aplikacji uwierzytelniającej
            </p>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-white bg-emerald-500/20 border border-emerald-500/30 rounded-md hover:bg-emerald-500/30 transition-colors"
          >
            <Lock className="h-3 w-3" />
            Zmień hasło
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#666666] bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] rounded-md hover:bg-white/[0.06] light:hover:bg-black/[0.06] transition-colors"
          >
            Anuluj
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-[#999999] light:text-[#666666]">Zabezpiecz swoje konto nowym hasłem</p>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999] bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] rounded-md hover:bg-white/[0.06] light:hover:bg-black/[0.06] hover:text-white light:hover:text-black transition-colors"
      >
        <Lock className="h-3 w-3" />
        Zmień hasło
      </button>
    </div>
  )
}
