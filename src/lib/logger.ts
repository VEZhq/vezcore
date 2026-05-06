import { reportApiFailure } from '@/lib/monitoring'

const IS_DEV = process.env.NODE_ENV === 'development'

export async function logError(context: string, error?: unknown): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error ?? 'unknown error')
  if (IS_DEV) {
    console.error(`[ERROR] ${context}:`, errorMessage)
    return
  }
  await reportApiFailure(context, {
    message: errorMessage,
    error: error instanceof Error ? error.stack : undefined,
  })
}

export function logWarn(context: string, message?: unknown): void {
  if (IS_DEV) {
    console.warn(`[WARN] ${context}:`, message)
  }
}
