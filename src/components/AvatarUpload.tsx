'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Camera, Upload, X, RefreshCw } from 'lucide-react'
import { uploadAvatar, removeAvatar } from '@/lib/actions/avatar'
import { useConfirm } from '@/components/ConfirmDialog'
import { useCSRFToken } from '@/hooks/useCSRFToken'

interface AvatarUploadProps {
  currentAvatarUrl: string | null
  userId: string
}

export function AvatarUpload({ currentAvatarUrl, userId }: AvatarUploadProps) {
  void userId
  const { confirm } = useConfirm()
  const { token: csrfToken } = useCSRFToken()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <div className="flex items-center gap-4">
      <div className="relative">
        {currentAvatarUrl ? (
          <Image
            src={currentAvatarUrl}
            alt="Awatar"
            width={64}
            height={64}
            className="h-20 w-20 rounded-[12px] object-cover ring-1 ring-black/[0.08] dark:ring-white/[0.1]"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-[12px] bg-black/[0.04] ring-1 ring-black/[0.06] dark:bg-white/[0.055] dark:ring-white/[0.08]">
            <Camera className="h-6 w-6 text-[#888f8c]" />
          </div>
        )}
        
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-[12px] bg-black/50">
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
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-8 items-center gap-2 rounded-[7px] border border-black/[0.09] bg-white/60 px-3 text-[9px] font-medium text-[#606764] transition-colors hover:bg-white disabled:opacity-50 dark:border-white/[0.09] dark:bg-white/[0.045] dark:text-[#a5aaa7] dark:hover:bg-white/[0.08]"
          >
            <Upload className="h-3 w-3" />
            {uploading ? 'Przesyłanie...' : 'Zmień awatar'}
          </button>

          {currentAvatarUrl && (
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="p-2 text-[#8a918e] transition-colors hover:text-red-500 disabled:opacity-50"
              aria-label="Usuń awatar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {error && (
          <p className="text-[10px] text-red-400">{error}</p>
        )}
        
        <p className="text-[9px] text-[#969c99]">
          JPG, PNG lub GIF. Max 5MB.
        </p>
      </div>
    </div>
  )
}
