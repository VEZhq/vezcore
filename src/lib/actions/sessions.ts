'use server'

import { createActionClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { isAdminRole } from '@/lib/roles'
import { revalidatePath } from 'next/cache'
import { ERRORS } from '@/lib/constants'
import { validateCSRFToken } from '@/lib/actions/csrf'
import { validateUUID } from '@/lib/server-utils'

export interface SessionInfo {
	id: string
	ip: string
	user_agent: string
	created_at: string
	updated_at: string
	aal: string
	is_current: boolean
}

export interface GlobalSessionInfo extends SessionInfo {
	user_email: string
	user_id: string
}

export async function getActiveSessions(): Promise<{ sessions: SessionInfo[]; error?: string }> {
	const supabase = await createActionClient()

	const { data: { user } } = await supabase.auth.getUser()
	if (!user) return { sessions: [] }

	const { data, error } = await supabase.rpc('get_user_sessions', { target_user_id: user.id })

	if (error) {
		return { sessions: [], error: 'Nie udało się pobrać sesji' }
	}

	const rows = (data ?? []) as Array<{
		id: string
		ip: string | null
		user_agent: string | null
		created_at: string
		updated_at: string
		aal: string | null
	}>

	const sessions: SessionInfo[] = rows.map((s, index) => ({
		id: s.id,
		ip: s.ip ?? 'unknown',
		user_agent: s.user_agent ?? 'unknown',
		created_at: s.created_at,
		updated_at: s.updated_at,
		aal: s.aal ?? 'aal1',
		is_current: index === 0,
	}))

	return { sessions }
}

export async function revokeSession(sessionId: string, csrfToken: string): Promise<{ success?: boolean; error?: string }> {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token CSRF' }
  }

  if (!validateUUID(sessionId)) {
    return { error: 'Nieprawidłowy identyfikator sesji' }
  }

	const supabase = await createActionClient()

	const { data: { user } } = await supabase.auth.getUser()
	if (!user) return { error: 'Nie jesteś zalogowany' }

	const { data: deleted, error } = await supabase.rpc('delete_user_session', {
		session_id: sessionId,
		owner_user_id: user.id,
	})

	if (error) {
		return { error: 'Nie udało się odwołać sesji' }
	}

	if (!deleted) {
		return { error: 'Sesja nie istnieje lub nie masz do niej dostępu' }
	}

	await supabase
		.from('audit_log')
		.insert({
			user_id: user.id,
			action: 'session_revoke',
			entity_type: 'session',
			entity_id: sessionId,
			details: { revoked_by: user.email },
		})

	revalidatePath('/profile')
	return { success: true }
}

export async function revokeAllSessions(csrfToken: string): Promise<{ success?: boolean; error?: string }> {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token CSRF' }
  }

	const supabase = await createActionClient()

	const { data: { user } } = await supabase.auth.getUser()
	if (!user) return { error: 'Nie jesteś zalogowany' }

	await supabase.auth.signOut({ scope: 'global' })

	await supabase
		.from('audit_log')
		.insert({
			user_id: user.id,
			action: 'all_sessions_revoked',
			entity_type: 'session',
			entity_id: user.id,
			details: { triggered_by: user.email },
		})

	revalidatePath('/profile')
	return { success: true }
}

export async function getAllUserSessions(): Promise<{ sessions: GlobalSessionInfo[]; error?: string }> {
	const supabase = await createActionClient()

	const { data: { user } } = await supabase.auth.getUser()
	if (!user) {
		return { sessions: [], error: ERRORS.NOT_LOGGED_IN }
	}

	const { data: callerProfile } = await supabase
		.from('profiles')
		.select('role, tenant_id')
		.eq('id', user.id)
		.single()

	if (!isAdminRole(callerProfile?.role)) {
		return { sessions: [], error: ERRORS.NO_PERMISSIONS }
	}

	const adminClient = getAdminClient()

	const { data: users, error: usersError } = await adminClient.auth.admin.listUsers()

	if (usersError) {
		return { sessions: [], error: 'Nie udało się pobrać listy użytkowników' }
	}

	const { data: managedProfiles } = await supabase
		.from('profiles')
		.select('id, tenant_id')
		.in(
			'id',
			users.users.map((u) => u.id)
		)

	const callerTenantId = callerProfile?.tenant_id
	const tenantUserIds = new Set(
		(managedProfiles || [])
			.filter((p) => callerProfile?.role === 'super_admin' || p.tenant_id === callerTenantId)
			.map((p) => p.id)
	)

	const userMap = new Map<string, string>()
	users.users.forEach((u) => {
		userMap.set(u.id, u.email || 'unknown')
	})

	const sessionPromises = users.users
		.filter((u) => tenantUserIds.has(u.id))
		.slice(0, 50)
		.map(async (u) => {
			const { data } = await supabase.rpc('get_user_sessions', { target_user_id: u.id })
			return { userId: u.id, sessions: data ?? [] }
		})

	const results = await Promise.all(sessionPromises)

	const globalSessions: GlobalSessionInfo[] = []

	results.forEach(({ userId, sessions }) => {
		const userEmail = userMap.get(userId) || 'unknown'
		;(sessions as Array<{
			id: string
			ip: string | null
			user_agent: string | null
			created_at: string
			updated_at: string
			aal: string | null
		}>).forEach((s) => {
			globalSessions.push({
				id: s.id,
				ip: s.ip ?? 'unknown',
				user_agent: s.user_agent ?? 'unknown',
				created_at: s.created_at,
				updated_at: s.updated_at,
				aal: s.aal ?? 'aal1',
				is_current: false,
				user_email: userEmail,
				user_id: userId,
			})
		})
	})

	globalSessions.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

	const limitedSessions = globalSessions.slice(0, 50)

	await supabase.from('audit_log').insert({
		user_id: user.id,
		action: 'admin_sessions_view',
		entity_type: 'session',
	})

	return { sessions: limitedSessions }
}

export async function adminRevokeSession(
	sessionId: string,
	targetUserId: string,
	csrfToken: string,
): Promise<{ success?: boolean; error?: string }> {
	if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
		return { error: 'Nieprawidłowy token CSRF' }
	}

	const supabase = await createActionClient()

	const { data: { user } } = await supabase.auth.getUser()
	if (!user) {
		return { error: ERRORS.NOT_LOGGED_IN }
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single()

	if (!isAdminRole(profile?.role)) {
		return { error: ERRORS.NO_PERMISSIONS }
	}

	const { data: targetProfile } = await supabase
		.from('profiles')
		.select('email')
		.eq('id', targetUserId)
		.single()

	const targetEmail = targetProfile?.email || 'unknown'

	const { data: deleted, error } = await supabase.rpc('delete_user_session', {
		session_id: sessionId,
		owner_user_id: targetUserId,
	})

	if (error) {
		return { error: 'Nie udało się odwołać sesji' }
	}

	if (!deleted) {
		return { error: 'Sesja nie istnieje' }
	}

	await supabase.from('audit_log').insert({
		user_id: user.id,
		action: 'admin_session_revoke',
		entity_type: 'session',
		entity_id: sessionId,
		details: { target_user_id: targetUserId, target_email: targetEmail },
	})

	revalidatePath('/security')
	return { success: true }
}
