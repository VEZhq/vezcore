import 'server-only'

import { Pool } from 'pg'
import { withoutConnectionStringTLSOptions } from '@/lib/database/connection-string'

declare global {
  // eslint-disable-next-line no-var
  var __vezcorePool: Pool | undefined
}

function createPool() {
  const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build'
    || process.env.npm_lifecycle_event === 'build'
  const configuredConnectionString = process.env.DATABASE_URL
    || (isProductionBuild ? 'postgresql://build:build@127.0.0.1:5432/build' : '')

  if (!configuredConnectionString) {
    throw new Error('DATABASE_URL is not configured')
  }

  const requireTLS = process.env.DATABASE_SSL === 'require'
  const connectionString = requireTLS
    ? withoutConnectionStringTLSOptions(configuredConnectionString)
    : configuredConnectionString
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
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'vezcore',
    ssl: requireTLS
      ? { rejectUnauthorized, ca: certificateAuthority, servername: tlsServername }
      : undefined,
  })
}

export const databasePool = globalThis.__vezcorePool ?? createPool()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__vezcorePool = databasePool
}
