import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// contextBridge는 직렬화 가능한 값만 전달 가능
// ipcRenderer.on 콜백은 직접 노출 대신 래핑 필요

const wardexAPI = {
  getSentryIssues: (query?: string) => ipcRenderer.invoke('sentry:get-issues', { query }),
  getSentryEvents: (issueId: string) => ipcRenderer.invoke('sentry:get-events', { issueId }),
  updateSentryIssue: (issueId: string, status: string) =>
    ipcRenderer.invoke('sentry:update-issue', { issueId, status }),
  getSystemHealth: () => ipcRenderer.invoke('health:check'),
  getHookEvents: (limit?: number) => ipcRenderer.invoke('hooks:get-events', { limit }),
  runAction: (action: string) => ipcRenderer.invoke('action:run', { action }),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('settings:set', settings),
  onLogMessage: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on('log:push', (_event, entry) => {
      callback(entry)
    })
    return () => {
      ipcRenderer.removeAllListeners('log:push')
    }
  },
  onHookEvent: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on('hook:event', (_event, entry) => {
      callback(entry)
    })
    return () => {
      ipcRenderer.removeAllListeners('hook:event')
    }
  },
  onHealthUpdate: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on('health:update', (_event, entry) => {
      callback(entry)
    })
    return () => {
      ipcRenderer.removeAllListeners('health:update')
    }
  },
  getPatternAnalysis: (options?: { days?: number }) =>
    ipcRenderer.invoke('patterns:analyze', options ?? {}),
  applySuggestion: (suggestionId: string, rule: string) =>
    ipcRenderer.invoke('patterns:apply-suggestion', { suggestionId, rule }),
  dismissSuggestion: (suggestionId: string) =>
    ipcRenderer.invoke('patterns:dismiss-suggestion', { suggestionId }),
  onPatternUpdate: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on('pattern:update', (_event, analysis) => {
      callback(analysis)
    })
    return () => {
      ipcRenderer.removeAllListeners('pattern:update')
    }
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('wardex', wardexAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error global assignment for non-isolated context
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  window.electron = electronAPI
  // @ts-expect-error global assignment for non-isolated context
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  window.wardex = wardexAPI
}
