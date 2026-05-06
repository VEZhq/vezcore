import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { getNewsletterSettings } from '@/lib/actions/vezvision/newsletter/settings'
import { getNewsletterTemplates } from '@/lib/actions/vezvision/newsletter/templates'
import CampaignEditorClient from '@/components/vezvision/newsletter/CampaignEditorClient'

export default async function NewCampaignPage() {
  await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE)

  const [settingsResult, templatesResult] = await Promise.all([
    getNewsletterSettings(),
    getNewsletterTemplates(),
  ])

  return (
    <CampaignEditorClient
      mode="create"
      settings={settingsResult.success ? settingsResult.data : null}
      templates={templatesResult.success ? templatesResult.data : []}
    />
  )
}
