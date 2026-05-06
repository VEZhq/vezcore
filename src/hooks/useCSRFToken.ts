'use client'

import { useEffect, useState } from 'react'

export function useCSRFToken() {
	const [token, setToken] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	const refreshToken = async (): Promise<string | null> => {
		try {
			const response = await fetch('/api/csrf', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
				cache: 'no-store',
			})

			if (!response.ok) {
				throw new Error('Failed to fetch CSRF token')
			}

			const data = (await response.json()) as { token: string | null }
			const nextToken = data.token
			setToken(nextToken)
			return nextToken
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		refreshToken()
			.catch(() => {
				setIsLoading(false)
			})
	}, [])

	return { token, isLoading, refreshToken }
}
