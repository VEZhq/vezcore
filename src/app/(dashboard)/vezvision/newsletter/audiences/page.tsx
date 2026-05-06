import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { getNewsletterSubscribers } from '@/lib/actions/vezvision/newsletter/audiences'
import AudienceListClient from '@/components/vezvision/newsletter/AudienceListClient'

export default async function AudiencesPage() {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_VIEW)
  const canManage = !('error' in auth) && await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE).then(a => !('error' in a)).catch(() => false)

  const result = await getNewsletterSubscribers({ limit: 50 })

  return (
    <AudienceListClient
      subscribers={result.success ? result.data.subscribers : []}
      total={result.success ? result.data.total : 0}
      canManage={canManage}
    />
  )
}
