# Electron IPC API 계약

> SSOT: Main ↔ Renderer 간 통신 채널, 페이로드, 방향 정의
> Phase 2 구현 시 이 계약을 기준으로 코딩

## 채널 목록

### Renderer → Main (invoke)

| 채널                  | 요청 페이로드                         | 응답 페이로드                     | 사용 페이지 |
| --------------------- | ------------------------------------- | --------------------------------- | ----------- |
| `sentry:get-issues`   | `{ query?: string }`                  | `SentryIssue[]`                   | /sentry     |
| `sentry:get-events`   | `{ issueId: string }`                 | `SentryEvent[]`                   | /sentry     |
| `sentry:update-issue` | `{ issueId: string, status: string }` | `{ ok: boolean, error?: string }` | /sentry     |
| `health:check`        | `void`                                | `SystemHealth`                    | /dashboard  |
| `hooks:get-events`    | `{ limit?: number }`                  | `HookEvent[]`                     | /timeline   |
| `action:run`          | `{ action: ActionType }`              | `ActionResult`                    | /dashboard  |
| `settings:get`        | `void`                                | `AppSettings`                     | /settings   |
| `settings:set`        | `Partial<AppSettings>`                | `{ ok: boolean, error?: string }` | /settings   |

### Main → Renderer (send)

| 채널            | 페이로드                | 트리거                              | 사용 페이지 |
| --------------- | ----------------------- | ----------------------------------- | ----------- |
| `log:push`      | `LogEntry`              | electron-log 메시지 발생            | /logs       |
| `hook:event`    | `HookEvent`             | chokidar가 hook-log.jsonl 변경 감지 | /timeline   |
| `health:update` | `Partial<SystemHealth>` | 퀵 액션 완료                        | /dashboard  |

## 타입 정의

> 실제 타입은 `src/shared/types.ts`에 정의 (SSOT)

```typescript
// --- 로그 ---
type LogLevel = 'error' | 'warn' | 'info' | 'debug'
type LogSource = 'main' | 'renderer' | 'hook'

interface LogEntry {
  timestamp: string
  level: LogLevel
  source: LogSource
  message: string
  stack?: string
  file?: string
  line?: number
}

// --- Sentry ---
interface SentryIssue {
  id: string
  title: string
  count: number
  firstSeen: string
  lastSeen: string
  status: 'unresolved' | 'resolved' | 'ignored'
  level: string
}

interface SentryEvent {
  id: string
  title: string
  timestamp: string
  tags: Record<string, string>
  context: Record<string, unknown>
  stacktrace?: string
}

// --- 시스템 헬스 ---
interface SystemHealth {
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
interface HookEvent {
  timestamp: string
  event: string
  tool: string
  file: string
  result: 'pass' | 'block' | 'error' | 'failure'
  message: string
}

// --- 퀵 액션 ---
type ActionType = 'typecheck' | 'lint-fix' | 'test' | 'format'

interface ActionResult {
  action: ActionType
  success: boolean
  output: string
  duration: number
  error?: string // (B2 수정) 에러 메시지 (동시 실행 거부, 타임아웃 등)
}

// --- 설정 ---
interface AppSettings {
  sentryDsn: string // 읽기 전용 (.env)
  sentryAuthToken: string
  sentryOrg: string
  sentryProject: string
  logBufferSize: number // 기본 1000
  darkMode: boolean
}
```

## Preload API

```typescript
// contextBridge로 노출되는 API
interface WardexAPI {
  // invoke (renderer → main → response)
  getSentryIssues(query?: string): Promise<SentryIssue[]>
  getSentryEvents(issueId: string): Promise<SentryEvent[]>
  updateSentryIssue(issueId: string, status: string): Promise<{ ok: boolean; error?: string }>
  getSystemHealth(): Promise<SystemHealth>
  getHookEvents(limit?: number): Promise<HookEvent[]>
  runAction(action: ActionType): Promise<ActionResult>
  getSettings(): Promise<AppSettings>
  setSettings(settings: Partial<AppSettings>): Promise<{ ok: boolean; error?: string }>

  // on (main → renderer push)
  onLogMessage(callback: (entry: LogEntry) => void): () => void
  onHookEvent(callback: (event: HookEvent) => void): () => void
  onHealthUpdate(callback: (health: Partial<SystemHealth>) => void): () => void
}
```

## 엣지케이스 & 대응

### EC-5: action:run 동시 실행

- **문제**: Type Check + Test 동시 클릭 시 프로세스 경합
- **대응**: main process에 `runningAction: ActionType | null` 상태 유지. 실행 중이면 요청 거부 + `{ ok: false, error: "Action already running" }` 반환. renderer에서 버튼 전체 비활성화.

### EC-6: action:run 타임아웃

- **문제**: tsc/vitest가 무응답 시 UI 무한 스피너
- **대응**: `child_process.spawn`에 60초 타임아웃. 초과 시 SIGKILL + `{ success: false, output: "Timed out after 60s" }` 반환.

### EC-7: IPC 리스너 메모리 누수

- **문제**: 페이지 전환 시 onLogMessage 등 구독 해제 안 하면 리스너 누적
- **대응**: `onLogMessage`/`onHookEvent`/`onHealthUpdate`가 cleanup 함수 반환. React useEffect cleanup에서 호출 필수. Preload API 시그니처에 반영 완료 (`(): () => void`).

### ~~EC-8, EC-9: HTTP 훅 서버 관련~~ (A2: 과잉 설계로 Phase 2에서 제거)

- chokidar 파일 watch로 대체. hook-log.jsonl 변경 감지 → IPC `hook:event` push.
- HTTP 서버는 향후 필요 시 Phase 3에서 도입 검토.

## 시뮬레이션 발견 사항

### S1: HashRouter 사용 필수 (치명적)

- **문제**: Electron production은 `file://` 프로토콜 → `BrowserRouter` 동작 안 함
- **수정**: `react-router-dom`의 `HashRouter` 사용 (`/#/dashboard`, `/#/logs`)
- dev 모드(localhost)에서는 BrowserRouter도 동작하지만, 통일성을 위해 HashRouter 고정

### S2: IPC 핸들러에서 execSync 금지 (치명적)

- **문제**: `ipcMain.handle`에서 `execSync` 사용 시 main process 블로킹 → 앱 전체 프리징
- **수정**: 모든 외부 명령은 `child_process.exec` (Promise 래핑) 또는 `execa` 사용
- `health:check`는 4개 명령을 `Promise.all`로 병렬 실행

### S5: electron-log preload 충돌

- **문제**: `log.initialize()`가 자동으로 preload를 주입하면 커스텀 preload와 충돌
- **수정**: 자동 주입 비활성화, main에서 수동 인터셉트 → IPC send 방식

```typescript
log.initialize({ preload: false }) // 자동 주입 비활성화
log.hooks.push((message) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('log:push', formatLogEntry(message))
  })
  return message
})
```

### S10: 다중 BrowserWindow broadcast

- **수정**: `mainWindow.webContents.send` 대신 `BrowserWindow.getAllWindows().forEach(win => win.webContents.send(...))`

### ~~S13: HTTP 서버 시작 순서~~ (A2: HTTP 서버 제거로 해소)

- chokidar watch는 `app.whenReady()` 내에서 시작. 파일 부재 시 무시.

## 실시간 이벤트 수집 (A2 반영)

~~HTTP 훅 서버~~ → **chokidar 파일 watch**로 변경 (과잉 설계 제거)

- **방식**: main process에서 `chokidar.watch('.claude/hooks/hook-log.jsonl')` 감시
- **동작**: 파일 변경 감지 → 마지막 읽기 위치 이후의 새 줄 파싱 → IPC `hook:event`로 모든 BrowserWindow에 broadcast
- **폴백**: 파일 부재 시 무시 (타임라인 빈 상태 표시)
- **향후**: 지연이 문제가 되면 Phase 3에서 HTTP 서버 도입 검토
