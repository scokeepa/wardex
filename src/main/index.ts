import 'dotenv/config'
import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import * as Sentry from '@sentry/electron/main'
import log from 'electron-log'
import { registerIpcHandlers, startHookLogWatcher } from './ipc-handlers'
import type { LogEntry } from '../shared/types'

// 단일 인스턴스 잠금 — 중복 실행 방지
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

// Sentry init (A1: beforeSend로 순환 방지)
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  tracesSampleRate: 1.0,
  enabled: !!process.env.SENTRY_DSN,
})

// electron-log init (S5: preload 자동 주입 비활성화)
log.initialize({ preload: false })
log.transports.file.level = 'info'

// 로그를 renderer에 push
log.hooks.push((message) => {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: message.level as LogEntry['level'],
    source: 'main',
    message: message.data
      .map((d: unknown) => (typeof d === 'string' ? d : JSON.stringify(d)))
      .join(' '),
  }
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('log:push', entry)
    }
  }
  return message
})

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

void app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.wardex')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC 핸들러 등록
  registerIpcHandlers()

  // hook-log.jsonl 감시 시작 (A2: chokidar)
  startHookLogWatcher()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
