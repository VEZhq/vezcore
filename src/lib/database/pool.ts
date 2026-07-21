import 'server-only'

import { Pool } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var __vezcorePool: Pool | undefined
}

function createPool() {
  const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build'
    || process.env.npm_lifecycle_event === 'build'
  const connectionString = process.env.DATABASE_URL
    || (isProductionBuild ? 'postgresql://build:build@127.0.0.1:5432/build' : '')

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured')
  }

  const requireTLS = process.env.DATABASE_SSL === 'require'
  const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false'
  const encodedCA = process.env.DATABASE_SSL_CA_BASE64?.trim()
  const certificateAuthority = encodedCA
    ? Buffer.from(encodedCA, 'base64').toString('utf8')
    : undefined

  if (certificateAuthority && !certificateAuthority.includes('-----BEGIN CERTIFICATE-----')) {
    throw new Error('DATABASE_SSL_CA_BASE64 is not a valid PEM certificate')
  }

  return new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'vezcore',
    ssl: requireTLS
      ? { rejectUnauthorized, ca: certificateAuthority }
      : undefined,
  })
}

export const databasePool = globalThis.__vezcorePool ?? createPool()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__vezcorePool = databasePool
}
