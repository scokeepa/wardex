import { useState } from 'react'
import type { LogEntry as LogEntryType } from '../../../shared/types'

const LEVEL_COLORS: Record<LogEntryType['level'], string> = {
  error: 'text-red-600',
  warn: 'text-yellow-600',
  info: 'text-blue-600',
  debug: 'text-neutral-400',
}

const LEVEL_BG: Record<LogEntryType['level'], string> = {
  error: 'bg-red-50 dark:bg-red-900/20',
  warn: 'bg-yellow-50 dark:bg-yellow-900/20',
  info: 'bg-white dark:bg-neutral-800',
  debug: 'bg-white dark:bg-neutral-800',
}

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g

function stripAnsi(str: string): string {
  return str.replace(ANSI_RE, '')
}

interface Props {
  entry: LogEntryType
}

export default function LogEntryRow({ entry }: Props): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const time = new Date(entry.timestamp).toLocaleTimeString()
  const message = stripAnsi(entry.message)

  return (
    <div
      className={`px-3 py-1.5 font-mono text-xs border-b border-neutral-100 dark:border-neutral-700 ${LEVEL_BG[entry.level]}`}
    >
      <div className="flex gap-2">
        <span className="text-neutral-400 shrink-0">{time}</span>
        <span className={`shrink-0 uppercase font-semibold w-12 ${LEVEL_COLORS[entry.level]}`}>
          {entry.level}
        </span>
        <span className="text-neutral-500 shrink-0">[{entry.source}]</span>
        <span className="text-neutral-800 dark:text-neutral-200 break-all">{message}</span>
      </div>
      {entry.stack ? (
        <button
          type="button"
          onClick={() => {
            setExpanded(!expanded)
          }}
          className="text-blue-500 hover:underline mt-1 text-xs"
        >
          {expanded ? 'Hide stack' : 'Show stack'}
        </button>
      ) : null}
      {expanded && entry.stack ? (
        <pre className="mt-1 text-neutral-500 whitespace-pre-wrap text-xs pl-4">
          {stripAnsi(entry.stack)}
        </pre>
      ) : null}
    </div>
  )
}
