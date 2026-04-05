import { useState, useEffect, useCallback } from 'react'
import type { PatternAnalysis } from '../../../shared/types'
import { usePatternStream } from '../hooks/useIpc'
import { useI18n } from '../i18n'
import Badge from '../components/Badge'

const TREND_ICON: Record<string, string> = {
  increasing: '\u2191',
  stable: '\u2192',
  decreasing: '\u2193',
}

export default function Patterns(): React.JSX.Element {
  const [analysis, setAnalysis] = useState<PatternAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useI18n()
  const pt = t.patterns

  const load = useCallback(() => {
    if (!window.wardex) return
    setLoading(true)
    window.wardex
      .getPatternAnalysis()
      .then(setAnalysis)
      .catch(() => {})
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  usePatternStream((updated) => {
    setAnalysis(updated)
  })

  async function handleApply(suggestionId: string, rule: string): Promise<void> {
    if (!window.wardex) return
    const result = await window.wardex.applySuggestion(suggestionId, rule)
    if (result.ok) load()
  }

  async function handleDismiss(suggestionId: string): Promise<void> {
    if (!window.wardex) return
    await window.wardex.dismissSuggestion(suggestionId)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{pt.title}</h1>
        {analysis ? (
          <span className="text-xs text-neutral-400">
            {String(analysis.analyzedEventCount)} events analyzed
          </span>
        ) : null}
      </div>

      {/* Error Patterns */}
      <section>
        <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-3">
          {pt.errorPatterns}
        </h2>
        {!analysis || analysis.patterns.length === 0 ? (
          <div className="p-6 text-center text-neutral-400 text-sm">
            {loading ? t.app.loading : pt.noPatterns}
          </div>
        ) : (
          <div className="overflow-auto border border-neutral-200 dark:border-neutral-700 rounded">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-neutral-500">{pt.file}</th>
                  <th className="text-left px-4 py-2 font-medium text-neutral-500">{pt.type}</th>
                  <th className="text-right px-4 py-2 font-medium text-neutral-500">{pt.count}</th>
                  <th className="text-center px-4 py-2 font-medium text-neutral-500">{pt.trend}</th>
                  <th className="text-left px-4 py-2 font-medium text-neutral-500">
                    {pt.lastSeen}
                  </th>
                </tr>
              </thead>
              <tbody>
                {analysis.patterns.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <td
                      className="px-4 py-2 font-mono text-xs truncate max-w-[200px]"
                      title={p.file}
                    >
                      {p.file.split('/').pop()}
                    </td>
                    <td className="px-4 py-2">
                      <Badge
                        status={p.errorType === 'block' ? 'error' : 'inactive'}
                        label={p.errorType}
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">{String(p.count)}</td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={
                          p.trend === 'increasing'
                            ? 'text-red-500'
                            : p.trend === 'decreasing'
                              ? 'text-green-500'
                              : 'text-neutral-400'
                        }
                      >
                        {TREND_ICON[p.trend] ?? ''}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-neutral-400">
                      {new Date(p.lastSeen).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Hot Files */}
      <section>
        <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-3">{pt.hotFiles}</h2>
        {!analysis || analysis.hotFiles.length === 0 ? (
          <div className="p-6 text-center text-neutral-400 text-sm">{pt.noHotFiles}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {analysis.hotFiles.map((hf) => (
              <div
                key={hf.file}
                className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3"
              >
                <div className="text-sm font-medium truncate" title={hf.file}>
                  {hf.file.split('/').pop()}
                </div>
                <div className="flex gap-3 mt-2 text-xs">
                  <span className="text-red-600">
                    {String(hf.errorCount)} {pt.errors}
                  </span>
                  <span className="text-orange-500">
                    {String(hf.blockCount)} {pt.blocks}
                  </span>
                  <span className="text-neutral-400">
                    {String(hf.totalEvents)} {pt.events}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Suggestions */}
      <section>
        <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-3">{pt.suggestions}</h2>
        {!analysis || analysis.suggestions.length === 0 ? (
          <div className="p-6 text-center text-neutral-400 text-sm">{pt.noSuggestions}</div>
        ) : (
          <div className="space-y-3">
            {analysis.suggestions.map((s) => (
              <div
                key={s.id}
                className={`rounded-lg border p-4 ${s.applied ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">{s.title}</h3>
                  {s.applied ? <Badge status="active" label={pt.applied} /> : null}
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                  {s.description}
                </p>
                <pre className="text-xs font-mono bg-neutral-50 dark:bg-neutral-900 p-2 rounded mb-3 whitespace-pre-wrap">
                  {s.rule}
                </pre>
                {!s.applied ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleApply(s.id, s.rule)
                      }}
                      className="rounded bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 px-3 py-1 text-xs text-white hover:bg-neutral-700 dark:hover:bg-neutral-300"
                    >
                      {pt.applyRule}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleDismiss(s.id)
                      }}
                      className="rounded border border-neutral-300 dark:border-neutral-600 px-3 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    >
                      {pt.dismiss}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
