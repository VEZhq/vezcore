import { notFound } from 'next/navigation'
import { getProject } from '@/lib/actions/vezvision/portfolio'
import { requireVezVisionPermission } from '@/lib/auth/vezvision-permissions'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { sanitizeVezVisionHtml } from '@/lib/vezvision-security-utils'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface PreviewPageProps {
  searchParams: Promise<{ id?: string }>
}

export default async function PortfolioPreviewPage({ searchParams }: PreviewPageProps) {
  const { id } = await searchParams
  if (!id) notFound()

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.PORTFOLIO_VIEW)
  if ('error' in auth) notFound()

  const result = await getProject(id)
  if (!result.success) notFound()

  const project = result.data

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Link
          href={`/vezvision/portfolio/${id}`}
          className="mb-8 inline-flex items-center gap-2 text-sm text-[#656b76] hover:text-[#111111]"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do edycji
        </Link>

        <div className="mb-6">
          <span className="mb-2 inline-block rounded-[4px] bg-[#f0f0f4] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-[#656b76]">
            {project.status === 'published' ? 'Opublikowany' : project.status === 'archived' ? 'Archiwum' : 'Szkic'} — Podgląd
          </span>

          <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.02em] text-[#111111]">
            {project.title_pl}
          </h1>

          {project.client_name && (
            <p className="mt-1 text-[14px] text-[#8b9098]">{project.client_name}</p>
          )}

          {project.title_en && (
            <p className="mt-2 text-[16px] text-[#8b9098]">{project.title_en}</p>
          )}
        </div>

        {project.cover_image && (
          <img
            src={project.cover_image}
            alt={project.title_pl}
            className="mb-8 w-full rounded-[6px] object-cover"
            style={{ maxHeight: '400px' }}
          />
        )}

        {project.short_desc_pl && (
          <p className="mb-6 text-[16px] font-medium italic text-[#555b66]">
            {project.short_desc_pl}
          </p>
        )}

        {project.description_pl && (
          <div
            className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-[#22a06b]"
            dangerouslySetInnerHTML={{ __html: sanitizeVezVisionHtml(project.description_pl) }}
          />
        )}

        {project.challenge_pl && (
          <div className="mt-8 rounded-[6px] border border-[#e7e8ee] bg-[#fbfbfc] p-5">
            <h3 className="mb-2 text-[14px] font-semibold text-[#111111]">Wyzwanie</h3>
            <div
              className="prose max-w-none text-[#555b66]"
              dangerouslySetInnerHTML={{ __html: sanitizeVezVisionHtml(project.challenge_pl) }}
            />
          </div>
        )}

        {project.solution_pl && (
          <div className="mt-4 rounded-[6px] border border-[#e7e8ee] bg-white p-5">
            <h3 className="mb-2 text-[14px] font-semibold text-[#111111]">Rozwiązanie</h3>
            <div
              className="prose max-w-none text-[#555b66]"
              dangerouslySetInnerHTML={{ __html: sanitizeVezVisionHtml(project.solution_pl) }}
            />
          </div>
        )}

        {(project.demo_url || project.github_url) && (
          <div className="mt-8 flex flex-wrap gap-3 border-t border-[#ececf1] pt-6">
            {project.demo_url && (
              <a
                href={project.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-[4px] bg-[#111111] px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-[#262626]"
              >
                Zobacz online
              </a>
            )}
            {project.github_url && (
              <a
                href={project.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-[4px] border border-[#e7e8ee] px-4 py-2 text-[12px] font-medium text-[#111111] transition-colors hover:bg-[#f0f0f4]"
              >
                GitHub
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
