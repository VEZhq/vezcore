import 'server-only'

import { Pool } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var __vezcorePool: Pool | undefined
}

function createPool() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured')
  }

  return new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'vezcore',
    ssl: process.env.DATABASE_SSL === 'require'
      ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : undefined,
  })
}

export const databasePool = globalThis.__vezcorePool ?? createPool()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__vezcorePool = databasePool
}
