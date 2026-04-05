// SSOT: 모든 IPC 타입 정의 — docs/architecture/ipc-contract.md 기준

// --- 로그 ---
export type LogLevel = 'error' | 'warn' | 'info' | 'debug'
export type LogSource = 'main' | 'renderer' | 'hook'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  source: LogSource
  message: string
  stack?: string
  file?: string
  line?: number
}

// --- Sentry ---
export interface SentryIssue {
  id: string
  title: string
  count: number
  firstSeen: string
  lastSeen: string
  status: 'unresolved' | 'resolved' | 'ignored'
  level: string
}

export interface SentryEvent {
  id: string
  title: string
  timestamp: string
  tags: Record<string, string>
  context: Record<string, unknown>
  stacktrace?: string
}

// --- 시스템 헬스 ---
export interface SystemHealth {
  typescript: { errors: number; checked: boolean }
  eslint: { errors: number; warnings: number; checked: boolean }
  tests: { passed: number; failed: number; total: number; checked: boolean }
  git: { branch: string; clean: boolean }
  layers: {
    claudeCode: { active: boolean; hookCount: number }
    gitHooks: { preCommit: boolean; prePush: boolean }
    cicd: { configured: boolean }
    sentry: { connected: boolean; unresolvedCount: number }
  }
}

// --- 훅 이벤트 ---
export interface HookEvent {
  timestamp: string
  event: string
  tool: string
  file: string
  result: 'pass' | 'block' | 'error' | 'failure'
  message: string
}

// --- 퀵 액션 ---
export type ActionType = 'typecheck' | 'lint-fix' | 'test' | 'format'

export interface ActionResult {
  action: ActionType
  success: boolean
  output: string
  duration: number
  error?: string
}

// --- 설정 ---
export interface AppSettings {
  sentryDsn: string
  sentryAuthToken: string
  sentryOrg: string
  sentryProject: string
  logBufferSize: number
  darkMode: boolean
}

// --- Preload API ---
export interface WardexAPI {
  getSentryIssues(query?: string): Promise<SentryIssue[]>
  getSentryEvents(issueId: string): Promise<SentryEvent[]>
  updateSentryIssue(issueId: string, status: string): Promise<{ ok: boolean; error?: string }>
  getSystemHealth(): Promise<SystemHealth>
  getHookEvents(limit?: number): Promise<HookEvent[]>
  runAction(action: ActionType): Promise<ActionResult>
  getSettings(): Promise<AppSettings>
  setSettings(settings: Partial<AppSettings>): Promise<{ ok: boolean; error?: string }>
  onLogMessage(callback: (entry: LogEntry) => void): () => void
  onHookEvent(callback: (event: HookEvent) => void): () => void
  onHealthUpdate(callback: (health: Partial<SystemHealth>) => void): () => void
}

// --- Window 타입 확장 ---
declare global {
  interface Window {
    wardex?: WardexAPI
  }
}
