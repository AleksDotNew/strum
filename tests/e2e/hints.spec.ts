import { test, expect } from '@playwright/test'

test.describe('hints and autocomplete', () => {
  test('displays token documentation in HintLine on cursor move', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Initial code is s("bd sd")
    // Tap on 'bd' inside .cm-content
    const cmContent = page.locator('.cm-content')
    await cmContent.tap()

    // Move cursor to position 4 (over "bd")
    await page.keyboard.press('Home')
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('ArrowRight')
    }

    const hintLine = page.getByTestId('hint-line')
    await expect(hintLine).toContainText(/bd \[drum\]/i)
  })

  test('triggers autocomplete and suggests methods after dot in JS context', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const cmContent = page.locator('.cm-content')
    await cmContent.tap()
    await page.keyboard.press('End')
    await page.keyboard.type('.')
    await page.keyboard.press('Control+Space')

    const tooltip = page.locator('.cm-tooltip-autocomplete')
    await expect(tooltip).toBeVisible({ timeout: 5000 })
    await expect(tooltip).toContainText('lpf')
  })
})
