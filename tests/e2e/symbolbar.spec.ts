import { test, expect } from '@playwright/test'

test('symbol bar shows mini-notation symbols inside string and js outside', async ({ page }) => {
  await page.goto('/')

  const cmContent = page.locator('.cm-content')
  await cmContent.click()
  // s("bd sd") length is 10. ArrowLeft from end puts cursor before ')' -> inside string
  await page.keyboard.press('End')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')

  // Inside string -> '~' should be visible
  await expect(page.locator('.symbol-btn[data-symbol="~"]')).toBeVisible({ timeout: 5000 })

  // Tap '~' -> verify inserted into editor
  await page.locator('.symbol-btn[data-symbol="~"]').dispatchEvent('pointerdown')
  await expect(cmContent).toContainText('~')

  // Move cursor outside string
  await page.keyboard.press('End')
  await page.keyboard.type('\n')

  // Outside string -> '$:' should be visible
  await expect(page.locator('.symbol-btn[data-symbol="$:"]')).toBeVisible({ timeout: 5000 })
})
