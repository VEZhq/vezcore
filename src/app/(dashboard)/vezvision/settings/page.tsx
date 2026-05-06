import { Settings } from 'lucide-react'
import { requireVezVisionPermission, hasVezVisionPermission } from '@/lib/auth/vezvision-permissions'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { getVezVisionLegalDocuments, getVezVisionPageSections, getVezVisionPageSeo, getVezVisionSiteSettings } from '@/lib/actions/vezvision/settings'
import VezVisionSettingsClient from './VezVisionSettingsClient'

export default async function VezVisionSettingsPage() {
  const state = await requireVezVisionPermission(VEZVISION_PERMISSIONS.SETTINGS_VIEW)
  const canManage = hasVezVisionPermission(state, VEZVISION_PERMISSIONS.SETTINGS_MANAGE)
  const [settingsResult, pageSeoResult, legalDocumentsResult, pageSectionsResult] = await Promise.all([getVezVisionSiteSettings(), getVezVisionPageSeo(), getVezVisionLegalDocuments(), getVezVisionPageSections()])
  const loadError = !settingsResult.success
    ? settingsResult.error
    : !pageSeoResult.success
      ? pageSeoResult.error
      : !legalDocumentsResult.success
        ? legalDocumentsResult.error
        : !pageSectionsResult.success
          ? pageSectionsResult.error
        : null

  if (!settingsResult.success || !pageSeoResult.success || !legalDocumentsResult.success || !pageSectionsResult.success) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-9 h-9 bg-white/[0.04] light:bg-black/[0.04] border border-white/[0.06] light:border-black/[0.06] rounded-sm">
            <Settings className="h-4 w-4 text-[#888888]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white light:text-black tracking-wide">Ustawienia</h1>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#555555] light:text-[#999999]">VezVision CMS</p>
          </div>
        </div>

        <div className="bg-[#111111]/80 light:bg-white/90 backdrop-blur-xl border border-red-500/20 rounded-sm p-8">
          <p className="text-sm text-red-300 light:text-red-600">Nie udało się załadować ustawień CRM dla VezVision.</p>
          <p className="mt-2 text-[11px] text-[#666666] light:text-[#888888]">{loadError}</p>
        </div>
      </div>
    )
  }

  return (
    <VezVisionSettingsClient
      settings={settingsResult.data}
      pageSeoEntries={pageSeoResult.data}
      legalDocuments={legalDocumentsResult.data}
      pageSections={pageSectionsResult.data}
      canManage={canManage}
    />
  )
}
