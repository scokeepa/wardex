import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Badge from '../components/Badge'
import StatusCard from '../components/StatusCard'
import Skeleton from '../components/Skeleton'
import LogEntryRow from '../components/LogEntry'
import type { LogEntry } from '../../../shared/types'

describe('Badge', () => {
  it('renders active badge with default label', () => {
    render(<Badge status="active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders inactive badge with default label', () => {
    render(<Badge status="inactive" />)
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('renders error badge with default label', () => {
    render(<Badge status="error" />)
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('renders custom label when provided', () => {
    render(<Badge status="active" label="Online" />)
    expect(screen.getByText('Online')).toBeInTheDocument()
  })
})

describe('StatusCard', () => {
  it('renders title and description', () => {
    render(<StatusCard title="L1 Claude Code" description="Real-time hooks" status="active" />)
    expect(screen.getByText('L1 Claude Code')).toBeInTheDocument()
    expect(screen.getByText('Real-time hooks')).toBeInTheDocument()
  })

  it('renders details when provided', () => {
    render(<StatusCard title="L1" description="desc" status="active" details="5 hooks" />)
    expect(screen.getByText('5 hooks')).toBeInTheDocument()
  })
})

describe('Skeleton', () => {
  it('renders with animate-pulse class', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveClass('animate-pulse')
  })

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-16" />)
    expect(container.firstChild).toHaveClass('h-16')
  })
})

describe('LogEntryRow', () => {
  const baseEntry: LogEntry = {
    timestamp: '2026-04-03T12:00:00Z',
    level: 'error',
    source: 'main',
    message: 'Something went wrong',
  }

  it('renders log level and message', () => {
    render(<LogEntryRow entry={baseEntry} />)
    expect(screen.getByText('error')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders source tag', () => {
    render(<LogEntryRow entry={baseEntry} />)
    expect(screen.getByText('[main]')).toBeInTheDocument()
  })

  it('strips ANSI codes from message', () => {
    const entry = { ...baseEntry, message: '\x1b[31mRed error\x1b[0m' }
    render(<LogEntryRow entry={entry} />)
    expect(screen.getByText('Red error')).toBeInTheDocument()
  })

  it('shows stack toggle when stack exists', () => {
    const entry = { ...baseEntry, stack: 'Error\n  at line 1' }
    render(<LogEntryRow entry={entry} />)
    expect(screen.getByText('Show stack')).toBeInTheDocument()
  })
})
