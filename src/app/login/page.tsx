'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import dynamic from 'next/dynamic'

import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { login, verify2FALogin } from '@/lib/actions/auth'
import { useCSRFToken } from '@/hooks/useCSRFToken'

const WhiteSphere = dynamic(() => import('./WhiteSphere'), { ssr: false })

function DotMatrix() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(pointer: coarse)').matches
  })

  useEffect(() => {
    if (isMobile) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
		if (reducedMotion) {
			return () => window.removeEventListener('resize', resize)
		}

    const dotCount = 14
		const dots: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; pulse: number }[] = []

		for (let i = 0; i < dotCount; i++) {
			dots.push({
				x: Math.random() * canvas.width,
				y: Math.random() * canvas.height,
				vx: (Math.random() - 0.5) * 0.1,
				vy: (Math.random() - 0.5) * 0.1,
				size: Math.random() * 1.5 + 0.5,
				alpha: Math.random() * 0.06 + 0.02,
				pulse: Math.random() * Math.PI * 2,
			})
		}

		const animate = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height)
			const time = performance.now() / 1000

			for (let i = 0; i < dots.length; i++) {
				const dot = dots[i]
				dot.x += dot.vx
				dot.y += dot.vy
				dot.pulse += 0.008

				if (dot.x < 0 || dot.x > canvas.width) dot.vx *= -1
				if (dot.y < 0 || dot.y > canvas.height) dot.vy *= -1

				for (let j = i + 1; j < dots.length; j++) {
					const dx = dot.x - dots[j].x
					const dy = dot.y - dots[j].y
					const distSq = dx * dx + dy * dy

					if (distSq < 10000) {
						const dist = Math.sqrt(distSq)
						const alpha = (1 - dist / 100) * 0.012
						ctx.beginPath()
						ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
						ctx.lineWidth = 0.5
						ctx.moveTo(dot.x, dot.y)
						ctx.lineTo(dots[j].x, dots[j].y)
						ctx.stroke()
					}
				}

				const pulseAlpha = dot.alpha + Math.sin(time * 2 + i) * 0.02

				ctx.beginPath()
				ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2)
				ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha})`
				ctx.fill()
			}

			animationId = requestAnimationFrame(animate)
		}

		animate()

		return () => {
			window.removeEventListener('resize', resize)
			cancelAnimationFrame(animationId)
		}
	}, [isMobile])

	return isMobile ? null : <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
}

function LoginPageContent() {
	const searchParams = useSearchParams()
	const initialReasonError = searchParams.get('reason') === '2fa_required'
		? 'Musisz zweryfikować 2FA. Zaloguj się ponownie.'
		: null
	const [error, setError] = useState<string | null>(() => initialReasonError)
	const [isLoading, setIsLoading] = useState(false)
	const [requires2FA, setRequires2FA] = useState(false)
	const [factorId, setFactorId] = useState<string | null>(null)
	const [challengeId, setChallengeId] = useState<string | null>(null)
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [twoFACode, setTwoFACode] = useState('')
	const { token: csrfToken } = useCSRFToken()

	async function handleFormSubmit() {
		if (!csrfToken) {
			setError('Błąd bezpieczeństwa. Odśwież stronę.')
			return
		}
		if (isLoading) return

		const emailVal = email.trim()
		const passwordVal = password

		if (!emailVal || !passwordVal) {
			setError('Wpisz email i hasło.')
			return
		}

		setIsLoading(true)
		setError(null)

		try {
			const formData = new FormData()
			formData.append('email', emailVal)
			formData.append('password', passwordVal)
			formData.append('csrfToken', csrfToken)

			const result = await login(formData)

			if (result?.error) {
				setError(result.error)
				setIsLoading(false)
			} else if (result?.requires2FA) {
				setRequires2FA(true)
				setFactorId(result.factorId || null)
				setChallengeId(result.challengeId || null)
				setIsLoading(false)
			} else {
				window.location.href = '/dashboard'
			}
		} catch {
      console.error('Login error')
			setError('Błąd połączenia. Spróbuj ponownie.')
			setIsLoading(false)
		}
	}


	async function handleVerify2FA() {
		if (!factorId || !challengeId) {
			setError('Błąd sesji 2FA. Zaloguj się ponownie.')
			return
		}

		if (!csrfToken) {
			setError('Błąd bezpieczeństwa. Odśwież stronę.')
			return
		}

		if (twoFACode.length !== 6) return

		setIsLoading(true)
		setError(null)

		try {
			const result = await verify2FALogin(factorId, challengeId, twoFACode, csrfToken)

			if (result?.error) {
				setError(result.error)
				setIsLoading(false)
				setTwoFACode('')
			} else if (result?.success) {
				window.location.href = '/dashboard'
			}
		} catch {
      console.error('2FA verification error')
			setError('Błąd połączenia z serwerem. Spróbuj ponownie.')
			setIsLoading(false)
			setTwoFACode('')
		}
	}


	function handleCancel2FA() {
		setRequires2FA(false)
		setFactorId(null)
		setChallengeId(null)
		setTwoFACode('')
		setError(null)
	}

	if (requires2FA) {
		return (
			<div className="min-h-screen flex relative overflow-hidden">
				<DotMatrix />
				<div className="flex-1 relative bg-black flex items-center justify-center p-4 sm:p-8 lg:p-16 min-h-screen">
					<div className="w-full max-w-sm space-y-8 sm:space-y-12 relative z-10">
						<div className="space-y-6">
							<Image
								src="/logo/vezcore_logo_white_full.svg"
								alt="vezCore"
								width={140}
								height={40}
								className="h-10 w-auto"
								style={{ width: 'auto' }}
								priority
							/>
							<div className="space-y-2">
								<h1 className="text-3xl font-medium tracking-tight text-white">
									Weryfikacja 2FA
								</h1>
								<p className="text-sm text-white/50">
									Wpisz kod z aplikacji Authenticator
								</p>
							</div>
						</div>

					<div className="space-y-6">
						<div className="space-y-2">
							<label htmlFor="2fa-code" className="text-xs uppercase tracking-wider font-medium text-white/60 block">
								Kod 2FA
							</label>
							<input
								id="2fa-code"
								type="text"
								inputMode="numeric"
								pattern="[0-9]*"
								value={twoFACode}
								onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
								maxLength={6}
								placeholder="000000"
								disabled={isLoading}
								autoComplete="one-time-code"
								className="h-16 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-white placeholder:text-white/20 text-center tracking-widest text-2xl outline-none focus:border-white/30 disabled:opacity-50"
								style={{ minHeight: '64px' }}
							/>
						</div>

						{error && (
							<div className="p-4 rounded-lg border text-sm bg-red-500/10 border-red-500/30 text-red-400">
								{error}
							</div>
						)}

						<button
							type="button"
							onClick={() => handleVerify2FA()}
							onTouchEnd={(e) => { e.preventDefault(); handleVerify2FA() }}
							disabled={isLoading || twoFACode.length !== 6}
							className="w-full h-16 text-base font-medium tracking-wider uppercase bg-white text-black hover:bg-white/90 active:bg-gray-200 transition-all rounded-lg touch-manipulation"
							style={{ minHeight: '64px' }}
						>
							{isLoading ? 'Weryfikacja...' : 'Zweryfikuj'}
						</button>

						<button
							type="button"
							onClick={handleCancel2FA}
							className="w-full text-center text-xs text-white/50 hover:text-white transition-colors py-2"
						>
							Anuluj i wróć do logowania
						</button>
					</div>
					</div>
				</div>

				<div className="hidden lg:block lg:w-1/2 relative bg-white overflow-hidden">
					<WhiteSphere />
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen flex relative overflow-hidden">
			<DotMatrix />
			<div className="flex-1 relative bg-black flex items-center justify-center p-4 sm:p-8 lg:p-16 min-h-screen">
				<div className="w-full max-w-sm space-y-8 sm:space-y-12 relative z-10">
					<div className="space-y-6">
						<Image
							src="/logo/vezcore_logo_white_full.svg"
							alt="vezCore"
							width={140}
							height={40}
							className="h-10 w-auto"
							style={{ width: 'auto' }}
							priority
						/>
						<div className="space-y-2">
							<h1 className="text-3xl font-medium tracking-tight text-white">
								Zaloguj się
							</h1>
							<p className="text-sm text-white/50">
								Uzyskaj dostęp do panelu zarządzania ekosystemem
							</p>
						</div>
					</div>

				<div className="space-y-6">
					<div className="space-y-5">
						<div className="space-y-2">
						<label htmlFor="email" className="text-xs uppercase tracking-wider font-medium text-white/60 block">
							Email
						</label>
						<input
							id="email"
							name="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="twoj@email.pl"
							disabled={isLoading}
							autoComplete="email"
							autoCapitalize="none"
							autoCorrect="off"
							spellCheck={false}
							className="h-16 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-lg text-white placeholder:text-white/20 outline-none focus:border-white/30 disabled:opacity-50"
							style={{ minHeight: '64px' }}
						/>
					</div>

					<div className="space-y-2">
						<label htmlFor="password" className="text-xs uppercase tracking-wider font-medium text-white/60 block">
							Hasło
						</label>
						<input
							id="password"
							name="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="••••••••"
							disabled={isLoading}
							autoComplete="current-password"
							className="h-16 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-lg text-white placeholder:text-white/20 outline-none focus:border-white/30 disabled:opacity-50"
							style={{ minHeight: '64px' }}
						/>
					</div>
					</div>

					{error && (
						<div className="p-4 rounded-lg border text-sm bg-red-500/10 border-red-500/30 text-red-400">
							{error}
						</div>
					)}

				<button
					type="button"
					onClick={() => handleFormSubmit()}
					onTouchEnd={(e) => { e.preventDefault(); handleFormSubmit() }}
					disabled={isLoading}
					className="w-full h-16 text-base font-medium tracking-wider uppercase bg-white text-black hover:bg-white/90 active:bg-gray-200 transition-all rounded-lg touch-manipulation"
					style={{ minHeight: '64px' }}
				>
					{isLoading ? 'Logowanie...' : 'Zaloguj się'}
				</button>
				</div>
				</div>
			</div>

			<div className="hidden lg:block lg:w-1/2 relative bg-white overflow-hidden">
				<WhiteSphere />
			</div>
		</div>
	)
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LoginPageContent />
    </Suspense>
  )
}
