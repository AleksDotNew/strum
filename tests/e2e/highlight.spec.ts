import { test, expect } from '@playwright/test'

test('active playing events are highlighted in the editor', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play' }).tap()
  await expect(page.getByTestId('engine-status')).toHaveText('playing', { timeout: 20_000 })

  // When playing, @strudel/codemirror applies mark outline styles to currently sounding mini-locations
  const hapElement = page.locator('.cm-content span[style*="outline"], .cm-content [style*="outline"]')
  await expect(hapElement.first()).toBeVisible({ timeout: 10_000 })
})
