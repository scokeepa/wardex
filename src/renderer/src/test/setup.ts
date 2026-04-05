import '@testing-library/jest-dom/vitest'

// jsdom localStorage polyfill (일부 vitest 환경에서 누락될 수 있음)
if (
  typeof globalThis.localStorage === 'undefined' ||
  typeof globalThis.localStorage.getItem !== 'function'
) {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => {
        store.clear()
      },
      get length() {
        return store.size
      },
      key: (index: number) => [...store.keys()][index] ?? null,
    },
    writable: true,
  })
}
import type { WardexAPI, SystemHealth, AppSettings } from '../../../shared/types'

const defaultHealth: SystemHealth = {
  typescript: { errors: 0, checked: true },
  eslint: { errors: 0, warnings: 0, checked: true },
  tests: { passed: 2, failed: 0, total: 2, checked: true },
  git: { branch: 'main', clean: true },
  layers: {
    claudeCode: { active: true, hookCount: 5 },
    gitHooks: { preCommit: true, prePush: true },
    cicd: { configured: true },
    sentry: { connected: false, unresolvedCount: 0 },
  },
}

const defaultSettings: AppSettings = {
  sentryDsn: '',
  sentryAuthToken: '',
  sentryOrg: '',
  sentryProject: '',
  logBufferSize: 1000,
  darkMode: false,
}

const noop = (): (() => void) => () => {}

const mockWardex: WardexAPI = {
  getSentryIssues: () => Promise.resolve([]),
  getSentryEvents: () => Promise.resolve([]),
  updateSentryIssue: () => Promise.resolve({ ok: true }),
  getSystemHealth: () => Promise.resolve(defaultHealth),
  getHookEvents: () => Promise.resolve([]),
  runAction: (action) => Promise.resolve({ action, success: true, output: '', duration: 100 }),
  getSettings: () => Promise.resolve(defaultSettings),
  setSettings: () => Promise.resolve({ ok: true }),
  onLogMessage: noop,
  onHookEvent: noop,
  onHealthUpdate: noop,
}

Object.defineProperty(window, 'wardex', { value: mockWardex, writable: true })
