'use client'

import { Save, Search } from 'lucide-react'
import type { VVPageSeo } from '@/lib/actions/vezvision/types'
import { Field } from './Field'
import { Section } from './Section'
import { inputCls, textareaCls, buttonCls } from './settingsStyles'

interface PageSeoSettingsProps {
  pageSeo: VVPageSeo[]
  selectedPageSeo: VVPageSeo | null
  selectedPageKey: string
  setSelectedPageKey: (key: string) => void
  pageSeoSearch: string
  setPageSeoSearch: (value: string) => void
  filteredPageSeo: VVPageSeo[]
  disabled: boolean
  savingKey: string | null
  canManage: boolean
  onSave: () => void
  onUpdate: (patch: Partial<VVPageSeo>) => void
}

export function PageSeoSettings({
  pageSeo,
  selectedPageSeo,
  selectedPageKey,
  setSelectedPageKey,
  pageSeoSearch,
  setPageSeoSearch,
  filteredPageSeo,
  disabled,
  savingKey,
  canManage,
  onSave,
  onUpdate,
}: PageSeoSettingsProps) {
  return (
    <Section title="Page SEO" description="Per-page SEO dla statycznych stron publicznych wdrożonych w Stage 3." action={canManage ? <button type="button" className={buttonCls} disabled={disabled || !selectedPageSeo || savingKey === 'page-seo'} onClick={onSave}><Save className="h-3.5 w-3.5" />Zapisz</button> : undefined}>
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
        <div className="rounded-md border border-white/[0.06] light:border-black/[0.06] p-3">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555555]" />
            <input value={pageSeoSearch} onChange={(e) => setPageSeoSearch(e.target.value)} className={`${inputCls} pl-9`} placeholder="Szukaj po page key..." />
          </div>
          <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
            {filteredPageSeo.map((entry) => (
              <button key={entry.page_key} type="button" onClick={() => setSelectedPageKey(entry.page_key)} className={`w-full rounded-md border px-3 py-2 text-left text-xs transition-colors ${selectedPageKey === entry.page_key ? 'border-emerald-400/30 bg-emerald-500/[0.06] text-emerald-300 light:text-emerald-600' : 'border-white/[0.06] light:border-black/[0.06] text-[#999999] hover:text-white light:hover:text-black hover:bg-white/[0.03] light:hover:bg-black/[0.03]'}`}>
                <div className="font-medium uppercase tracking-[0.2em]">{entry.page_key}</div>
                <div className="mt-1 truncate text-[11px] opacity-80">{entry.title_pl}</div>
              </button>
            ))}
          </div>
        </div>

        {selectedPageSeo ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="SEO title PL" required><input value={selectedPageSeo.title_pl} onChange={(e) => onUpdate({ title_pl: e.target.value })} className={inputCls} disabled={disabled} /></Field>
              <Field label="SEO title EN" required><input value={selectedPageSeo.title_en} onChange={(e) => onUpdate({ title_en: e.target.value })} className={inputCls} disabled={disabled} /></Field>
              <Field label="OG title PL"><input value={selectedPageSeo.og_title_pl} onChange={(e) => onUpdate({ og_title_pl: e.target.value })} className={inputCls} disabled={disabled} /></Field>
              <Field label="OG title EN"><input value={selectedPageSeo.og_title_en} onChange={(e) => onUpdate({ og_title_en: e.target.value })} className={inputCls} disabled={disabled} /></Field>
              <Field label="Canonical URL"><input value={selectedPageSeo.canonical_url} onChange={(e) => onUpdate({ canonical_url: e.target.value })} className={inputCls} disabled={disabled} /></Field>
              <Field label="OG image URL"><input value={selectedPageSeo.og_image_url} onChange={(e) => onUpdate({ og_image_url: e.target.value })} className={inputCls} disabled={disabled} /></Field>
              <Field label="Robots"><input value={selectedPageSeo.robots} onChange={(e) => onUpdate({ robots: e.target.value })} className={inputCls} disabled={disabled} /></Field>
              <Field label="Indexable"><button type="button" onClick={() => onUpdate({ indexable: !selectedPageSeo.indexable })} className={buttonCls} disabled={disabled}>{selectedPageSeo.indexable ? 'Index' : 'Noindex'}</button></Field>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Description PL" required><textarea value={selectedPageSeo.description_pl} onChange={(e) => onUpdate({ description_pl: e.target.value })} className={textareaCls} disabled={disabled} /></Field>
              <Field label="Description EN" required><textarea value={selectedPageSeo.description_en} onChange={(e) => onUpdate({ description_en: e.target.value })} className={textareaCls} disabled={disabled} /></Field>
              <Field label="OG description PL"><textarea value={selectedPageSeo.og_description_pl} onChange={(e) => onUpdate({ og_description_pl: e.target.value })} className={textareaCls} disabled={disabled} /></Field>
              <Field label="OG description EN"><textarea value={selectedPageSeo.og_description_en} onChange={(e) => onUpdate({ og_description_en: e.target.value })} className={textareaCls} disabled={disabled} /></Field>
            </div>
            <Field label="Structured data JSON"><textarea value={selectedPageSeo.structured_data_json} onChange={(e) => onUpdate({ structured_data_json: e.target.value })} className={textareaCls} disabled={disabled} /></Field>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-white/[0.08] light:border-black/[0.08] p-8 text-center text-sm text-[#666666] light:text-[#888888]">Wybierz stronę z listy po lewej.</div>
        )}
      </div>
    </Section>
  )
}
