import { useState, useEffect, useCallback } from 'react'
import type { HookEvent } from '../../../shared/types'
import { useI18n } from '../i18n'

const RESULT_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
  pass: { bg: 'bg-green-100', text: 'text-green-800', icon: '\u2705' },
  block: { bg: 'bg-red-100', text: 'text-red-800', icon: '\uD83D\uDD34' },
  error: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '\u26A0\uFE0F' },
  failure: { bg: 'bg-orange-100', text: 'text-orange-800', icon: '\u26A0\uFE0F' },
}
const EVENT_TYPES = ['PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'Stop'] as const
const PAGE_SIZE = 200

export default function Timeline(): React.JSX.Element {
  const [events, setEvents] = useState<HookEvent[]>([])
  const [eventFilter, setEventFilter] = useState('all')
  const [resultFilter, setResultFilter] = useState('all')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [total, setTotal] = useState(0)
  const { t } = useI18n()

  const load = useCallback(() => {
    if (!window.wardex) return
    window.wardex
      .getHookEvents(limit)
      .then((evts) => {
        setEvents(evts)
        setTotal(evts.length)
      })
      .catch(() => {})
  }, [limit])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!window.wardex) return () => {}
    return window.wardex.onHookEvent((event) => {
      const e = event
      setEvents((prev) => {
        const next = [...prev, e]
        return next.length > limit ? next.slice(-limit) : next
      })
      setTotal((n) => n + 1)
    })
  }, [limit])

  const filtered = events
    .filter((e) => eventFilter === 'all' || e.event === eventFilter)
    .filter((e) => resultFilter === 'all' || e.result === resultFilter)

  const tt = t.timeline

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-2xl font-bold mb-4">{tt.title}</h1>
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <select
          value={eventFilter}
          onChange={(e) => {
            setEventFilter(e.target.value)
          }}
          className="rounded border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 px-2 py-1 text-xs"
        >
          <option value="all">{tt.allEvents}</option>
          {EVENT_TYPES.map((tp) => (
            <option key={tp} value={tp}>
              {tp}
            </option>
          ))}
        </select>
        <select
          value={resultFilter}
          onChange={(e) => {
            setResultFilter(e.target.value)
          }}
          className="rounded border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 px-2 py-1 text-xs"
        >
          <option value="all">{tt.allResults}</option>
          <option value="pass">pass</option>
          <option value="block">block</option>
          <option value="error">error</option>
          <option value="failure">failure</option>
        </select>
        <span className="text-xs text-neutral-400 ml-auto">
          {String(filtered.length)} / {String(total)}
          {tt.events}
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-sm">
            {events.length === 0 ? tt.noEvents : tt.noMatch}
          </div>
        ) : (
          [...filtered].reverse().map((event, i) => {
            const style = RESULT_STYLE[event.result] ?? RESULT_STYLE.error
            const localTime = new Date(event.timestamp).toLocaleTimeString()
            return (
              <div
                key={`${event.timestamp}-${String(i)}`}
                className="flex items-start gap-3 border-l-2 border-neutral-200 dark:border-neutral-700 pl-4 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <div className="flex flex-col items-center shrink-0 w-5 -ml-[1.4rem]">
                  <div
                    className={`w-3 h-3 rounded-full ${style.bg} border-2 border-white dark:border-neutral-900`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-neutral-400" title={event.timestamp}>
                      {localTime}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-xs ${style.bg} ${style.text}`}
                    >
                      {event.event}
                    </span>
                    <span className="text-neutral-600 dark:text-neutral-300 truncate">
                      {event.tool}
                    </span>
                    <span className="text-neutral-400 truncate">{event.file}</span>
                    <span>
                      {style.icon} {event.result}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 truncate">{event.message}</div>
                </div>
              </div>
            )
          })
        )}
        {events.length >= limit ? (
          <button
            type="button"
            onClick={() => {
              setLimit((l) => l + PAGE_SIZE)
            }}
            className="w-full py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 mt-2"
          >
            {tt.loadMore}
          </button>
        ) : null}
      </div>
    </div>
  )
}
