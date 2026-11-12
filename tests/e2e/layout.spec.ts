import { test, expect } from '@playwright/test'

test('studio fits 412x915 without scroll and thumb controls are at bottom', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
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

test('landscape mode splits into 60/40 workspace and controls without document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 915, height: 412 })
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')

  const doc = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    sh: document.documentElement.scrollHeight,
    cw: document.documentElement.clientWidth,
    ch: document.documentElement.clientHeight,
  }))
  expect(doc.sw).toBeLessThanOrEqual(doc.cw)
  expect(doc.sh).toBeLessThanOrEqual(doc.ch)

  const workspace = await page.locator('.workspace-panel').boundingBox()
  expect(workspace).not.toBeNull()
  expect(workspace!.width).toBeGreaterThanOrEqual(530)
  expect(workspace!.width).toBeLessThanOrEqual(560)

  const topbar = await page.locator('.topbar').boundingBox()
  expect(topbar).not.toBeNull()
  expect(topbar!.x).toBeGreaterThanOrEqual(530)

  const nav = await page.getByRole('navigation').boundingBox()
  expect(nav).not.toBeNull()
  expect(nav!.x).toBeGreaterThanOrEqual(530)

  for (const name of ['Код', 'Сетка', 'Звуки', 'Микс']) {
    const tab = page.getByRole('tab', { name })
    await expect(tab).toBeVisible()
    const b = await tab.boundingBox()
    expect(b!.height).toBeGreaterThanOrEqual(48)
    expect(b!.width).toBeGreaterThanOrEqual(48)
  }
})

