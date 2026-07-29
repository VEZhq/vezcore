import assert from 'node:assert/strict'
import test from 'node:test'
import { applyRolePreview, isRolePreview } from '../role-preview.ts'
import type { UserPermissions } from '../permissions.ts'

function fullPermissions(): UserPermissions {
  return new Proxy({ role: 'super_admin' } as UserPermissions, {
    get(target, property) {
      if (property === 'role') return target.role
      if (typeof property === 'string' && property.startsWith('can')) return true
      return Reflect.get(target, property)
    },
    ownKeys() {
      return [
        'role',
        'canAccessKonta',
        'canAccessAudit',
        'canAccessSettings',
        'canAccessInfrastructure',
        'canAccessOperations',
        'canManageOperations',
        'canRevealOperationsShortcuts',
        'canViewSecurityReport',
        'canPreviewRoles',
        'canAccessProfile',
        'canAccessVezVision',
      ]
    },
    getOwnPropertyDescriptor() {
      return { enumerable: true, configurable: true }
    },
  })
}

test('role preview accepts only supported profiles', () => {
  assert.equal(isRolePreview('client'), true)
  assert.equal(isRolePreview('operator'), true)
  assert.equal(isRolePreview('admin'), false)
  assert.equal(isRolePreview(null), false)
})

test('client preview removes privileged capabilities', () => {
  const result = applyRolePreview(fullPermissions(), 'client')

  assert.equal(result.role, 'client')
  assert.equal(result.canAccessProfile, true)
  assert.equal(result.canAccessVezVision, true)
  assert.equal(result.canAccessKonta, false)
  assert.equal(result.canManageOperations, false)
  assert.equal(result.canRevealOperationsShortcuts, false)
  assert.equal(result.canPreviewRoles, false)
})

test('operator preview grants observation but not privileged operations', () => {
  const result = applyRolePreview(fullPermissions(), 'operator')

  assert.equal(result.canAccessAudit, true)
  assert.equal(result.canAccessInfrastructure, true)
  assert.equal(result.canAccessOperations, true)
  assert.equal(result.canManageOperations, false)
  assert.equal(result.canRevealOperationsShortcuts, false)
  assert.equal(result.canViewSecurityReport, false)
})
