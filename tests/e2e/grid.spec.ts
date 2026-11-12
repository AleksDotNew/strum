import { test, expect } from '@playwright/test'

test.describe('step grid bidirectional visual control', () => {
  test('renders step grid in grid tab and modifies mini-notation code on cell tap', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Initial code is s("bd sd")
    // Switch to Grid tab
    const gridTabBtn = page.getByRole('tab', { name: 'Сетка' })
    await gridTabBtn.tap()

    // StepGrid container should be visible
    const stepGrid = page.getByTestId('step-grid')
    await expect(stepGrid).toBeVisible()

    // Tracks for bd and sd should be present
    const bdTrack = page.getByTestId('track-bd')
    await expect(bdTrack).toBeVisible()

    // Find and tap step 2 on bd track
    const stepCell = bdTrack.locator('[data-step="2"]')
    await expect(stepCell).toBeVisible()
    await stepCell.tap()
    await expect(stepCell).toHaveClass(/active/)

    // Switch back to Code tab
    const codeTabBtn = page.getByRole('tab', { name: 'Код' })
    await codeTabBtn.tap()

    // Editor content should now contain the modified pattern
    const cmContent = page.locator('.cm-content')
    await expect(cmContent).toBeVisible()
    const updatedCode = await cmContent.textContent()
    expect(updatedCode).toContain('bd')
  })

  test('shows fallback message when code is not grid-compatible', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Enter complex polymetric pattern
    const cmContent = page.locator('.cm-content')
    await cmContent.tap()
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type('s("<bd sd>")')

    // Switch to Grid tab
    await page.getByRole('tab', { name: 'Сетка' }).tap()

    // Fallback container should be displayed
    const fallback = page.getByTestId('grid-fallback')
    await expect(fallback).toBeVisible()
    await expect(fallback).toContainText(/только в коде/i)

    // Button to reset to default 16-step grid
    const resetBtn = page.getByTestId('grid-load-template-btn')
    await expect(resetBtn).toBeVisible()
    await resetBtn.tap()

    // Grid should now be active
    await expect(page.getByTestId('step-grid')).toBeVisible()
  })

  test('adds and removes track in step grid updating code model', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Switch to Grid tab
    await page.getByRole('tab', { name: 'Сетка' }).tap()
    await expect(page.getByTestId('step-grid')).toBeVisible()

    // Add 'hh' track using toolbar button
    const addHhBtn = page.getByRole('button', { name: '+ hh' })
    await expect(addHhBtn).toBeVisible()
    await addHhBtn.tap()

    // Track for hh should now exist
    const hhTrack = page.getByTestId('track-hh')
    await expect(hhTrack).toBeVisible()

    // Tap step 2 on hh track
    const hhStep2 = hhTrack.locator('[data-step="2"]')
    await hhStep2.tap()
    await expect(hhStep2).toHaveClass(/active/)

    // Switch to code tab and verify hh is present in code
    await page.getByRole('tab', { name: 'Код' }).tap()
    const cmContent = page.locator('.cm-content')
    await expect(cmContent).toContainText('hh')
  })
})
