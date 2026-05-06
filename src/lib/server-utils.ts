import { headers } from 'next/headers'

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/
const IPV6_REGEX = /^[0-9a-f:]+$/i
const TRUSTED_IP_HEADERS = ['cf-connecting-ip', 'x-vercel-forwarded-for', 'x-real-ip'] as const

type HeaderReader = Pick<Headers, 'get'>

function stripIpDecoration(value: string): string {
	const trimmed = value.trim()

	if (!trimmed) {
		return ''
	}

	if (trimmed.startsWith('[')) {
		const endIndex = trimmed.indexOf(']')
		return endIndex > 0 ? trimmed.slice(1, endIndex) : trimmed.slice(1)
	}

	const lastColonIndex = trimmed.lastIndexOf(':')
	if (lastColonIndex > -1 && trimmed.indexOf(':') === lastColonIndex) {
		const port = trimmed.slice(lastColonIndex + 1)
		if (/^\d+$/.test(port)) {
			return trimmed.slice(0, lastColonIndex)
		}
	}

	return trimmed
}

function normalizeIpCandidate(value: string | null): string | null {
	if (!value) {
		return null
	}

	const normalized = stripIpDecoration(value).slice(0, 128)
	if (!normalized) {
		return null
	}

	if (IPV4_REGEX.test(normalized)) {
		return normalized
	}

	if (normalized.includes(':') && IPV6_REGEX.test(normalized)) {
		return normalized
	}

	return null
}

export function resolveClientIpFromHeaders(headersList: HeaderReader): string {
	for (const headerName of TRUSTED_IP_HEADERS) {
		const ip = normalizeIpCandidate(headersList.get(headerName))
		if (ip) {
			return ip
		}
	}

	const forwardedIps = (headersList.get('x-forwarded-for') ?? '')
		.split(',')
		.map(part => normalizeIpCandidate(part))
		.filter((value): value is string => Boolean(value))

	if (forwardedIps.length > 0) {
		return forwardedIps[forwardedIps.length - 1]
	}

	return 'unknown'
}

export async function getClientIP(): Promise<string> {
	const headersList = await headers()
	return resolveClientIpFromHeaders(headersList)
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateUUID(value: string): boolean {
	return UUID_REGEX.test(value)
}
