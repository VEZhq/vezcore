'use client'

import { Save, Search, LayoutTemplate, Eye, EyeOff, Code2, ArrowUpDown } from 'lucide-react'
import type { VVPageSection } from '@/lib/actions/vezvision/types'
import { Field } from './Field'
import { Section } from './Section'
import { inputCls, textareaCls, buttonCls, cardCls } from './settingsStyles'

interface MarketingSectionsSettingsProps {
  marketingSections: VVPageSection[]
  selectedMarketingSection: VVPageSection | null
  selectedSectionKey: string
  setSelectedSectionKey: (key: string) => void
  sectionSearch: string
  setSectionSearch: (value: string) => void
  sectionPageFilter: 'all' | 'home' | 'about' | 'contact'
  setSectionPageFilter: (filter: 'all' | 'home' | 'about' | 'contact') => void
  filteredMarketingSections: VVPageSection[]
  marketingSectionStats: { total: number; enabledCount: number; hiddenCount: number; publicCount: number }
  selectedSectionContentPlText: string
  setSelectedSectionContentPlText: (value: string) => void
  selectedSectionContentEnText: string
  setSelectedSectionContentEnText: (value: string) => void
  selectedSectionConfigText: string
  setSelectedSectionConfigText: (value: string) => void
  disabled: boolean
  savingKey: string | null
  canManage: boolean
  onSave: () => void
  onUpdate: (patch: Partial<VVPageSection>) => void
}

export function MarketingSectionsSettings({
  marketingSections,
  selectedMarketingSection,
  selectedSectionKey,
  setSelectedSectionKey,
  sectionSearch,
  setSectionSearch,
  sectionPageFilter,
  setSectionPageFilter,
  filteredMarketingSections,
  marketingSectionStats,
  selectedSectionContentPlText,
  setSelectedSectionContentPlText,
  selectedSectionContentEnText,
  setSelectedSectionContentEnText,
  selectedSectionConfigText,
  setSelectedSectionConfigText,
  disabled,
  savingKey,
  canManage,
  onSave,
  onUpdate,
}: MarketingSectionsSettingsProps) {
  return (
    <Section title="Marketing page sections" description="Stage 5: kolejność, widoczność i CMS overrides dla Home / About / Contact." action={canManage ? <button type="button" className={buttonCls} disabled={disabled || !selectedMarketingSection || savingKey === 'page-section'} onClick={onSave}><Save className="h-3.5 w-3.5" />Zapisz</button> : undefined}>
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className={cardCls}>
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#777777] light:text-[#8b8b8b]">
            <LayoutTemplate className="h-3.5 w-3.5" />
            Wszystkie sekcje
          </div>
          <div className="text-2xl font-light text-white light:text-black">{marketingSectionStats.total}</div>
          <div className="mt-2 text-[11px] text-[#666666] light:text-[#888888]">Home / About / Contact</div>
        </div>
        <div className={cardCls}>
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#777777] light:text-[#8b8b8b]">
            <Eye className="h-3.5 w-3.5" />
            Aktywne
          </div>
          <div className="text-2xl font-light text-emerald-300 light:text-emerald-600">{marketingSectionStats.enabledCount}</div>
          <div className="mt-2 text-[11px] text-[#666666] light:text-[#888888]">renderowane publicznie</div>
        </div>
        <div className={cardCls}>
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#777777] light:text-[#8b8b8b]">
            <EyeOff className="h-3.5 w-3.5" />
            Ukryte
          </div>
          <div className="text-2xl font-light text-white light:text-black">{marketingSectionStats.hiddenCount}</div>
          <div className="mt-2 text-[11px] text-[#666666] light:text-[#888888]">wyłączone sekcje</div>
        </div>
        <div className={cardCls}>
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#777777] light:text-[#8b8b8b]">
            <Code2 className="h-3.5 w-3.5" />
            Publiczne
          </div>
          <div className="text-2xl font-light text-white light:text-black">{marketingSectionStats.publicCount}</div>
          <div className="mt-2 text-[11px] text-[#666666] light:text-[#888888]">z włączonym is_public</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-[300px_1fr]">
        <div className={`${cardCls} space-y-3`}>
          <div className="flex gap-2">
            {(['all', 'home', 'about', 'contact'] as const).map((pageKey) => (
              <button
                key={pageKey}
                type="button"
                onClick={() => setSectionPageFilter(pageKey)}
                className={`rounded-md px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition-colors ${sectionPageFilter === pageKey ? 'bg-emerald-500/[0.08] text-emerald-300 light:text-emerald-600 border border-emerald-400/20' : 'border border-white/[0.06] light:border-black/[0.06] text-[#888888] hover:text-white light:hover:text-black'}`}
              >
                {pageKey === 'all' ? 'Wszystkie' : pageKey}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555555]" />
            <input value={sectionSearch} onChange={(e) => setSectionSearch(e.target.value)} className={`${inputCls} pl-9`} placeholder="Szukaj sekcji..." />
          </div>
          <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
            {filteredMarketingSections.map((entry) => {
              const sectionId = `${entry.page_key}:${entry.section_key}`
              return (
                <button key={sectionId} type="button" onClick={() => setSelectedSectionKey(sectionId)} className={`w-full rounded-md border px-3 py-3 text-left transition-colors ${selectedSectionKey === sectionId ? 'border-emerald-400/30 bg-emerald-500/[0.06]' : 'border-white/[0.06] light:border-black/[0.06] hover:bg-white/[0.03] light:hover:bg-black/[0.03]'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#888888]">{entry.page_key}</div>
                    <div className={`rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] ${entry.enabled ? 'bg-emerald-500/[0.08] text-emerald-300 light:text-emerald-600' : 'bg-white/[0.05] text-[#777777]'}`}>
                      {entry.enabled ? 'Visible' : 'Hidden'}
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-medium text-white light:text-black">{entry.section_key}</div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-[#666666] light:text-[#888888]">
                    <ArrowUpDown className="h-3 w-3" /> order {entry.order_index}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {selectedMarketingSection ? (
          <div className={`${cardCls} space-y-5`}>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] pb-4 light:border-black/[0.06]">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#888888]">{selectedMarketingSection.page_key}</div>
                <h3 className="mt-2 text-lg font-semibold text-white light:text-black">{selectedMarketingSection.section_key}</h3>
                <p className="mt-1 text-[11px] text-[#666666] light:text-[#888888]">Sterowanie kolejnością, widocznością i override’ami tłumaczeń dla tej sekcji.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[#999999] light:border-black/[0.08] light:text-[#777777]">order {selectedMarketingSection.order_index}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${selectedMarketingSection.enabled ? 'bg-emerald-500/[0.08] text-emerald-300 light:text-emerald-600' : 'bg-white/[0.05] text-[#777777]'}`}>{selectedMarketingSection.enabled ? 'Visible' : 'Hidden'}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${selectedMarketingSection.is_public ? 'bg-blue-500/[0.08] text-blue-300 light:text-blue-600' : 'bg-white/[0.05] text-[#777777]'}`}>{selectedMarketingSection.is_public ? 'Public' : 'Private'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Page key"><input value={selectedMarketingSection.page_key} className={inputCls} disabled /></Field>
              <Field label="Section key"><input value={selectedMarketingSection.section_key} className={inputCls} disabled /></Field>
              <Field label="Order index"><input type="number" value={selectedMarketingSection.order_index} onChange={(e) => onUpdate({ order_index: Number(e.target.value) || 0 })} className={inputCls} disabled={disabled} /></Field>
              <Field label="Enabled"><button type="button" onClick={() => onUpdate({ enabled: !selectedMarketingSection.enabled })} className={buttonCls} disabled={disabled}>{selectedMarketingSection.enabled ? 'Aktywna' : 'Ukryta'}</button></Field>
              <Field label="Public"><button type="button" onClick={() => onUpdate({ is_public: !selectedMarketingSection.is_public })} className={buttonCls} disabled={disabled}>{selectedMarketingSection.is_public ? 'Publiczna' : 'Prywatna'}</button></Field>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className={cardCls}>
                <Field label="content_pl (JSON)"><textarea value={selectedSectionContentPlText} onChange={(e) => setSelectedSectionContentPlText(e.target.value)} className={`${textareaCls} min-h-[320px] font-mono text-xs`} disabled={disabled} /></Field>
              </div>
              <div className={cardCls}>
                <Field label="content_en (JSON)"><textarea value={selectedSectionContentEnText} onChange={(e) => setSelectedSectionContentEnText(e.target.value)} className={`${textareaCls} min-h-[320px] font-mono text-xs`} disabled={disabled} /></Field>
              </div>
            </div>

            <div className={cardCls}>
              <Field label="config (JSON)"><textarea value={selectedSectionConfigText} onChange={(e) => setSelectedSectionConfigText(e.target.value)} className={`${textareaCls} min-h-[220px] font-mono text-xs`} disabled={disabled} /></Field>
              <p className="mt-3 text-[11px] text-[#666666] light:text-[#888888]">Tutaj ustawiasz np. href CTA, target formularza albo inne zachowania sekcji bez ruszania kodu.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-white/[0.08] light:border-black/[0.08] p-8 text-center text-sm text-[#666666] light:text-[#888888]">Wybierz sekcję z listy po lewej.</div>
        )}
      </div>
    </Section>
  )
}
