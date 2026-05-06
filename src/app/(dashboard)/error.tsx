'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center bg-[#0a0a0a] light:bg-[#f5f5f5]">
      <h2 className="text-xl font-medium text-white light:text-black">Wystąpił błąd</h2>
      <p className="max-w-md text-sm text-[#656b76]">
        Nie udało się załadować tej strony. Możesz spróbować ponownie lub wrócić do dashboardu.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-[4px] bg-white light:bg-black px-4 py-2.5 text-[12px] font-medium text-black light:text-white transition-colors hover:bg-[#e7e8ee] light:hover:bg-[#333333]"
        >
          Spróbuj ponownie
        </button>
        <Link
          href="/dashboard"
          className="rounded-[4px] border border-white/10 light:border-black/10 px-4 py-2.5 text-[12px] font-medium text-white light:text-black transition-colors hover:bg-white/5 light:hover:bg-black/5"
        >
          Dashboard
        </Link>
      </div>
    </div>
  )
}
