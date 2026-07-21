import { betterAuth } from 'better-auth'
import { admin, twoFactor } from 'better-auth/plugins'
import { Pool } from 'pg'

function createDatabasePool(): Pool {
  const encodedCA = process.env.DATABASE_SSL_CA_BASE64?.trim()
  const certificateAuthority = encodedCA
    ? Buffer.from(encodedCA, 'base64').toString('utf8')
    : undefined

  if (certificateAuthority && !certificateAuthority.includes('-----BEGIN CERTIFICATE-----')) {
    throw new Error('DATABASE_SSL_CA_BASE64 is not a valid PEM certificate')
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    application_name: 'vezcore-auth-cli',
    ssl: process.env.DATABASE_SSL === 'require'
      ? {
          rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
          ca: certificateAuthority,
        }
      : undefined,
  })
}

export const auth = betterAuth({
  appName: 'VEZcore',
  database: createDatabasePool(),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.BETTER_AUTH_ALLOW_SIGNUP !== 'true',
    minPasswordLength: 12,
  },
  advanced: { database: { generateId: () => crypto.randomUUID() } },
  plugins: [
    admin({ defaultRole: 'user', adminRoles: ['admin'] }),
    twoFactor({ issuer: 'VEZcore' }),
  ],
})
