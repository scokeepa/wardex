/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-base-to-string */
import { ipcMain, BrowserWindow, safeStorage } from 'electron'
import { exec } from 'child_process'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { watch } from 'chokidar'
import Store from 'electron-store'
import type {
  SystemHealth,
  HookEvent,
  ActionType,
  ActionResult,
  AppSettings,
  LogEntry,
} from '../shared/types'

const PROJECT_DIR = process.cwd()
console.log('[wardex] PROJECT_DIR:', PROJECT_DIR)

type StoredSettings = Omit<AppSettings, 'sentryDsn'>

let store: Store<StoredSettings>
try {
  store = new Store<StoredSettings>({
    name: 'wardex-settings',
    defaults: {
      sentryAuthToken: '',
      sentryOrg: '',
      sentryProject: '',
      logBufferSize: 1000,
      darkMode: false,
    },
  })
  console.log('[wardex] electron-store initialized')
} catch (err) {
  console.error('[wardex] electron-store init failed:', err)
  // fallback — in-memory store
  const mem: Record<string, unknown> = {
    sentryAuthToken: '',
    sentryOrg: '',
    sentryProject: '',
    logBufferSize: 1000,
    darkMode: false,
  }
  store = {
    get: (k: string) => mem[k],
    set: (k: string, v: unknown) => {
      mem[k] = v
    },
  } as unknown as Store<StoredSettings>
}

const BIN = join(PROJECT_DIR, 'node_modules', '.bin')
const HOOK_LOG = join(PROJECT_DIR, '.claude', 'hooks', 'hook-log.jsonl')

let runningAction: ActionType | null = null
let lastReadPosition = 0

function encryptToken(token: string): string {
  if (!token || !safeStorage.isEncryptionAvailable()) return token
  return safeStorage.encryptString(token).toString('base64')
}

function decryptToken(encrypted: string): string {
  if (!encrypted || !safeStorage.isEncryptionAvailable()) return encrypted
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  } catch {
    return encrypted
  }
}

function broadcast(channel: string, data: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data)
    }
  }
}

function execAsync(cmd: string, timeoutMs = 60_000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(
      cmd,
      { cwd: PROJECT_DIR, timeout: timeoutMs, maxBuffer: 5 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err?.killed) {
          reject(new Error(`Timed out after ${String(timeoutMs / 1000)}s`))
        } else {
          resolve({ stdout, stderr })
        }
      },
    )
  })
}

async function checkTypescript(): Promise<SystemHealth['typescript']> {
  try {
    const { stdout } = await execAsync(`${BIN}/tsc --noEmit 2>&1`)
    const errors = (stdout.match(/error TS/g) ?? []).length
    return { errors, checked: true }
  } catch {
    return { errors: -1, checked: false }
  }
}

async function checkEslint(): Promise<SystemHealth['eslint']> {
  try {
    const { stdout } = await execAsync(`${BIN}/eslint src/ --format json 2>/dev/null`)
    const results = JSON.parse(stdout) as Array<{ errorCount: number; warningCount: number }>
    const errors = results.reduce((sum, r) => sum + r.errorCount, 0)
    const warnings = results.reduce((sum, r) => sum + r.warningCount, 0)
    return { errors, warnings, checked: true }
  } catch {
    return { errors: -1, warnings: -1, checked: false }
  }
}

async function checkTests(): Promise<SystemHealth['tests']> {
  try {
    const outFile = '/tmp/wardex-test-result.json'
    await execAsync(`${BIN}/vitest run --reporter=json --outputFile=${outFile} 2>/dev/null`)
    const raw = await readFile(outFile, 'utf-8')
    const data = JSON.parse(raw) as {
      numPassedTests: number
      numFailedTests: number
      numTotalTests: number
    }
    return {
      passed: data.numPassedTests,
      failed: data.numFailedTests,
      total: data.numTotalTests,
      checked: true,
    }
  } catch {
    return { passed: 0, failed: 0, total: 0, checked: false }
  }
}

async function checkGit(): Promise<SystemHealth['git']> {
  try {
    const [status, branch] = await Promise.all([
      execAsync('git status --porcelain'),
      execAsync('git branch --show-current'),
    ])
    return { branch: branch.stdout.trim() || 'unknown', clean: status.stdout.trim() === '' }
  } catch {
    return { branch: 'unknown', clean: false }
  }
}

async function checkSentry(): Promise<{ connected: boolean; unresolvedCount: number }> {
  const { base, token, org, project } = getSentryConfig()
  if (!token || !org || !project) return { connected: false, unresolvedCount: 0 }
  try {
    const res = await fetch(
      `${base}/api/0/projects/${org}/${project}/issues/?query=is:unresolved&per_page=1`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) return { connected: false, unresolvedCount: 0 }
    const issues = (await res.json()) as unknown[]
    const total = res.headers.get('X-Hits') ?? res.headers.get('X-Total-Count')
    return { connected: true, unresolvedCount: total ? Number(total) : issues.length }
  } catch {
    return { connected: false, unresolvedCount: 0 }
  }
}

async function checkLayers(): Promise<SystemHealth['layers']> {
  const claudeSettingsPath = join(PROJECT_DIR, '.claude', 'settings.json')
  let claudeCode = { active: false, hookCount: 0 }
  try {
    const raw = await readFile(claudeSettingsPath, 'utf-8')
    const settings = JSON.parse(raw) as { hooks?: Record<string, unknown[]> }
    if (settings.hooks) {
      const count = Object.values(settings.hooks).reduce((sum, arr) => sum + arr.length, 0)
      claudeCode = { active: true, hookCount: count }
    }
  } catch {
    /* not configured */
  }

  const preCommit = existsSync(join(PROJECT_DIR, '.husky', 'pre-commit'))
  const prePush = existsSync(join(PROJECT_DIR, '.husky', 'pre-push'))
  const cicd = existsSync(join(PROJECT_DIR, '.github', 'workflows', 'ci.yml'))

  return {
    claudeCode,
    gitHooks: { preCommit, prePush },
    cicd: { configured: cicd },
    sentry: await checkSentry(),
  }
}

// S3: DSN에서 Sentry API 베이스 URL 추출
function parseSentryApiBase(dsn: string): string {
  try {
    const url = new URL(dsn)
    let host = url.hostname // e.g. o123.ingest.us.sentry.io
    host = host.replace(/^o\d+\./, '') // o{digits}. 제거
    host = host.replace('ingest.', '') // ingest. 제거
    return `https://${host}`
  } catch {
    return 'https://sentry.io'
  }
}

function getSentryConfig(): { base: string; token: string; org: string; project: string } {
  const dsn = (store.get('sentryDsn' as never) as string) || process.env.SENTRY_DSN || ''
  const token = decryptToken(store.get('sentryAuthToken'))
  const org = store.get('sentryOrg')
  const project = store.get('sentryProject')
  return { base: parseSentryApiBase(dsn), token, org, project }
}

function formatStacktrace(event: Record<string, unknown>): string {
  try {
    const entries =
      (event.entries as Array<{
        type: string
        data: {
          values?: Array<{
            stacktrace?: { frames?: Array<{ filename: string; lineNo: number; function: string }> }
          }>
        }
      }>) ?? []
    for (const entry of entries) {
      if (entry.type === 'exception' && entry.data?.values) {
        const frames = entry.data.values[0]?.stacktrace?.frames ?? []
        return frames
          .reverse()
          .map((f) => `  at ${f.function ?? '?'} (${f.filename}:${String(f.lineNo)})`)
          .join('\n')
      }
    }
  } catch {
    /* ignore */
  }
  return ''
}

function parseHookLogLines(content: string): HookEvent[] {
  return content
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as HookEvent
      } catch {
        return null
      }
    })
    .filter((e): e is HookEvent => e !== null)
}

async function getFullHealth(): Promise<SystemHealth> {
  console.log('[wardex] health:check running...')
  const [typescript, eslint, tests, git, layers] = await Promise.all([
    checkTypescript(),
    checkEslint(),
    checkTests(),
    checkGit(),
    checkLayers(),
  ])
  console.log('[wardex] health:check done', {
    ts: typescript.errors,
    eslint: eslint.errors,
    git: git.branch,
  })
  return { typescript, eslint, tests, git, layers }
}

export function registerIpcHandlers(): void {
  console.log('[wardex] Registering IPC handlers...')

  ipcMain.handle('health:check', async () => {
    return getFullHealth()
  })

  ipcMain.handle(
    'action:run',
    async (_event, { action }: { action: ActionType }): Promise<ActionResult> => {
      if (runningAction) {
        return {
          action,
          success: false,
          output: '',
          duration: 0,
          error: `Action '${runningAction}' already running`,
        }
      }
      runningAction = action
      const start = Date.now()
      const commands: Record<ActionType, string> = {
        typecheck: `${BIN}/tsc --noEmit`,
        'lint-fix': `${BIN}/eslint --fix src/`,
        test: `${BIN}/vitest run`,
        format: `${BIN}/prettier --check src/`,
      }
      try {
        const { stdout, stderr } = await execAsync(commands[action])
        const output = (stdout + stderr).slice(0, 5000)
        runningAction = null
        void getFullHealth().then((h) => {
          broadcast('health:update', h)
        })
        return { action, success: true, output, duration: Date.now() - start }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        runningAction = null
        void getFullHealth().then((h) => {
          broadcast('health:update', h)
        })
        return {
          action,
          success: false,
          output: msg.slice(0, 5000),
          duration: Date.now() - start,
          error: msg.slice(0, 200),
        }
      }
    },
  )

  ipcMain.handle('hooks:get-events', async (_event, { limit }: { limit?: number }) => {
    try {
      const content = await readFile(HOOK_LOG, 'utf-8')
      const events = parseHookLogLines(content)
      return limit ? events.slice(-limit) : events.slice(-200)
    } catch {
      return []
    }
  })

  ipcMain.handle('settings:get', () => {
    console.log('[wardex] settings:get called')
    return {
      sentryDsn: (store.get('sentryDsn' as never) as string) || process.env.SENTRY_DSN || '',
      sentryAuthToken: decryptToken(store.get('sentryAuthToken')),
      sentryOrg: store.get('sentryOrg'),
      sentryProject: store.get('sentryProject'),
      logBufferSize: store.get('logBufferSize'),
      darkMode: store.get('darkMode'),
    }
  })

  ipcMain.handle('settings:set', async (_event, settings: Partial<AppSettings>) => {
    try {
      if (settings.sentryDsn !== undefined)
        store.set('sentryDsn' as never, settings.sentryDsn as never)
      if (settings.sentryAuthToken !== undefined) {
        if (settings.sentryAuthToken) {
          try {
            const res = await fetch('https://sentry.io/api/0/', {
              headers: { Authorization: `Bearer ${settings.sentryAuthToken}` },
              signal: AbortSignal.timeout(5000),
            })
            if (res.status === 401) {
              store.set('sentryAuthToken', encryptToken(settings.sentryAuthToken))
              return { ok: true, error: 'Token saved but may be invalid (401)' }
            }
          } catch {
            /* offline */
          }
        }
        store.set('sentryAuthToken', encryptToken(settings.sentryAuthToken))
      }
      if (settings.sentryOrg !== undefined) store.set('sentryOrg', settings.sentryOrg)
      if (settings.sentryProject !== undefined) store.set('sentryProject', settings.sentryProject)
      if (settings.darkMode !== undefined) store.set('darkMode', settings.darkMode)
      if (settings.logBufferSize !== undefined) {
        store.set('logBufferSize', Math.max(100, Math.min(10000, settings.logBufferSize)))
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  })

  // --- Sentry API ---

  ipcMain.handle('sentry:get-issues', async (_event, { query }: { query?: string }) => {
    const { base, token, org, project } = getSentryConfig()
    if (!token || !org || !project) return []
    try {
      const q = query ?? 'is:unresolved'
      const res = await fetch(
        `${base}/api/0/projects/${org}/${project}/issues/?query=${encodeURIComponent(q)}&per_page=100`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(10000),
        },
      )
      if (!res.ok) return []
      const data = (await res.json()) as Array<Record<string, unknown>>
      const issues = data
        .map((d) => ({
          id: String(d.id ?? ''),
          title: String(d.title ?? ''),
          count: Number(d.count ?? 0),
          firstSeen: String(d.firstSeen ?? ''),
          lastSeen: String(d.lastSeen ?? ''),
          status: String(d.status ?? 'unresolved') as 'unresolved' | 'resolved' | 'ignored',
          level: String(d.level ?? 'error'),
        }))
        .filter((i) => i.id && i.title)
      // EC-20: 캐시 저장
      store.set(
        '_sentryIssuesCache' as never,
        JSON.stringify({ timestamp: Date.now(), data: issues }) as never,
      )
      return issues
    } catch {
      // EC-20: 오프라인 → 캐시 반환
      try {
        const cached = store.get('_sentryIssuesCache' as never) as string | undefined
        if (cached) {
          const parsed = JSON.parse(cached) as { data: unknown[] }
          return parsed.data
        }
      } catch {
        /* no cache */
      }
      return []
    }
  })

  ipcMain.handle('sentry:get-events', async (_event, { issueId }: { issueId: string }) => {
    const { base, token, org } = getSentryConfig()
    if (!token || !org || !issueId) return []
    try {
      const res = await fetch(`${base}/api/0/organizations/${org}/issues/${issueId}/events/`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) return []
      const data = (await res.json()) as Array<Record<string, unknown>>
      return data
        .map((d) => ({
          id: String(d.eventID ?? d.id ?? ''),
          title: String(d.title ?? ''),
          timestamp: String(d.dateCreated ?? ''),
          tags: (Array.isArray(d.tags)
            ? Object.fromEntries(
                (d.tags as Array<{ key: string; value: string }>).map((t) => [t.key, t.value]),
              )
            : {}) as Record<string, string>,
          context: (d.context ?? {}) as Record<string, unknown>,
          stacktrace: formatStacktrace(d),
        }))
        .filter((e) => e.id)
    } catch {
      return []
    }
  })

  ipcMain.handle(
    'sentry:update-issue',
    async (_event, { issueId, status }: { issueId: string; status: string }) => {
      const { base, token, org } = getSentryConfig()
      if (!token || !org || !issueId) return { ok: false, error: 'Not configured' }
      try {
        const res = await fetch(`${base}/api/0/organizations/${org}/issues/${issueId}/`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
          signal: AbortSignal.timeout(10000),
        })
        if (!res.ok) return { ok: false, error: `HTTP ${String(res.status)}` }
        return { ok: true }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
      }
    },
  )

  console.log('[wardex] IPC handlers registered')
}

export function startHookLogWatcher(): void {
  if (!existsSync(HOOK_LOG)) {
    console.log('[wardex] hook-log.jsonl not found, skipping watcher')
    return
  }

  console.log('[wardex] Starting hook-log watcher:', HOOK_LOG)
  const watcher = watch(HOOK_LOG, { persistent: true, ignoreInitial: true })
  watcher.on('change', () => {
    void (async () => {
      try {
        const content = await readFile(HOOK_LOG, 'utf-8')
        const allBytes = Buffer.byteLength(content, 'utf-8')
        if (allBytes <= lastReadPosition) return

        const newContent = content.slice(lastReadPosition)
        lastReadPosition = allBytes
        const newEvents = parseHookLogLines(newContent)
        for (const event of newEvents) {
          broadcast('hook:event', event)
          const logEntry: LogEntry = {
            timestamp: event.timestamp,
            level:
              event.result === 'block' || event.result === 'error'
                ? 'error'
                : event.result === 'failure'
                  ? 'warn'
                  : 'info',
            source: 'hook',
            message: `[${event.event}] ${event.tool} ${event.file} — ${event.result}: ${event.message}`,
          }
          broadcast('log:push', logEntry)
        }
      } catch {
        /* ignore */
      }
    })()
  })
}
