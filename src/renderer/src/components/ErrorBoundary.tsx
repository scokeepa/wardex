import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

// G3/A1: Sentry에 의존하지 않는 순수 React ErrorBoundary
// Sentry.ErrorBoundary 대신 직접 구현하여 순환 의존 방지
export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Sentry가 초기화되어 있으면 전송 시도 (실패해도 무시)
    try {
      void import('@sentry/react').then((Sentry) => {
        Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
      })
    } catch {
      // Sentry 미사용 환경에서도 앱은 정상 동작
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // 정적 fallback — Sentry, IPC, 외부 의존 없음
      return (
        <div role="alert" style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Something went wrong</h2>
          <pre style={{ color: 'red', whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
            {this.state.error?.message ?? 'Unknown error'}
          </pre>
          <button
            onClick={this.handleReset}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
            type="button"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
