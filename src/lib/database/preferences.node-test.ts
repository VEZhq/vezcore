import assert from 'node:assert/strict'
import test from 'node:test'
import {
  defaultUserPreferences,
  sanitizeUserPreferences,
} from '../preferences.ts'

test('preferences sanitizer rejects unsupported values and unknown dashboard nodes', () => {
  const result = sanitizeUserPreferences({
    timezone: 'Etc/Unexpected',
    dateFormat: 'YY',
    sessionTimeout: 999,
    autoLogoutOnIpChange: 'yes',
    hiddenModules: ['vezVision', 'unknown'],
    hiddenServiceNodes: ['monitor', 'secret'],
    dashboardModulePositions: {
      vezVision: { left: 101.4, top: 202.8 },
      unknown: { left: 1, top: 2 },
    },
    dashboardModuleSizes: {
      vezVision: { width: 250.4, height: 130.8 },
      unknown: { width: 200, height: 100 },
    },
  })

  assert.equal(result.timezone, defaultUserPreferences.timezone)
  assert.equal(result.dateFormat, defaultUserPreferences.dateFormat)
  assert.equal(result.sessionTimeout, defaultUserPreferences.sessionTimeout)
  assert.equal(result.autoLogoutOnIpChange, false)
  assert.deepEqual(result.hiddenModules, ['vezVision'])
  assert.deepEqual(result.hiddenServiceNodes, ['monitor'])
  assert.deepEqual(result.dashboardModulePositions, {
    vezVision: { left: 101, top: 203 },
  })
  assert.deepEqual(result.dashboardModuleSizes, {
    vezVision: { width: 250, height: 131 },
  })
})

test('preferences sanitizer clamps movable and resizable dashboard values', () => {
  const result = sanitizeUserPreferences({
    operationsPanelSize: { width: 10_000, height: -10 },
    operationsPanelPosition: { left: -50, top: 50_000 },
    operationsPanelHidden: true,
    dashboardCenter: { x: -50_000, y: 50_000 },
    dashboardServiceNodePositions: {
      prodApi: { left: -50_000, top: 50_000 },
      database: { left: Number.NaN, top: 0 },
    },
    dashboardServiceNodeSizes: {
      prodApi: { width: 10_000, height: -100 },
    },
  })

  assert.deepEqual(result.operationsPanelSize, { width: 520, height: 280 })
  assert.deepEqual(result.operationsPanelPosition, { left: 0, top: 1770 })
  assert.equal(result.operationsPanelHidden, true)
  assert.deepEqual(result.dashboardCenter, { x: -1200, y: 1200 })
  assert.deepEqual(result.dashboardServiceNodePositions, {
    prodApi: { left: -1200, top: 1770 },
  })
  assert.deepEqual(result.dashboardServiceNodeSizes, {
    prodApi: { width: 280, height: 44 },
  })
})

test('preferences sanitizer always returns fresh nested defaults', () => {
  const first = sanitizeUserPreferences(null)
  const second = sanitizeUserPreferences(null)

  assert.notEqual(first, second)
  first.hiddenModules.push('vez')
  assert.deepEqual(second.hiddenModules, [])
})
