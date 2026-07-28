export function formatDate(dateStr: string | null, timezone: string = 'Europe/Warsaw'): string {
  if (!dateStr) return 'Nigdy'
  const date = new Date(dateStr)
  return date.toLocaleDateString('pl-PL', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }
  return email.substring(0, 2).toUpperCase()
}

export function getAvatarColor(name: string | null, email: string): string {
  const str = name || email
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = [
    'bg-emerald-500/20 text-emerald-400 light:text-emerald-600',
    'bg-[#d8c6ad]/16 text-[#d8c6ad] light:text-[#7d5a38]',
    'bg-[#d7bfd8]/16 text-[#d7bfd8] light:text-[#735671]',
    'bg-orange-500/20 text-orange-400 light:text-orange-600',
    'bg-pink-500/20 text-pink-400 light:text-pink-600',
    'bg-[#c9d8c5]/16 text-[#c9d8c5] light:text-[#5f7358]',
  ]
  return colors[Math.abs(hash) % colors.length]
}
