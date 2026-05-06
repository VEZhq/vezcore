#!/usr/bin/env node

import { chromium } from 'playwright'

const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000'
const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD
const TEST_EMAIL = process.env.E2E_TEST_USER_EMAIL || `e2e_${Date.now()}@example.com`
const TEST_PASSWORD = process.env.E2E_TEST_USER_PASSWORD || 'Admin123!'
const TEST_NAME = process.env.E2E_TEST_USER_NAME || 'E2E User'

if (!EMAIL || !PASSWORD) {
  console.error('Missing E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD')
  process.exit(1)
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    await page.fill('#email', EMAIL)
    await page.fill('#password', PASSWORD)
    await page.click('button:has-text("Zaloguj się")')
    await page.waitForURL(/\/dashboard|\/login/, { timeout: 15000 })

    await page.goto(`${BASE_URL}/konta`, { waitUntil: 'networkidle' })
    await page.click('button:has-text("Dodaj")')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.fill('input[placeholder="Jan Kowalski"]', TEST_NAME)
    await page.click('button:has-text("Dodaj")')
    await page.waitForTimeout(1200)

    await page.fill('input[placeholder="Szukaj po email lub nazwie..."]', TEST_EMAIL)
    await page.waitForTimeout(1200)

    const userVisible = await page.locator(`text=${TEST_EMAIL}`).first().isVisible().catch(() => false)
    if (!userVisible) {
      throw new Error('E2E create user check failed: user not visible on /konta')
    }

    const userLink = page.locator('a[href*="/konta/"]').first()
    await userLink.click()
    await page.waitForURL(/\/konta\/.+/, { timeout: 10000 })

    const permissionsLink = page.locator('a:has-text("Pozwolenia")')
    if (await permissionsLink.isVisible().catch(() => false)) {
      await permissionsLink.click()
      await page.waitForURL(/\/permissions/, { timeout: 10000 })
      const toggles = page.locator('button').filter({ hasText: '' })
      if (await toggles.count() > 0) {
        await page.waitForTimeout(200)
      }
    }

    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' })
    const twoFaVisible = await page.locator('text=2FA').first().isVisible().catch(() => false)
    if (!twoFaVisible) {
      throw new Error('E2E 2FA section check failed on /profile')
    }

    console.log('E2E checks passed')
  } finally {
    await browser.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
