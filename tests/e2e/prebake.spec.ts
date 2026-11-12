import { test, expect } from '@playwright/test'

test('prebake stack and templates workflow', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')

  // Open menu
  await page.getByRole('button', { name: 'Menu' }).tap()
  await expect(page.getByRole('button', { name: '⚙️ Стек Prebake' })).toBeVisible()

  // Open Prebake Stack
  await page.getByRole('button', { name: '⚙️ Стек Prebake' }).tap()
  await expect(page.locator('.prebake-sheet')).toBeVisible()
  await expect(page.locator('.prebake-item').first()).toBeVisible()

  // Add new script
  await page.getByRole('button', { name: 'Add Script' }).tap()
  await page.getByPlaceholder('Название (например: Acid synths)').fill('My Custom Synth')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).tap()

  await expect(page.locator('.prebake-item')).toContainText(['My Custom Synth'])

  // Close Prebake Sheet
  await page.getByRole('button', { name: 'Close Prebake' }).tap()
  await expect(page.locator('.prebake-sheet')).not.toBeVisible()

  // Open Menu -> Templates
  await page.getByRole('button', { name: 'Menu' }).tap()
  await page.getByRole('button', { name: '📑 Шаблоны проектов' }).tap()
  await expect(page.locator('.templates-sheet')).toBeVisible()

  // Close Templates Sheet
  await page.getByRole('button', { name: 'Close Templates' }).tap()
  await expect(page.locator('.templates-sheet')).not.toBeVisible()
})
