const SSL_QUERY_PARAMETERS = ['sslmode', 'sslrootcert', 'sslcert', 'sslkey'] as const

export function withoutConnectionStringTLSOptions(connectionString: string): string {
  const parsed = new URL(connectionString)

  for (const parameter of SSL_QUERY_PARAMETERS) {
    parsed.searchParams.delete(parameter)
  }

  return parsed.toString()
}
