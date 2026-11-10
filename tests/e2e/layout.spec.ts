import { test, expect } from '@playwright/test'

test('studio fits 412x915 without scroll and thumb controls are at bottom', async ({ page }) => {
  await page.goto('/')
  const doc = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    sh: document.documentElement.scrollHeight,
    cw: document.documentElement.clientWidth,
    ch: document.documentElement.clientHeight,
  }))
  expect(doc.sw).toBeLessThanOrEqual(doc.cw)
  expect(doc.sh).toBeLessThanOrEqual(doc.ch)

  const nav = await page.getByRole('navigation').boundingBox()
  expect(nav).not.toBeNull()
  expect(nav!.y + nav!.height).toBeGreaterThan(915 - 4)

  for (const name of ['Код', 'Сетка', 'Звуки', 'Микс']) {
    const tab = page.getByRole('tab', { name })
    await expect(tab).toBeVisible()
    const b = await tab.boundingBox()
    expect(b!.height).toBeGreaterThanOrEqual(48)
    expect(b!.width).toBeGreaterThanOrEqual(48)
  }

  const meta = await page.locator('meta[name=viewport]').getAttribute('content')
  expect(meta).toContain('user-scalable=no')
})

