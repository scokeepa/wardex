import { useState, useEffect, useRef, useCallback } from 'react'
import type { LogEntry, LogLevel } from '../../../shared/types'
import { useI18n } from '../i18n'
import LogEntryRow from '../components/LogEntry'

let MAX_BUFFER = 1000
const BATCH_SIZE = 50
const VISIBLE_ITEMS = 200

type LogSource = 'main' | 'renderer' | 'hook'

export default function LogViewer(): React.JSX.Element {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [levelFilter, setLevelFilter] = useState<Set<LogLevel>>(new Set(['error', 'warn']))
  const [sourceFilter, setSourceFilter] = useState(new Set(['main', 'renderer', 'hook']))
  const [search, setSearch] = useState('')
  const [searchError, setSearchError] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const pendingRef = useRef<LogEntry[]>([])
  const rafRef = useRef(0)
  const { t } = useI18n()

  useEffect(() => {
    if (window.wardex)
      window.wardex
        .getSettings()
        .then((s) => {
          MAX_BUFFER = s.logBufferSize
        })
        .catch(() => {})
  }, [])

  const flushPending = useCallback(() => {
    if (pendingRef.current.length === 0) return
    const batch = pendingRef.current.splice(0, BATCH_SIZE)
    setLogs((prev) => {
      const next = [...prev, ...batch]
      return next.length > MAX_BUFFER ? next.slice(-MAX_BUFFER) : next
    })
    if (pendingRef.current.length > 0) {
      rafRef.current = requestAnimationFrame(flushPending)
    }
  }, [])

  useEffect(() => {
    if (!window.wardex) return () => {}
    return window.wardex.onLogMessage((entry) => {
      pendingRef.current.push(entry)
      if (rafRef.current === 0) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0
          flushPending()
        })
      }
    })
  }, [flushPending])

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  function handleScroll(): void {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50)
  }

  function matchesSearch(msg: string): boolean {
    if (!search) return true
    try {
      setSearchError(false)
      return new RegExp(search, 'i').test(msg)
    } catch {
      setSearchError(true)
      return msg.toLowerCase().includes(search.toLowerCase())
    }
  }

  const filtered = logs
    .filter((l) => levelFilter.has(l.level))
    .filter((l) => sourceFilter.has(l.source as LogSource))
    .filter((l) => matchesSearch(l.message))
    .slice(-VISIBLE_ITEMS)

  const lt = t.logs

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-2xl font-bold mb-4">{lt.title}</h1>
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        {(['error', 'warn', 'info', 'debug'] as const).map((level) => (
          <FilterToggle
            key={level}
            label={level}
            active={levelFilter.has(level)}
            color={LEVEL_COLORS[level]}
            onToggle={() => {
              setLevelFilter((prev) => {
                const next = new Set(prev)
                if (next.has(level)) next.delete(level)
                else next.add(level)
                return next
              })
            }}
          />
        ))}
        <span className="text-neutral-300">|</span>
        {(['main', 'renderer', 'hook'] as const).map((source) => (
          <FilterToggle
            key={source}
            label={source}
            active={sourceFilter.has(source)}
            color="bg-neutral-600"
            onToggle={() => {
              setSourceFilter((prev) => {
                const next = new Set(prev)
                if (next.has(source)) next.delete(source)
                else next.add(source)
                return next
              })
            }}
          />
        ))}
        <span className="text-neutral-300">|</span>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
            }}
            placeholder={lt.search}
            className={`rounded border px-2 py-1 text-xs w-48 ${searchError ? 'border-red-400 bg-red-50 dark:bg-red-900/30' : 'border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800'}`}
          />
          {searchError ? (
            <span className="absolute right-2 top-1 text-xs text-red-500">{lt.invalidRegex}</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setAutoScroll(!autoScroll)
          }}
          className={`rounded px-2 py-1 text-xs ${autoScroll ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}
        >
          {lt.autoScroll} {autoScroll ? lt.on : lt.off}
        </button>
        <span className="text-xs text-neutral-400 ml-auto">
          {String(filtered.length)} / {String(logs.length)} {lt.entries}
        </span>
      </div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800"
      >
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-sm">
            {logs.length === 0 ? lt.noLogs : lt.noMatch}
          </div>
        ) : (
          filtered.map((entry, i) => (
            <LogEntryRow key={`${entry.timestamp}-${String(i)}`} entry={entry} />
          ))
        )}
      </div>
    </div>
  )
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  error: 'bg-red-600',
  warn: 'bg-yellow-500',
  info: 'bg-blue-500',
  debug: 'bg-neutral-400',
}

function FilterToggle({
  label,
  active,
  color,
  onToggle,
}: {
  label: string
  active: boolean
  color: string
  onToggle: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded px-2 py-1 text-xs font-mono transition-colors ${active ? `${color} text-white` : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400 line-through'}`}
    >
      {label}
    </button>
  )
}
