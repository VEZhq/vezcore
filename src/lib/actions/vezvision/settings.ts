'use server'
import { ONE_MINUTE } from '@/lib/constants/time'

import { revalidatePath } from 'next/cache'

import { createActionClient } from '@/lib/supabase/server'
import { getClientIP } from '@/lib/server-utils'
import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { getVezVisionPrivilegedClient } from '@/lib/supabase/vezvision'
import type { Json, TablesUpdate } from '@/types/vezvision-db'

import { guardVezVisionMutation } from './security'
import { logError } from '@/lib/logger'
import type {
  ActionResult,
  VVCodeInjectionSettings,
  VVCompanySettings,
  VVContactSettings,
  VVFooterSettings,
  VVLegalDocument,
  VVLegalDocumentInput,
  VVLocalizedLinkItem,
  VVMaintenanceSettings,
  VVNavigationSettings,
  VVPageSection,
  VVPageSectionInput,
  VVPageSeo,
  VVPageSeoInput,
  VVSeoFilesSettings,
  VVSeoSettings,
  VVSiteIdentitySettings,
  VVSiteSettingRecord,
  VVSiteSettingsBundle,
  VVSocialSettings,
} from './types'

const SITE_SETTING_KEYS = [
  'site_identity',
  'contact',
  'social',
  'seo',
  'maintenance_mode',
  'code_injection',
  'seo_files',
  'company',
  'navigation',
  'footer',
] as const

const PAGE_SEO_KEYS = [
  'home',
  'about',
  'services',
  'portfolio',
  'blog',
  'products',
  'contact',
  'privacy-policy',
  'terms',
  'cookie-policy',
  'unsubscribe',
  'not-found',
] as const

const LEGAL_DOCUMENT_KEYS = ['privacy_policy', 'terms', 'cookie_policy'] as const
const PAGE_SECTION_KEYS = {
  home: ['hero', 'founder_note', 'benefits', 'features', 'potential', 'process', 'about_comparison', 'products_teaser', 'newsletter', 'contact'],
  about: ['hero', 'header', 'cards', 'values', 'about_comparison', 'why_choose', 'faq', 'contact'],
  contact: ['hero', 'form', 'faq', 'contact'],
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asBoolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : []
}

function isValidUrl(value: unknown): boolean {
  const str = typeof value === 'string' ? value : ''
  if (!str) return true
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json
}

function normalizeLocalizedLinks(value: unknown): VVLocalizedLinkItem[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item, index) => {
    if (!isRecord(item)) return []

    const href = asString(item.href)
    const labelPl = asString(item.labelPl)
    if (!href || !labelPl) return []

    return [{
      id: asString(item.id) || `item-${index}`,
      href,
      labelPl,
      labelEn: asString(item.labelEn),
      enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
    }]
  })
}

function emptyBundle(): VVSiteSettingsBundle {
  return {
    identity: { siteName: '', logoUrl: '', faviconUrl: '', defaultOgImageUrl: '' },
    contact: { email: '', phone: '', address: '', addressLine1: '', city: '', postalCode: '', country: '' },
    social: { facebook: '', instagram: '', linkedin: '', github: '', x: '' },
    seo: { siteTitle: '', siteDescription: '', keywords: [], siteUrl: '', robots: '', ogSiteName: '' },
    maintenance: { enabled: false, message: '', description: '', allowedIps: [] },
    code: { head: '', body: '' },
    seoFiles: { robotsTxt: '', sitemapXml: '' },
    company: { legalName: '', krs: '', nip: '', regon: '' },
    navigation: { items: [], contactButtonLabelPl: '', contactButtonLabelEn: '', contactButtonHref: '' },
    footer: { subtitlePl: '', subtitleEn: '', taglinePl: '', taglineEn: '', ctaLabelPl: '', ctaLabelEn: '', ctaHref: '', legalLinks: [] },
  }
}

function normalizeSiteSettings(rows: VVSiteSettingRecord[]): VVSiteSettingsBundle {
  const bundle = emptyBundle()
  const map = new Map(rows.map((row) => [row.key, row.value]))

  const identity = map.get('site_identity')
  if (isRecord(identity)) {
    bundle.identity = {
      siteName: asString(identity.siteName),
      logoUrl: asString(identity.logoUrl),
      faviconUrl: asString(identity.faviconUrl),
      defaultOgImageUrl: asString(identity.defaultOgImageUrl),
    }
  }

  const contact = map.get('contact')
  if (isRecord(contact)) {
    bundle.contact = {
      email: asString(contact.email),
      phone: asString(contact.phone),
      address: asString(contact.address),
      addressLine1: asString(contact.addressLine1),
      city: asString(contact.city),
      postalCode: asString(contact.postalCode),
      country: asString(contact.country),
    }
  }

  const social = map.get('social')
  if (isRecord(social)) {
    bundle.social = {
      facebook: asString(social.facebook),
      instagram: asString(social.instagram),
      linkedin: asString(social.linkedin),
      github: asString(social.github),
      x: asString(social.x),
    }
  }

  const seo = map.get('seo')
  if (isRecord(seo)) {
    bundle.seo = {
      siteTitle: asString(seo.siteTitle),
      siteDescription: asString(seo.siteDescription),
      keywords: asStringArray(seo.keywords),
      siteUrl: asString(seo.siteUrl),
      robots: asString(seo.robots),
      ogSiteName: asString(seo.ogSiteName),
    }
  }

  const maintenance = map.get('maintenance_mode')
  if (isRecord(maintenance)) {
    bundle.maintenance = {
      enabled: asBoolean(maintenance.enabled),
      message: asString(maintenance.message),
      description: asString(maintenance.description),
      allowedIps: asStringArray(maintenance.allowedIps),
    }
  }

  const code = map.get('code_injection')
  if (isRecord(code)) {
    bundle.code = {
      head: asString(code.head),
      body: asString(code.body),
    }
  }

  const seoFiles = map.get('seo_files')
  if (isRecord(seoFiles)) {
    bundle.seoFiles = {
      robotsTxt: asString(seoFiles.robotsTxt),
      sitemapXml: asString(seoFiles.sitemapXml),
    }
  }

  const company = map.get('company')
  if (isRecord(company)) {
    bundle.company = {
      legalName: asString(company.legalName),
      krs: asString(company.krs),
      nip: asString(company.nip),
      regon: asString(company.regon),
    }
  }

  const navigation = map.get('navigation')
  if (isRecord(navigation)) {
    bundle.navigation = {
      items: normalizeLocalizedLinks(navigation.items),
      contactButtonLabelPl: asString(navigation.contactButtonLabelPl),
      contactButtonLabelEn: asString(navigation.contactButtonLabelEn),
      contactButtonHref: asString(navigation.contactButtonHref),
    }
  }

  const footer = map.get('footer')
  if (isRecord(footer)) {
    bundle.footer = {
      subtitlePl: asString(footer.subtitlePl),
      subtitleEn: asString(footer.subtitleEn),
      taglinePl: asString(footer.taglinePl),
      taglineEn: asString(footer.taglineEn),
      ctaLabelPl: asString(footer.ctaLabelPl),
      ctaLabelEn: asString(footer.ctaLabelEn),
      ctaHref: asString(footer.ctaHref),
      legalLinks: normalizeLocalizedLinks(footer.legalLinks),
    }
  }

  return bundle
}

function validateIdentitySettings(input: VVSiteIdentitySettings): string | null {
  if (!input.siteName.trim()) return 'Nazwa serwisu jest wymagana'
  if (![input.logoUrl, input.faviconUrl, input.defaultOgImageUrl].every(isValidUrl)) return 'Jeden z URL-i identity jest nieprawidłowy'
  return null
}

function validateContactSettings(input: VVContactSettings): string | null {
  if (!input.email.trim()) return 'Email kontaktowy jest wymagany'
  if (!input.phone.trim()) return 'Telefon kontaktowy jest wymagany'
  return null
}

function validateSeoSettings(input: VVSeoSettings): string | null {
  if (!input.siteTitle.trim()) return 'Globalny title SEO jest wymagany'
  if (!input.siteDescription.trim()) return 'Globalny description SEO jest wymagany'
  if (!input.siteUrl.trim() || !isValidUrl(input.siteUrl)) return 'URL strony jest nieprawidłowy'
  return null
}

function validateCompanySettings(input: VVCompanySettings): string | null {
  if (!input.legalName.trim()) return 'Nazwa prawna firmy jest wymagana'
  return null
}

function validateNavigationSettings(input: VVNavigationSettings): string | null {
  if (!input.contactButtonLabelPl.trim()) return 'Label PL przycisku kontaktowego jest wymagany'
  if (!input.contactButtonHref.trim()) return 'Link przycisku kontaktowego jest wymagany'
  if (!input.items.length) return 'Nawigacja musi zawierać przynajmniej jeden link'
  if (input.items.some((item) => !item.href.trim() || !item.labelPl.trim())) return 'Każdy link nawigacji musi mieć href i label PL'
  return null
}

function validateFooterSettings(input: VVFooterSettings): string | null {
  if (!input.subtitlePl.trim()) return 'Subtitle PL w footerze jest wymagany'
  if (!input.taglinePl.trim()) return 'Tagline PL w footerze jest wymagany'
  if (!input.ctaLabelPl.trim()) return 'CTA PL w footerze jest wymagane'
  if (!input.ctaHref.trim()) return 'Link CTA w footerze jest wymagany'
  return null
}

function validatePageSeoInput(input: VVPageSeoInput): string | null {
  if (!input.title_pl.trim()) return 'SEO title PL jest wymagany'
  if (!input.title_en.trim()) return 'SEO title EN jest wymagany'
  if (!input.description_pl.trim()) return 'SEO description PL jest wymagany'
  if (!input.description_en.trim()) return 'SEO description EN jest wymagany'
  if (input.canonical_url && !isValidUrl(input.canonical_url)) return 'Canonical URL jest nieprawidłowy'
  if (input.og_image_url && !isValidUrl(input.og_image_url)) return 'OG image URL jest nieprawidłowy'
  if (input.structured_data_json) {
    try {
      JSON.parse(input.structured_data_json)
    } catch {
      return 'Structured data musi być poprawnym JSON-em'
    }
  }
  return null
}

function isValidPageSeoKey(pageKey: string): boolean {
  return (PAGE_SEO_KEYS as readonly string[]).includes(pageKey)
}

function isValidLegalDocumentKey(documentKey: string): documentKey is VVLegalDocument['document_key'] {
  return (LEGAL_DOCUMENT_KEYS as readonly string[]).includes(documentKey)
}

function isValidPageSectionKey(pageKey: string, sectionKey: string): pageKey is VVPageSection['page_key'] {
  return pageKey in PAGE_SECTION_KEYS && (PAGE_SECTION_KEYS[pageKey as keyof typeof PAGE_SECTION_KEYS] as readonly string[]).includes(sectionKey)
}

function validateLegalDocumentInput(input: VVLegalDocumentInput): string | null {
  if (!input.title_pl.trim()) return 'Tytuł PL dokumentu prawnego jest wymagany'
  if (!input.title_en.trim()) return 'Tytuł EN dokumentu prawnego jest wymagany'
  if (!input.content_pl.trim()) return 'Treść PL dokumentu prawnego jest wymagana'
  if (!input.content_en.trim()) return 'Treść EN dokumentu prawnego jest wymagana'
  if (!input.version.trim()) return 'Wersja dokumentu prawnego jest wymagana'
  if (!input.last_updated.trim()) return 'Data aktualizacji dokumentu prawnego jest wymagana'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.last_updated.trim())) return 'Data aktualizacji musi mieć format YYYY-MM-DD'
  return null
}

function parseJsonObject(label: string, value: string): { success: true; data: Json } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(value || '{}') as unknown
    if (!isRecord(parsed)) {
      return { success: false, error: `${label} musi być obiektem JSON` }
    }
    return { success: true, data: toJson(parsed) }
  } catch {
    return { success: false, error: `${label} musi być poprawnym JSON-em` }
  }
}

function validatePageSectionInput(input: VVPageSectionInput): string | null {
  if (!Number.isInteger(input.order_index) || input.order_index < 0) return 'Order index musi być liczbą całkowitą >= 0'
  return null
}

async function insertVezVisionAuditLog(action: string, entityType: string, entityId: string, details: Record<string, unknown>) {
  const supabase = await createActionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const ip = await getClientIP()
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: {
      ip,
      ...details,
    },
  })
}

async function upsertSiteSetting(
  key: (typeof SITE_SETTING_KEYS)[number],
  value: unknown,
  description: string
): Promise<ActionResult<VVSiteSettingRecord>> {
  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_site_settings')
    .upsert({ key, value: toJson(value), is_public: true, description }, { onConflict: 'key' })
    .select('key,value,is_public,description,updated_at')
    .single()

  if (error) {
    logError('settings.upsertSiteSetting', error)
    return { success: false, error: 'Błąd podczas zapisu ustawień' }
  }

  await insertVezVisionAuditLog('vezvision_settings_update', 'vezvision_site_setting', key, {
    key,
    description,
  })

  revalidatePath('/vezvision/settings')
  return { success: true, data: data as VVSiteSettingRecord }
}

export async function getVezVisionSiteSettings(): Promise<ActionResult<VVSiteSettingsBundle>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SETTINGS_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_site_settings')
    .select('key,value,is_public,description,updated_at')
    .in('key', [...SITE_SETTING_KEYS])
    .order('key', { ascending: true })

  if (error) {
    logError('settings.getVezVisionSiteSettings', error)
    return { success: false, error: 'Nie udało się pobrać ustawień VezVision' }
  }

  return { success: true, data: normalizeSiteSettings((data ?? []) as VVSiteSettingRecord[]) }
}

export async function getVezVisionPageSeo(): Promise<ActionResult<VVPageSeo[]>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SETTINGS_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_page_seo')
    .select('page_key,title_pl,title_en,description_pl,description_en,og_title_pl,og_title_en,og_description_pl,og_description_en,og_image_url,canonical_url,robots,indexable,structured_data_json,is_public,updated_at')
    .order('page_key', { ascending: true })

  if (error) {
    logError('settings.getVezVisionPageSeo', error)
    return { success: false, error: 'Nie udało się pobrać page SEO' }
  }

  return { success: true, data: (data ?? []) as VVPageSeo[] }
}

export async function getVezVisionLegalDocuments(): Promise<ActionResult<VVLegalDocument[]>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SETTINGS_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_legal_documents')
    .select('document_key,title_pl,title_en,content_pl,content_en,version,last_updated,is_published,updated_at')
    .order('document_key', { ascending: true })

  if (error) {
    logError('settings.getVezVisionLegalDocuments', error)
    return { success: false, error: 'Nie udało się pobrać dokumentów prawnych' }
  }

  return { success: true, data: (data ?? []) as VVLegalDocument[] }
}

export async function getVezVisionPageSections(): Promise<ActionResult<VVPageSection[]>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SETTINGS_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_page_sections')
    .select('page_key,section_key,order_index,enabled,content_pl,content_en,config,is_public,updated_at')
    .order('page_key', { ascending: true })
    .order('order_index', { ascending: true })

  if (error) {
    logError('settings.getVezVisionPageSections', error)
    return { success: false, error: 'Nie udało się pobrać sekcji stron' }
  }

  return { success: true, data: (data ?? []) as VVPageSection[] }
}

interface SiteSettingConfig<T> {
  action: string
  maxRequests: number
  description: string
  validate: (input: T) => string | null
}

type SiteSettingKey = (typeof SITE_SETTING_KEYS)[number]

const SITE_SETTING_CONFIG: {
  [K in SiteSettingKey]?: SiteSettingConfig<unknown>
} = {
  site_identity: {
    action: 'settings.site_identity.update',
    maxRequests: 20,
    description: 'Public brand identity settings',
    validate: (input) => validateIdentitySettings(input as VVSiteIdentitySettings),
  },
  contact: {
    action: 'settings.contact.update',
    maxRequests: 20,
    description: 'Public contact settings',
    validate: (input) => validateContactSettings(input as VVContactSettings),
  },
  social: {
    action: 'settings.social.update',
    maxRequests: 20,
    description: 'Public social media links',
    validate: (input) => {
      if (!Object.values(input as Record<string, unknown>).every(isValidUrl)) {
        return 'Jeden z URL-i social media jest nieprawidłowy'
      }
      return null
    },
  },
  seo: {
    action: 'settings.seo.update',
    maxRequests: 20,
    description: 'Global public SEO settings',
    validate: (input) => validateSeoSettings(input as VVSeoSettings),
  },
  maintenance_mode: {
    action: 'settings.maintenance.update',
    maxRequests: 20,
    description: 'Public maintenance mode settings',
    validate: () => null,
  },
  code_injection: {
    action: 'settings.code.update',
    maxRequests: 10,
    description: 'Public code injection snippets',
    validate: (input) => {
      const typed = input as VVCodeInjectionSettings
      if (typed.head.length > 20000 || typed.body.length > 20000) {
        return 'Code injection jest zbyt długi'
      }
      return null
    },
  },
  seo_files: {
    action: 'settings.seo_files.update',
    maxRequests: 10,
    description: 'SEO files content',
    validate: () => null,
  },
  company: {
    action: 'settings.company.update',
    maxRequests: 20,
    description: 'Public company identity data',
    validate: (input) => validateCompanySettings(input as VVCompanySettings),
  },
  navigation: {
    action: 'settings.navigation.update',
    maxRequests: 20,
    description: 'Primary public navigation settings',
    validate: (input) => validateNavigationSettings(input as VVNavigationSettings),
  },
  footer: {
    action: 'settings.footer.update',
    maxRequests: 20,
    description: 'Footer copy, CTA and legal links',
    validate: (input) => validateFooterSettings(input as VVFooterSettings),
  },
}

export async function updateSiteSettings<K extends SiteSettingKey>(
  category: K,
  input: K extends 'site_identity'
    ? VVSiteIdentitySettings
    : K extends 'contact'
      ? VVContactSettings
      : K extends 'social'
        ? VVSocialSettings
        : K extends 'seo'
          ? VVSeoSettings
          : K extends 'maintenance_mode'
            ? VVMaintenanceSettings
            : K extends 'code_injection'
              ? VVCodeInjectionSettings
              : K extends 'seo_files'
                ? VVSeoFilesSettings
                : K extends 'company'
                  ? VVCompanySettings
                  : K extends 'navigation'
                    ? VVNavigationSettings
                    : K extends 'footer'
                      ? VVFooterSettings
                      : never,
  csrfToken: string
): Promise<ActionResult<VVSiteSettingRecord>> {
  const config = SITE_SETTING_CONFIG[category]
  if (!config) {
    return { success: false, error: 'Nieznana kategoria ustawień' }
  }

  const guard = await guardVezVisionMutation({
    action: config.action,
    csrfToken,
    maxRequests: config.maxRequests,
    windowMs: ONE_MINUTE,
  })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SETTINGS_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const validationError = config.validate(input)
  if (validationError) return { success: false, error: validationError }

  return upsertSiteSetting(category, input, config.description)
}

export async function updateSiteIdentitySettings(input: VVSiteIdentitySettings, csrfToken: string): Promise<ActionResult<VVSiteSettingRecord>> {
  return updateSiteSettings('site_identity', input, csrfToken)
}

export async function updateContactSettings(input: VVContactSettings, csrfToken: string): Promise<ActionResult<VVSiteSettingRecord>> {
  return updateSiteSettings('contact', input, csrfToken)
}

export async function updateSocialSettings(input: VVSocialSettings, csrfToken: string): Promise<ActionResult<VVSiteSettingRecord>> {
  return updateSiteSettings('social', input, csrfToken)
}

export async function updateSeoSettings(input: VVSeoSettings, csrfToken: string): Promise<ActionResult<VVSiteSettingRecord>> {
  return updateSiteSettings('seo', input, csrfToken)
}

export async function updateMaintenanceSettings(input: VVMaintenanceSettings, csrfToken: string): Promise<ActionResult<VVSiteSettingRecord>> {
  return updateSiteSettings('maintenance_mode', input, csrfToken)
}

export async function updateCodeInjectionSettings(input: VVCodeInjectionSettings, csrfToken: string): Promise<ActionResult<VVSiteSettingRecord>> {
  return updateSiteSettings('code_injection', input, csrfToken)
}

export async function updateSeoFilesSettings(input: VVSeoFilesSettings, csrfToken: string): Promise<ActionResult<VVSiteSettingRecord>> {
  return updateSiteSettings('seo_files', input, csrfToken)
}

export async function updateCompanySettings(input: VVCompanySettings, csrfToken: string): Promise<ActionResult<VVSiteSettingRecord>> {
  return updateSiteSettings('company', input, csrfToken)
}

export async function updateNavigationSettings(input: VVNavigationSettings, csrfToken: string): Promise<ActionResult<VVSiteSettingRecord>> {
  return updateSiteSettings('navigation', input, csrfToken)
}

export async function updateFooterSettings(input: VVFooterSettings, csrfToken: string): Promise<ActionResult<VVSiteSettingRecord>> {
  return updateSiteSettings('footer', input, csrfToken)
}

export async function updatePageSeoEntry(pageKey: string, input: VVPageSeoInput, csrfToken: string): Promise<ActionResult<VVPageSeo>> {
  const guard = await guardVezVisionMutation({ action: 'settings.page_seo.update', csrfToken, maxRequests: 30, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SETTINGS_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }
  if (!isValidPageSeoKey(pageKey)) return { success: false, error: 'Nieprawidłowy page key' }

  const validationError = validatePageSeoInput(input)
  if (validationError) return { success: false, error: validationError }

  const vv = getVezVisionPrivilegedClient()
  const updateData: TablesUpdate<'vv_page_seo'> = {
    title_pl: input.title_pl,
    title_en: input.title_en,
    description_pl: input.description_pl,
    description_en: input.description_en,
    og_title_pl: input.og_title_pl ?? '',
    og_title_en: input.og_title_en ?? '',
    og_description_pl: input.og_description_pl ?? '',
    og_description_en: input.og_description_en ?? '',
    og_image_url: input.og_image_url ?? '',
    canonical_url: input.canonical_url ?? '',
    robots: input.robots ?? 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1',
    indexable: input.indexable ?? true,
    structured_data_json: input.structured_data_json ?? '',
    is_public: input.is_public ?? true,
  }

  const { data, error } = await vv
    .from('vv_page_seo')
    .update(updateData)
    .eq('page_key', pageKey)
    .select('page_key,title_pl,title_en,description_pl,description_en,og_title_pl,og_title_en,og_description_pl,og_description_en,og_image_url,canonical_url,robots,indexable,structured_data_json,is_public,updated_at')
    .single()

  if (error) {
    logError('settings.updatePageSeoEntry', error)
    return { success: false, error: 'Błąd podczas zapisu page SEO' }
  }

  await insertVezVisionAuditLog('vezvision_page_seo_update', 'vezvision_page_seo', pageKey, {
    page_key: pageKey,
    indexable: updateData.indexable,
    is_public: updateData.is_public,
  })

  revalidatePath('/vezvision/settings')
  return { success: true, data: data as VVPageSeo }
}

export async function updateLegalDocument(documentKey: string, input: VVLegalDocumentInput, csrfToken: string): Promise<ActionResult<VVLegalDocument>> {
  const guard = await guardVezVisionMutation({ action: 'settings.legal_document.update', csrfToken, maxRequests: 20, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SETTINGS_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }
  if (!isValidLegalDocumentKey(documentKey)) return { success: false, error: 'Nieprawidłowy klucz dokumentu prawnego' }

  const validationError = validateLegalDocumentInput(input)
  if (validationError) return { success: false, error: validationError }

  const vv = getVezVisionPrivilegedClient()
  const updateData: TablesUpdate<'vv_legal_documents'> = {
    title_pl: input.title_pl,
    title_en: input.title_en,
    content_pl: input.content_pl,
    content_en: input.content_en,
    version: input.version,
    last_updated: input.last_updated,
    is_published: input.is_published ?? true,
  }

  const { data, error } = await vv
    .from('vv_legal_documents')
    .update(updateData)
    .eq('document_key', documentKey)
    .select('document_key,title_pl,title_en,content_pl,content_en,version,last_updated,is_published,updated_at')
    .single()

  if (error) {
    logError('settings.updateLegalDocument', error)
    return { success: false, error: 'Błąd podczas zapisu dokumentu prawnego' }
  }

  await insertVezVisionAuditLog('vezvision_legal_document_update', 'vezvision_legal_document', documentKey, {
    document_key: documentKey,
    version: updateData.version,
    is_published: updateData.is_published,
  })

  revalidatePath('/vezvision/settings')
  return { success: true, data: data as VVLegalDocument }
}

export async function updatePageSection(pageKey: string, sectionKey: string, input: VVPageSectionInput, csrfToken: string): Promise<ActionResult<VVPageSection>> {
  const guard = await guardVezVisionMutation({ action: 'settings.page_section.update', csrfToken, maxRequests: 30, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SETTINGS_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }
  if (!isValidPageSectionKey(pageKey, sectionKey)) return { success: false, error: 'Nieprawidłowy klucz sekcji strony' }

  const validationError = validatePageSectionInput(input)
  if (validationError) return { success: false, error: validationError }

  const parsedContentPl = parseJsonObject('content_pl', input.content_pl)
  if (!parsedContentPl.success) return { success: false, error: parsedContentPl.error }

  const parsedContentEn = parseJsonObject('content_en', input.content_en)
  if (!parsedContentEn.success) return { success: false, error: parsedContentEn.error }

  const parsedConfig = parseJsonObject('config', input.config)
  if (!parsedConfig.success) return { success: false, error: parsedConfig.error }

  const vv = getVezVisionPrivilegedClient()
  const updateData: TablesUpdate<'vv_page_sections'> = {
    order_index: input.order_index,
    enabled: input.enabled,
    content_pl: parsedContentPl.data,
    content_en: parsedContentEn.data,
    config: parsedConfig.data,
    is_public: input.is_public ?? true,
  }

  const { data, error } = await vv
    .from('vv_page_sections')
    .update(updateData)
    .eq('page_key', pageKey)
    .eq('section_key', sectionKey)
    .select('page_key,section_key,order_index,enabled,content_pl,content_en,config,is_public,updated_at')
    .single()

  if (error) {
    logError('settings.updatePageSection', error)
    return { success: false, error: 'Błąd podczas zapisu sekcji strony' }
  }

  await insertVezVisionAuditLog('vezvision_page_section_update', 'vezvision_page_section', `${pageKey}:${sectionKey}`, {
    page_key: pageKey,
    section_key: sectionKey,
    order_index: updateData.order_index,
    enabled: updateData.enabled,
  })

  revalidatePath('/vezvision/settings')
  return { success: true, data: data as VVPageSection }
}
