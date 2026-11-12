import { test, expect } from '@playwright/test'

test('projects and version history workflows', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')

  // Open menu
  await page.getByRole('button', { name: 'Menu' }).tap()
  await expect(page.getByRole('button', { name: '🕒 История версий' })).toBeVisible()

  // Open Version History
  await page.getByRole('button', { name: '🕒 История версий' }).tap()
  await expect(page.locator('.history-sheet')).toBeVisible()

  // Close History
  await page.getByRole('button', { name: 'Close History' }).tap()
  await expect(page.locator('.history-sheet')).not.toBeVisible()

  // Open Menu -> Projects
  await page.getByRole('button', { name: 'Menu' }).tap()
  await page.getByRole('button', { name: '📁 Проекты' }).tap()
  await expect(page.locator('.project-card').first()).toBeVisible()

  // Create new project
  await page.getByRole('button', { name: 'New Project' }).tap()
  await expect(page.locator('.project-card')).toHaveCount(2)

  // Close Projects
  await page.getByRole('button', { name: 'Close Projects' }).tap()
  await expect(page.locator('.project-card')).not.toBeVisible()
})
