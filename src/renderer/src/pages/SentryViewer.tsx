import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SentryIssue, SentryEvent } from '../../../shared/types'
import { useI18n } from '../i18n'
import Badge from '../components/Badge'
import Skeleton from '../components/Skeleton'

export default function SentryViewer(): React.JSX.Element {
  const [issues, setIssues] = useState<SentryIssue[]>([])
  const [selectedIssue, setSelectedIssue] = useState<SentryIssue | null>(null)
  const [events, setEvents] = useState<SentryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [configured, setConfigured] = useState(true)
  const navigate = useNavigate()
  const { t } = useI18n()

  const loadIssues = useCallback(() => {
    if (!window.wardex) return
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const s = await window.wardex.getSettings()
        if (!s.sentryAuthToken || !s.sentryOrg || !s.sentryProject) {
          setConfigured(false)
          setLoading(false)
          return
        }
        setConfigured(true)
        const data = await window.wardex.getSentryIssues()
        setIssues(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    loadIssues()
  }, [loadIssues])

  function selectIssue(issue: SentryIssue): void {
    setSelectedIssue(issue)
    setEvents([])
    if (!window.wardex) return
    void window.wardex
      .getSentryEvents(issue.id)
      .then(setEvents)
      .catch(() => {})
  }

  async function updateStatus(issueId: string, status: string): Promise<void> {
    if (!window.wardex) return
    const result = await window.wardex.updateSentryIssue(issueId, status)
    if (result.ok) {
      setIssues((prev) => prev.filter((i) => i.id !== issueId))
      if (selectedIssue?.id === issueId) setSelectedIssue(null)
    }
  }

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-500">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {t.sentry.title}
        </h1>
        <p>
          {t.settings.authToken}, {t.settings.organization}, {t.settings.project}를 설정해주세요.
        </p>
        <button
          type="button"
          onClick={() => {
            void navigate('/settings')
          }}
          className="rounded bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 dark:hover:bg-neutral-300"
        >
          {t.nav.settings}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{t.sentry.title}</h1>
        <button
          type="button"
          onClick={loadIssues}
          disabled={loading}
          className="rounded border border-neutral-300 dark:border-neutral-600 px-3 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40"
        >
          {loading ? t.app.checking : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div className="rounded bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-800 dark:text-red-300 mb-4">
          {error}
        </div>
      ) : null}

      <div className="flex-1 flex gap-4 min-h-0">
        {/* 이슈 목록 */}
        <div className="w-1/3 overflow-auto border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800">
          {loading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : issues.length === 0 ? (
            <div className="p-6 text-center text-neutral-400 text-sm">{t.sentry.placeholder}</div>
          ) : null}
          {issues.map((issue) => (
            <button
              key={issue.id}
              type="button"
              onClick={() => {
                selectIssue(issue)
              }}
              className={`w-full text-left px-4 py-3 border-b border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750 ${selectedIssue?.id === issue.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  status={issue.level === 'error' ? 'error' : 'inactive'}
                  label={issue.level}
                />
                <span className="text-xs text-neutral-400">{String(issue.count)}x</span>
              </div>
              <div className="text-sm font-medium truncate">{issue.title}</div>
              <div className="text-xs text-neutral-400 mt-1">
                {new Date(issue.lastSeen).toLocaleString()}
              </div>
              <div className="flex gap-1 mt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void updateStatus(issue.id, 'resolved')
                  }}
                  className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60"
                >
                  Resolve
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void updateStatus(issue.id, 'ignored')
                  }}
                  className="text-xs px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                >
                  Ignore
                </button>
              </div>
            </button>
          ))}
        </div>

        {/* 이벤트 상세 */}
        <div className="flex-1 overflow-auto border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 p-4">
          {!selectedIssue ? (
            <div className="flex items-center justify-center h-full text-neutral-400 text-sm">
              이슈를 선택하세요
            </div>
          ) : events.length === 0 ? (
            <div className="text-neutral-400 text-sm">{t.app.checking}</div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{selectedIssue.title}</h2>
              {events.map((event) => (
                <div
                  key={event.id}
                  className="border border-neutral-200 dark:border-neutral-700 rounded p-3"
                >
                  <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                    <span>{new Date(event.timestamp).toLocaleString()}</span>
                    <span className="font-mono">{event.id.slice(0, 8)}</span>
                  </div>
                  {event.stacktrace ? (
                    <pre className="text-xs font-mono bg-neutral-50 dark:bg-neutral-900 p-2 rounded overflow-auto max-h-48 whitespace-pre-wrap">
                      {event.stacktrace}
                    </pre>
                  ) : null}
                  {Object.keys(event.tags).length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(event.tags).map(([k, v]) => (
                        <span
                          key={k}
                          className="text-xs bg-neutral-100 dark:bg-neutral-700 rounded px-1.5 py-0.5"
                        >
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
