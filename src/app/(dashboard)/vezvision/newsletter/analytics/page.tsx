import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { getNewsletterAnalytics } from '@/lib/actions/vezvision/newsletter/analytics'
import AnalyticsClient from '@/components/vezvision/newsletter/AnalyticsClient'

export default async function AnalyticsPage() {
  await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_VIEW)

  const result = await getNewsletterAnalytics()

  return (
    <AnalyticsClient
      campaigns={result.success ? result.data.campaigns : []}
      stats={
        result.success
          ? result.data.stats
          : {
              totalSubscribers: 0,
              activeSubscribers: 0,
              inactiveSubscribers: 0,
              totalSent: 0,
              totalFailed: 0,
              totalCampaigns: 0,
            }
      }
    />
  )
}
