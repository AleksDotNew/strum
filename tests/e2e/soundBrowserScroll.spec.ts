import { test, expect } from '@playwright/test'

test.describe('sound browser and samplepacks scrolling', () => {
  test('scrolls vertically through sounds list', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Switch to Sounds tab
    await page.getByRole('tab', { name: 'Звуки' }).tap()
    const soundBrowser = page.getByTestId('sound-browser')
    await expect(soundBrowser).toBeVisible()

    // Find the scrollable list container
    const soundsList = page.getByTestId('sounds-scroll-list')
    await expect(soundsList).toBeVisible()

    // Check that there are many sounds
    const soundItems = soundsList.locator('[data-testid^="sound-item-"]')
    const count = await soundItems.count()
    expect(count).toBeGreaterThan(20)

    // Scroll down
    await soundsList.evaluate((el) => {
      el.scrollTop = 400
    })

    const scrolledTop = await soundsList.evaluate((el) => el.scrollTop)
    expect(scrolledTop).toBeGreaterThan(200)
  })

  test('scrolls vertically through samplepacks list', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Switch to Sounds tab
    await page.getByRole('tab', { name: 'Звуки' }).tap()
    const soundBrowser = page.getByTestId('sound-browser')
    await expect(soundBrowser).toBeVisible()

    // Switch to Samplepacks tab
    const packsTabBtn = page.getByRole('button', { name: /Сэмплпаки/i })
    await expect(packsTabBtn).toBeVisible()
    await packsTabBtn.tap()

    // Find the scrollable packs container
    const packsList = page.getByTestId('samplepacks-scroll-list')
    await expect(packsList).toBeVisible()

    // Scroll down
    await packsList.evaluate((el) => {
      el.scrollTop = 300
    })

    const scrolledTop = await packsList.evaluate((el) => el.scrollTop)
    expect(scrolledTop).toBeGreaterThan(150)
  })
})
