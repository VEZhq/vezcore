import { notFound } from 'next/navigation'
import { getBlogPost } from '@/lib/actions/vezvision/blog'
import { requireVezVisionPermission } from '@/lib/auth/vezvision-permissions'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { sanitizeVezVisionHtml } from '@/lib/vezvision-security-utils'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface PreviewPageProps {
  searchParams: Promise<{ id?: string }>
}

export default async function BlogPreviewPage({ searchParams }: PreviewPageProps) {
  const { id } = await searchParams
  if (!id) notFound()

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.BLOG_VIEW)
  if ('error' in auth) notFound()

  const result = await getBlogPost(id)
  if (!result.success) notFound()

  const post = result.data
  const categories = post.categories ?? []

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Link
          href={`/vezvision/blog/${id}`}
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do edycji
        </Link>

        <div className="mb-6">
          {categories.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <span
                  key={cat.id}
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{ backgroundColor: cat.color + '20', color: cat.color }}
                >
                  {cat.name_pl}
                </span>
              ))}
            </div>
          )}

          <span className="mb-2 inline-block rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-gray-400">
            {post.status === 'published' ? 'Opublikowany' : post.status === 'archived' ? 'Archiwum' : 'Szkic'} — Podgląd
          </span>

          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {post.title_pl}
          </h1>

          {post.title_en && (
            <p className="mt-2 text-lg text-gray-500">{post.title_en}</p>
          )}

          <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
            <span>{post.reading_time} min czytania</span>
            {post.published_at && (
              <span>{new Date(post.published_at).toLocaleDateString('pl-PL')}</span>
            )}
          </div>
        </div>

        {post.featured_image && (
          <img
            src={post.featured_image}
            alt={post.title_pl}
            className="mb-8 w-full rounded-lg object-cover"
            style={{ maxHeight: '400px' }}
          />
        )}

        {post.excerpt_pl && (
          <p className="mb-6 text-lg font-medium italic text-gray-600">
            {post.excerpt_pl}
          </p>
        )}

        <div
          className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600"
          dangerouslySetInnerHTML={{ __html: sanitizeVezVisionHtml(post.content_pl) }}
        />

        {post.tags_pl.length > 0 && (
          <div className="mt-10 border-t pt-6">
            <p className="mb-2 text-sm text-gray-400">Tagi:</p>
            <div className="flex flex-wrap gap-2">
              {post.tags_pl.map((tag) => (
                <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
