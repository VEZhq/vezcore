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
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-white/[0.05] light:bg-black/[0.05] flex items-center justify-center">
            <Camera className="h-6 w-6 text-[#444444] light:text-[#888888]" />
          </div>
        )}
        
        {uploading && (
          <div className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center">
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
            className="flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[#666666] light:text-[#999999] border border-white/[0.06] light:border-black/[0.06] hover:bg-white/[0.02] light:hover:bg-black/[0.02] disabled:opacity-50 transition-colors"
          >
            <Upload className="h-3 w-3" />
            {uploading ? 'Przesyłanie...' : 'Zmień awatar'}
          </button>

          {currentAvatarUrl && (
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="p-2 text-[#666666] light:text-[#999999] hover:text-red-400 light:hover:text-red-600 disabled:opacity-50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {error && (
          <p className="text-[10px] text-red-400">{error}</p>
        )}
        
        <p className="text-[10px] text-[#444444] light:text-[#888888]">
          JPG, PNG lub GIF. Max 5MB.
        </p>
      </div>
    </div>
  )
}
