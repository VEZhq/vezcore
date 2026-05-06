import { notFound } from 'next/navigation'
import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { getNewsletterCampaign } from '@/lib/actions/vezvision/newsletter/campaigns'
import { getNewsletterSettings } from '@/lib/actions/vezvision/newsletter/settings'
import { getNewsletterTemplates } from '@/lib/actions/vezvision/newsletter/templates'
import CampaignEditorClient from '@/components/vezvision/newsletter/CampaignEditorClient'

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE)

  const { id } = await params
  const [campaignResult, settingsResult, templatesResult] = await Promise.all([
    getNewsletterCampaign(id),
    getNewsletterSettings(),
    getNewsletterTemplates(),
  ])

  if (!campaignResult.success || !campaignResult.data) {
    notFound()
  }

  return (
    <CampaignEditorClient
      mode="edit"
      campaign={campaignResult.data}
      settings={settingsResult.success ? settingsResult.data : null}
      templates={templatesResult.success ? templatesResult.data : []}
    />
  )
}
