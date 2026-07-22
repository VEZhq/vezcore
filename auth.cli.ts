import { betterAuth } from 'better-auth'
import { admin, twoFactor } from 'better-auth/plugins'
import { Pool } from 'pg'
import { withoutConnectionStringTLSOptions } from './src/lib/database/connection-string'

function createDatabasePool(): Pool {
  const configuredConnectionString = process.env.DATABASE_URL
  if (!configuredConnectionString) {
    throw new Error('DATABASE_URL is not configured')
  }

  const requireTLS = process.env.DATABASE_SSL === 'require'
  const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false'
  const tlsServername = process.env.DATABASE_SSL_SERVERNAME?.trim()
  const encodedCA = process.env.DATABASE_SSL_CA_BASE64?.trim()
  const certificateAuthority = encodedCA
    ? Buffer.from(encodedCA, 'base64').toString('utf8')
    : undefined

  if (certificateAuthority && !certificateAuthority.includes('-----BEGIN CERTIFICATE-----')) {
    throw new Error('DATABASE_SSL_CA_BASE64 is not a valid PEM certificate')
  }

  if (requireTLS && rejectUnauthorized && !tlsServername) {
    throw new Error('DATABASE_SSL_SERVERNAME is required for verified database TLS')
  }

  return new Pool({
    connectionString: requireTLS
      ? withoutConnectionStringTLSOptions(configuredConnectionString)
      : configuredConnectionString,
    application_name: 'vezcore-auth-cli',
    ssl: requireTLS
      ? {
          rejectUnauthorized,
          ca: certificateAuthority,
          servername: tlsServername,
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
