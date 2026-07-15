import { betterAuth } from 'better-auth'
import { admin, twoFactor } from 'better-auth/plugins'
import { Pool } from 'pg'

export const auth = betterAuth({
  appName: 'VEZcore',
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.BETTER_AUTH_ALLOW_SIGNUP !== 'true',
    minPasswordLength: 12,
  },
  advanced: { database: { generateId: 'uuid' } },
  plugins: [
    admin({ defaultRole: 'user', adminRoles: ['admin'] }),
    twoFactor({ issuer: 'VEZcore' }),
  ],
})
