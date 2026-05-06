import type { Json } from '@/types/vezvision-db'

export type VVStatus = 'draft' | 'published' | 'archived' | 'scheduled'
export type VVServiceStatus = 'draft' | 'active' | 'archived'
export type VVImageType = 'screenshot' | 'mockup' | 'logo' | 'banner'
export type VVBucket = 'vv-blog-images' | 'vv-portfolio-images' | 'vv-service-images' | 'vv-files-private'
export type VVFileEventType =
  | 'folder.created'
  | 'folder.acl_granted'
  | 'folder.acl_updated'
  | 'folder.acl_revoked'
  | 'folder.moved'
  | 'folder.updated'
  | 'folder.deleted'
  | 'file.created'
  | 'file.moved'
  | 'file.restored'
  | 'file.permanently_deleted'
  | 'file.updated'
  | 'file.deleted'
  | 'file.downloaded'

export interface VVFolder {
  id: string
  parent_id: string | null
  name: string
  slug: string
  full_path: string
  owner_user_id: string | null
  is_system: boolean
  created_at: string
  updated_at: string
}

export interface VVFile {
  id: string
  folder_id: string | null
  original_name: string
  storage_bucket: string
  storage_path: string
  mime_type: string
  size_bytes: number
  checksum_sha256: string | null
  owner_user_id: string | null
  is_public: boolean
  owner_type: string | null
  owner_id: string | null
  metadata: Json
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface VVFolderAclEntry {
  user_id: string
  user_email: string | null
  user_name: string | null
  can_view: boolean
  can_upload: boolean
  can_manage: boolean
  is_inherited: boolean
  source_folder_id: string
  source_folder_name: string
  source_folder_path: string
}

export interface VVFileAssignableUser {
  id: string
  email: string | null
  name: string | null
}

export interface VVFileEvent {
  id: string
  file_id: string | null
  folder_id: string | null
  actor_user_id: string | null
  event_type: VVFileEventType
  ip: string | null
  user_agent: string | null
  payload: Json
  created_at: string
}

export interface VVFolderInput {
  parent_id?: string | null
  name: string
}

export interface VVFileInput {
  folder_id?: string | null
  original_name: string
  storage_bucket: VVBucket
  storage_path: string
  mime_type: string
  size_bytes: number
  checksum_sha256?: string | null
  is_public?: boolean
  owner_type?: string | null
  owner_id?: string | null
  metadata?: Json
}

export interface VVBlogCategory {
  id: string
  slug: string
  name_pl: string
  name_en: string | null
  color: string
  order_index: number
  created_at: string
}

export interface VVBlogPost {
  id: string
  slug: string
  status: VVStatus
  featured: boolean
  featured_image: string | null
  reading_time: number
  views_count: number
  published_at: string | null
  scheduled_for: string | null
  author_id: string | null
  title_pl: string
  title_en: string | null
  excerpt_pl: string | null
  excerpt_en: string | null
  content_pl: string
  content_en: string | null
  meta_title_pl: string | null
  meta_title_en: string | null
  meta_desc_pl: string | null
  meta_desc_en: string | null
  tags_pl: string[]
  tags_en: string[]
  created_by: string | null
  created_at: string
  updated_at: string
  categories?: VVBlogCategory[]
}

export interface VVBlogPostInput {
  slug: string
  status?: VVStatus
  featured?: boolean
  featured_image?: string | null
  reading_time?: number
  scheduled_for?: string | null
  title_pl: string
  title_en?: string | null
  excerpt_pl?: string | null
  excerpt_en?: string | null
  content_pl: string
  content_en?: string | null
  meta_title_pl?: string | null
  meta_title_en?: string | null
  meta_desc_pl?: string | null
  meta_desc_en?: string | null
  tags_pl?: string[]
  tags_en?: string[]
  category_ids?: string[]
}

export interface VVProjectTechnology {
  id: string
  project_id: string
  name: string
  color: string
  icon: string | null
  order_index: number
}

export interface VVProjectImage {
  id: string
  project_id: string
  path: string
  type: VVImageType
  alt_pl: string | null
  alt_en: string | null
  order_index: number
  created_at: string
}

export interface VVProject {
  id: string
  slug: string
  status: VVStatus
  featured: boolean
  order_index: number
  cover_image: string | null
  show_cover_image: boolean
  show_demo_url: boolean
  show_challenge: boolean
  show_solution: boolean
  demo_url: string | null
  github_url: string | null
  client_name: string | null
  title_pl: string
  title_en: string | null
  short_desc_pl: string | null
  short_desc_en: string | null
  description_pl: string | null
  description_en: string | null
  challenge_pl: string | null
  challenge_en: string | null
  solution_pl: string | null
  solution_en: string | null
  seo_title_pl: string | null
  seo_title_en: string | null
  seo_desc_pl: string | null
  seo_desc_en: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  technologies?: VVProjectTechnology[]
  images?: VVProjectImage[]
}

export interface VVProjectInput {
  slug: string
  status?: VVStatus
  featured?: boolean
  order_index?: number
  cover_image?: string | null
  show_cover_image?: boolean
  show_demo_url?: boolean
  show_challenge?: boolean
  show_solution?: boolean
  demo_url?: string | null
  github_url?: string | null
  client_name?: string | null
  title_pl: string
  title_en?: string | null
  short_desc_pl?: string | null
  short_desc_en?: string | null
  description_pl?: string | null
  description_en?: string | null
  challenge_pl?: string | null
  challenge_en?: string | null
  solution_pl?: string | null
  solution_en?: string | null
  seo_title_pl?: string | null
  seo_title_en?: string | null
  seo_desc_pl?: string | null
  seo_desc_en?: string | null
}

export interface VVServiceCategory {
  id: string
  slug: string
  name_pl: string
  name_en: string | null
  order_index: number
  created_at: string
}

export interface VVService {
  id: string
  slug: string
  status: VVServiceStatus
  order_index: number
  icon: string | null
  image_url: string | null
  price: number | null
  price_unit: string
  price_from: boolean
  duration: string | null
  title_pl: string
  title_en: string | null
  short_desc_pl: string | null
  short_desc_en: string | null
  description_pl: string | null
  description_en: string | null
  meta_title_pl: string | null
  meta_title_en: string | null
  meta_desc_pl: string | null
  meta_desc_en: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  categories?: VVServiceCategory[]
}

export interface VVServiceInput {
  slug: string
  status?: VVServiceStatus
  order_index?: number
  icon?: string | null
  image_url?: string | null
  price?: number | null
  price_unit?: string
  price_from?: boolean
  duration?: string | null
  title_pl: string
  title_en?: string | null
  short_desc_pl?: string | null
  short_desc_en?: string | null
  description_pl?: string | null
  description_en?: string | null
  meta_title_pl?: string | null
  meta_title_en?: string | null
  meta_desc_pl?: string | null
  meta_desc_en?: string | null
  category_ids?: string[]
}

export interface VVFaqCategory {
  id: string
  slug: string
  name_pl: string
  name_en: string | null
  order_index: number
  is_active: boolean
  created_by: string | null
  created_at: string
}

export interface VVFaqItem {
  id: string
  category_id: string | null
  question_pl: string
  question_en: string | null
  answer_pl: string
  answer_en: string | null
  order_index: number
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  category?: VVFaqCategory | null
}

export interface VVFaqCategoryInput {
  slug: string
  name_pl: string
  name_en?: string | null
  order_index?: number
  is_active?: boolean
}

export interface VVFaqItemInput {
  category_id?: string | null
  question_pl: string
  question_en?: string | null
  answer_pl: string
  answer_en?: string | null
  order_index?: number
  is_active?: boolean
}

export interface VVNewsletterSubscriber {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  source: string
  language: 'pl' | 'en'
  tags: string[]
  token: string
  is_active: boolean
  subscribed_at: string
  unsubscribed_at: string | null
  created_at: string
  updated_at: string
}

export interface VVNewsletterCampaign {
  id: string
  subject: string
  subject_en: string | null
  content_html: string
  content_html_en: string | null
  template_config: Json | null
  status: string
  recipient_count: number
  sent_count: number
  scheduled_for: string | null
  segment_tags: Json | null
  segment_language: string | null
  sent_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface VVLocalizedLinkItem {
  id: string
  href: string
  labelPl: string
  labelEn: string
  enabled: boolean
}

export interface VVSiteIdentitySettings {
  siteName: string
  logoUrl: string
  faviconUrl: string
  defaultOgImageUrl: string
}

export interface VVContactSettings {
  email: string
  phone: string
  address: string
  addressLine1: string
  city: string
  postalCode: string
  country: string
}

export interface VVSocialSettings {
  facebook: string
  instagram: string
  linkedin: string
  github: string
  x: string
}

export interface VVSeoSettings {
  siteTitle: string
  siteDescription: string
  keywords: string[]
  siteUrl: string
  robots: string
  ogSiteName: string
}

export interface VVMaintenanceSettings {
  enabled: boolean
  message: string
  description: string
  allowedIps: string[]
}

export interface VVCodeInjectionSettings {
  head: string
  body: string
}

export interface VVSeoFilesSettings {
  robotsTxt: string
  sitemapXml: string
}

export interface VVCompanySettings {
  legalName: string
  krs: string
  nip: string
  regon: string
}

export interface VVNavigationSettings {
  items: VVLocalizedLinkItem[]
  contactButtonLabelPl: string
  contactButtonLabelEn: string
  contactButtonHref: string
}

export interface VVFooterSettings {
  subtitlePl: string
  subtitleEn: string
  taglinePl: string
  taglineEn: string
  ctaLabelPl: string
  ctaLabelEn: string
  ctaHref: string
  legalLinks: VVLocalizedLinkItem[]
}

export interface VVSiteSettingRecord {
  key: string
  value: Json
  is_public: boolean
  description: string | null
  updated_at: string
}

export interface VVSiteSettingsBundle {
  identity: VVSiteIdentitySettings
  contact: VVContactSettings
  social: VVSocialSettings
  seo: VVSeoSettings
  maintenance: VVMaintenanceSettings
  code: VVCodeInjectionSettings
  seoFiles: VVSeoFilesSettings
  company: VVCompanySettings
  navigation: VVNavigationSettings
  footer: VVFooterSettings
}

export interface VVPageSeo {
  page_key: string
  title_pl: string
  title_en: string
  description_pl: string
  description_en: string
  og_title_pl: string
  og_title_en: string
  og_description_pl: string
  og_description_en: string
  og_image_url: string
  canonical_url: string
  robots: string
  indexable: boolean
  structured_data_json: string
  is_public: boolean
  updated_at: string
}

export interface VVPageSeoInput {
  title_pl: string
  title_en: string
  description_pl: string
  description_en: string
  og_title_pl?: string
  og_title_en?: string
  og_description_pl?: string
  og_description_en?: string
  og_image_url?: string
  canonical_url?: string
  robots?: string
  indexable?: boolean
  structured_data_json?: string
  is_public?: boolean
}

export interface VVLegalDocument {
  document_key: 'privacy_policy' | 'terms' | 'cookie_policy'
  title_pl: string
  title_en: string
  content_pl: string
  content_en: string
  version: string
  last_updated: string
  is_published: boolean
  updated_at: string
}

export interface VVLegalDocumentInput {
  title_pl: string
  title_en: string
  content_pl: string
  content_en: string
  version: string
  last_updated: string
  is_published?: boolean
}

export interface VVPageSection {
  page_key: 'home' | 'about' | 'contact'
  section_key: string
  order_index: number
  enabled: boolean
  content_pl: Json
  content_en: Json
  config: Json
  is_public: boolean
  updated_at: string
}

export interface VVPageSectionInput {
  order_index: number
  enabled: boolean
  content_pl: string
  content_en: string
  config: string
  is_public?: boolean
}

export interface VVCalendarEvent {
  id: string
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  all_day: boolean
  color: string
  category: string
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface VVCalendarEventInput {
  title: string
  description?: string | null
  start_at: string
  end_at?: string | null
  all_day?: boolean
  color?: string
  category?: string
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
