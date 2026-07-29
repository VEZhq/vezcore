'use client'

import { useRef, useState } from 'react'
import { Camera, Upload, X, RefreshCw } from 'lucide-react'
import { uploadAvatar, removeAvatar } from '@/lib/actions/avatar'
import { useConfirm } from '@/components/ConfirmDialog'
import { useCSRFToken } from '@/hooks/useCSRFToken'

interface AvatarUploadProps {
  currentAvatarUrl: string | null
  userId: string
  fallbackLabel?: string
}

export function AvatarUpload({ currentAvatarUrl, userId, fallbackLabel = 'VEZ' }: AvatarUploadProps) {
  void userId
  const { confirm } = useConfirm()
  const { token: csrfToken } = useCSRFToken()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null)
  const initials = fallbackLabel
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    if (!csrfToken) {
      setError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      setUploading(false)
      return
    }

    const formData = new FormData()
    formData.append('avatar', file)
    formData.append('csrfToken', csrfToken)

    const result = await uploadAvatar(formData)

    if (result.error) {
      setError(result.error)
    } else if (result.url) {
      window.location.reload()
    }

    setUploading(false)
  }

  const handleRemove = async () => {
    const confirmed = await confirm({
      title: 'Usunąć awatar?',
      message: 'Czy na pewno chcesz usunąć swój awatar?',
      confirmText: 'Usuń',
      variant: 'danger',
    })

    if (!confirmed) return

    setUploading(true)
    setError(null)

    if (!csrfToken) {
      setError('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      setUploading(false)
      return
    }

    const result = await removeAvatar(csrfToken)

    if (result.error) {
      setError(result.error)
    } else {
      window.location.reload()
    }

    setUploading(false)
  }

  return (
    <div className="flex flex-col gap-3 sm:items-start">
      <div className="group relative h-24 w-24 shrink-0">
        {currentAvatarUrl && failedImageUrl !== currentAvatarUrl ? (
          // Avatar hosts are dynamic and should not depend on Next Image's hostname allowlist.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentAvatarUrl}
            alt={`Awatar ${fallbackLabel}`}
            onError={() => setFailedImageUrl(currentAvatarUrl)}
            referrerPolicy="no-referrer"
            className="h-24 w-24 rounded-[16px] object-cover ring-1 ring-black/[0.09] dark:ring-white/[0.12]"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-[16px] bg-[#e3e9e5] text-[24px] font-semibold text-[#587063] ring-1 ring-black/[0.06] dark:bg-[#18201c] dark:text-[#9db0a5] dark:ring-white/[0.09]">
            {initials || <Camera className="h-6 w-6" />}
          </div>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#59615d] shadow-sm transition-transform hover:scale-105 disabled:opacity-50 dark:border-white/[0.1] dark:bg-[#202320] dark:text-[#d4d8d6]"
          aria-label="Zmień awatar"
          title="Zmień awatar"
        >
          <Camera className="h-3.5 w-3.5" />
        </button>

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-[16px] bg-black/50">
            <RefreshCw className="h-5 w-5 text-white animate-spin" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-7 items-center gap-1.5 px-1 text-[10px] font-medium text-[#68706c] transition-colors hover:text-[#202422] disabled:opacity-50 dark:text-[#9ca39f] dark:hover:text-white"
          >
            <Upload className="h-3 w-3" />
            {uploading ? 'Przesyłanie...' : 'Wgraj zdjęcie'}
          </button>

          {currentAvatarUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="flex h-7 w-7 items-center justify-center text-[#8a918e] transition-colors hover:text-red-500 disabled:opacity-50"
              aria-label="Usuń awatar"
              title="Usuń awatar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {error && (
          <p className="text-[10px] text-red-400">{error}</p>
        )}
        
        <p className="text-[9px] text-[#969c99]">
          JPG, PNG, GIF lub WebP · maks. 5 MB
        </p>
      </div>
    </div>
  )
}
