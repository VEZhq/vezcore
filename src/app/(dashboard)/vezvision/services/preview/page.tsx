import { notFound } from 'next/navigation'
import { getService } from '@/lib/actions/vezvision/services'
import { requireVezVisionPermission } from '@/lib/auth/vezvision-permissions'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { sanitizeVezVisionHtml } from '@/lib/vezvision-security-utils'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface PreviewPageProps {
  searchParams: Promise<{ id?: string }>
}

export default async function ServicePreviewPage({ searchParams }: PreviewPageProps) {
  const { id } = await searchParams
  if (!id) notFound()

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SERVICES_VIEW)
  if ('error' in auth) notFound()

  const result = await getService(id)
  if (!result.success) notFound()

  const service = result.data

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Link
          href={`/vezvision/services/${id}`}
          className="mb-8 inline-flex items-center gap-2 text-sm text-[#656b76] hover:text-[#111111]"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do edycji
        </Link>

        <div className="mb-6">
          <span className="mb-2 inline-block rounded-[4px] bg-[#f0f0f4] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-[#656b76]">
            {service.status === 'active' ? 'Aktywna' : service.status === 'archived' ? 'Archiwum' : 'Szkic'} — Podgląd
          </span>

          <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.02em] text-[#111111]">
            {service.title_pl}
          </h1>

          {service.title_en && (
            <p className="mt-2 text-[16px] text-[#8b9098]">{service.title_en}</p>
          )}

          {service.categories && service.categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {service.categories.map((cat) => (
                <span
                  key={cat.id}
                  className="rounded-[4px] bg-[#f0f0f4] px-2.5 py-1 text-[11px] font-medium text-[#656b76]"
                >
                  {cat.name_pl}
                </span>
              ))}
            </div>
          )}
        </div>

        {service.short_desc_pl && (
          <p className="mb-6 text-[16px] font-medium italic text-[#555b66]">
            {service.short_desc_pl}
          </p>
        )}

        {service.description_pl && (
          <div
            className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-[#22a06b]"
            dangerouslySetInnerHTML={{ __html: sanitizeVezVisionHtml(service.description_pl) }}
          />
        )}

        {(service.price || service.duration) && (
          <div className="mt-8 flex flex-wrap gap-4 border-t border-[#ececf1] pt-6">
            {service.price && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#8b9098]">Cena</p>
                <p className="text-[18px] font-semibold text-[#111111]">{service.price} PLN</p>
              </div>
            )}
            {service.duration && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#8b9098]">Czas realizacji</p>
                <p className="text-[18px] font-semibold text-[#111111]">{service.duration}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
