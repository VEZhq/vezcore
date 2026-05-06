'use client'

import { Save } from 'lucide-react'
import {
  updateSiteIdentitySettings,
  updateContactSettings,
  updateCompanySettings,
  updateSocialSettings,
  updateSeoSettings,
  updateMaintenanceSettings,
  updateCodeInjectionSettings,
  updateSeoFilesSettings,
  updateNavigationSettings,
  updateFooterSettings,
} from '@/lib/actions/vezvision/settings'
import type {
  VVSiteIdentitySettings,
  VVContactSettings,
  VVCompanySettings,
  VVSocialSettings,
  VVSeoSettings,
  VVMaintenanceSettings,
  VVCodeInjectionSettings,
  VVSeoFilesSettings,
  VVNavigationSettings,
  VVFooterSettings,
} from '@/lib/actions/vezvision/types'
import { Field } from './Field'
import { Section } from './Section'
import { LinkItemsEditor } from './LinkItemsEditor'
import { inputCls, textareaCls, buttonCls } from './settingsStyles'
import type { WithSave } from './settingsTypes'

interface BrandSettingsProps {
  identity: VVSiteIdentitySettings
  setIdentity: React.Dispatch<React.SetStateAction<VVSiteIdentitySettings>>
  contact: VVContactSettings
  setContact: React.Dispatch<React.SetStateAction<VVContactSettings>>
  social: VVSocialSettings
  setSocial: React.Dispatch<React.SetStateAction<VVSocialSettings>>
  seo: VVSeoSettings
  setSeo: React.Dispatch<React.SetStateAction<VVSeoSettings>>
  maintenance: VVMaintenanceSettings
  setMaintenance: React.Dispatch<React.SetStateAction<VVMaintenanceSettings>>
  code: VVCodeInjectionSettings
  setCode: React.Dispatch<React.SetStateAction<VVCodeInjectionSettings>>
  seoFiles: VVSeoFilesSettings
  setSeoFiles: React.Dispatch<React.SetStateAction<VVSeoFilesSettings>>
  company: VVCompanySettings
  setCompany: React.Dispatch<React.SetStateAction<VVCompanySettings>>
  navigation: VVNavigationSettings
  setNavigation: React.Dispatch<React.SetStateAction<VVNavigationSettings>>
  footer: VVFooterSettings
  setFooter: React.Dispatch<React.SetStateAction<VVFooterSettings>>
  disabled: boolean
  savingKey: string | null
  canManage: boolean
  csrfToken: string
  withSave: WithSave
}

export function BrandSettings({
  identity,
  setIdentity,
  contact,
  setContact,
  social,
  setSocial,
  seo,
  setSeo,
  maintenance,
  setMaintenance,
  code,
  setCode,
  seoFiles,
  setSeoFiles,
  company,
  setCompany,
  navigation,
  setNavigation,
  footer,
  setFooter,
  disabled,
  savingKey,
  canManage,
  csrfToken,
  withSave,
}: BrandSettingsProps) {
  return (
    <>
      <Section title="Identity" description="Marka, logo, favicon i domyślny OG image." action={canManage ? <button type="button" className={buttonCls} disabled={disabled || savingKey === 'identity'} onClick={() => withSave('identity', () => updateSiteIdentitySettings(identity, csrfToken), 'Identity zapisane')}><Save className="h-3.5 w-3.5" />Zapisz</button> : undefined}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Site name" required><input value={identity.siteName} onChange={(e) => setIdentity((prev) => ({ ...prev, siteName: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Logo URL"><input value={identity.logoUrl} onChange={(e) => setIdentity((prev) => ({ ...prev, logoUrl: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Favicon URL"><input value={identity.faviconUrl} onChange={(e) => setIdentity((prev) => ({ ...prev, faviconUrl: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Default OG image URL"><input value={identity.defaultOgImageUrl} onChange={(e) => setIdentity((prev) => ({ ...prev, defaultOgImageUrl: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
        </div>
      </Section>

      <Section title="Contact & company" description="Publiczne dane kontaktowe i dane firmy renderowane na stronie." action={canManage ? <div className="flex gap-2"><button type="button" className={buttonCls} disabled={disabled || savingKey === 'contact'} onClick={() => withSave('contact', () => updateContactSettings(contact, csrfToken), 'Contact zapisany')}><Save className="h-3.5 w-3.5" />Kontakt</button><button type="button" className={buttonCls} disabled={disabled || savingKey === 'company'} onClick={() => withSave('company', () => updateCompanySettings(company, csrfToken), 'Company zapisane')}><Save className="h-3.5 w-3.5" />Firma</button></div> : undefined}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Email" required><input value={contact.email} onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Telefon" required><input value={contact.phone} onChange={(e) => setContact((prev) => ({ ...prev, phone: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Address line 1"><input value={contact.addressLine1} onChange={(e) => setContact((prev) => ({ ...prev, addressLine1: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="City"><input value={contact.city} onChange={(e) => setContact((prev) => ({ ...prev, city: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Postal code"><input value={contact.postalCode} onChange={(e) => setContact((prev) => ({ ...prev, postalCode: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Country"><input value={contact.country} onChange={(e) => setContact((prev) => ({ ...prev, country: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Full address"><input value={contact.address} onChange={(e) => setContact((prev) => ({ ...prev, address: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Legal name" required><input value={company.legalName} onChange={(e) => setCompany((prev) => ({ ...prev, legalName: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="KRS"><input value={company.krs} onChange={(e) => setCompany((prev) => ({ ...prev, krs: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="NIP"><input value={company.nip} onChange={(e) => setCompany((prev) => ({ ...prev, nip: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="REGON"><input value={company.regon} onChange={(e) => setCompany((prev) => ({ ...prev, regon: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
        </div>
      </Section>

      <Section title="Social & global SEO" description="Linki społecznościowe i globalny fallback SEO strony." action={canManage ? <div className="flex gap-2"><button type="button" className={buttonCls} disabled={disabled || savingKey === 'social'} onClick={() => withSave('social', () => updateSocialSettings(social, csrfToken), 'Social zapisane')}><Save className="h-3.5 w-3.5" />Social</button><button type="button" className={buttonCls} disabled={disabled || savingKey === 'seo'} onClick={() => withSave('seo', () => updateSeoSettings(seo, csrfToken), 'Global SEO zapisane')}><Save className="h-3.5 w-3.5" />SEO</button></div> : undefined}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Facebook"><input value={social.facebook} onChange={(e) => setSocial((prev) => ({ ...prev, facebook: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Instagram"><input value={social.instagram} onChange={(e) => setSocial((prev) => ({ ...prev, instagram: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="LinkedIn"><input value={social.linkedin} onChange={(e) => setSocial((prev) => ({ ...prev, linkedin: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="GitHub"><input value={social.github} onChange={(e) => setSocial((prev) => ({ ...prev, github: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="X / Twitter"><input value={social.x} onChange={(e) => setSocial((prev) => ({ ...prev, x: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Site URL" required><input value={seo.siteUrl} onChange={(e) => setSeo((prev) => ({ ...prev, siteUrl: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Site title" required><input value={seo.siteTitle} onChange={(e) => setSeo((prev) => ({ ...prev, siteTitle: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="OG site name"><input value={seo.ogSiteName} onChange={(e) => setSeo((prev) => ({ ...prev, ogSiteName: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Keywords (comma separated)"><input value={seo.keywords.join(', ')} onChange={(e) => setSeo((prev) => ({ ...prev, keywords: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Robots"><input value={seo.robots} onChange={(e) => setSeo((prev) => ({ ...prev, robots: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
        </div>
        <div className="mt-4">
          <Field label="Site description" required><textarea value={seo.siteDescription} onChange={(e) => setSeo((prev) => ({ ...prev, siteDescription: e.target.value }))} className={textareaCls} disabled={disabled} /></Field>
        </div>
      </Section>

      <Section title="Maintenance, code injection, SEO files" description="Ustawienia operacyjne i techniczne dla publicznej strony." action={canManage ? <div className="flex gap-2"><button type="button" className={buttonCls} disabled={disabled || savingKey === 'maintenance'} onClick={() => withSave('maintenance', () => updateMaintenanceSettings(maintenance, csrfToken), 'Maintenance zapisane')}><Save className="h-3.5 w-3.5" />Maintenance</button><button type="button" className={buttonCls} disabled={disabled || savingKey === 'code'} onClick={() => withSave('code', () => updateCodeInjectionSettings(code, csrfToken), 'Code injection zapisany')}><Save className="h-3.5 w-3.5" />Code</button><button type="button" className={buttonCls} disabled={disabled || savingKey === 'seo-files'} onClick={() => withSave('seo-files', () => updateSeoFilesSettings(seoFiles, csrfToken), 'SEO files zapisane')}><Save className="h-3.5 w-3.5" />SEO files</button></div> : undefined}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Maintenance enabled"><button type="button" onClick={() => setMaintenance((prev) => ({ ...prev, enabled: !prev.enabled }))} className={buttonCls} disabled={disabled}>{maintenance.enabled ? 'Aktywne' : 'Wyłączone'}</button></Field>
          <Field label="Allowed IPs (comma separated)"><input value={maintenance.allowedIps.join(', ')} onChange={(e) => setMaintenance((prev) => ({ ...prev, allowedIps: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))} className={inputCls} disabled={disabled} /></Field>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Maintenance message"><input value={maintenance.message} onChange={(e) => setMaintenance((prev) => ({ ...prev, message: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Maintenance description"><textarea value={maintenance.description} onChange={(e) => setMaintenance((prev) => ({ ...prev, description: e.target.value }))} className={textareaCls} disabled={disabled} /></Field>
          <Field label="Code injection head"><textarea value={code.head} onChange={(e) => setCode((prev) => ({ ...prev, head: e.target.value }))} className={textareaCls} disabled={disabled} /></Field>
          <Field label="Code injection body"><textarea value={code.body} onChange={(e) => setCode((prev) => ({ ...prev, body: e.target.value }))} className={textareaCls} disabled={disabled} /></Field>
          <Field label="robots.txt"><textarea value={seoFiles.robotsTxt} onChange={(e) => setSeoFiles((prev) => ({ ...prev, robotsTxt: e.target.value }))} className={textareaCls} disabled={disabled} /></Field>
          <Field label="sitemap.xml"><textarea value={seoFiles.sitemapXml} onChange={(e) => setSeoFiles((prev) => ({ ...prev, sitemapXml: e.target.value }))} className={textareaCls} disabled={disabled} /></Field>
        </div>
      </Section>

      <Section title="Navigation" description="Linki nawigacji publicznej strony i przycisk kontaktowy." action={canManage ? <button type="button" className={buttonCls} disabled={disabled || savingKey === 'navigation'} onClick={() => withSave('navigation', () => updateNavigationSettings(navigation, csrfToken), 'Navigation zapisana')}><Save className="h-3.5 w-3.5" />Zapisz</button> : undefined}>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Contact button label PL" required><input value={navigation.contactButtonLabelPl} onChange={(e) => setNavigation((prev) => ({ ...prev, contactButtonLabelPl: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Contact button label EN"><input value={navigation.contactButtonLabelEn} onChange={(e) => setNavigation((prev) => ({ ...prev, contactButtonLabelEn: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Contact button href" required><input value={navigation.contactButtonHref} onChange={(e) => setNavigation((prev) => ({ ...prev, contactButtonHref: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
        </div>
        <LinkItemsEditor items={navigation.items} onChange={(items) => setNavigation((prev) => ({ ...prev, items }))} disabled={disabled} addLabel="Dodaj link nawigacji" />
      </Section>

      <Section title="Footer" description="Footer CTA, tagline, subtitle i linki prawne." action={canManage ? <button type="button" className={buttonCls} disabled={disabled || savingKey === 'footer'} onClick={() => withSave('footer', () => updateFooterSettings(footer, csrfToken), 'Footer zapisany')}><Save className="h-3.5 w-3.5" />Zapisz</button> : undefined}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Subtitle PL" required><input value={footer.subtitlePl} onChange={(e) => setFooter((prev) => ({ ...prev, subtitlePl: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Subtitle EN"><input value={footer.subtitleEn} onChange={(e) => setFooter((prev) => ({ ...prev, subtitleEn: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="Tagline PL" required><textarea value={footer.taglinePl} onChange={(e) => setFooter((prev) => ({ ...prev, taglinePl: e.target.value }))} className={textareaCls} disabled={disabled} /></Field>
          <Field label="Tagline EN"><textarea value={footer.taglineEn} onChange={(e) => setFooter((prev) => ({ ...prev, taglineEn: e.target.value }))} className={textareaCls} disabled={disabled} /></Field>
          <Field label="CTA label PL" required><input value={footer.ctaLabelPl} onChange={(e) => setFooter((prev) => ({ ...prev, ctaLabelPl: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="CTA label EN"><input value={footer.ctaLabelEn} onChange={(e) => setFooter((prev) => ({ ...prev, ctaLabelEn: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
          <Field label="CTA href" required><input value={footer.ctaHref} onChange={(e) => setFooter((prev) => ({ ...prev, ctaHref: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
        </div>
        <div className="mt-4">
          <LinkItemsEditor items={footer.legalLinks} onChange={(legalLinks) => setFooter((prev) => ({ ...prev, legalLinks }))} disabled={disabled} addLabel="Dodaj link prawny" />
        </div>
      </Section>
    </>
  )
}
