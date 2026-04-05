import * as Sentry from '@sentry/react'

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) {
    console.log('[wardex] Sentry renderer init skipped (no VITE_SENTRY_DSN)')
    return
  }

  // dev 모드에서는 sentry-ipc 프로토콜이 없어 일부 transport가 동작하지 않을 수 있으나,
  // @sentry/react의 fetch transport는 정상 동작하므로 환경 무관하게 초기화.
  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.2,
      // A1: 대시보드 UI 에러가 Sentry를 다시 호출하는 순환 방지
      beforeSend(event) {
        const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? []
        const isDashboardError = frames.some(
          (f) => f.filename && /components\/|pages\//.test(f.filename),
        )
        if (isDashboardError) return null
        return event
      },
    })
    console.log('[wardex] Sentry renderer initialized')
  } catch {
    // Sentry init 실패해도 앱은 정상 동작 (A1)
    console.warn('[wardex] Sentry renderer init failed, continuing without it')
  }
}
