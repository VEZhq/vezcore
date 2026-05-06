'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Plus, X, ChevronDown, ChevronUp, ImagePlus, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { createProject, updateProject, addProjectImage, removeProjectImage } from '@/lib/actions/vezvision/portfolio'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import type { VVProject, VVProjectImage, VVStatus, VVImageType } from '@/lib/actions/vezvision/types'

interface ProjectEditorProps {
  project: VVProject | null
  canManage: boolean
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

type Tab = 'pl' | 'en'

interface CollapsibleProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function Collapsible({ title, children, defaultOpen = false }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-[6px] border border-[#e7e8ee] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-[12px] font-medium text-[#111111] transition-colors hover:bg-[#fbfbfc]"
      >
        {title}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <div className="space-y-4 border-t border-[#ececf1] px-4 pb-4 pt-4">
          {children}
        </div>
      )}
    </div>
  )
}

interface FieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
}

function Field({ label, required, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium text-[#555b66]">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc] px-3 py-2 text-[13px] text-[#111111] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#d7d9e2] focus:bg-white'
const textareaCls = `${inputCls} resize-none`
const IMAGE_TYPES: VVImageType[] = ['screenshot', 'mockup', 'logo', 'banner']

export default function ProjectEditor({ project, canManage }: ProjectEditorProps) {
  const router = useRouter()
  const { token: csrfToken } = useCSRFToken()
  const isNew = !project
  const coverFileInputRef = useRef<HTMLInputElement | null>(null)
  const imageFileInputRef = useRef<HTMLInputElement | null>(null)

  const [tab, setTab] = useState<Tab>('pl')
  const [saving, setSaving] = useState(false)

  const [slug, setSlug] = useState(project?.slug ?? '')
  const [slugManual, setSlugManual] = useState(!isNew)
  const [clientName, setClientName] = useState(project?.client_name ?? '')
  const [demoUrl, setDemoUrl] = useState(project?.demo_url ?? '')
  const [githubUrl, setGithubUrl] = useState(project?.github_url ?? '')
  const [coverImage, setCoverImage] = useState(project?.cover_image ?? '')
  const [showDemoUrl, setShowDemoUrl] = useState(project?.show_demo_url ?? true)
  const [showCoverImage, setShowCoverImage] = useState(project?.show_cover_image ?? true)
  const [showChallenge, setShowChallenge] = useState(project?.show_challenge ?? true)
  const [showSolution, setShowSolution] = useState(project?.show_solution ?? true)
  const [status, setStatus] = useState<VVStatus>(project?.status ?? 'draft')
  const [featured, setFeatured] = useState(project?.featured ?? false)
  const [orderIndex, setOrderIndex] = useState<string>(project ? String(project.order_index) : '')
  const [orderIndexChanged, setOrderIndexChanged] = useState(false)

  const [titlePl, setTitlePl] = useState(project?.title_pl ?? '')
  const [titleEn, setTitleEn] = useState(project?.title_en ?? '')
  const [shortDescPl, setShortDescPl] = useState(project?.short_desc_pl ?? '')
  const [shortDescEn, setShortDescEn] = useState(project?.short_desc_en ?? '')
  const [descriptionPl, setDescriptionPl] = useState(project?.description_pl ?? '')
  const [descriptionEn, setDescriptionEn] = useState(project?.description_en ?? '')

  const [challengePl, setChallengePl] = useState(project?.challenge_pl ?? '')
  const [challengeEn, setChallengeEn] = useState(project?.challenge_en ?? '')
  const [solutionPl, setSolutionPl] = useState(project?.solution_pl ?? '')
  const [solutionEn, setSolutionEn] = useState(project?.solution_en ?? '')

  const [seoTitlePl, setSeoTitlePl] = useState(project?.seo_title_pl ?? '')
  const [seoTitleEn, setSeoTitleEn] = useState(project?.seo_title_en ?? '')
  const [seoDescPl, setSeoDescPl] = useState(project?.seo_desc_pl ?? '')
  const [seoDescEn, setSeoDescEn] = useState(project?.seo_desc_en ?? '')

  const [images, setImages] = useState<VVProjectImage[]>(project?.images ?? [])
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [imageType, setImageType] = useState<VVImageType>('screenshot')
  const [imageLoading, setImageLoading] = useState(false)

  const handleTitlePlChange = (value: string) => {
    setTitlePl(value)
    if (!slugManual) setSlug(slugify(value))
  }

  const handleCoverImageUpload = async (file: File) => {
    if (!canManage) return
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    const safeSlug = slugify(slug || titlePl || 'project') || 'project'
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'png'
    const path = `portfolio/cover/${safeSlug}-${Date.now()}.${ext}`
    const formData = new FormData()
    formData.append('bucket', 'vv-portfolio-images')
    formData.append('path', path)
    formData.append('csrfToken', csrfToken)
    formData.append('file', file)

    const response = await fetch('/api/vezvision/upload-image', {
      method: 'POST',
      body: formData,
    })

    const uploaded = (await response.json()) as { success: boolean; data?: string; error?: string }
    if (!uploaded.success || !uploaded.data) {
      toast.error(uploaded.error ?? 'Błąd podczas uploadu pliku')
      return
    }

    setCoverImage(uploaded.data)
    toast.success('Okładka została przesłana')
  }

  const handleAddImage = async () => {
    if (!canManage || !project || !imageUrl.trim()) return
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }
    setImageLoading(true)
    const result = await addProjectImage(project.id, {
      path: imageUrl.trim(),
      type: imageType,
      alt_pl: imageAlt || null,
      alt_en: null,
      order_index: images.length,
    }, csrfToken)
    if (result.success) {
      setImages((prev) => [...prev, result.data])
      setImageUrl('')
      setImageAlt('')
    } else {
      toast.error(result.error)
    }
    setImageLoading(false)
  }

  const handleImageFileUpload = async (file: File) => {
    if (!canManage || !project) return
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    const safeSlug = slugify(slug || titlePl || 'project') || 'project'
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'png'
    const path = `portfolio/images/${safeSlug}-${Date.now()}.${ext}`
    const formData = new FormData()
    formData.append('bucket', 'vv-portfolio-images')
    formData.append('path', path)
    formData.append('csrfToken', csrfToken)
    formData.append('file', file)

    setImageLoading(true)
    try {
      const response = await fetch('/api/vezvision/upload-image', {
        method: 'POST',
        body: formData,
      })

      const uploaded = (await response.json()) as { success: boolean; data?: string; error?: string }
      if (!uploaded.success || !uploaded.data) {
        toast.error(uploaded.error ?? 'Błąd podczas uploadu pliku')
        return
      }

      const result = await addProjectImage(project.id, {
        path: uploaded.data,
        type: imageType,
        alt_pl: imageAlt || null,
        alt_en: null,
        order_index: images.length,
      }, csrfToken)

      if (result.success) {
        setImages((prev) => [...prev, result.data])
        setImageAlt('')
        toast.success('Zdjęcie dodane')
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Błąd podczas uploadu pliku')
    } finally {
      setImageLoading(false)
    }
  }

  const handleRemoveImage = async (img: VVProjectImage) => {
    if (!canManage || !project) return
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }
    setImageLoading(true)
    const result = await removeProjectImage(img.id, project.id, csrfToken)
    if (result.success) {
      setImages((prev) => prev.filter((i) => i.id !== img.id))
    } else {
      toast.error(result.error)
    }
    setImageLoading(false)
  }

  const handleSave = async () => {
    if (!canManage) return
    if (!titlePl.trim()) {
      toast.error('Tytuł PL jest wymagany')
      return
    }
    if (!slug.trim()) {
      toast.error('Slug jest wymagany')
      return
    }

    setSaving(true)
    try {
      if (!csrfToken) {
        toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
        return
      }

      const parsedOrder = orderIndex.trim() === '' ? undefined : parseInt(orderIndex, 10)
      const normalizedOrder = Number.isNaN(parsedOrder) ? undefined : parsedOrder

      const input = {
        slug,
        status,
        featured,
        order_index: orderIndexChanged ? normalizedOrder : undefined,
        cover_image: coverImage || null,
        show_cover_image: showCoverImage,
        demo_url: showDemoUrl ? (demoUrl || null) : null,
        github_url: githubUrl || null,
        show_demo_url: showDemoUrl,
        show_challenge: showChallenge,
        show_solution: showSolution,
        client_name: clientName || null,
        title_pl: titlePl,
        title_en: titleEn || null,
        short_desc_pl: shortDescPl || null,
        short_desc_en: shortDescEn || null,
        description_pl: descriptionPl || null,
        description_en: descriptionEn || null,
        challenge_pl: challengePl || null,
        challenge_en: challengeEn || null,
        solution_pl: solutionPl || null,
        solution_en: solutionEn || null,
        seo_title_pl: seoTitlePl || null,
        seo_title_en: seoTitleEn || null,
        seo_desc_pl: seoDescPl || null,
        seo_desc_en: seoDescEn || null,
      }

      const result = isNew
        ? await createProject(input, csrfToken)
        : await updateProject(project.id, input, csrfToken)

      if (result.success) {
        toast.success(isNew ? 'Projekt utworzony' : 'Projekt zapisany')
        router.push('/vezvision/portfolio')
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Wystąpił nieoczekiwany błąd')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="light w-full px-5 py-4 text-[#111111] xl:px-6">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/vezvision/portfolio"
          className="flex items-center gap-2 rounded-[4px] px-2 py-1.5 text-[12px] text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]"
        >
          <ArrowLeft className="h-3 w-3" />
          Portfolio
        </Link>
        <div className="h-4 w-px bg-[#e7e8ee]" />
        <h1 className="truncate text-[21px] font-medium tracking-[-0.04em] text-[#111111]">
          {isNew ? 'Nowy projekt' : titlePl || 'Edytuj projekt'}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="space-y-4 rounded-[6px] border border-[#e7e8ee] bg-white p-4 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Slug" required>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugManual(true) }}
                  className={inputCls}
                  placeholder="url-slug"
                />
              </Field>
              <Field label="Klient">
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className={inputCls}
                  placeholder="Nazwa klienta..."
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Demo URL">
                <input
                  type="url"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  className={inputCls}
                  placeholder="https://..."
                />
              </Field>
              <Field label="GitHub URL">
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className={inputCls}
                  placeholder="https://github.com/..."
                />
              </Field>
            </div>

            <Field label="Obraz okładki">
              <div className="space-y-2">
                <input
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className={inputCls}
                  placeholder="https://..."
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-[4px] border border-[#e7e8ee] bg-white px-3 py-2 text-[12px] text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]"
                  >
                    <ImagePlus className="h-3 w-3" />
                    Dodaj plik okładki
                  </button>
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const input = e.currentTarget
                      const file = e.target.files?.[0]
                      if (file) await handleCoverImageUpload(file)
                      input.value = ''
                    }}
                  />
                </div>
                {coverImage && (
                  <div className="relative h-40 w-full overflow-hidden rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc]">
                    <Image src={coverImage} alt="Podgląd okładki" fill className="object-cover" unoptimized />
                  </div>
                )}
              </div>
            </Field>
          </div>

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

          <div className="space-y-4 rounded-[6px] border border-[#e7e8ee] bg-white p-4 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
            {tab === 'pl' ? (
              <>
                <Field label="Tytuł PL" required>
                  <input type="text" value={titlePl} onChange={(e) => handleTitlePlChange(e.target.value)} className={inputCls} placeholder="Nazwa projektu..." />
                </Field>
                <Field label="Krótki opis PL">
                  <textarea value={shortDescPl} onChange={(e) => setShortDescPl(e.target.value)} className={textareaCls} rows={2} placeholder="Krótki opis projektu..." />
                </Field>
                <Field label="Opis PL">
                  <textarea value={descriptionPl} onChange={(e) => setDescriptionPl(e.target.value)} className={textareaCls} rows={8} placeholder="Pełny opis projektu..." />
                </Field>
              </>
            ) : (
              <>
                <Field label="Tytuł EN">
                  <input type="text" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className={inputCls} placeholder="Project name..." />
                </Field>
                <Field label="Krótki opis EN">
                  <textarea value={shortDescEn} onChange={(e) => setShortDescEn(e.target.value)} className={textareaCls} rows={2} placeholder="Short project description..." />
                </Field>
                <Field label="Opis EN">
                  <textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} className={textareaCls} rows={8} placeholder="Full project description..." />
                </Field>
              </>
            )}
          </div>

          <Collapsible title="Case Study">
            <div className="pt-4 space-y-4">
              {tab === 'pl' ? (
                <>
                  <Field label="Wyzwanie PL">
                    <textarea value={challengePl} onChange={(e) => setChallengePl(e.target.value)} className={textareaCls} rows={4} placeholder="Opis wyzwania..." />
                  </Field>
                  <Field label="Rozwiązanie PL">
                    <textarea value={solutionPl} onChange={(e) => setSolutionPl(e.target.value)} className={textareaCls} rows={4} placeholder="Opis rozwiązania..." />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Challenge EN">
                    <textarea value={challengeEn} onChange={(e) => setChallengeEn(e.target.value)} className={textareaCls} rows={4} placeholder="Challenge description..." />
                  </Field>
                  <Field label="Solution EN">
                    <textarea value={solutionEn} onChange={(e) => setSolutionEn(e.target.value)} className={textareaCls} rows={4} placeholder="Solution description..." />
                  </Field>
                </>
              )}
            </div>
          </Collapsible>

          <Collapsible title="SEO">
            <div className="pt-4 space-y-4">
              {tab === 'pl' ? (
                <>
                  <Field label="SEO title PL">
                    <input type="text" value={seoTitlePl} onChange={(e) => setSeoTitlePl(e.target.value)} className={inputCls} placeholder="SEO tytuł..." />
                  </Field>
                  <Field label="SEO description PL">
                    <textarea value={seoDescPl} onChange={(e) => setSeoDescPl(e.target.value)} className={textareaCls} rows={3} placeholder="SEO opis..." />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="SEO title EN">
                    <input type="text" value={seoTitleEn} onChange={(e) => setSeoTitleEn(e.target.value)} className={inputCls} placeholder="SEO title..." />
                  </Field>
                  <Field label="SEO description EN">
                    <textarea value={seoDescEn} onChange={(e) => setSeoDescEn(e.target.value)} className={textareaCls} rows={3} placeholder="SEO description..." />
                  </Field>
                </>
              )}
            </div>
          </Collapsible>

          {!isNew && (
            <Collapsible title="Zdjęcia projektu">
              <div className="pt-4 space-y-4">
                 <div className="grid grid-cols-[1fr_120px_auto_auto] gap-2 items-end">
                   <Field label="URL zdjęcia">
                      <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={inputCls} placeholder="https://..." />
                   </Field>
                   <Field label="Typ">
                      <select value={imageType} onChange={(e) => setImageType(e.target.value as VVImageType)} className={`${inputCls} h-9`}>
                       {IMAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                     </select>
                   </Field>
                   <Field label="Alt text">
                      <input type="text" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} className={inputCls} placeholder="Opis..." />
                   </Field>
                    <button type="button" onClick={handleAddImage} disabled={imageLoading || !imageUrl.trim()} className="px-3 h-9 text-[10px] text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 disabled:opacity-40 transition-colors mt-[22px]">
                     <Plus className="h-3 w-3" />
                   </button>
                 </div>

                 <div className="flex items-center gap-2">
                   <button
                     type="button"
                     onClick={() => imageFileInputRef.current?.click()}
                     className="inline-flex items-center gap-2 rounded-[4px] border border-[#e7e8ee] bg-white px-3 py-2 text-[12px] text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]"
                   >
                     <ImagePlus className="h-3 w-3" />
                     Dodaj plik
                   </button>
                   <input
                     ref={imageFileInputRef}
                     type="file"
                     accept="image/*"
                     className="hidden"
                     onChange={async (e) => {
                       const input = e.currentTarget
                       const file = e.target.files?.[0]
                       if (file) await handleImageFileUpload(file)
                       input.value = ''
                     }}
                   />
                 </div>

                {images.length > 0 && (
                  <div className="space-y-2">
                    {images.map((img) => (
                       <div key={img.id} className="flex items-center gap-3 rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc] px-3 py-2">
                         <div className="relative h-8 w-12 flex-shrink-0 overflow-hidden rounded-[3px] bg-[#ececf1]">
                           <Image src={img.path} alt={img.alt_pl ?? ''} fill sizes="48px" className="object-cover" unoptimized />
                         </div>
                         <div className="min-w-0 flex-1">
                           <p className="truncate font-mono text-[10px] text-[#8b9098]">{img.path}</p>
                           <p className="text-[9px] uppercase tracking-[0.15em] text-[#656b76]">{img.type}</p>
                         </div>
                          <button type="button" onClick={() => handleRemoveImage(img)} disabled={imageLoading} className="rounded-[4px] p-1 text-[#656b76] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                           <X className="h-3 w-3" />
                         </button>
                       </div>
                    ))}
                  </div>
                )}
              </div>
            </Collapsible>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-4 rounded-[6px] border border-[#e7e8ee] bg-white p-4 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as VVStatus)} className={`${inputCls} h-9`}>
                <option value="draft">Szkic</option>
                <option value="published">Opublikowany</option>
                <option value="archived">Archiwum</option>
              </select>
            </Field>

            <Field label="Kolejność">
              <input type="number" value={orderIndex} onChange={(e) => { setOrderIndex(e.target.value); setOrderIndexChanged(true) }} className={inputCls} min="0" placeholder={isNew ? 'Automatycznie na końcu listy' : 'Numer pozycji'} />
              <p className="mt-1 text-[11px] text-[#8b9098]">Po zapisaniu kolejność pozostałych projektów zostanie przeliczona automatycznie.</p>
            </Field>

            <div className="flex items-center justify-between py-1">
              <span className="text-[11px] font-medium text-[#555b66]">Featured</span>
              <button type="button" onClick={() => setFeatured((v) => !v)} className={`h-5 w-10 rounded-full transition-colors ${featured ? 'bg-[#22a06b]' : 'bg-[#dfe1e7]'}`}>
                <span className={`mx-0.5 block h-4 w-4 rounded-full bg-white transition-transform ${featured ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-[11px] font-medium text-[#555b66]">Pokaż wyzwanie</span>
              <button type="button" onClick={() => setShowChallenge((v) => !v)} className={`h-5 w-10 rounded-full transition-colors ${showChallenge ? 'bg-[#22a06b]' : 'bg-[#dfe1e7]'}`}>
                <span className={`mx-0.5 block h-4 w-4 rounded-full bg-white transition-transform ${showChallenge ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-[11px] font-medium text-[#555b66]">Pokaż rozwiązanie</span>
              <button type="button" onClick={() => setShowSolution((v) => !v)} className={`h-5 w-10 rounded-full transition-colors ${showSolution ? 'bg-[#22a06b]' : 'bg-[#dfe1e7]'}`}>
                <span className={`mx-0.5 block h-4 w-4 rounded-full bg-white transition-transform ${showSolution ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-[11px] font-medium text-[#555b66]">Pokaż przycisk Zobacz online</span>
              <button type="button" onClick={() => setShowDemoUrl((v) => !v)} className={`h-5 w-10 rounded-full transition-colors ${showDemoUrl ? 'bg-[#22a06b]' : 'bg-[#dfe1e7]'}`}>
                <span className={`mx-0.5 block h-4 w-4 rounded-full bg-white transition-transform ${showDemoUrl ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-[11px] font-medium text-[#555b66]">Pokaż zdjęcie okładki</span>
              <button type="button" onClick={() => setShowCoverImage((v) => !v)} className={`h-5 w-10 rounded-full transition-colors ${showCoverImage ? 'bg-[#22a06b]' : 'bg-[#dfe1e7]'}`}>
                <span className={`mx-0.5 block h-4 w-4 rounded-full bg-white transition-transform ${showCoverImage ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          <div className="space-y-2 rounded-[6px] border border-[#e7e8ee] bg-white p-4 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
             <button type="button" onClick={handleSave} disabled={saving} className="w-full rounded-[4px] border border-[#e7e8ee] bg-white px-4 py-2.5 text-[12px] font-medium text-[#111111] transition-colors hover:bg-[#f0f0f4] disabled:opacity-40">
              {saving ? 'Zapisywanie...' : 'Zapisz'}
            </button>
            {!isNew && project && (
              <Link
                href={`/vezvision/portfolio/preview?id=${project.id}`}
                target="_blank"
                className="flex w-full items-center justify-center gap-1.5 rounded-[4px] border border-[#e7e8ee] bg-white px-4 py-2.5 text-[12px] font-medium text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]"
              >
                <Eye className="h-3.5 w-3.5" />
                Podgląd
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
