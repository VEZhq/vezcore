'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function VezVisionError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[RouteError]', error.digest ?? error.message)
      }
    }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-medium text-[#111111]">Wystąpił błąd</h2>
      <p className="max-w-md text-sm text-[#656b76]">
        Nie udało się załadować tej strony. Możesz spróbować ponownie lub wrócić do dashboardu.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-[4px] bg-[#111111] px-4 py-2.5 text-[12px] font-medium text-white transition-colors hover:bg-[#333333]"
        >
          Spróbuj ponownie
        </button>
        <Link
          href="/dashboard"
          className="rounded-[4px] border border-[#e7e8ee] bg-white px-4 py-2.5 text-[12px] font-medium text-[#111111] transition-colors hover:bg-[#f0f0f4]"
        >
          Dashboard
        </Link>
      </div>
    </div>
  )
}
