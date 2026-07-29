'use client'

import { Eye, X } from 'lucide-react'
import { useState } from 'react'
import { clearRolePreview } from '@/lib/actions/role-preview'
import { useCSRFToken } from '@/hooks/useCSRFToken'

export function RolePreviewBanner({ role }: { role: string }) {
  const { token } = useCSRFToken()
  const [busy, setBusy] = useState(false)

  const closePreview = async () => {
    if (!token || busy) return
    setBusy(true)
    const result = await clearRolePreview(token)
    if ('success' in result) window.location.assign('/dashboard')
    else setBusy(false)
  }

  return (
    <div className="relative z-[100] flex h-8 items-center justify-center gap-2 border-b border-[#b8a14e]/35 bg-[#fff8d8] px-3 text-[10px] font-medium text-[#5d522a] dark:border-[#d7bc56]/25 dark:bg-[#2a2515] dark:text-[#e4d38d]">
      <Eye className="h-3.5 w-3.5" />
      Podgląd roli: {role === 'operator' ? 'operator' : 'użytkownik'}
      <button
        type="button"
        onClick={closePreview}
        disabled={!token || busy}
        className="ml-2 flex h-6 items-center gap-1 rounded-[6px] px-2 hover:bg-black/[0.06] disabled:opacity-50 dark:hover:bg-white/[0.08]"
      >
        <X className="h-3 w-3" />
        Zakończ
      </button>
    </div>
  )
}
