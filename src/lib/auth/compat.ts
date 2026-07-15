import 'server-only'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

type BetterAuthUser = {
  id: string
  email: string
  name: string
  image?: string | null
  createdAt: Date
  updatedAt: Date
  emailVerified: boolean
  role?: string | null
  twoFactorEnabled?: boolean | null
}

export interface AuthUser {
  id: string
  email: string
  created_at: string
  updated_at: string
  last_sign_in_at?: string
  email_confirmed_at?: string
  user_metadata: { full_name?: string; name?: string; avatar_url?: string }
  app_metadata: { role?: string }
  two_factor_enabled: boolean
}

function mapUser(user: BetterAuthUser, lastSignInAt?: Date | string): AuthUser {
  const createdAt = new Date(user.createdAt).toISOString()
  return {
    id: user.id,
    email: user.email,
    created_at: createdAt,
    updated_at: new Date(user.updatedAt).toISOString(),
    last_sign_in_at: lastSignInAt ? new Date(lastSignInAt).toISOString() : undefined,
    email_confirmed_at: user.emailVerified ? createdAt : undefined,
    user_metadata: {
      full_name: user.name || undefined,
      name: user.name || undefined,
      avatar_url: user.image || undefined,
    },
    app_metadata: { role: user.role || undefined },
    two_factor_enabled: Boolean(user.twoFactorEnabled),
  }
}

function toError(error: unknown) {
  const candidate = error as { message?: string; body?: { code?: string; message?: string }; status?: string }
  return {
    message: candidate?.body?.message || candidate?.message || 'Authentication request failed',
    code: candidate?.body?.code || candidate?.status,
  }
}

export function createAuthFacade() {
  return {
    getUser: async () => {
      try {
        const session = await auth.api.getSession({ headers: await headers() })
        return {
          data: { user: session?.user ? mapUser(session.user as BetterAuthUser, session.session.updatedAt) : null },
          error: null,
        }
      } catch (error) {
        return { data: { user: null }, error: toError(error) }
      }
    },

    getSession: async () => {
      try {
        const session = await auth.api.getSession({ headers: await headers() })
        return {
          data: {
            session: session
              ? { user: mapUser(session.user as BetterAuthUser, session.session.updatedAt), access_token: session.session.token }
              : null,
          },
          error: null,
        }
      } catch (error) {
        return { data: { session: null }, error: toError(error) }
      }
    },

    refreshSession: async () => ({ data: { session: null, user: null }, error: null }),

    signOut: async (options?: { scope?: string }) => {
      try {
        const requestHeaders = await headers()
        if (options?.scope === 'global') {
          await auth.api.revokeSessions({ headers: requestHeaders })
        }
        await auth.api.signOut({ headers: requestHeaders })
        return { error: null }
      } catch (error) {
        return { error: toError(error) }
      }
    },
  }
}

export function createAdminAuthFacade() {
  return {
    listUsers: async () => {
      try {
        const result = await auth.api.listUsers({
          headers: await headers(),
          query: { limit: 100, offset: 0, sortBy: 'createdAt', sortDirection: 'desc' },
        })
        return {
          data: { users: result.users.map((user) => mapUser(user as BetterAuthUser)) },
          error: null,
        }
      } catch (error) {
        return { data: { users: [] as AuthUser[] }, error: toError(error) }
      }
    },

    getUserById: async (id: string) => {
      try {
        const user = await auth.api.getUser({ headers: await headers(), query: { id } })
        return { data: { user: user ? mapUser(user as BetterAuthUser) : null }, error: null }
      } catch (error) {
        return { data: { user: null }, error: toError(error) }
      }
    },

    createUser: async (input: { email: string; password: string; email_confirm?: boolean; user_metadata?: { full_name?: string }; role?: string }) => {
      try {
        const result = await auth.api.createUser({
          headers: await headers(),
          body: {
            email: input.email,
            password: input.password,
            name: input.user_metadata?.full_name || input.email.split('@')[0],
            role: input.role === 'admin' || input.role === 'super_admin' ? 'admin' : 'user',
          },
        })
        return { data: { user: mapUser(result.user as BetterAuthUser) }, error: null }
      } catch (error) {
        return { data: { user: null }, error: toError(error) }
      }
    },

    updateUserById: async (userId: string, input: { email?: string; email_confirm?: boolean; password?: string; role?: string }) => {
      try {
        if (input.password) {
          await auth.api.setUserPassword({ headers: await headers(), body: { userId, newPassword: input.password } })
        }
        const data: Record<string, unknown> = {}
        if (input.email) data.email = input.email
        if (input.email_confirm !== undefined) data.emailVerified = input.email_confirm
        if (input.role) data.role = input.role === 'admin' || input.role === 'super_admin' ? 'admin' : 'user'
        if (Object.keys(data).length > 0) {
          await auth.api.adminUpdateUser({ headers: await headers(), body: { userId, data } })
        }
        return { data: { user: null }, error: null }
      } catch (error) {
        return { data: { user: null }, error: toError(error) }
      }
    },

    deleteUser: async (userId: string) => {
      try {
        await auth.api.removeUser({ headers: await headers(), body: { userId } })
        return { data: { user: null }, error: null }
      } catch (error) {
        return { data: { user: null }, error: toError(error) }
      }
    },
  }
}
