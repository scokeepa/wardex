import { describe, it, expect } from 'vitest'

// parseSentryApiBase 로직 — src/main/ipc-handlers.ts:197과 동일
// main process 전용 함수이므로 로직만 동일하게 검증
function parseSentryApiBase(dsn: string): string {
  try {
    const url = new URL(dsn)
    let host = url.hostname
    host = host.replace(/^o\d+\./, '')
    host = host.replace('ingest.', '')
    return `https://${host}`
  } catch {
    return 'https://sentry.io'
  }
}

describe('parseSentryApiBase', () => {
  it('parses US region DSN', () => {
    const dsn = 'https://key@o4511150835236864.ingest.us.sentry.io/4511150841397248'
    expect(parseSentryApiBase(dsn)).toBe('https://us.sentry.io')
  })

  it('parses EU region DSN', () => {
    const dsn = 'https://key@o1234.ingest.eu.sentry.io/5678'
    expect(parseSentryApiBase(dsn)).toBe('https://eu.sentry.io')
  })

  it('parses DE region DSN', () => {
    const dsn = 'https://key@o9999.ingest.de.sentry.io/1111'
    expect(parseSentryApiBase(dsn)).toBe('https://de.sentry.io')
  })

  it('parses legacy DSN (no region)', () => {
    const dsn = 'https://key@o1234.ingest.sentry.io/5678'
    expect(parseSentryApiBase(dsn)).toBe('https://sentry.io')
  })

  it('falls back to sentry.io for invalid DSN', () => {
    expect(parseSentryApiBase('not-a-url')).toBe('https://sentry.io')
  })

  it('falls back to sentry.io for empty string', () => {
    expect(parseSentryApiBase('')).toBe('https://sentry.io')
  })
})
