const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  'video/mp4': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
  ],
  'application/zip': [[0x50, 0x4b, 0x03, 0x04]],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    [0x50, 0x4b, 0x03, 0x04],
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    [0x50, 0x4b, 0x03, 0x04],
  ],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    [0x50, 0x4b, 0x03, 0x04],
  ],
}

export function validateMagicBytes(
  buffer: ArrayBuffer,
  allowedTypes: readonly string[]
): boolean {
  const bytes = new Uint8Array(buffer)
  let hasKnownSignature = false

  for (const type of allowedTypes) {
    const signatures = MAGIC_BYTES[type]
    if (!signatures) continue

    hasKnownSignature = true

    for (const signature of signatures) {
      if (bytes.length < signature.length) continue

      let match = true
      for (let i = 0; i < signature.length; i++) {
        if (bytes[i] !== signature[i]) {
          match = false
          break
        }
      }

      if (match) return true
    }
  }

  if (!hasKnownSignature) {
    return true
  }

  return false
}

export function sanitizeUploadPath(path: string): string | null {
  const trimmed = path.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('/')) return null
  if (trimmed.includes('..')) return null

  const segments = trimmed.split('/').filter(Boolean)
  if (segments.some((segment) => segment === '.' || segment === '..')) return null

  if (!/^[a-zA-Z0-9/_\-.]+$/.test(trimmed)) return null

  return trimmed.replace(/\/+/g, '/').replace(/\/$/g, '')
}
