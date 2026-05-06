'use client'

import { useEffect, useMemo, useState } from 'react'
import { Settings, Globe, Shield, FileSearch, FileText, PanelsTopLeft } from 'lucide-react'
import { toast } from 'sonner'

import { useCSRFToken } from '@/hooks/useCSRFToken'
import {
  updatePageSeoEntry,
  updateLegalDocument,
  updatePageSection,
} from '@/lib/actions/vezvision/settings'
import type {
  VVCodeInjectionSettings,
  VVCompanySettings,
  VVContactSettings,
  VVFooterSettings,
  VVLegalDocument,
  VVMaintenanceSettings,
  VVNavigationSettings,
  VVPageSection,
  VVPageSeo,
  VVSiteIdentitySettings,
  VVSiteSettingsBundle,
  VVSocialSettings,
  VVSeoFilesSettings,
  VVSeoSettings,
} from '@/lib/actions/vezvision/types'

import {
  WorkspaceButton,
  BrandSettings,
  PlatformSettings,
  PageSeoSettings,
  LegalSettings,
  MarketingSectionsSettings,
  stringifyJson,
} from '@/components/vezvision/settings'

interface Props {
  settings: VVSiteSettingsBundle
  pageSeoEntries: VVPageSeo[]
  legalDocuments: VVLegalDocument[]
  pageSections: VVPageSection[]
  canManage: boolean
}

export default function VezVisionSettingsClient({ settings, pageSeoEntries, legalDocuments, pageSections, canManage }: Props) {
  const { token: csrfToken, isLoading: csrfLoading } = useCSRFToken()

  const [identity, setIdentity] = useState<VVSiteIdentitySettings>(settings.identity)
  const [contact, setContact] = useState<VVContactSettings>(settings.contact)
  const [social, setSocial] = useState<VVSocialSettings>(settings.social)
  const [seo, setSeo] = useState<VVSeoSettings>(settings.seo)
  const [maintenance, setMaintenance] = useState<VVMaintenanceSettings>(settings.maintenance)
  const [code, setCode] = useState<VVCodeInjectionSettings>(settings.code)
  const [seoFiles, setSeoFiles] = useState<VVSeoFilesSettings>(settings.seoFiles)
  const [company, setCompany] = useState<VVCompanySettings>(settings.company)
  const [navigation, setNavigation] = useState<VVNavigationSettings>(settings.navigation)
  const [footer, setFooter] = useState<VVFooterSettings>(settings.footer)
  const [pageSeo, setPageSeo] = useState<VVPageSeo[]>(pageSeoEntries)
  const [legalDocs, setLegalDocs] = useState<VVLegalDocument[]>(legalDocuments)
  const [marketingSections, setMarketingSections] = useState<VVPageSection[]>(pageSections)
  const [pageSeoSearch, setPageSeoSearch] = useState('')
  const [selectedPageKey, setSelectedPageKey] = useState(pageSeoEntries[0]?.page_key ?? '')
  const [legalSearch, setLegalSearch] = useState('')
  const [selectedLegalKey, setSelectedLegalKey] = useState<string>(legalDocuments[0]?.document_key ?? '')
  const [sectionSearch, setSectionSearch] = useState('')
  const [sectionPageFilter, setSectionPageFilter] = useState<'all' | 'home' | 'about' | 'contact'>('all')
  const [activeWorkspace, setActiveWorkspace] = useState<'brand' | 'platform' | 'seo' | 'legal' | 'sections'>('brand')
  const [selectedSectionKey, setSelectedSectionKey] = useState(pageSections[0] ? `${pageSections[0].page_key}:${pageSections[0].section_key}` : '')
  const [selectedSectionContentPlText, setSelectedSectionContentPlText] = useState(pageSections[0] ? stringifyJson(pageSections[0].content_pl) : '{}')
  const [selectedSectionContentEnText, setSelectedSectionContentEnText] = useState(pageSections[0] ? stringifyJson(pageSections[0].content_en) : '{}')
  const [selectedSectionConfigText, setSelectedSectionConfigText] = useState(pageSections[0] ? stringifyJson(pageSections[0].config) : '{}')
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const disabled = !canManage || csrfLoading || !csrfToken
  const statusMessage = csrfLoading
    ? 'Przygotowuję token bezpieczeństwa do zapisu…'
    : !csrfToken
      ? 'Brak tokenu bezpieczeństwa. Odśwież stronę.'
      : null

  const selectedPageSeo = useMemo(() => {
    return pageSeo.find((entry) => entry.page_key === selectedPageKey) ?? null
  }, [pageSeo, selectedPageKey])

  const selectedLegalDocument = useMemo(() => {
    return legalDocs.find((entry) => entry.document_key === selectedLegalKey) ?? null
  }, [legalDocs, selectedLegalKey])

  const selectedMarketingSection = useMemo(() => {
    const [pageKey, sectionKey] = selectedSectionKey.split(':')
    return marketingSections.find((entry) => entry.page_key === pageKey && entry.section_key === sectionKey) ?? null
  }, [marketingSections, selectedSectionKey])

  const filteredPageSeo = useMemo(() => {
    const query = pageSeoSearch.trim().toLowerCase()
    if (!query) return pageSeo
    return pageSeo.filter((entry) => entry.page_key.toLowerCase().includes(query) || entry.title_pl.toLowerCase().includes(query) || entry.title_en.toLowerCase().includes(query))
  }, [pageSeo, pageSeoSearch])

  const filteredLegalDocs = useMemo(() => {
    const query = legalSearch.trim().toLowerCase()
    if (!query) return legalDocs
    return legalDocs.filter((entry) => entry.document_key.toLowerCase().includes(query) || entry.title_pl.toLowerCase().includes(query) || entry.title_en.toLowerCase().includes(query))
  }, [legalDocs, legalSearch])

  const filteredMarketingSections = useMemo(() => {
    const query = sectionSearch.trim().toLowerCase()
    return marketingSections.filter((entry) => {
      const matchesPage = sectionPageFilter === 'all' || entry.page_key === sectionPageFilter
      const matchesQuery = !query || `${entry.page_key}:${entry.section_key}`.toLowerCase().includes(query)
      return matchesPage && matchesQuery
    })
  }, [marketingSections, sectionSearch, sectionPageFilter])

  const marketingSectionStats = useMemo(() => {
    const total = marketingSections.length
    const enabledCount = marketingSections.filter((entry) => entry.enabled).length
    const publicCount = marketingSections.filter((entry) => entry.is_public).length
    return { total, enabledCount, hiddenCount: total - enabledCount, publicCount }
  }, [marketingSections])

  const workspaceSummary = {
    brand: `${navigation.items.length} linków • ${footer.legalLinks.length} legal links`,
    platform: maintenance.enabled ? 'maintenance aktywne' : 'maintenance wyłączone',
    seo: `${pageSeo.length} stron SEO`,
    legal: `${legalDocs.length} dokumenty prawne`,
    sections: `${marketingSectionStats.total} sekcji marketingowych`,
  } as const

  useEffect(() => {
    if (!selectedMarketingSection) return
    setSelectedSectionContentPlText(stringifyJson(selectedMarketingSection.content_pl))
    setSelectedSectionContentEnText(stringifyJson(selectedMarketingSection.content_en))
    setSelectedSectionConfigText(stringifyJson(selectedMarketingSection.config))
  }, [selectedMarketingSection])

  const withSave = async <T,>(key: string, action: () => Promise<{ success: boolean; error?: string; data?: T }>, successMessage: string) => {
    if (!canManage) {
      toast.error('Brak uprawnień do zapisu')
      return
    }
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    setSavingKey(key)
    try {
      const result = await action()
      if (result.success) {
        toast.success(successMessage)
      } else {
        toast.error(result.error ?? 'Błąd zapisu')
      }
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Wystąpił nieobsłużony błąd podczas zapisu'
      console.error('[VezVisionSettingsClient] Failed to save setting')
      toast.error(message)
      return { success: false as const, error: message }
    } finally {
      setSavingKey(null)
    }
  }

  const savePageSeoField = async () => {
    if (!selectedPageSeo) return
    const result = await withSave('page-seo', () => updatePageSeoEntry(selectedPageSeo.page_key, {
      title_pl: selectedPageSeo.title_pl,
      title_en: selectedPageSeo.title_en,
      description_pl: selectedPageSeo.description_pl,
      description_en: selectedPageSeo.description_en,
      og_title_pl: selectedPageSeo.og_title_pl,
      og_title_en: selectedPageSeo.og_title_en,
      og_description_pl: selectedPageSeo.og_description_pl,
      og_description_en: selectedPageSeo.og_description_en,
      og_image_url: selectedPageSeo.og_image_url,
      canonical_url: selectedPageSeo.canonical_url,
      robots: selectedPageSeo.robots,
      indexable: selectedPageSeo.indexable,
      structured_data_json: selectedPageSeo.structured_data_json,
      is_public: selectedPageSeo.is_public,
    }, csrfToken!), 'Page SEO zapisane')

    const savedEntry = result?.success ? result.data : undefined
    if (savedEntry) {
      setPageSeo((prev) => prev.map((entry) => (entry.page_key === savedEntry.page_key ? savedEntry : entry)))
    }
  }

  const updateSelectedPageSeo = (patch: Partial<VVPageSeo>) => {
    if (!selectedPageSeo) return
    setPageSeo((prev) => prev.map((entry) => (entry.page_key === selectedPageSeo.page_key ? { ...entry, ...patch } : entry)))
  }

  const saveLegalDocument = async () => {
    if (!selectedLegalDocument) return
    const result = await withSave('legal', () => updateLegalDocument(selectedLegalDocument.document_key, {
      title_pl: selectedLegalDocument.title_pl,
      title_en: selectedLegalDocument.title_en,
      content_pl: selectedLegalDocument.content_pl,
      content_en: selectedLegalDocument.content_en,
      version: selectedLegalDocument.version,
      last_updated: selectedLegalDocument.last_updated,
      is_published: selectedLegalDocument.is_published,
    }, csrfToken!), 'Dokument prawny zapisany')

    const savedDocument = result?.success ? result.data : undefined
    if (savedDocument) {
      setLegalDocs((prev) => prev.map((entry) => (entry.document_key === savedDocument.document_key ? savedDocument : entry)))
    }
  }

  const updateSelectedLegalDocument = (patch: Partial<VVLegalDocument>) => {
    if (!selectedLegalDocument) return
    setLegalDocs((prev) => prev.map((entry) => (entry.document_key === selectedLegalDocument.document_key ? { ...entry, ...patch } : entry)))
  }

  const saveMarketingSection = async () => {
    if (!selectedMarketingSection) return
    const result = await withSave('page-section', () => updatePageSection(selectedMarketingSection.page_key, selectedMarketingSection.section_key, {
      order_index: selectedMarketingSection.order_index,
      enabled: selectedMarketingSection.enabled,
      content_pl: selectedSectionContentPlText,
      content_en: selectedSectionContentEnText,
      config: selectedSectionConfigText,
      is_public: selectedMarketingSection.is_public,
    }, csrfToken!), 'Sekcja marketingowa zapisana')

    const savedSection = result?.success ? result.data : undefined
    if (savedSection) {
      setMarketingSections((prev) => prev.map((entry) => entry.page_key === savedSection.page_key && entry.section_key === savedSection.section_key ? savedSection : entry))
    }
  }

  const updateSelectedMarketingSection = (patch: Partial<VVPageSection>) => {
    if (!selectedMarketingSection) return
    setMarketingSections((prev) => prev.map((entry) => entry.page_key === selectedMarketingSection.page_key && entry.section_key === selectedMarketingSection.section_key ? { ...entry, ...patch } : entry))
  }

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <div className="border border-white/[0.06] bg-[#111111] p-6 light:border-black/[0.08] light:bg-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center border border-emerald-400/20 bg-emerald-500/[0.08]">
              <Settings className="h-4 w-4 text-emerald-300 light:text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white light:text-black">Ustawienia VezVision</h1>
              <p className="text-[11px] text-[#8b8b8b] light:text-[#7f7f7f]">Jedno miejsce do zarządzania marką, treścią, SEO i sekcjami strony.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-[#777777] light:text-[#888888]">
            <span className="border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 light:border-black/[0.08] light:bg-black/[0.03]">{workspaceSummary[activeWorkspace]}</span>
          </div>
        </div>
      </div>

      {statusMessage ? (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-200 light:text-amber-700">
          {statusMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-6 xl:self-start space-y-2">
          <WorkspaceButton title="Brand & kontakt" description="Marka, dane firmy, kontakt, social, footer i navigation." icon={Globe} active={activeWorkspace === 'brand'} onClick={() => setActiveWorkspace('brand')} />
          <WorkspaceButton title="Platforma" description="Maintenance mode, code injection i pliki techniczne SEO." icon={Shield} active={activeWorkspace === 'platform'} onClick={() => setActiveWorkspace('platform')} />
          <WorkspaceButton title="SEO stron" description="Meta title, description, OG i canonical dla statycznych route'ów." icon={FileSearch} active={activeWorkspace === 'seo'} onClick={() => setActiveWorkspace('seo')} />
          <WorkspaceButton title="Dokumenty prawne" description="Privacy policy, terms i cookie policy w jednym miejscu." icon={FileText} active={activeWorkspace === 'legal'} onClick={() => setActiveWorkspace('legal')} />
          <WorkspaceButton title="Sekcje marketingowe" description="Kolejność, widoczność i override’y dla Home / About / Contact." icon={PanelsTopLeft} active={activeWorkspace === 'sections'} onClick={() => setActiveWorkspace('sections')} />
        </aside>

        <div className="space-y-6">
          {activeWorkspace === 'brand' && (
            <BrandSettings
              identity={identity} setIdentity={setIdentity}
              contact={contact} setContact={setContact}
              social={social} setSocial={setSocial}
              seo={seo} setSeo={setSeo}
              maintenance={maintenance} setMaintenance={setMaintenance}
              code={code} setCode={setCode}
              seoFiles={seoFiles} setSeoFiles={setSeoFiles}
              company={company} setCompany={setCompany}
              navigation={navigation} setNavigation={setNavigation}
              footer={footer} setFooter={setFooter}
              disabled={disabled} savingKey={savingKey}
              canManage={canManage} csrfToken={csrfToken!}
              withSave={withSave}
            />
          )}

          {activeWorkspace === 'platform' && (
            <PlatformSettings
              maintenance={maintenance} setMaintenance={setMaintenance}
              code={code} setCode={setCode}
              seoFiles={seoFiles} setSeoFiles={setSeoFiles}
              disabled={disabled} savingKey={savingKey}
              canManage={canManage} csrfToken={csrfToken!}
              withSave={withSave}
            />
          )}

          {activeWorkspace === 'seo' && (
            <PageSeoSettings
              pageSeo={pageSeo}
              selectedPageSeo={selectedPageSeo}
              selectedPageKey={selectedPageKey}
              setSelectedPageKey={setSelectedPageKey}
              pageSeoSearch={pageSeoSearch}
              setPageSeoSearch={setPageSeoSearch}
              filteredPageSeo={filteredPageSeo}
              disabled={disabled} savingKey={savingKey}
              canManage={canManage}
              onSave={savePageSeoField}
              onUpdate={updateSelectedPageSeo}
            />
          )}

          {activeWorkspace === 'legal' && (
            <LegalSettings
              legalDocs={legalDocs}
              selectedLegalDocument={selectedLegalDocument}
              selectedLegalKey={selectedLegalKey}
              setSelectedLegalKey={setSelectedLegalKey}
              legalSearch={legalSearch}
              setLegalSearch={setLegalSearch}
              filteredLegalDocs={filteredLegalDocs}
              disabled={disabled} savingKey={savingKey}
              canManage={canManage}
              onSave={saveLegalDocument}
              onUpdate={updateSelectedLegalDocument}
            />
          )}

          {activeWorkspace === 'sections' && (
            <MarketingSectionsSettings
              marketingSections={marketingSections}
              selectedMarketingSection={selectedMarketingSection}
              selectedSectionKey={selectedSectionKey}
              setSelectedSectionKey={setSelectedSectionKey}
              sectionSearch={sectionSearch}
              setSectionSearch={setSectionSearch}
              sectionPageFilter={sectionPageFilter}
              setSectionPageFilter={setSectionPageFilter}
              filteredMarketingSections={filteredMarketingSections}
              marketingSectionStats={marketingSectionStats}
              selectedSectionContentPlText={selectedSectionContentPlText}
              setSelectedSectionContentPlText={setSelectedSectionContentPlText}
              selectedSectionContentEnText={selectedSectionContentEnText}
              setSelectedSectionContentEnText={setSelectedSectionContentEnText}
              selectedSectionConfigText={selectedSectionConfigText}
              setSelectedSectionConfigText={setSelectedSectionConfigText}
              disabled={disabled} savingKey={savingKey}
              canManage={canManage}
              onSave={saveMarketingSection}
              onUpdate={updateSelectedMarketingSection}
            />
          )}
        </div>
      </div>
    </div>
  )
}
