import { test, expect } from '@playwright/test'

test('eval error keeps previous pattern and shows message', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play' }).tap()
  await expect(page.getByTestId('engine-status')).toHaveText('playing', { timeout: 20_000 })

  await page.locator('.cm-content').tap()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('s("bd sd"')

  await page.getByRole('button', { name: 'Eval' }).tap()
  await expect(page.getByTestId('hint-line')).toContainText(/Unexpected|expected|SyntaxError/i)
  await expect(page.getByTestId('engine-status')).toHaveText('error')
  await expect(page.locator('.cm-error-line')).toBeVisible()
})
