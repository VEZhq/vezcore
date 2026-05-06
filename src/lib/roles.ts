export const ADMIN_ROLES = ['super_admin', 'admin'] as const

export type AdminRole = typeof ADMIN_ROLES[number]

export function isAdminRole(role: string | null): role is AdminRole {
  return role !== null && (ADMIN_ROLES as readonly string[]).includes(role)
}
