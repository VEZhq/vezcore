import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { getNewsletterCampaigns } from '@/lib/actions/vezvision/newsletter/campaigns'
import CampaignListClient from '@/components/vezvision/newsletter/CampaignListClient'

export default async function CampaignsPage() {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_VIEW)
  const canManage = !('error' in auth) && await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE).then(a => !('error' in a)).catch(() => false)

  const campaigns = await getNewsletterCampaigns()

  return (
    <CampaignListClient
      campaigns={campaigns.success ? campaigns.data : []}
      canManage={canManage}
    />
  )
}
