import { test, expect } from '@playwright/test'

test.describe('piano roll melodic editor', () => {
  test('switches to piano roll, taps note step and updates note pattern in code', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Switch to Grid tab
    await page.getByRole('tab', { name: 'Сетка' }).tap()

    // Switch mode to Piano Roll
    const pianoRollModeBtn = page.getByRole('button', { name: /Пиано-ролл/i })
    await expect(pianoRollModeBtn).toBeVisible()
    await pianoRollModeBtn.tap()

    const pianoRoll = page.getByTestId('piano-roll')
    await expect(pianoRoll).toBeVisible()

    // Load default melodic template if needed
    const loadMelodyBtn = page.getByTestId('piano-load-melody-btn')
    if (await loadMelodyBtn.isVisible()) {
      await loadMelodyBtn.tap()
    }

    // Find C3 note row and tap step 1 (adding c3 hit)
    const c3Row = page.getByTestId('piano-row-c3')
    await expect(c3Row).toBeVisible()
    const step1 = c3Row.locator('[data-step="1"]')
    await expect(step1).toBeVisible()
    await step1.tap()

    // Switch back to Code tab and verify note pattern
    await page.getByRole('tab', { name: 'Код' }).tap()
    const cmContent = page.locator('.cm-content')
    await expect(cmContent).toContainText('note(')
    await expect(cmContent).toContainText('c3')
  })
})
