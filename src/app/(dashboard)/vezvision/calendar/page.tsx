import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { listCalendarEvents } from '@/lib/actions/vezvision/calendar'
import CalendarClient from '@/components/vezvision/calendar/CalendarClient'

export default async function CalendarPage() {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.CALENDAR_VIEW)
  const canManage = !('error' in auth) && await requireVezVisionPermission(VEZVISION_PERMISSIONS.CALENDAR_MANAGE).then(a => !('error' in a)).catch(() => false)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const events = await listCalendarEvents(startOfMonth, endOfMonth)

  return (
    <CalendarClient
      initialEvents={events.success ? events.data : []}
      canManage={canManage}
    />
  )
}
