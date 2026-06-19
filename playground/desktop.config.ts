import { defineDesktopConfig } from '@owdproject/core'

export default defineDesktopConfig({
  theme: '@owdproject/theme-nova',
  modules: [
    '@owdproject/module-atproto',
    '@owdproject/module-atproto-persistence'
  ],
  apps: ['@owdproject/app-todo'],
  systemBar: { enabled: true, startButton: true },
})
