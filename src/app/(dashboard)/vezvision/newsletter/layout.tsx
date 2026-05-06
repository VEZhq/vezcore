import { Suspense } from 'react'
import NewsletterNav from '@/components/vezvision/newsletter/NewsletterNav'
import NewsletterLoading from './loading'

export default function NewsletterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#ececf1] px-5 py-4 xl:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[21px] font-medium tracking-[-0.04em] text-[#111111]">Newsletter</h1>
            <p className="mt-0.5 text-[12px] text-[#656b76]">
              Zarządzaj kampaniami i odbiorcami
            </p>
          </div>
        </div>

        <NewsletterNav />
      </div>

      <div className="flex-1 overflow-auto p-5 xl:p-6">
        <Suspense fallback={<NewsletterLoading />}>
          {children}
        </Suspense>
      </div>
    </div>
  )
}
