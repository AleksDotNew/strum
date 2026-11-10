import { test, expect } from '@playwright/test'

test('play button evaluates a pattern without error', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play' }).tap()
  await expect(page.getByTestId('engine-status')).toHaveText('playing', { timeout: 25_000 })
})

