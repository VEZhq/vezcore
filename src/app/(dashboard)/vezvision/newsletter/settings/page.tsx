import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { getNewsletterSettings } from '@/lib/actions/vezvision/newsletter/settings'
import SettingsClient from '@/components/vezvision/newsletter/SettingsClient'

export default async function SettingsPage() {
  await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_VIEW)
  const canManage = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE).then(a => !('error' in a)).catch(() => false)

  const settings = await getNewsletterSettings()

  return (
    <SettingsClient
      initialSettings={settings.success ? settings.data : null}
      canManage={canManage}
    />
  )
}
