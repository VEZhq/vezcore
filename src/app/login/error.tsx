'use client'

import { useEffect } from 'react'

export default function RouteError({
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
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-medium text-[#111111]">Wystąpił błąd</h2>
      <p className="max-w-md text-sm text-[#656b76]">
        Nie udało się załadować tej strony. Możesz spróbować ponownie.
      </p>
      <button
        onClick={reset}
        className="rounded-[4px] bg-[#111111] px-4 py-2.5 text-[12px] font-medium text-white transition-colors hover:bg-[#333333]"
      >
        Spróbuj ponownie
      </button>
    </div>
  )
}
