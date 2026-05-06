import Link from 'next/link'

interface UnsubscribedPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function UnsubscribedPage({ searchParams }: UnsubscribedPageProps) {
  const params = await searchParams
  const status = params.status

  const isSuccess = status === 'ok'

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-4">
      <div className="max-w-md w-full p-8 border border-white/[0.06] bg-[#111111]/80 backdrop-blur-xl text-center space-y-6">
        <h1 className={`text-2xl font-medium ${isSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
          {isSuccess ? 'Zostałeś pomyślnie wypisany z listy.' : 'Link jest nieprawidłowy lub wygasł.'}
        </h1>
        
        <p className="text-[12px] uppercase tracking-[0.2em] text-[#888888]">
          {isSuccess 
            ? 'Nie będziesz już otrzymywać naszych wiadomości.' 
            : 'Twój link do wypisania się jest nieważny. Możliwe, że już się wypisałeś.'}
        </p>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-white border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
          >
            Wróć na stronę główną
          </Link>
        </div>
      </div>
    </div>
  )
}
