'use server'

import { createActionClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendAuditLog } from '@/lib/discord'
import { getClientIP } from '@/lib/server-utils'
import { logError } from '@/lib/logger'
import { isAdminRole } from '@/lib/roles'
import { ERRORS } from '@/lib/constants'
import { validateCSRFToken } from '@/lib/actions/csrf'

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
const IPV6_REGEX = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){0,6}::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$/

function isValidIP(ip: string): boolean {
	return IPV4_REGEX.test(ip) || IPV6_REGEX.test(ip)
}

export interface IPEntry {
	id: string
	ip: string
	type: 'whitelist' | 'blacklist'
	reason: string | null
	created_at: string
	expires_at: string | null
}

async function requireAdmin(supabase: Awaited<ReturnType<typeof createActionClient>>): Promise<
	{ error: string } | { userId: string; tenantId: string | null }
> {
	const { data: { user } } = await supabase.auth.getUser()
	if (!user) return { error: ERRORS.NOT_LOGGED_IN }

	const { data: profile } = await supabase
		.from('profiles')
		.select('role, tenant_id')
		.eq('id', user.id)
		.single()

	if (!isAdminRole(profile?.role)) return { error: ERRORS.NO_PERMISSIONS }

	return { userId: user.id, tenantId: (profile?.tenant_id ?? null) as string | null }
}

export async function getIPLists(): Promise<{ whitelist: IPEntry[]; blacklist: IPEntry[] }> {
	const supabase = await createActionClient()
	const auth = await requireAdmin(supabase)
	if ('error' in auth) return { whitelist: [], blacklist: [] }

	const { data: entries } = await supabase
		.from('ip_lists')
		.select('id, ip, type, reason, created_at, expires_at')
		.order('created_at', { ascending: false })

	const whitelist = (entries || []).filter(e => e.type === 'whitelist')
	const blacklist = (entries || []).filter(e => e.type === 'blacklist')

	return { whitelist, blacklist }
}

export async function addToIPList(
	ip: string,
	type: 'whitelist' | 'blacklist',
	csrfToken: string,
	reason?: string,
): Promise<{ error: string } | { success: true }> {
	if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
		return { error: 'Nieprawidłowy token CSRF' }
	}

	const supabase = await createActionClient()
	const auth = await requireAdmin(supabase)
	if ('error' in auth) return auth

	if (!isValidIP(ip)) {
		return { error: 'Nieprawidłowy format adresu IP' }
	}

	const { error } = await supabase
		.from('ip_lists')
		.insert({
			ip,
			type,
			reason: reason || null,
			created_by: auth.userId,
		})

	if (error) {
		return { error: 'Nie udało się dodać IP' }
	}

	const clientIp = await getClientIP()

	await supabase
		.from('audit_log')
		.insert({
			user_id: auth.userId,
			action: type === 'blacklist' ? 'ip_blacklist_add' : 'ip_whitelist_add',
			entity_type: 'ip_list',
			entity_id: ip,
			details: {
				ip: clientIp,
				target_ip: ip,
				type,
				reason: reason || null,
			}
		})

  sendAuditLog(type === 'blacklist' ? 'ip_blacklist_add' : 'ip_whitelist_add', {
		target_ip: ip,
		type,
		reason: reason || null,
	}).catch(() => logError('Async operation failed', new Error('Async operation failed')))

	revalidatePath('/security')
	return { success: true as const }
}

export async function removeFromIPList(
	id: string,
	csrfToken: string,
): Promise<{ error: string } | { success: true }> {
	if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
		return { error: 'Nieprawidłowy token CSRF' }
	}

	const supabase = await createActionClient()
	const auth = await requireAdmin(supabase)
	if ('error' in auth) return auth

	const { data: entry } = await supabase
		.from('ip_lists')
		.select('ip, type')
		.eq('id', id)
		.single()

	const { error } = await supabase
		.from('ip_lists')
		.delete()
		.eq('id', id)

	if (error) {
		return { error: 'Nie udało się usunąć IP' }
	}

	if (entry) {
		const clientIp = await getClientIP()

		await supabase
			.from('audit_log')
			.insert({
				user_id: auth.userId,
				action: entry.type === 'blacklist' ? 'ip_blacklist_remove' : 'ip_whitelist_remove',
				entity_type: 'ip_list',
				entity_id: entry.ip,
				details: {
					ip: clientIp,
					target_ip: entry.ip,
					type: entry.type,
				}
			})

		sendAuditLog(entry.type === 'blacklist' ? 'ip_blacklist_remove' : 'ip_whitelist_remove', {
			target_ip: entry.ip,
			type: entry.type,
		}).catch(() => logError('Async operation failed', new Error('Async operation failed')))
	}

	revalidatePath('/security')
	return { success: true as const }
}


