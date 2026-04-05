import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/renderer/src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src'),
    },
  },
})
