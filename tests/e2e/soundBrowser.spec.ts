import { test, expect } from '@playwright/test'

test.describe('sound browser and audition', () => {
  test('browses sounds by category and search query, then inserts into code', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Switch to Sounds tab
    const soundsTab = page.getByRole('tab', { name: 'Звуки' })
    await soundsTab.tap()

    const browser = page.getByTestId('sound-browser')
    await expect(browser).toBeVisible()

    // Filter by Synth category
    const synthFilter = page.getByTestId('filter-synth')
    await expect(synthFilter).toBeVisible()
    await synthFilter.tap()

    // Sawtooth should be in list
    const sawtoothItem = page.getByTestId('sound-item-sawtooth')
    await expect(sawtoothItem).toBeVisible()

    // Search for 808
    const searchInput = page.getByPlaceholder('Поиск звуков...')
    await searchInput.fill('808')

    // 808bd should be visible
    const bd808Item = page.getByTestId('sound-item-808bd')
    await expect(bd808Item).toBeVisible()

    // Tap insert button
    const insertBtn = bd808Item.getByRole('button', { name: /Вставить/i })
    await insertBtn.tap()

    // Should automatically switch to Code tab with 808bd inserted
    const cmContent = page.locator('.cm-content')
    await expect(cmContent).toBeVisible()
    await expect(cmContent).toContainText('808bd')
  })
})

