'use client'

import { useState } from 'react'
import Image from 'next/image'
import { enroll2FA, verify2FA, unenroll2FA } from '@/lib/actions/twoFactor'
import { Shield, Check, X, Copy } from 'lucide-react'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import { useRouter } from 'next/navigation'

interface TwoFactorFormProps {
  isEnabled: boolean
  factorId?: string
}

export function TwoFactorForm({ isEnabled, factorId }: TwoFactorFormProps) {
	const router = useRouter()
	const { refreshToken } = useCSRFToken()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [newFactorId, setNewFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [password, setPassword] = useState('')
  const [disablePassword, setDisablePassword] = useState('')
  const [disableError, setDisableError] = useState<string | null>(null)

	async function handleEnroll() {
		const csrfToken = await refreshToken()
		if (!csrfToken) {
      setError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await enroll2FA(csrfToken, password)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    setQrCode(result.qr_code?.trimEnd() || null)
    setSecret(result.secret || null)
    setNewFactorId(result.id || null)
    setIsLoading(false)
  }

	async function handleVerify() {
		if (!newFactorId) return
		const csrfToken = await refreshToken()
		if (!csrfToken) {
      setError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await verify2FA(newFactorId, code, csrfToken)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    setSuccess(true)
    setIsOpen(false)
    setIsLoading(false)
    router.refresh()
  }

  function copySecret() {
    if (secret) {
      navigator.clipboard.writeText(secret)
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 text-emerald-500 text-xs">
        <Check className="h-4 w-4" />
        2FA włączone
      </div>
    )
  }

  if (isEnabled) {
    if (showDisableConfirm) {
      return (
        <div className="space-y-4">
          <p className="text-xs text-red-400">
            ⚠️ Wyłączenie 2FA zmniejszy bezpieczeństwo Twojego konta
          </p>
          
          <div>
            <label htmlFor="disable-2fa-code" className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999] block mb-1">
              Wpisz kod z aplikacji Authenticator
            </label>
            <input
              id="disable-2fa-code"
              type="text"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              maxLength={6}
              className="w-full h-10 px-3 bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] rounded-md text-sm text-white light:text-black font-mono text-center tracking-widest focus:outline-none focus:border-red-500/50 transition-colors"
              placeholder="000000"
            />
          </div>

          <div>
            <label htmlFor="disable-2fa-password" className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999] block mb-1">
              Aktualne hasło
            </label>
            <input
              id="disable-2fa-password"
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              autoComplete="current-password"
              className="w-full h-10 px-3 bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] rounded-md text-sm text-white light:text-black focus:outline-none focus:border-red-500/50 transition-colors"
            />
          </div>

          {disableError && (
            <p className="text-xs text-red-500">{disableError}</p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
				if (!factorId) return
				const csrfToken = await refreshToken()
				if (!csrfToken) {
                  setDisableError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
                  return
                }
                setIsLoading(true)
                setDisableError(null)
                const result = await unenroll2FA(factorId, disableCode, disablePassword, csrfToken)
                if (result.error) {
                  setDisableError(result.error)
                  setIsLoading(false)
                } else {
                  setSuccess(false)
                  setShowDisableConfirm(false)
                  setIsLoading(false)
                  router.refresh()
                }
              }}
              disabled={isLoading || disableCode.length !== 6 || !disablePassword}
              className="flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-red-400 bg-red-500/20 border border-red-500/30 rounded-md hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              <X className="h-3 w-3" />
              {isLoading ? 'Wyłączanie...' : 'Wyłącz 2FA'}
            </button>
            <button
              onClick={() => {
                setShowDisableConfirm(false)
                setDisableCode('')
                setDisablePassword('')
                setDisableError(null)
              }}
              className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#666666] bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] rounded-md hover:bg-white/[0.06] light:hover:bg-black/[0.06] transition-colors"
            >
              Anuluj
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-500" />
          <span className="text-xs text-[#999999] light:text-[#666666]">2FA włączone</span>
        </div>
        <button
          onClick={() => setShowDisableConfirm(true)}
          className="flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-red-400 light:text-red-600 bg-red-500/[0.05] light:bg-red-500/[0.08] border border-red-500/20 light:border-red-500/30 rounded-md hover:bg-red-500/10 light:hover:bg-red-500/15 transition-colors"
        >
          <X className="h-3 w-3" />
          Wyłącz 2FA
        </button>
      </div>
    )
  }

  if (isOpen) {
    if (qrCode) {
      return (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999] mb-2">
              Zeskanuj kod QR w aplikacji Authenticator
            </p>
            <div className="inline-block p-4 bg-white rounded-lg">
              <Image src={qrCode} alt="QR Code" width={160} height={160} className="w-40 h-40" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999]">
              Lub wpisz sekret ręcznie:
            </p>
            <button
              onClick={copySecret}
              className="text-[10px] text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
          <p className="text-xs text-white light:text-black font-mono break-all bg-white/[0.03] light:bg-black/[0.03] p-2 rounded">
            {secret}
          </p>

          <div>
            <label htmlFor="2fa-code" className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999] block mb-1">
              Wpisz kod z aplikacji
            </label>
            <input
              id="2fa-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              className="w-full h-10 px-3 bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] rounded-md text-sm text-white light:text-black font-mono text-center tracking-widest focus:outline-none focus:border-emerald-500/50 transition-colors"
              placeholder="000000"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleVerify}
              disabled={isLoading || code.length !== 6}
              className="flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-white bg-emerald-500/20 border border-emerald-500/30 rounded-md hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
            >
              <Check className="h-3 w-3" />
              {isLoading ? 'Weryfikacja...' : 'Weryfikuj'}
            </button>
            <button
              onClick={() => {
                setIsOpen(false)
                setQrCode(null)
                setSecret(null)
                setNewFactorId(null)
                setCode('')
                setError(null)
              }}
              className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#666666] bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] rounded-md hover:bg-white/[0.06] light:hover:bg-black/[0.06] transition-colors"
            >
              Anuluj
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <p className="text-xs text-[#999999] light:text-[#666666]">
          Dwuskładnikowe uwierzytelnianie dodaje dodatkową warstwę bezpieczeństwa do Twojego konta.
        </p>

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <div>
          <label htmlFor="enable-2fa-password" className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999] block mb-1">
            Aktualne hasło
          </label>
          <input
            id="enable-2fa-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full h-10 px-3 bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] rounded-md text-sm text-white light:text-black focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleEnroll}
            disabled={isLoading || !password}
            className="flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-white bg-emerald-500/20 border border-emerald-500/30 rounded-md hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
          >
            <Shield className="h-3 w-3" />
            {isLoading ? 'Generowanie...' : 'Włącz 2FA'}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#666666] bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] rounded-md hover:bg-white/[0.06] light:hover:bg-black/[0.06] transition-colors"
          >
            Anuluj
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999]">
          Dwuskładnikowe uwierzytelnianie
        </p>
        <p className="text-xs text-[#999999] light:text-[#666666]">Dodatkowa ochrona konta</p>
      </div>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-[#666666] light:text-[#999999] bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] rounded-md hover:bg-white/[0.06] light:hover:bg-black/[0.06] hover:text-white light:hover:text-black transition-colors"
      >
        <Shield className="h-3 w-3" />
        Konfiguruj
      </button>
    </div>
  )
}
