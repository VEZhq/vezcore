import { redirect } from 'next/navigation'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AutoLogoutProvider } from '@/components/AutoLogoutProvider'
import { SecurityAlertsProvider } from '@/components/SecurityAlertsProvider'
import { getAuthenticatedUserPermissionState } from '@/lib/permissions'
import { isAdminRole } from '@/lib/roles'
import { enforceRequiredMfaLevel } from '@/lib/queries/auth'

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const authState = await getAuthenticatedUserPermissionState()
	if (!authState) redirect('/login')

	const mfaState = await enforceRequiredMfaLevel()
	if (!mfaState.allowed) redirect('/login?reason=2fa_required')

	const permissions = authState.permissions
	const isAdmin = isAdminRole(permissions.role)

	return (
		<ErrorBoundary>
			<SecurityAlertsProvider isAdmin={isAdmin}>
				<AutoLogoutProvider>
					<div className="min-h-screen bg-[#0a0a0a]">
						{children}
					</div>
				</AutoLogoutProvider>
			</SecurityAlertsProvider>
		</ErrorBoundary>
	)
}
