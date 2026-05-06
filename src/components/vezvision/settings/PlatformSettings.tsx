'use client'

import { Save } from 'lucide-react'
import {
  updateMaintenanceSettings,
  updateCodeInjectionSettings,
  updateSeoFilesSettings,
} from '@/lib/actions/vezvision/settings'
import type {
  VVMaintenanceSettings,
  VVCodeInjectionSettings,
  VVSeoFilesSettings,
} from '@/lib/actions/vezvision/types'
import { Field } from './Field'
import { Section } from './Section'
import { inputCls, textareaCls, buttonCls, cardCls } from './settingsStyles'
import type { WithSave } from './settingsTypes'

interface PlatformSettingsProps {
  maintenance: VVMaintenanceSettings
  setMaintenance: React.Dispatch<React.SetStateAction<VVMaintenanceSettings>>
  code: VVCodeInjectionSettings
  setCode: React.Dispatch<React.SetStateAction<VVCodeInjectionSettings>>
  seoFiles: VVSeoFilesSettings
  setSeoFiles: React.Dispatch<React.SetStateAction<VVSeoFilesSettings>>
  disabled: boolean
  savingKey: string | null
  canManage: boolean
  csrfToken: string
  withSave: WithSave
}

export function PlatformSettings({
  maintenance,
  setMaintenance,
  code,
  setCode,
  seoFiles,
  setSeoFiles,
  disabled,
  savingKey,
  canManage,
  csrfToken,
  withSave,
}: PlatformSettingsProps) {
  return (
    <Section title="Platforma i operacje" description="Maintenance mode, code injection i pliki techniczne używane przez publiczny frontend." action={canManage ? <div className="flex gap-2"><button type="button" className={buttonCls} disabled={disabled || savingKey === 'maintenance'} onClick={() => withSave('maintenance', () => updateMaintenanceSettings(maintenance, csrfToken), 'Maintenance zapisane')}><Save className="h-3.5 w-3.5" />Maintenance</button><button type="button" className={buttonCls} disabled={disabled || savingKey === 'code'} onClick={() => withSave('code', () => updateCodeInjectionSettings(code, csrfToken), 'Code injection zapisany')}><Save className="h-3.5 w-3.5" />Code</button><button type="button" className={buttonCls} disabled={disabled || savingKey === 'seo-files'} onClick={() => withSave('seo-files', () => updateSeoFilesSettings(seoFiles, csrfToken), 'SEO files zapisane')}><Save className="h-3.5 w-3.5" />SEO files</button></div> : undefined}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className={cardCls}><div className="text-[10px] uppercase tracking-[0.18em] text-[#888888]">Maintenance</div><div className="mt-2 text-sm text-white light:text-black">{maintenance.enabled ? 'Aktywne' : 'Wyłączone'}</div><p className="mt-1 text-[11px] text-[#666666] light:text-[#888888]">Utrzymanie strony i komunikat dla użytkowników.</p></div>
        <div className={cardCls}><div className="text-[10px] uppercase tracking-[0.18em] text-[#888888]">Code injection</div><div className="mt-2 text-sm text-white light:text-black">{code.head || code.body ? 'Skonfigurowane' : 'Puste'}</div><p className="mt-1 text-[11px] text-[#666666] light:text-[#888888]">Snippety head/body dla integracji marketingowych.</p></div>
        <div className={cardCls}><div className="text-[10px] uppercase tracking-[0.18em] text-[#888888]">SEO files</div><div className="mt-2 text-sm text-white light:text-black">{seoFiles.robotsTxt || seoFiles.sitemapXml ? 'Skonfigurowane' : 'Puste'}</div><p className="mt-1 text-[11px] text-[#666666] light:text-[#888888]">robots.txt i sitemap.xml.</p></div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Maintenance enabled"><button type="button" onClick={() => setMaintenance((prev) => ({ ...prev, enabled: !prev.enabled }))} className={buttonCls} disabled={disabled}>{maintenance.enabled ? 'Aktywne' : 'Wyłączone'}</button></Field>
        <Field label="Allowed IPs (comma separated)"><input value={maintenance.allowedIps.join(', ')} onChange={(e) => setMaintenance((prev) => ({ ...prev, allowedIps: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))} className={inputCls} disabled={disabled} /></Field>
        <Field label="Maintenance message"><input value={maintenance.message} onChange={(e) => setMaintenance((prev) => ({ ...prev, message: e.target.value }))} className={inputCls} disabled={disabled} /></Field>
        <Field label="Maintenance description"><textarea value={maintenance.description} onChange={(e) => setMaintenance((prev) => ({ ...prev, description: e.target.value }))} className={textareaCls} disabled={disabled} /></Field>
        <Field label="Code injection head"><textarea value={code.head} onChange={(e) => setCode((prev) => ({ ...prev, head: e.target.value }))} className={textareaCls} disabled={disabled} /></Field>
        <Field label="Code injection body"><textarea value={code.body} onChange={(e) => setCode((prev) => ({ ...prev, body: e.target.value }))} className={textareaCls} disabled={disabled} /></Field>
        <Field label="robots.txt"><textarea value={seoFiles.robotsTxt} onChange={(e) => setSeoFiles((prev) => ({ ...prev, robotsTxt: e.target.value }))} className={textareaCls} disabled={disabled} /></Field>
        <Field label="sitemap.xml"><textarea value={seoFiles.sitemapXml} onChange={(e) => setSeoFiles((prev) => ({ ...prev, sitemapXml: e.target.value }))} className={textareaCls} disabled={disabled} /></Field>
      </div>
    </Section>
  )
}
