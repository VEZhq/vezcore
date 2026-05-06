'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ChevronUp, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { createService, updateService } from '@/lib/actions/vezvision/services'
import { Checkbox } from '@/components/ui/checkbox'
import type { VVService, VVServiceCategory, VVServiceStatus } from '@/lib/actions/vezvision/types'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import { SERVICE_ICON_OPTIONS, getServiceIcon, getServiceIconTextFallback } from '../serviceIcons'

interface ServiceEditorProps {
  service: VVService | null
  categories: VVServiceCategory[]
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

export default function ServiceEditor({ service, categories, canManage }: ServiceEditorProps) {
  const router = useRouter()
  const { token: csrfToken } = useCSRFToken()
  const isNew = !service

  const [tab, setTab] = useState<Tab>('pl')
  const [saving, setSaving] = useState(false)

  const [slug, setSlug] = useState(service?.slug ?? '')
  const [slugManual, setSlugManual] = useState(!isNew)
  const [icon, setIcon] = useState(service?.icon ?? '')
  const [status, setStatus] = useState<VVServiceStatus>(service?.status ?? 'draft')
  const [orderIndex, setOrderIndex] = useState<string>(isNew ? '' : String(service.order_index))
  const [orderIndexChanged, setOrderIndexChanged] = useState(false)

  const [titlePl, setTitlePl] = useState(service?.title_pl ?? '')
  const [titleEn, setTitleEn] = useState(service?.title_en ?? '')
  const [shortDescPl, setShortDescPl] = useState(service?.short_desc_pl ?? '')
  const [shortDescEn, setShortDescEn] = useState(service?.short_desc_en ?? '')
  const [descriptionPl, setDescriptionPl] = useState(service?.description_pl ?? '')
  const [descriptionEn, setDescriptionEn] = useState(service?.description_en ?? '')

  const [metaTitlePl, setMetaTitlePl] = useState(service?.meta_title_pl ?? '')
  const [metaTitleEn, setMetaTitleEn] = useState(service?.meta_title_en ?? '')
  const [metaDescPl, setMetaDescPl] = useState(service?.meta_desc_pl ?? '')
  const [metaDescEn, setMetaDescEn] = useState(service?.meta_desc_en ?? '')

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    service?.categories?.map((c) => c.id) ?? []
  )

  const handleTitlePlChange = (value: string) => {
    setTitlePl(value)
    if (!slugManual) setSlug(slugify(value))
  }

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
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
        order_index: orderIndexChanged ? normalizedOrder : undefined,
        icon: icon || null,
        title_pl: titlePl,
        title_en: titleEn || null,
        short_desc_pl: shortDescPl || null,
        short_desc_en: shortDescEn || null,
        description_pl: descriptionPl || null,
        description_en: descriptionEn || null,
        meta_title_pl: metaTitlePl || null,
        meta_title_en: metaTitleEn || null,
        meta_desc_pl: metaDescPl || null,
        meta_desc_en: metaDescEn || null,
        category_ids: selectedCategoryIds,
      }

      const result = isNew
        ? await createService(input, csrfToken)
        : await updateService(service.id, input, csrfToken)

      if (result.success) {
        toast.success(isNew ? 'Usługa utworzona' : 'Usługa zapisana')
        router.push('/vezvision/services')
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
          href="/vezvision/services"
          className="flex items-center gap-2 rounded-[4px] px-2 py-1.5 text-[12px] text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]"
        >
          <ArrowLeft className="h-3 w-3" />
          Usługi
        </Link>
        <div className="h-4 w-px bg-[#e7e8ee]" />
        <h1 className="truncate text-[21px] font-medium tracking-[-0.04em] text-[#111111]">
          {isNew ? 'Nowa usługa' : titlePl || 'Edytuj usługę'}
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
              <Field label="Ikona">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      list="service-icons-list"
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      className={`${inputCls} flex-1`}
                      placeholder="Wybierz ikonę z listy"
                    />
                    <div className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc]">
                      {(() => {
                        const SelectedIcon = getServiceIcon(icon)
                        if (SelectedIcon) return <SelectedIcon className="h-4 w-4 text-emerald-600" />
                        return <span className="text-sm leading-none text-[#656b76]">{getServiceIconTextFallback(icon)}</span>
                      })()}
                    </div>
                  </div>
                  <datalist id="service-icons-list">
                    {SERVICE_ICON_OPTIONS.map((iconName) => (
                      <option key={iconName} value={iconName} />
                    ))}
                  </datalist>
                  <p className="text-[11px] text-[#8b9098]">Dostępna jest rozszerzona lista ikon (Lucide). Zacznij wpisywać nazwę, aby filtrować.</p>
                </div>
              </Field>
            </div>
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
                {t === 'pl' ? 'Polski' : 'Angielski'}
                {t === 'pl' && <span className="ml-1 text-red-500">*</span>}
              </button>
            ))}
          </div>

          <div className="space-y-4 rounded-[6px] border border-[#e7e8ee] bg-white p-4 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
            {tab === 'pl' ? (
              <>
                <Field label="Tytuł PL" required>
                  <input
                    type="text"
                    value={titlePl}
                    onChange={(e) => handleTitlePlChange(e.target.value)}
                    className={inputCls}
                    placeholder="Nazwa usługi..."
                  />
                </Field>
                <Field label="Krótki opis PL">
                  <textarea
                    value={shortDescPl}
                    onChange={(e) => setShortDescPl(e.target.value)}
                    className={textareaCls}
                    rows={2}
                    placeholder="Krótki opis widoczny w kartach..."
                  />
                </Field>
                <Field label="Opis PL">
                  <textarea
                    value={descriptionPl}
                    onChange={(e) => setDescriptionPl(e.target.value)}
                    className={textareaCls}
                    rows={8}
                    placeholder="Pełny opis usługi..."
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Tytuł EN">
                  <input
                    type="text"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    className={inputCls}
                    placeholder="Nazwa usługi..."
                  />
                </Field>
                <Field label="Krótki opis EN">
                  <textarea
                    value={shortDescEn}
                    onChange={(e) => setShortDescEn(e.target.value)}
                    className={textareaCls}
                    rows={2}
                    placeholder="Krótki opis widoczny w kartach..."
                  />
                </Field>
                <Field label="Opis EN">
                  <textarea
                    value={descriptionEn}
                    onChange={(e) => setDescriptionEn(e.target.value)}
                    className={textareaCls}
                    rows={8}
                    placeholder="Pełny opis usługi..."
                  />
                </Field>
              </>
            )}
          </div>

          <Collapsible title="SEO">
            <div className="space-y-4 pt-2">
              {tab === 'pl' ? (
                <>
                  <Field label="Meta tytuł PL">
                    <input type="text" value={metaTitlePl} onChange={(e) => setMetaTitlePl(e.target.value)} className={inputCls} placeholder="Meta tytuł..." />
                  </Field>
                  <Field label="Meta opis PL">
                    <textarea value={metaDescPl} onChange={(e) => setMetaDescPl(e.target.value)} className={textareaCls} rows={3} placeholder="Meta opis..." />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Meta tytuł EN">
                    <input type="text" value={metaTitleEn} onChange={(e) => setMetaTitleEn(e.target.value)} className={inputCls} placeholder="Meta tytuł..." />
                  </Field>
                  <Field label="Meta opis EN">
                    <textarea value={metaDescEn} onChange={(e) => setMetaDescEn(e.target.value)} className={textareaCls} rows={3} placeholder="Meta opis..." />
                  </Field>
                </>
              )}
            </div>
          </Collapsible>
        </div>

        <div className="space-y-4">
          <div className="space-y-4 rounded-[6px] border border-[#e7e8ee] bg-white p-4 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
            <Field label="Status usługi">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VVServiceStatus)}
                className={`${inputCls} h-9`}
              >
                <option value="draft">Szkic</option>
                <option value="active">Aktywna</option>
                <option value="archived">Archiwum</option>
              </select>
            </Field>

            <Field label="Kolejność">
              <input
                type="number"
                value={orderIndex}
                onChange={(e) => { setOrderIndex(e.target.value); setOrderIndexChanged(true) }}
                className={inputCls}
                min="0"
                placeholder={isNew ? 'Automatycznie na końcu listy' : 'Numer pozycji'}
              />
              <p className="mt-1 text-[11px] text-[#8b9098]">
                Po zapisaniu kolejność pozostałych usług zostanie przeliczona automatycznie.
              </p>
            </Field>
          </div>

          {categories.length > 0 && (
            <div className="space-y-3 rounded-[6px] border border-[#e7e8ee] bg-white p-4 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
              <p className="text-[11px] font-medium text-[#555b66]">Kategorie</p>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <label key={cat.id} className="flex cursor-pointer items-center gap-2 group">
                    <Checkbox
                      checked={selectedCategoryIds.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                      aria-label={`Wybierz kategorię ${cat.name_pl}`}
                      disabled={false}
                    />
                    <span className="text-[12px] text-[#656b76] transition-colors group-hover:text-[#111111]">
                      {cat.name_pl}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-[6px] border border-[#e7e8ee] bg-white p-4 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-[4px] border border-[#e7e8ee] bg-white px-4 py-2.5 text-[12px] font-medium text-[#111111] transition-colors hover:bg-[#f0f0f4] disabled:opacity-40"
            >
              {saving ? 'Zapisywanie...' : 'Zapisz'}
            </button>
            {!isNew && service && (
              <Link
                href={`/vezvision/services/preview?id=${service.id}`}
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
