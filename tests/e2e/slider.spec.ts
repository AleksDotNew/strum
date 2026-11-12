import { test, expect } from '@playwright/test'

test.describe('number slider AST visual control', () => {
  test('opens number slider when tapping literal button and rewrites AST code', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const cmContent = page.locator('.cm-content')
    await cmContent.tap()
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type('s("bd").lpf(800)')

    // Place cursor over '800' (move left 2 chars from end)
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')

    // SymbolBar should display the ⚡ slider button for lpf
    const sliderBtn = page.getByTestId('symbol-slider-btn')
    await expect(sliderBtn).toBeVisible({ timeout: 5000 })
    await expect(sliderBtn).toContainText('lpf: 800')

    // Tap the slider button to open sheet
    await sliderBtn.tap()

    const sheet = page.getByTestId('number-slider-sheet')
    await expect(sheet).toBeVisible()

    // Tap the 2500 preset button
    const preset2500 = page.getByTestId('preset-2500')
    await expect(preset2500).toBeVisible()
    await preset2500.tap()

    // Verify code in editor was rewritten surgically
    await expect(cmContent).toContainText('s("bd").lpf(2500)')

    // Close the slider sheet
    await page.getByTestId('done-slider-btn').tap()
    await expect(sheet).not.toBeVisible()

    // Verify code is permanently preserved
    await expect(cmContent).toContainText('s("bd").lpf(2500)')
  })
})
