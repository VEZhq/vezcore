import { NextResponse } from 'next/server'
import { sendSecurityAlert, sendAuditLog, sendSystemAlert, sendIntegrationEvent } from '@/lib/discord'
import { isDevelopmentDiscordTester } from '@/lib/queries/health'

export async function GET() {
	if (process.env.NODE_ENV === 'production') {
		return NextResponse.json({ error: 'Not found' }, { status: 404 })
	}

	const canTestDiscord = await isDevelopmentDiscordTester()
	if (!canTestDiscord) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}


	const results: Record<string, { success: boolean; error?: string }> = {}

	const testEmail = 'test@example.com'
	const testIP = '192.168.1.1'

	try {
		const result = await sendSecurityAlert('failed_login', {
			email: testEmail,
			ip: testIP,
			reason: 'Test failed login',
		})
		results['security_alert'] = { success: result }
	} catch (error) {
		results['security_alert'] = { success: false, error: String(error) }
	}

	try {
		await sendAuditLog('login', {
			email: testEmail,
			ip: testIP,
		})
		results['audit_log'] = { success: true }
	} catch (error) {
		results['audit_log'] = { success: false, error: String(error) }
	}

	try {
		await sendSystemAlert('error', {
			message: 'Test error message',
			endpoint: '/api/test-discord',
		})
		results['system_alert'] = { success: true }
	} catch (error) {
		results['system_alert'] = { success: false, error: String(error) }
	}

	try {
		await sendIntegrationEvent('deploy', {
			environment: 'test',
			status: 'success',
		})
		results['integration_event'] = { success: true }
	} catch (error) {
		results['integration_event'] = { success: false, error: String(error) }
	}

	return NextResponse.json({
		timestamp: new Date().toISOString(),
		results,
		env: {
			hasBotToken: !!process.env.DISCORD_BOT_TOKEN,
			hasSecurityChannel: !!process.env.DISCORD_SECURITY_CHANNEL_ID,
			hasAuditChannel: !!process.env.DISCORD_AUDIT_CHANNEL_ID,
			hasSystemChannel: !!process.env.DISCORD_SYSTEM_CHANNEL_ID,
			hasIntegrationsChannel: !!process.env.DISCORD_INTEGRATIONS_CHANNEL_ID,
		}
	})
}
