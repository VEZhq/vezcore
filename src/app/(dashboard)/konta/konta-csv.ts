interface ExportUser {
  email: string
  full_name: string | null
  role: string
  created_at: string
  last_sign_in: string | null
}

export function downloadUserCsv(users: ExportUser[], filename?: string): void {
  const exportHeaders = ['Email', 'Imię', 'Rola', 'Data utworzenia', 'Ostatnie logowanie']
  const rows = users.map(u => [
    u.email,
    u.full_name || '',
    u.role,
    u.created_at,
    u.last_sign_in || 'Nigdy',
  ])

  const csv = [
    exportHeaders.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `users_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
