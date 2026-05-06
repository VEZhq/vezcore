'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { X, Plus, ArrowLeft, ImagePlus, Wand2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { createBlogPost, updateBlogPost, publishBlogPost, unpublishBlogPost } from '@/lib/actions/vezvision/blog'
import { uploadImage } from '@/lib/actions/vezvision/upload'
import { Checkbox } from '@/components/ui/checkbox'
import type { VVBlogPost, VVBlogCategory, VVStatus } from '@/lib/actions/vezvision/types'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import { sanitizeVezVisionHtml } from '@/lib/vezvision-security-utils'
import { slugify, calcReadingTime, normalizeLegacyContent, normalizeEditorHtml } from './post-editor-utils'
import { Collapsible, Field, inputCls, textareaCls } from './post-editor-ui'

interface PostEditorProps {
  post: VVBlogPost | null
  categories: VVBlogCategory[]
  canManage: boolean
  canPublish: boolean
}

type Tab = 'pl' | 'en'
type AutosaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function PostEditor({ post, categories, canManage, canPublish }: PostEditorProps) {
  const router = useRouter()
  const { token: csrfToken } = useCSRFToken()
  const isNew = !post

  const [tab, setTab] = useState<Tab>('pl')
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [slug, setSlug] = useState(post?.slug ?? '')
  const [slugManual, setSlugManual] = useState(!isNew)

  const [titlePl, setTitlePl] = useState(post?.title_pl ?? '')
  const [titleEn, setTitleEn] = useState(post?.title_en ?? '')
  const [excerptPl, setExcerptPl] = useState(post?.excerpt_pl ?? '')
  const [excerptEn, setExcerptEn] = useState(post?.excerpt_en ?? '')

  const [contentPl, setContentPl] = useState(normalizeLegacyContent(post?.content_pl ?? ''))
  const [contentEn, setContentEn] = useState(normalizeLegacyContent(post?.content_en ?? ''))

  const [featured, setFeatured] = useState(post?.featured ?? false)
  const [featuredImage, setFeaturedImage] = useState(post?.featured_image ?? '')

  const [tagsPl, setTagsPl] = useState<string[]>(post?.tags_pl ?? [])
  const [tagsEn, setTagsEn] = useState<string[]>(post?.tags_en ?? [])
  const [tagInputPl, setTagInputPl] = useState('')
  const [tagInputEn, setTagInputEn] = useState('')

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(post?.categories?.map((c) => c.id) ?? [])

  const [metaTitlePl, setMetaTitlePl] = useState(post?.meta_title_pl ?? '')
  const [metaTitleEn, setMetaTitleEn] = useState(post?.meta_title_en ?? '')
  const [metaDescPl, setMetaDescPl] = useState(post?.meta_desc_pl ?? '')
  const [metaDescEn, setMetaDescEn] = useState(post?.meta_desc_en ?? '')

  const [status, setStatus] = useState<VVStatus>(post?.status ?? 'draft')
  const [scheduledFor, setScheduledFor] = useState<string>(
    post?.scheduled_for ? new Date(post.scheduled_for).toISOString().slice(0, 16) : ''
  )
  const [readingTime, setReadingTime] = useState(post?.reading_time ?? calcReadingTime(post?.content_pl ?? ''))
  const [autosaveState, setAutosaveState] = useState<AutosaveState>('idle')

  const autosaveSignatureRef = useRef('')
  const autosaveRunningRef = useRef(false)

  const handleTitlePlChange = useCallback((value: string) => {
    setTitlePl(value)
    if (!slugManual) setSlug(slugify(value))
  }, [slugManual])

  const addTag = (lang: Tab) => {
    const input = lang === 'pl' ? tagInputPl : tagInputEn
    const tags = lang === 'pl' ? tagsPl : tagsEn
    const setInput = lang === 'pl' ? setTagInputPl : setTagInputEn
    const setTags = lang === 'pl' ? setTagsPl : setTagsEn

    const newTags = input.split(',').map((t) => t.trim()).filter((t) => t && !tags.includes(t))
    if (newTags.length) {
      setTags([...tags, ...newTags])
      setInput('')
    }
  }

  const removeTag = (lang: Tab, tag: string) => {
    if (lang === 'pl') setTagsPl((prev) => prev.filter((t) => t !== tag))
    else setTagsEn((prev) => prev.filter((t) => t !== tag))
  }

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  const uploadBlogImage = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      toast.error('Wybierz plik graficzny')
      return null
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeSlug = slug || slugify(titlePl || 'post') || 'post'
    const path = `blog/${safeSlug}/${Date.now()}-${crypto.randomUUID()}.${ext}`
    const buffer = await file.arrayBuffer()
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return null
    }
    const uploaded = await uploadImage('vv-blog-images', path, buffer, file.type, csrfToken)
    if (!uploaded.success) {
      toast.error(uploaded.error)
      return null
    }
    return uploaded.data
  }

  const handleFeaturedImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const uploadedUrl = await uploadBlogImage(file)
      if (uploadedUrl) setFeaturedImage(uploadedUrl)
    } finally {
      setUploadingImage(false)
      event.target.value = ''
    }
  }

  const buildInput = useCallback((targetStatus: VVStatus) => ({
    slug,
    status: targetStatus,
    featured,
    featured_image: featuredImage || null,
    reading_time: readingTime,
    title_pl: titlePl,
    title_en: titleEn || null,
    excerpt_pl: excerptPl || null,
    excerpt_en: excerptEn || null,
    content_pl: sanitizeVezVisionHtml(contentPl),
    content_en: contentEn ? sanitizeVezVisionHtml(contentEn) : null,
    meta_title_pl: metaTitlePl || null,
    meta_title_en: metaTitleEn || null,
    meta_desc_pl: metaDescPl || null,
    meta_desc_en: metaDescEn || null,
    tags_pl: tagsPl,
    tags_en: tagsEn,
    category_ids: selectedCategoryIds,
    scheduled_for: targetStatus === 'scheduled' && scheduledFor ? new Date(scheduledFor).toISOString() : null,
  }), [contentEn, contentPl, excerptEn, excerptPl, featured, featuredImage, metaDescEn, metaDescPl, metaTitleEn, metaTitlePl, readingTime, scheduledFor, selectedCategoryIds, slug, tagsEn, tagsPl, titleEn, titlePl])

  const buildAutosaveSignature = useCallback(() => normalizeEditorHtml(
    JSON.stringify({
      titlePl,
      titleEn,
      excerptPl,
      excerptEn,
      contentPl,
      contentEn,
      featured,
      featuredImage,
      tagsPl,
      tagsEn,
      selectedCategoryIds,
      metaTitlePl,
      metaTitleEn,
      metaDescPl,
      metaDescEn,
      readingTime,
      scheduledFor,
      status,
      slug,
    })
  ), [contentEn, contentPl, excerptEn, excerptPl, featured, featuredImage, metaDescEn, metaDescPl, metaTitleEn, metaTitlePl, readingTime, scheduledFor, selectedCategoryIds, slug, status, tagsEn, tagsPl, titleEn, titlePl])

  const runAutosave = useCallback(async () => {
    if (!csrfToken) return
    if (autosaveRunningRef.current) return
    if (!slug.trim() || !titlePl.trim() || !contentPl.replace(/<[^>]+>/g, '').trim()) return

    const nextSignature = buildAutosaveSignature()
    if (nextSignature === autosaveSignatureRef.current) return

    autosaveRunningRef.current = true
    setAutosaveState('saving')
    try {
      const result = isNew
        ? await createBlogPost(buildInput('draft'), csrfToken)
        : await updateBlogPost(post.id, buildInput(post.status), csrfToken)

      if (result.success) {
        autosaveSignatureRef.current = nextSignature
        setAutosaveState('saved')
        if (isNew) router.replace(`/vezvision/blog/${result.data.id}`)
      } else {
        setAutosaveState('error')
      }
    } catch {
      setAutosaveState('error')
    } finally {
      autosaveRunningRef.current = false
      window.setTimeout(() => {
        setAutosaveState((prev) => (prev === 'saved' ? 'idle' : prev))
      }, 1800)
    }
  }, [buildAutosaveSignature, buildInput, contentPl, csrfToken, isNew, post, router, slug, titlePl])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void runAutosave()
    }, 2000)
    return () => window.clearTimeout(timeout)
  }, [runAutosave])

  const handleSave = async (targetStatus: VVStatus) => {
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }
    if (!titlePl.trim()) {
      toast.error('Tytuł PL jest wymagany')
      return
    }
    if (!slug.trim()) {
      toast.error('Slug jest wymagany')
      return
    }
    const hasContentPl = Boolean(contentPl.replace(/<[^>]+>/g, '').trim())
    if (targetStatus === 'published' && !hasContentPl) {
      toast.error('Treść PL jest wymagana')
      return
    }
    if (targetStatus === 'scheduled' && !scheduledFor) {
      toast.error('Data publikacji jest wymagana dla zaplanowanego posta')
      return
    }
    if (targetStatus === 'scheduled' && new Date(scheduledFor) <= new Date()) {
      toast.error('Data publikacji musi być w przyszłości')
      return
    }

    setSaving(true)
    try {
      const result = isNew
        ? await createBlogPost(buildInput(targetStatus), csrfToken)
        : await updateBlogPost(post.id, buildInput(targetStatus), csrfToken)

      if (result.success) {
        toast.success(isNew ? 'Post utworzony' : 'Post zapisany')
        setStatus(targetStatus)
        router.push('/vezvision/blog')
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Wystąpił nieoczekiwany błąd')
    } finally {
      setSaving(false)
    }
  }

  const handlePublishToggle = async () => {
    if (isNew) {
      await handleSave('published')
      return
    }
    setSaving(true)
    try {
      const action = status === 'published' ? unpublishBlogPost : publishBlogPost
      if (!csrfToken) {
        toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
        return
      }
      const result = await action(post.id, csrfToken)
      if (result.success) {
        const newStatus = status === 'published' ? 'draft' : 'published'
        setStatus(newStatus)
        toast.success(status === 'published' ? 'Post wycofany do szkicu' : 'Post opublikowany')
        router.push('/vezvision/blog')
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Wystąpił nieoczekiwany błąd. Spróbuj ponownie.')
    } finally {
      setSaving(false)
    }
  }

  const autosaveLabel =
    autosaveState === 'saving' ? 'Autosave: zapis...' :
      autosaveState === 'saved' ? 'Autosave: zapisano' :
        autosaveState === 'error' ? 'Autosave: błąd' : 'Autosave: gotowy'

  return (
    <div className="light w-full px-5 py-4 text-[#111111] xl:px-6">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/vezvision/blog"
          className="flex items-center gap-2 rounded-[4px] px-2 py-1.5 text-[12px] text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]"
        >
          <ArrowLeft className="h-3 w-3" />
          Blog
        </Link>
        <div className="h-4 w-px bg-[#e7e8ee]" />
        <h1 className="truncate text-[21px] font-medium tracking-[-0.04em] text-[#111111]">
          {isNew ? 'Nowy post' : titlePl || 'Edytuj post'}
        </h1>
        <div className="ml-auto rounded-[4px] bg-[#f0f0f4] px-2.5 py-1 text-[11px] text-[#656b76]">
          {autosaveLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="flex items-center gap-1 border-b border-[#e7e8ee]">
            {(['pl', 'en'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-3 py-2 text-[12px] transition-colors ${
                  tab === t
                    ? 'border-[#111111] text-[#111111]'
                    : 'border-transparent text-[#8b9098] hover:text-[#111111]'
                }`}
              >
                {t === 'pl' ? 'Polski' : 'English'}
                {t === 'pl' && <span className="ml-1 text-red-500">*</span>}
              </button>
            ))}
          </div>

          <div className="space-y-3 rounded-[6px] border border-[#e7e8ee] bg-white p-4 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
            {tab === 'pl' ? (
              <>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
                  <Field label="Tytuł PL" required>
                    <input type="text" value={titlePl} onChange={(e) => handleTitlePlChange(e.target.value)} className={inputCls} placeholder="Tytuł posta..." />
                  </Field>
                  <Field label="Slug">
                    <input type="text" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugManual(true) }} className={inputCls} placeholder="url-slug" />
                  </Field>
                </div>
                <Field label="Krótki opis PL">
                  <textarea value={excerptPl} onChange={(e) => setExcerptPl(e.target.value)} className={textareaCls} rows={2} placeholder="Krótki opis..." />
                </Field>
              <Field label="Tagi PL">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInputPl}
                        onChange={(e) => setTagInputPl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag('pl') } }}
                        className={`${inputCls} flex-1`}
                        placeholder="Tag1, Tag2 (Enter aby dodać)"
                      />
                      <button type="button" onClick={() => addTag('pl')} className="inline-flex items-center justify-center rounded-[4px] border border-[#e7e8ee] bg-white px-3 py-2 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    {tagsPl.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tagsPl.map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc] px-2 py-1 text-[11px] text-[#656b76]">
                            {tag}
                            <button type="button" onClick={() => removeTag('pl', tag)} className="hover:text-red-400 transition-colors"><X className="h-2.5 w-2.5" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Field>
                <Field label="Treść PL" required>
                  <textarea
                    value={contentPl}
                    onChange={(e) => setContentPl(e.target.value)}
                    placeholder="Treść posta..."
                    className={textareaCls}
                    rows={8}
                    disabled={uploadingImage}
                  />
                </Field>
              </>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
                  <Field label="Tytuł EN">
                    <input type="text" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className={inputCls} placeholder="Post title..." />
                  </Field>
                  <Field label="Slug">
                    <input type="text" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugManual(true) }} className={inputCls} placeholder="url-slug" />
                  </Field>
                </div>
                <Field label="Krótki opis EN">
                  <textarea value={excerptEn} onChange={(e) => setExcerptEn(e.target.value)} className={textareaCls} rows={2} placeholder="Short description..." />
                </Field>
                <Field label="Tagi EN">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInputEn}
                        onChange={(e) => setTagInputEn(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag('en') } }}
                        className={`${inputCls} flex-1`}
                        placeholder="Tag1, Tag2 (Enter to add)"
                      />
                      <button type="button" onClick={() => addTag('en')} className="inline-flex items-center justify-center rounded-[4px] border border-[#e7e8ee] bg-white px-3 py-2 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    {tagsEn.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tagsEn.map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc] px-2 py-1 text-[11px] text-[#656b76]">
                            {tag}
                            <button type="button" onClick={() => removeTag('en', tag)} className="hover:text-red-400 transition-colors"><X className="h-2.5 w-2.5" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Field>
                <Field label="Treść EN">
                  <textarea
                    value={contentEn}
                    onChange={(e) => setContentEn(e.target.value)}
                    placeholder="Post content..."
                    className={textareaCls}
                    rows={8}
                    disabled={uploadingImage}
                  />
                </Field>
              </>
            )}
          </div>

          <Collapsible title="SEO">
            <div className="space-y-4 border-t border-[#ececf1] px-4 pb-4 pt-4">
              {tab === 'pl' ? (
                <>
                  <Field label="Meta title PL">
                    <input type="text" value={metaTitlePl} onChange={(e) => setMetaTitlePl(e.target.value)} className={inputCls} placeholder="Meta tytuł..." />
                  </Field>
                  <Field label="Meta description PL">
                    <textarea value={metaDescPl} onChange={(e) => setMetaDescPl(e.target.value)} className={textareaCls} rows={3} placeholder="Meta opis..." />
                  </Field>

                  <div className="space-y-3 rounded-[4px] bg-[#fbfbfc] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b9098]">Podgląd w Google</p>
                    <div className="space-y-1">
                      <p className="truncate text-sm text-[#1a0dab] hover:underline" style={{ color: '#1a0dab' }}>
                        {(metaTitlePl || titlePl || 'Tytuł posta').slice(0, 60)}{((metaTitlePl || titlePl)?.length ?? 0) > 60 ? '...' : ''}
                      </p>
                      <p className="text-xs text-[#006621]">
                        vezvision.com › blog › {slug || 'url-slug'}
                      </p>
                      <p className="text-xs leading-5 text-[#545454]">
                        {(metaDescPl || excerptPl || contentPl.replace(/<[^>]+>/g, ' ').trim()).slice(0, 160)}{((metaDescPl || excerptPl || contentPl)?.length ?? 0) > 160 ? '...' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-[4px] bg-[#fbfbfc] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b9098]">Social preview</p>
                    <div className="overflow-hidden rounded border border-[#e7e8ee]">
                      <div className="h-32 w-full bg-gray-200" style={{
                        backgroundImage: featuredImage ? `url(${featuredImage})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }} />
                      <div className="bg-white p-2.5">
                        <p className="truncate text-xs font-medium text-[#111111]">
                          {(metaTitlePl || titlePl || 'Tytuł posta').slice(0, 80)}{((metaTitlePl || titlePl)?.length ?? 0) > 80 ? '...' : ''}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#656b76]">
                          vezvision.com
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Field label="Meta title EN">
                    <input type="text" value={metaTitleEn} onChange={(e) => setMetaTitleEn(e.target.value)} className={inputCls} placeholder="Meta title..." />
                  </Field>
                  <Field label="Meta description EN">
                    <textarea value={metaDescEn} onChange={(e) => setMetaDescEn(e.target.value)} className={textareaCls} rows={3} placeholder="Meta description..." />
                  </Field>

                  <div className="space-y-3 rounded-[4px] bg-[#fbfbfc] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b9098]">Google preview</p>
                    <div className="space-y-1">
                      <p className="truncate text-sm text-[#1a0dab] hover:underline" style={{ color: '#1a0dab' }}>
                        {(metaTitleEn || titleEn || 'Post title').slice(0, 60)}{((metaTitleEn || titleEn)?.length ?? 0) > 60 ? '...' : ''}
                      </p>
                      <p className="text-xs text-[#006621]">
                        vezvision.com › blog › {slug || 'url-slug'}
                      </p>
                      <p className="text-xs leading-5 text-[#545454]">
                        {(metaDescEn || excerptEn || contentEn.replace(/<[^>]+>/g, ' ').trim()).slice(0, 160)}{((metaDescEn || excerptEn || contentEn)?.length ?? 0) > 160 ? '...' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-[4px] bg-[#fbfbfc] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b9098]">Social preview</p>
                    <div className="overflow-hidden rounded border border-[#e7e8ee]">
                      <div className="h-32 w-full bg-gray-200" style={{
                        backgroundImage: featuredImage ? `url(${featuredImage})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }} />
                      <div className="bg-white p-2.5">
                        <p className="truncate text-xs font-medium text-[#111111]">
                          {(metaTitleEn || titleEn || 'Post title').slice(0, 80)}{((metaTitleEn || titleEn)?.length ?? 0) > 80 ? '...' : ''}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#656b76]">
                          vezvision.com
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Collapsible>
        </div>

        <div className="space-y-4">
          <div className="space-y-4 rounded-[6px] border border-[#e7e8ee] bg-white p-4 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-[#555b66]">Status</p>
              <select value={status} onChange={(e) => setStatus(e.target.value as VVStatus)} className={`${inputCls} h-9`}>
                <option value="draft">Szkic</option>
                {(canPublish || status === 'published') && <option value="published">Opublikowany</option>}
                <option value="archived">Archiwum</option>
                {(canPublish || status === 'scheduled') && <option value="scheduled">Zaplanowany</option>}
              </select>
            </div>

            {status === 'scheduled' && (
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-[#555b66]">Data publikacji</p>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className={`${inputCls} h-9`}
                  min={new Date().toISOString().slice(0, 16)}
                />
                {!scheduledFor && (
                  <p className="text-[11px] text-red-500">Wybierz datę publikacji</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between py-1">
              <span className="text-[11px] font-medium text-[#555b66]">Wyróżniony</span>
              <button type="button" onClick={() => setFeatured((v) => !v)} className={`h-5 w-10 rounded-full transition-colors ${featured ? 'bg-[#22a06b]' : 'bg-[#dfe1e7]'}`}>
                <span className={`block w-4 h-4 rounded-full bg-white transition-transform mx-0.5 ${featured ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-[#555b66]">Czas czytania</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={readingTime}
                  onChange={(e) => setReadingTime(Math.max(1, Number(e.target.value)))}
                  className={`${inputCls} h-8 w-20 text-center`}
                />
                <span className="text-xs text-[#656b76]">min</span>
              </div>
              <p className="text-[11px] text-[#8b9098]">Auto: {calcReadingTime(contentPl || 'x')} min</p>
            </div>

            {post?.created_at && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-[#555b66]">Utworzono</p>
                <p className="font-mono text-xs text-[#656b76]">{new Date(post.created_at).toLocaleDateString('pl-PL')}</p>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-[6px] border border-[#e7e8ee] bg-white p-4 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
            <p className="text-[11px] font-medium text-[#555b66]">Obraz wyróżniony</p>
            <input type="url" value={featuredImage} onChange={(e) => setFeaturedImage(e.target.value)} className={inputCls} placeholder="https://..." />
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-[4px] border border-[#e7e8ee] bg-white px-3 py-2 text-[12px] text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]">
                <ImagePlus className="h-3 w-3" />
                {uploadingImage ? 'Wgrywanie...' : 'Wgraj obraz'}
                <input type="file" accept="image/*" onChange={handleFeaturedImageUpload} disabled={uploadingImage} className="hidden" />
              </label>
              {featuredImage && (
                <button type="button" onClick={() => {
                  const insertImage = (prev: string) => `${prev}<img src="${featuredImage}" alt="" />`
                  if (tab === 'pl') setContentPl(insertImage)
                  else setContentEn(insertImage)
                }} className="inline-flex items-center gap-2 rounded-[4px] border border-[#e7e8ee] bg-white px-3 py-2 text-[12px] text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]">
                  <Wand2 className="h-3 w-3" />
                  Wstaw do treści
                </button>
              )}
            </div>
            {featuredImage && (
              <div className="overflow-hidden rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc]">
                <Image key={featuredImage} src={featuredImage} alt="Podgląd obrazka wyróżnionego" width={1200} height={400} className="h-40 w-full object-cover" unoptimized />
              </div>
            )}
          </div>

          {categories.length > 0 && (
            <div className="space-y-3 rounded-[6px] border border-[#e7e8ee] bg-white p-4 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
              <p className="text-[11px] font-medium text-[#555b66]">Kategorie</p>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 cursor-pointer group">
                    <Checkbox
                      checked={selectedCategoryIds.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                      aria-label={`Wybierz kategorię ${cat.name_pl}`}
                    />
                    <span className="text-xs text-[#656b76] transition-colors group-hover:text-[#111111]">{cat.name_pl}</span>
                    {cat.color && <span className="w-2 h-2 rounded-full ml-auto" style={{ backgroundColor: cat.color }} />}
                  </label>
                ))}
              </div>
            </div>
          )}

          {!isNew && (
            <a
              href={`/vezvision/blog/preview?id=${post.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-1.5 rounded-[4px] border border-[#e7e8ee] bg-white px-4 py-2.5 text-[12px] font-medium text-[#111111] transition-colors hover:bg-[#f0f0f4]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Podgląd
            </a>
          )}

          <div className="space-y-2 rounded-[6px] border border-[#e7e8ee] bg-white p-4 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
            {canManage && (
              <button type="button" onClick={() => handleSave(status)} disabled={saving} className="w-full rounded-[4px] border border-[#e7e8ee] bg-white px-4 py-2.5 text-[12px] font-medium text-[#111111] transition-colors hover:bg-[#f0f0f4] disabled:opacity-40">
                {saving ? 'Zapisywanie...' : 'Zapisz'}
              </button>
            )}
            {canPublish && (
              <button
                type="button"
                onClick={handlePublishToggle}
                disabled={saving}
                className={`w-full rounded-[4px] border px-4 py-2.5 text-[12px] font-medium transition-colors disabled:opacity-40 ${
                  status === 'published'
                    ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
                    : 'border-[#111111] bg-[#111111] text-white hover:bg-[#262626]'
                }`}
              >
                {status === 'published' ? 'Wycofaj publikację' : 'Opublikuj'}
              </button>
            )}
            {canManage && (
              <button type="button" onClick={() => handleSave('archived')} disabled={saving} className="w-full rounded-[4px] px-4 py-2.5 text-[12px] text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111] disabled:opacity-40">
                Archiwizuj
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
