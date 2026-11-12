import { test, expect } from '@playwright/test'

test.describe('mixer channel strips and mute/gain control', () => {
  test('adjusts channel gain and toggles mute from mixer tab', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Initial code is s("bd sd")
    // Switch to Mix tab
    const mixTab = page.getByRole('tab', { name: 'Микс' })
    await mixTab.tap()

    const mixer = page.getByTestId('mixer-screen')
    await expect(mixer).toBeVisible()

    // First channel strip should exist
    const strip0 = page.getByTestId('channel-strip-0')
    await expect(strip0).toBeVisible()

    // Adjust gain slider on channel 0
    const slider = strip0.getByRole('slider')
    await expect(slider).toBeVisible()
    await slider.fill('0.5')

    // Switch to Code tab to verify .gain(0.5) was added
    await page.getByRole('tab', { name: 'Код' }).tap()
    const cmContent = page.locator('.cm-content')
    await expect(cmContent).toContainText('.gain(0.5)')

    // Switch back to Mix tab
    await mixTab.tap()

    // Toggle Mute on channel 0
    const muteBtn = strip0.getByRole('button', { name: 'M' })
    await muteBtn.tap()
    await expect(muteBtn).toHaveClass(/active-mute/)

    // Switch to Code tab to verify gain is 0 (muted)
    await page.getByRole('tab', { name: 'Код' }).tap()
    await expect(cmContent).toContainText('.gain(0)')
  })
})
