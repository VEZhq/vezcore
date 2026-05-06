'use server'

import { getAdminClient } from '@/lib/supabase/admin'
import { sendSecurityAlert } from '@/lib/discord'
import { getClientIP } from '@/lib/server-utils'
import { ONE_MINUTE, ONE_HOUR } from '@/lib/constants/time'
import { DEFAULT_WINDOW_MS } from '@/lib/constants/rate-limit'
import { logError } from '@/lib/logger'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  /** When true, allow requests through if the rate-limit backend fails.
   *  Defaults to false (fail-closed) for security. */
  failOpen?: boolean
}

const defaultConfig: RateLimitConfig = {
  maxRequests: 10,
  windowMs: DEFAULT_WINDOW_MS,
  failOpen: false,
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  error?: string
}

interface RateLimitRpcResult {
  allowed: boolean
  remaining: number
  reset_time: string
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = defaultConfig
): Promise<RateLimitResult> {
  const supabase = getAdminClient()

  type RpcClient = {
    rpc: (
      fn: 'consume_rate_limit',
      args: { p_key: string; p_max_requests: number; p_window_ms: number }
    ) => Promise<{ data: RateLimitRpcResult[] | null; error: { code: string } | null }>
  }

  const rpcClient = supabase as unknown as RpcClient

  const { data, error } = await rpcClient.rpc('consume_rate_limit', {
    p_key: identifier,
    p_max_requests: config.maxRequests,
    p_window_ms: config.windowMs,
  })

  if (error || !data || data.length === 0) {
    await logError('rate-limit.rpc', error)
    await sendSecurityAlert('suspicious', {
      email: 'system',
      ip: 'unknown',
      reason: `Rate limit backend failure for key: ${identifier}`,
    }).catch(() => logError('rate-limit.alert'))

    if (config.failOpen) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
      }
    }

    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + config.windowMs,
      error: 'Service temporarily unavailable',
    }
  }

  const result = data[0]
  const resetTime = new Date(result.reset_time).getTime()

  if (!result.allowed) {
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      error: `Rate limit exceeded. Try again after ${result.reset_time}`,
    }
  }

  return {
    allowed: true,
    remaining: result.remaining,
    resetTime,
  }
}

export async function rateLimitByIP(
  action: string,
  config?: RateLimitConfig
): Promise<RateLimitResult> {
  const ip = await getClientIP()

  const key = `${action}:${ip}`
  const result = await checkRateLimit(key, config)

  if (!result.allowed) {
    const waitTime = Math.ceil((result.resetTime - Date.now()) / 1000)
    return {
      allowed: false,
      remaining: 0,
      resetTime: result.resetTime,
      error: `Za dużo prób. Spróbuj ponownie za ${waitTime} sekund.`,
    }
  }

  return { allowed: true, remaining: result.remaining, resetTime: result.resetTime }
}

export async function cleanupOldRateLimits(): Promise<void> {
  const supabase = getAdminClient()
  const oneHourAgo = new Date(Date.now() - ONE_HOUR).toISOString()

  const { error } = await (supabase
    .from('rate_limits')
    .delete()
    .lt('reset_time', oneHourAgo) as unknown as Promise<{ error: { code: string } | null }>)

  if (error) {
    logError('rate-limit.cleanup', error)
  }
}


