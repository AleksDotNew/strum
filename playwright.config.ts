import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    ...devices['Pixel 7'],
    viewport: { width: 412, height: 915 },
    baseURL: 'http://localhost:5180',
    launchOptions: {
      args: ['--autoplay-policy=no-user-gesture-required'],
    },
  },
  webServer: {
    command: 'npm run dev',
    port: 5180,
    reuseExistingServer: true,
  },
})

