import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'dev.strum.app',
  appName: 'Strum',
  webDir: 'dist',
  android: {
    minWebViewVersion: 120,
  },
  plugins: {
    Keyboard: {
      resize: 'none',
    },
  },
}

export default config

