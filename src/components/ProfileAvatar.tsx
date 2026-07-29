'use client'

import { useState } from 'react'
import { User } from 'lucide-react'

interface ProfileAvatarProps {
  url: string | null | undefined
  label: string
  className?: string
  fallbackClassName?: string
}

export function ProfileAvatar({
  url,
  label,
  className = 'h-8 w-8 rounded-[8px]',
  fallbackClassName = '',
}: ProfileAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const initials = label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  if (url && failedUrl !== url) {
    return (
      // Avatar URLs are dynamic and must not depend on Next Image's hostname allowlist.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`Awatar ${label}`}
        onError={() => setFailedUrl(url)}
        referrerPolicy="no-referrer"
        className={`${className} object-cover`}
      />
    )
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center bg-[#e3e9e5] font-semibold text-[#587063] dark:bg-[#18201c] dark:text-[#9db0a5] ${className} ${fallbackClassName}`}
      aria-label={`Awatar ${label}`}
    >
      {initials || <User className="h-[45%] w-[45%]" />}
    </span>
  )
}
