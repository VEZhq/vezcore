import type { UserPermissions } from '@/lib/permissions'

export const ROLE_PREVIEW_COOKIE = '__vez_role_preview'
export const ROLE_PREVIEW_VALUES = ['client', 'operator'] as const
export type RolePreview = typeof ROLE_PREVIEW_VALUES[number]

export function isRolePreview(value: unknown): value is RolePreview {
  return typeof value === 'string' && (ROLE_PREVIEW_VALUES as readonly string[]).includes(value)
}

export function applyRolePreview(
  actual: UserPermissions,
  preview: RolePreview
): UserPermissions {
  const minimal: UserPermissions = {
    ...Object.fromEntries(
      Object.keys(actual)
        .filter((key) => key.startsWith('can'))
        .map((key) => [key, false])
    ) as unknown as UserPermissions,
    role: 'client',
    canAccessProfile: true,
  }

  if (preview === 'operator') {
    return {
      ...minimal,
      role: 'client',
      canAccessAudit: true,
      canAccessInfrastructure: true,
      canAccessOperations: true,
      canAccessVezVision: true,
    }
  }

  return {
    ...minimal,
    canAccessVezVision: true,
  }
}
