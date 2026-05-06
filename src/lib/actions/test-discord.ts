'use server'

import { createActionClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { isAdminRole } from '@/lib/roles'
import { ERRORS } from '@/lib/constants'
import { sendSystemAlert, sendIntegrationEvent, sendSecurityAlert, sendAuditLog, ensureUserDiscordThread, listDiscordUserThreads } from '@/lib/discord'
import { validateCSRFToken } from '@/lib/actions/csrf'
import { logError } from '@/lib/logger'

export async function testDiscordIntegrations(csrfToken: string) {
  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return { error: 'Nieprawidłowy token CSRF' }
  }

  const supabase = await createActionClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: ERRORS.NOT_LOGGED_IN }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isAdminRole(profile?.role)) return { error: ERRORS.NO_PERMISSIONS }

  const results: Record<string, boolean> = {}

  try {
    await sendSystemAlert('error', {
      message: 'Test error message',
      endpoint: '/api/test',
      responseTime: 500,
    })
    results['system_error'] = true
  } catch (error) {
    logError('test-discord.system_error', error)
    results['system_error'] = false
  }

  try {
    await sendSystemAlert('performance', {
      message: 'Slow response detected',
      endpoint: '/api/users',
      responseTime: 2500,
    })
    results['system_performance'] = true
  } catch (error) {
    logError('test-discord.system_performance', error)
    results['system_performance'] = false
  }

  try {
    await sendIntegrationEvent('github', {
      repo: 'vezCore',
      branch: 'main',
      commit: 'abc1234',
      message: 'Test commit',
      author: 'admin@vezvision.com',
    })
    results['github'] = true
  } catch (error) {
    logError('test-discord.github', error)
    results['github'] = false
  }

  try {
    await sendIntegrationEvent('deploy', {
      environment: 'production',
      status: 'success',
      duration: '2m 30s',
    })
    results['deploy'] = true
  } catch (error) {
    logError('test-discord.deploy', error)
    results['deploy'] = false
  }

  try {
    await sendIntegrationEvent('backup', {
      status: 'completed',
      size: '250MB',
      duration: '5m',
    })
    results['backup'] = true
  } catch (error) {
    logError('test-discord.backup', error)
    results['backup'] = false
  }

  try {
    await sendSecurityAlert('failed_login', {
      email: 'test@example.com',
      ip: '192.168.1.1',
      reason: 'Test failed login',
    })
    results['security_alerts'] = true
  } catch (error) {
    logError('test-discord.security_alerts', error)
    results['security_alerts'] = false
  }

  try {
    await sendAuditLog('login', {
      email: 'admin@vezvision.com',
      ip: '192.168.1.1',
    })
    results['audit_log'] = true
  } catch (error) {
    logError('test-discord.audit_log', error)
    results['audit_log'] = false
  }

  return results
}

async function requireAdminSession() {
  const supabase = await createActionClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: ERRORS.NOT_LOGGED_IN as string }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isAdminRole(profile?.role)) return { error: ERRORS.NO_PERMISSIONS as string }

  return { user }
}


