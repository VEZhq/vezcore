import 'server-only'

import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { admin, twoFactor } from 'better-auth/plugins'
import { databasePool } from '@/lib/database/pool'

export const auth = betterAuth({
  appName: 'VEZcore',
  database: databasePool,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.BETTER_AUTH_ALLOW_SIGNUP !== 'true',
    requireEmailVerification: false,
    minPasswordLength: 12,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 12,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  advanced: {
    cookiePrefix: 'vezcore',
    useSecureCookies: process.env.NODE_ENV === 'production',
    database: { generateId: 'uuid' },
  },
  plugins: [
    admin({
      defaultRole: 'user',
      adminRoles: ['admin'],
    }),
    twoFactor({ issuer: 'VEZcore' }),
    nextCookies(),
  ],
})
