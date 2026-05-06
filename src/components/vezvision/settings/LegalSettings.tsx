'use client'

import { Save, Search } from 'lucide-react'
import type { VVLegalDocument } from '@/lib/actions/vezvision/types'
import { Field } from './Field'
import { Section } from './Section'
import { inputCls, textareaCls, buttonCls } from './settingsStyles'

interface LegalSettingsProps {
  legalDocs: VVLegalDocument[]
  selectedLegalDocument: VVLegalDocument | null
  selectedLegalKey: string
  setSelectedLegalKey: (key: string) => void
  legalSearch: string
  setLegalSearch: (value: string) => void
  filteredLegalDocs: VVLegalDocument[]
  disabled: boolean
  savingKey: string | null
  canManage: boolean
  onSave: () => void
  onUpdate: (patch: Partial<VVLegalDocument>) => void
}

export function LegalSettings({
  legalDocs,
  selectedLegalDocument,
  selectedLegalKey,
  setSelectedLegalKey,
  legalSearch,
  setLegalSearch,
  filteredLegalDocs,
  disabled,
  savingKey,
  canManage,
  onSave,
  onUpdate,
}: LegalSettingsProps) {
  return (
    <Section title="Legal documents" description="Treści prawne Stage 4: privacy policy, terms i cookie policy." action={canManage ? <button type="button" className={buttonCls} disabled={disabled || !selectedLegalDocument || savingKey === 'legal'} onClick={onSave}><Save className="h-3.5 w-3.5" />Zapisz</button> : undefined}>
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
        <div className="rounded-md border border-white/[0.06] light:border-black/[0.06] p-3">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555555]" />
            <input value={legalSearch} onChange={(e) => setLegalSearch(e.target.value)} className={`${inputCls} pl-9`} placeholder="Szukaj dokumentu..." />
          </div>
          <div className="space-y-1">
            {filteredLegalDocs.map((entry) => (
              <button key={entry.document_key} type="button" onClick={() => setSelectedLegalKey(entry.document_key)} className={`w-full rounded-md border px-3 py-2 text-left text-xs transition-colors ${selectedLegalKey === entry.document_key ? 'border-emerald-400/30 bg-emerald-500/[0.06] text-emerald-300 light:text-emerald-600' : 'border-white/[0.06] light:border-black/[0.06] text-[#999999] hover:text-white light:hover:text-black hover:bg-white/[0.03] light:hover:bg-black/[0.03]'}`}>
                <div className="font-medium uppercase tracking-[0.2em]">{entry.document_key}</div>
                <div className="mt-1 truncate text-[11px] opacity-80">{entry.title_pl}</div>
              </button>
            ))}
          </div>
        </div>

        {selectedLegalDocument ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Title PL" required><input value={selectedLegalDocument.title_pl} onChange={(e) => onUpdate({ title_pl: e.target.value })} className={inputCls} disabled={disabled} /></Field>
              <Field label="Title EN" required><input value={selectedLegalDocument.title_en} onChange={(e) => onUpdate({ title_en: e.target.value })} className={inputCls} disabled={disabled} /></Field>
              <Field label="Version" required><input value={selectedLegalDocument.version} onChange={(e) => onUpdate({ version: e.target.value })} className={inputCls} disabled={disabled} /></Field>
              <Field label="Last updated" required><input type="date" value={selectedLegalDocument.last_updated} onChange={(e) => onUpdate({ last_updated: e.target.value })} className={inputCls} disabled={disabled} /></Field>
              <Field label="Published"><button type="button" onClick={() => onUpdate({ is_published: !selectedLegalDocument.is_published })} className={buttonCls} disabled={disabled}>{selectedLegalDocument.is_published ? 'Opublikowany' : 'Szkic'}</button></Field>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Content PL" required><textarea value={selectedLegalDocument.content_pl} onChange={(e) => onUpdate({ content_pl: e.target.value })} className={`${textareaCls} min-h-[420px]`} disabled={disabled} /></Field>
              <Field label="Content EN" required><textarea value={selectedLegalDocument.content_en} onChange={(e) => onUpdate({ content_en: e.target.value })} className={`${textareaCls} min-h-[420px]`} disabled={disabled} /></Field>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-white/[0.08] light:border-black/[0.08] p-8 text-center text-sm text-[#666666] light:text-[#888888]">Wybierz dokument z listy po lewej.</div>
        )}
      </div>
    </Section>
  )
}
