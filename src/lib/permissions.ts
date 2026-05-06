'use server'

import { cache } from 'react'
import { createActionClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { isAdminRole } from '@/lib/roles'

export interface UserPermissions {
  canAccessKonta: boolean
  canAccessAudit: boolean
  canAccessSettings: boolean
  canAccessProfile: boolean
  canAddUsers: boolean
  canDeleteUsers: boolean
  canEditUsers: boolean
  canManagePermissions: boolean
  canAccessVezVision: boolean
  canViewVezVisionBlog: boolean
  canManageVezVisionBlog: boolean
  canPublishVezVisionBlog: boolean
  canViewVezVisionPortfolio: boolean
  canManageVezVisionPortfolio: boolean
  canViewVezVisionServices: boolean
  canManageVezVisionServices: boolean
  canViewVezVisionFaq: boolean
  canManageVezVisionFaq: boolean
  canViewVezVisionNewsletter: boolean
  canManageVezVisionNewsletter: boolean
  canViewVezVisionFiles: boolean
  canManageVezVisionFiles: boolean
  canManageVezVisionFilesAcl: boolean
  canViewVezVisionSettings: boolean
  canManageVezVisionSettings: boolean
  canViewVezVisionCalendar: boolean
  canManageVezVisionCalendar: boolean
  role: string | null
}

type PermissionKey =
  | 'konta.view'
  | 'konta.create'
  | 'konta.edit'
  | 'konta.delete'
  | 'konta.permissions'
  | 'audit.view'
  | 'settings.view'
  | 'vezvision.access'
  | 'vezvision.blog.view'
  | 'vezvision.blog.manage'
  | 'vezvision.blog.publish'
  | 'vezvision.portfolio.view'
  | 'vezvision.portfolio.manage'
  | 'vezvision.services.view'
  | 'vezvision.services.manage'
  | 'vezvision.faq.view'
  | 'vezvision.faq.manage'
  | 'vezvision.newsletter.view'
  | 'vezvision.newsletter.manage'
  | 'vezvision.files.view'
  | 'vezvision.files.manage'
  | 'vezvision.files.permissions.manage'
  | 'vezvision.settings.view'
  | 'vezvision.settings.manage'
  | 'vezvision.calendar.view'
  | 'vezvision.calendar.manage'

interface PermissionKeyRow {
  permission_key: string | null
}

interface AuthenticatedPermissionState {
  userId: string
  permissions: UserPermissions
}

const EMPTY_PERMISSIONS: UserPermissions = {
  canAccessKonta: false,
  canAccessAudit: false,
  canAccessSettings: false,
  canAccessProfile: false,
  canAddUsers: false,
  canDeleteUsers: false,
  canEditUsers: false,
  canManagePermissions: false,
  canAccessVezVision: false,
  canViewVezVisionBlog: false,
  canManageVezVisionBlog: false,
  canPublishVezVisionBlog: false,
  canViewVezVisionPortfolio: false,
  canManageVezVisionPortfolio: false,
  canViewVezVisionServices: false,
  canManageVezVisionServices: false,
  canViewVezVisionFaq: false,
  canManageVezVisionFaq: false,
  canViewVezVisionNewsletter: false,
  canManageVezVisionNewsletter: false,
  canViewVezVisionFiles: false,
  canManageVezVisionFiles: false,
  canManageVezVisionFilesAcl: false,
  canViewVezVisionSettings: false,
  canManageVezVisionSettings: false,
  canViewVezVisionCalendar: false,
  canManageVezVisionCalendar: false,
  role: null,
}

const FIELD_TO_PERMISSION: Record<Exclude<keyof UserPermissions, 'canAccessProfile' | 'role'>, PermissionKey> = {
  canAccessKonta: 'konta.view',
  canAccessAudit: 'audit.view',
  canAccessSettings: 'settings.view',
  canAddUsers: 'konta.create',
  canDeleteUsers: 'konta.delete',
  canEditUsers: 'konta.edit',
  canManagePermissions: 'konta.permissions',
  canAccessVezVision: 'vezvision.access',
  canViewVezVisionBlog: 'vezvision.blog.view',
  canManageVezVisionBlog: 'vezvision.blog.manage',
  canPublishVezVisionBlog: 'vezvision.blog.publish',
  canViewVezVisionPortfolio: 'vezvision.portfolio.view',
  canManageVezVisionPortfolio: 'vezvision.portfolio.manage',
  canViewVezVisionServices: 'vezvision.services.view',
  canManageVezVisionServices: 'vezvision.services.manage',
  canViewVezVisionFaq: 'vezvision.faq.view',
  canManageVezVisionFaq: 'vezvision.faq.manage',
  canViewVezVisionNewsletter: 'vezvision.newsletter.view',
  canManageVezVisionNewsletter: 'vezvision.newsletter.manage',
  canViewVezVisionFiles: 'vezvision.files.view',
  canManageVezVisionFiles: 'vezvision.files.manage',
  canManageVezVisionFilesAcl: 'vezvision.files.permissions.manage',
  canViewVezVisionSettings: 'vezvision.settings.view',
  canManageVezVisionSettings: 'vezvision.settings.manage',
  canViewVezVisionCalendar: 'vezvision.calendar.view',
  canManageVezVisionCalendar: 'vezvision.calendar.manage',
}

async function buildUserPermissions(userId: string, role: string | null): Promise<UserPermissions> {
  const isAdmin = isAdminRole(role)
  const permissionKeys = new Set<string>()

  if (!isAdmin) {
    const adminClient = getAdminClient()
    const { data: permissions } = await adminClient
      .from('user_permissions')
      .select('permission_key')
      .eq('user_id', userId)

    const permissionRows = (permissions || []) as PermissionKeyRow[]

    for (const permission of permissionRows) {
      if (typeof permission.permission_key === 'string') {
        permissionKeys.add(permission.permission_key)
      }
    }
  }

  const hasPermission = (permissionKey: PermissionKey) => isAdmin || permissionKeys.has(permissionKey)

  return {
    canAccessKonta: hasPermission(FIELD_TO_PERMISSION.canAccessKonta),
    canAccessAudit: hasPermission(FIELD_TO_PERMISSION.canAccessAudit),
    canAccessSettings: hasPermission(FIELD_TO_PERMISSION.canAccessSettings),
    canAccessProfile: true,
    canAddUsers: hasPermission(FIELD_TO_PERMISSION.canAddUsers),
    canDeleteUsers: hasPermission(FIELD_TO_PERMISSION.canDeleteUsers),
    canEditUsers: hasPermission(FIELD_TO_PERMISSION.canEditUsers),
    canManagePermissions: hasPermission(FIELD_TO_PERMISSION.canManagePermissions),
    canAccessVezVision: hasPermission(FIELD_TO_PERMISSION.canAccessVezVision),
    canViewVezVisionBlog: hasPermission(FIELD_TO_PERMISSION.canViewVezVisionBlog),
    canManageVezVisionBlog: hasPermission(FIELD_TO_PERMISSION.canManageVezVisionBlog),
    canPublishVezVisionBlog: hasPermission(FIELD_TO_PERMISSION.canPublishVezVisionBlog),
    canViewVezVisionPortfolio: hasPermission(FIELD_TO_PERMISSION.canViewVezVisionPortfolio),
    canManageVezVisionPortfolio: hasPermission(FIELD_TO_PERMISSION.canManageVezVisionPortfolio),
    canViewVezVisionServices: hasPermission(FIELD_TO_PERMISSION.canViewVezVisionServices),
    canManageVezVisionServices: hasPermission(FIELD_TO_PERMISSION.canManageVezVisionServices),
    canViewVezVisionFaq: hasPermission(FIELD_TO_PERMISSION.canViewVezVisionFaq),
    canManageVezVisionFaq: hasPermission(FIELD_TO_PERMISSION.canManageVezVisionFaq),
    canViewVezVisionNewsletter: hasPermission(FIELD_TO_PERMISSION.canViewVezVisionNewsletter),
    canManageVezVisionNewsletter: hasPermission(FIELD_TO_PERMISSION.canManageVezVisionNewsletter),
    canViewVezVisionFiles:
      hasPermission(FIELD_TO_PERMISSION.canViewVezVisionFiles) ||
      hasPermission(FIELD_TO_PERMISSION.canManageVezVisionFiles) ||
      hasPermission(FIELD_TO_PERMISSION.canManageVezVisionFilesAcl),
    canManageVezVisionFiles: hasPermission(FIELD_TO_PERMISSION.canManageVezVisionFiles),
    canManageVezVisionFilesAcl: hasPermission(FIELD_TO_PERMISSION.canManageVezVisionFilesAcl),
    canViewVezVisionSettings: hasPermission(FIELD_TO_PERMISSION.canViewVezVisionSettings),
    canManageVezVisionSettings: hasPermission(FIELD_TO_PERMISSION.canManageVezVisionSettings),
    canViewVezVisionCalendar: hasPermission(FIELD_TO_PERMISSION.canViewVezVisionCalendar),
    canManageVezVisionCalendar: hasPermission(FIELD_TO_PERMISSION.canManageVezVisionCalendar),
    role,
  }
}

export const getAuthenticatedUserPermissionState = cache(async (): Promise<AuthenticatedPermissionState | null> => {
  const supabase = await createActionClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return {
    userId: user.id,
    permissions: await buildUserPermissions(user.id, profile?.role || null),
  }
})

const getUserPermissionState = cache(async (): Promise<UserPermissions> => {
  const state = await getAuthenticatedUserPermissionState()
  return state?.permissions ?? EMPTY_PERMISSIONS
})

export async function getUserPermissions(): Promise<UserPermissions> {
  return getUserPermissionState()
}


