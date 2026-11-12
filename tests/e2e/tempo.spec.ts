import { test, expect } from '@playwright/test'

test('tempo sheet allows changing BPM and hush gesture stops playback', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')

  // Open tempo sheet
  await page.getByRole('button', { name: 'Set BPM' }).tap()
  await expect(page.locator('.tempo-sheet')).toBeVisible()

  // Tap preset 140
  await page.getByRole('button', { name: '140' }).tap()
  await expect(page.getByRole('button', { name: 'Set BPM' })).toHaveText('140 bpm')

  // Close sheet
  await page.getByRole('button', { name: 'Close' }).tap()
  await expect(page.locator('.tempo-sheet')).not.toBeVisible()

  // Start playback
  await page.getByRole('button', { name: 'Play' }).tap()
  await expect(page.getByTestId('engine-status')).toHaveText('playing', { timeout: 15_000 })

  // Swipe down on topbar to trigger hush
  const topbar = page.locator('.topbar')
  await topbar.dispatchEvent('pointerdown', { clientY: 10, pointerId: 1 })
  await topbar.dispatchEvent('pointermove', { clientY: 80, pointerId: 1 })
  await topbar.dispatchEvent('pointerup', { clientY: 80, pointerId: 1 })

  // Verify hush stopped playback
  await expect(page.getByTestId('engine-status')).toHaveText('idle')
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
})
