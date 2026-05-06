'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Eye, Monitor, Smartphone, Clock, X, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import { generateEmailHtml, DEFAULT_UNSUBSCRIBE_URL } from '@/lib/newsletter/email-template'
import { createNewsletterCampaign, updateNewsletterCampaign } from '@/lib/actions/vezvision/newsletter/campaigns'
import type { NewsletterSettings } from '@/lib/actions/vezvision/newsletter/settings'
import type { NewsletterTemplate } from '@/lib/actions/vezvision/newsletter/templates'
import type { VVNewsletterCampaign } from '@/lib/actions/vezvision/types'
import type { CampaignLanguage } from '@/lib/newsletter/email-template'

interface CampaignEditorClientProps {
  mode: 'create' | 'edit'
  campaign?: VVNewsletterCampaign
  settings: NewsletterSettings | null
  templates?: NewsletterTemplate[]
}

export default function CampaignEditorClient({ mode, campaign, settings, templates = [] }: CampaignEditorClientProps) {
  const router = useRouter()
  const { token: csrfToken } = useCSRFToken()
  const [activeLang, setActiveLang] = useState<CampaignLanguage>('pl')
  const [subject, setSubject] = useState(campaign?.subject ?? '')
  const [content, setContent] = useState(campaign?.content_html ?? '<p></p>')
  const [subjectEn, setSubjectEn] = useState(campaign?.subject_en ?? '')
  const [contentEn, setContentEn] = useState(campaign?.content_html_en ?? '<p></p>')
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [showPreview, setShowPreview] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scheduledFor, setScheduledFor] = useState<string>(
    campaign?.scheduled_for ? new Date(campaign.scheduled_for).toISOString().slice(0, 16) : ''
  )
  const [segmentTags, setSegmentTags] = useState<string[]>(
    (campaign?.segment_tags as string[]) ?? []
  )
  const [segmentLanguage, setSegmentLanguage] = useState<string>(
    campaign?.segment_language ?? ''
  )
  const [newTag, setNewTag] = useState('')

  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'vv-newsletter-images')
      formData.append('path', `newsletter/${Date.now()}-${file.name}`)
      formData.append('csrfToken', csrfToken || '')

      const res = await fetch('/api/vezvision/upload-image', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json() as { success: boolean; data?: string; error?: string }
      if (!json.success || !json.data) {
        toast.error(json.error || 'Błąd uploadu obrazu')
        return null
      }
      return json.data
    } catch {
      toast.error('Błąd uploadu obrazu')
      return null
    }
  }

  const activeSubject = activeLang === 'pl' ? subject : subjectEn
  const activeContent = activeLang === 'pl' ? content : contentEn

  const setActiveSubject = (value: string) => {
    if (activeLang === 'pl') setSubject(value)
    else setSubjectEn(value)
  }

  const setActiveContent = (value: string) => {
    if (activeLang === 'pl') setContent(value)
    else setContentEn(value)
  }

  const appendVariable = (variable: string) => {
    if (activeLang === 'pl') setContent((prev) => prev + variable)
    else setContentEn((prev) => prev + variable)
  }

  const loadTemplate = (template: NewsletterTemplate) => {
    setContent(template.content_html)
    if (template.content_html_en) {
      setContentEn(template.content_html_en)
    }
    toast.success(`Szablon "${template.name}" załadowany`)
  }

  const [debouncedContent, setDebouncedContent] = useState(activeContent)
  const [debouncedSubject, setDebouncedSubject] = useState(activeSubject)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedContent(activeContent)
      setDebouncedSubject(activeSubject)
    }, 300)
    return () => clearTimeout(timer)
  }, [activeContent, activeSubject])

  const previewHtml = useMemo(
    () =>
      generateEmailHtml(
        debouncedSubject || (activeLang === 'pl' ? 'Podgląd tematu' : 'Subject preview'),
        debouncedContent,
        settings,
        DEFAULT_UNSUBSCRIBE_URL,
        activeLang
      ),
    [debouncedSubject, debouncedContent, settings, activeLang]
  )

  const handleSave = async () => {
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa')
      return
    }
    if (!subject.trim()) {
      toast.error('Temat jest wymagany')
      return
    }
    if (!content.trim() || content === '<p></p>') {
      toast.error('Treść jest wymagana')
      return
    }

    if (scheduledFor && new Date(scheduledFor) <= new Date()) {
      toast.error('Data harmonogramu musi być w przyszłości')
      return
    }

    setSaving(true)
    const status = scheduledFor ? 'scheduled' : 'draft'
    const scheduledForIso = scheduledFor ? new Date(scheduledFor).toISOString() : null

    if (mode === 'create') {
      const createInput = {
        subject,
        content_html: content,
        subject_en: subjectEn,
        content_html_en: contentEn,
        status,
        scheduled_for: scheduledForIso,
        segment_tags: segmentTags.length > 0 ? segmentTags : null,
        segment_language: segmentLanguage || null,
      }
      const result = await createNewsletterCampaign(
        createInput,
        csrfToken
      )
      if (result.success) {
        toast.success(scheduledFor ? 'Kampania zaplanowana' : 'Kampania utworzona')
        router.push('/vezvision/newsletter/campaigns')
      } else {
        toast.error(result.error)
      }
    } else if (campaign) {
      const updateInput = {
        subject,
        content_html: content,
        subject_en: subjectEn,
        content_html_en: contentEn,
        status,
        scheduled_for: scheduledForIso,
        segment_tags: segmentTags.length > 0 ? segmentTags : null,
        segment_language: segmentLanguage || null,
      }
      const result = await updateNewsletterCampaign(
        campaign.id,
        updateInput,
        csrfToken
      )
      if (result.success) {
        toast.success(scheduledFor ? 'Harmonogram zapisany' : 'Kampania zaktualizowana')
        router.push('/vezvision/newsletter/campaigns')
      } else {
        toast.error(result.error)
      }
    }
    setSaving(false)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#ececf1] px-5 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/vezvision/newsletter/campaigns"
            className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-[14px] font-medium text-[#111111]">
              {mode === 'create' ? 'Nowa kampania' : 'Edycja kampanii'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-[#8b9098]" />
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="h-8 rounded-[4px] border border-[#e7e8ee] bg-white px-2 text-[11px] text-[#111111] outline-none focus:border-[#d7d9e2]"
              title="Harmonogram wysyłki (opcjonalnie)"
            />
            {scheduledFor && (
              <button
                type="button"
                onClick={() => setScheduledFor('')}
                className="rounded-[4px] p-1 text-[#8b9098] transition-colors hover:text-[#111111]"
                title="Wyczyść harmonogram"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-[4px] border px-3 text-[11px] transition-colors ${
              showPreview
                ? 'border-[#e7e8ee] bg-[#f0f0f4] text-[#111111]'
                : 'border-[#e7e8ee] bg-white text-[#656b76] hover:bg-[#f7f7f9]'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Podgląd
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode(previewMode === 'desktop' ? 'mobile' : 'desktop')}
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[#e7e8ee] bg-white px-3 text-[11px] text-[#656b76] transition-colors hover:bg-[#f7f7f9]"
          >
            {previewMode === 'desktop' ? (
              <>
                <Monitor className="h-3.5 w-3.5" />
                Desktop
              </>
            ) : (
              <>
                <Smartphone className="h-3.5 w-3.5" />
                Mobile
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] bg-[#111111] px-3 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-[#262626] disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Zapisywanie...' : mode === 'create' ? 'Utwórz kampanię' : 'Zapisz zmiany'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-5 overflow-hidden p-5">
        <div className={`flex flex-col gap-4 overflow-auto rounded-[6px] border border-[#e7e8ee] bg-white p-5 shadow-[0_8px_26px_rgba(25,29,42,0.04)] ${showPreview ? 'w-1/2' : 'w-full'}`}>
          <div className="flex w-fit rounded-[4px] border border-[#e7e8ee] bg-[#f7f7f9] p-0.5">
            {(['pl', 'en'] as const).map((language) => (
              <button
                key={language}
                type="button"
                onClick={() => setActiveLang(language)}
                className={`h-8 rounded-[3px] px-3 text-[11px] font-medium transition-colors ${
                  activeLang === language
                    ? 'bg-white text-[#111111] shadow-sm'
                    : 'text-[#656b76] hover:text-[#111111]'
                }`}
              >
                {language.toUpperCase()}
              </button>
            ))}
          </div>

          {templates.length > 0 && mode === 'create' && (
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-[#555b66]">
                Szablon
              </label>
              <div className="flex flex-wrap gap-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => loadTemplate(template)}
                    className="rounded-[4px] border border-[#e7e8ee] bg-white px-3 py-1.5 text-[11px] text-[#656b76] transition-colors hover:border-[#d7d9e2] hover:text-[#111111]"
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[#555b66]">
              {activeLang === 'pl' ? 'Temat kampanii' : 'Campaign subject'}
            </label>
            <input
              type="text"
              value={activeSubject}
              onChange={(e) => setActiveSubject(e.target.value)}
              placeholder={activeLang === 'pl' ? 'Wpisz temat...' : 'Enter subject...'}
              className="h-9 w-full rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc] px-3 text-[13px] text-[#111111] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#d7d9e2] focus:bg-white"
            />
          </div>

          <div className="flex-1">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label className="block text-[11px] font-medium text-[#555b66]">
                {activeLang === 'pl' ? 'Treść' : 'Content'}
              </label>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#8b9098]">
                {activeLang === 'pl' ? 'Wersja PL' : 'English Version'}
              </span>
            </div>
            <textarea
              value={activeContent}
              onChange={(e) => setActiveContent(e.target.value)}
              placeholder={activeLang === 'pl' ? 'Napisz treść newslettera...' : 'Write newsletter content...'}
              className="h-64 w-full resize-none rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc] px-3 py-2 text-[13px] text-[#111111] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#d7d9e2] focus:bg-white"
              rows={12}
            />
          </div>

          <div className="rounded-[6px] border border-[#e7e8ee] bg-[#fbfbfc] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b9098]">
              Dostępne zmienne
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {['{first_name}', '{last_name}', '{email}'].map((variable) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => appendVariable(variable)}
                  className="rounded-[4px] border border-[#e7e8ee] bg-white px-2 py-1 text-[10px] text-[#656b76] transition-colors hover:border-[#d7d9e2] hover:text-[#111111]"
                >
                  {variable}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[6px] border border-[#e7e8ee] bg-white p-4">
            <p className="mb-3 text-[11px] font-medium text-[#555b66]">
              Segmentacja odbiorców
            </p>
            <p className="mb-3 text-[11px] text-[#8b9098]">
              Opcjonalnie ogranicz wysyłkę do wybranej grupy odbiorców.
            </p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#555b66]">
                  Język
                </label>
                <select
                  value={segmentLanguage}
                  onChange={(e) => setSegmentLanguage(e.target.value)}
                  className="h-9 w-full rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc] px-3 text-[13px] text-[#111111] outline-none focus:border-[#d7d9e2] focus:bg-white"
                >
                  <option value="">Wszyscy</option>
                  <option value="pl">Tylko polscy</option>
                  <option value="en">Tylko angielscy</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#555b66]">
                  Tagi
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {segmentTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-[4px] bg-[#f0f0f4] px-2 py-0.5 text-[11px] text-[#656b76]"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setSegmentTags((prev) => prev.filter((t) => t !== tag))}
                        className="text-[#8b9098] hover:text-[#111111]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Dodaj tag..."
                    className="h-8 flex-1 rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc] px-2 text-[12px] text-[#111111] outline-none focus:border-[#d7d9e2] focus:bg-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTag.trim()) {
                        e.preventDefault()
                        if (!segmentTags.includes(newTag.trim())) {
                          setSegmentTags((prev) => [...prev, newTag.trim()])
                        }
                        setNewTag('')
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newTag.trim() && !segmentTags.includes(newTag.trim())) {
                        setSegmentTags((prev) => [...prev, newTag.trim()])
                      }
                      setNewTag('')
                    }}
                    className="inline-flex h-8 items-center gap-1 rounded-[4px] bg-[#f0f0f4] px-2 text-[11px] text-[#656b76] transition-colors hover:bg-[#e7e8ee]"
                  >
                    <Tag className="h-3 w-3" />
                    Dodaj
                  </button>
                </div>
              </div>

              {(segmentTags.length > 0 || segmentLanguage) && (
                <p className="text-[11px] text-[#8b9098]">
                  Kampania zostanie wysłana tylko do odbiorców spełniających wybrane kryteria.
                </p>
              )}
            </div>
          </div>
        </div>

        {showPreview && (
          <div className="flex w-1/2 flex-col overflow-hidden rounded-[6px] border border-[#e7e8ee] bg-white p-5 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b9098]">
              Podgląd — {previewMode === 'desktop' ? 'Desktop' : 'Mobile'} — {activeLang.toUpperCase()}
            </p>
            <div
              className="mx-auto flex-1 overflow-hidden rounded-[6px] border border-[#e7e8ee] bg-white"
              style={{
                maxWidth: previewMode === 'mobile' ? '375px' : '100%',
                width: '100%',
              }}
            >
              <iframe
                srcDoc={previewHtml}
                className="h-full w-full"
                style={{ border: 'none' }}
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
