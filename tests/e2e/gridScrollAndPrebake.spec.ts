import { test, expect } from '@playwright/test'

test.describe('grid scroll retention, sound browser scrolling, and prebake reactivity', () => {
  test('retains scroll position when tapping steps 9-16 in step grid', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Switch to Grid tab
    await page.getByRole('tab', { name: 'Сетка' }).tap()
    const stepGrid = page.getByTestId('step-grid')
    await expect(stepGrid).toBeVisible()

    // Find the unified horizontal scroll container
    const scrollContainer = page.getByTestId('grid-scroll-tracks')
    await expect(scrollContainer).toBeVisible()

    // Scroll to the right (past step 8)
    await scrollContainer.evaluate((el) => {
      el.scrollLeft = 320
    })

    const initialScroll = await scrollContainer.evaluate((el) => el.scrollLeft)
    expect(initialScroll).toBeGreaterThan(200)

    // Tap step 12 on bd track
    const bdTrack = page.getByTestId('track-bd')
    const step12 = bdTrack.locator('[data-step="11"]') // 12th step (0-indexed 11)
    await expect(step12).toBeVisible()
    await step12.tap()

    // Verify cell is now active
    await expect(step12).toHaveClass(/active/)

    // Verify scrollLeft did NOT reset to 0
    const scrollAfterTap = await scrollContainer.evaluate((el) => el.scrollLeft)
    expect(scrollAfterTap).toBeGreaterThan(200)
  })

  test('piano roll scrolls horizontally as a whole and retains scroll position on step tap', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Switch to Grid tab -> Piano Roll
    await page.getByRole('tab', { name: 'Сетка' }).tap()
    await page.getByRole('button', { name: /Пиано-ролл/i }).tap()

    const loadMelodyBtn = page.getByTestId('piano-load-melody-btn')
    if (await loadMelodyBtn.isVisible()) {
      await loadMelodyBtn.tap()
    }

    const pianoRoll = page.getByTestId('piano-roll')
    await expect(pianoRoll).toBeVisible()

    const pianoScroll = page.getByTestId('piano-roll-scroll')
    await expect(pianoScroll).toBeVisible()

    // Scroll piano roll to the right
    await pianoScroll.evaluate((el) => {
      el.scrollLeft = 300
    })

    const scrollBefore = await pianoScroll.evaluate((el) => el.scrollLeft)
    expect(scrollBefore).toBeGreaterThan(150)

    // Tap step 10 on c3 row
    const c3Row = page.getByTestId('piano-row-c3')
    const step10 = c3Row.locator('[data-step="9"]')
    await expect(step10).toBeVisible()
    await step10.tap()

    // Verify scroll did NOT reset to 0
    const scrollAfter = await pianoScroll.evaluate((el) => el.scrollLeft)
    expect(scrollAfter).toBeGreaterThan(150)
  })

  test('prebake scripts toggle in stack reactively without needing to reopen sheet', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Open Prebake sheet from TopBar menu
    const menuBtn = page.getByLabel('Menu')
    await menuBtn.tap()

    const prebakeBtn = page.getByRole('button', { name: /Стек Prebake/i })
    await prebakeBtn.tap()

    const prebakeSheet = page.locator('.prebake-sheet')
    await expect(prebakeSheet).toBeVisible()

    // Find the Weft Helpers prebake item
    const weftItem = prebakeSheet.locator('.prebake-item').filter({ hasText: 'Weft Helpers' })
    await expect(weftItem).toBeVisible()

    const toggleBtn = weftItem.getByRole('button', { name: /\+ В стек|В стеке ✓/i })
    await expect(toggleBtn).toBeVisible()

    const initialText = await toggleBtn.textContent()

    // Tap toggle button
    await toggleBtn.tap()

    // Text and background should IMMEDIATELY change reactively
    if (initialText?.includes('В стек')) {
      await expect(toggleBtn).toHaveText(/В стеке ✓/)
    } else {
      await expect(toggleBtn).toHaveText(/\+ В стек/)
    }
  })
})
