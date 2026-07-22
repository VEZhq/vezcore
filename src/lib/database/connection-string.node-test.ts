import assert from 'node:assert/strict'
import test from 'node:test'
import { withoutConnectionStringTLSOptions } from './connection-string.ts'

test('removes TLS parameters that would override the verified Pool configuration', () => {
  const result = withoutConnectionStringTLSOptions(
    'postgresql://user:password@db.internal:5432/vezcore?sslmode=require&application_name=test',
  )

  assert.equal(
    result,
    'postgresql://user:password@db.internal:5432/vezcore?application_name=test',
  )
})

test('preserves credentials and unrelated query parameters', () => {
  const result = withoutConnectionStringTLSOptions(
    'postgresql://user:p%40ss@db.internal:5432/vezcore?connect_timeout=5&sslrootcert=system',
  )

  assert.equal(
    result,
    'postgresql://user:p%40ss@db.internal:5432/vezcore?connect_timeout=5',
  )
})
