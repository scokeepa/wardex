import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { AppProvider } from '../context/AppContext'
import Dashboard from '../pages/Dashboard'
import Settings from '../pages/Settings'
import About from '../pages/About'
import Timeline from '../pages/Timeline'

vi.mock('@sentry/react', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('Dashboard', () => {
  it('renders page title', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('renders 4 layer status cards', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('L1 Claude Code')).toBeInTheDocument()
      expect(screen.getByText('L2 Git Hooks')).toBeInTheDocument()
      expect(screen.getByText('L3 CI/CD')).toBeInTheDocument()
      expect(screen.getByText('L4 Sentry')).toBeInTheDocument()
    })
  })

  it('renders quick action buttons', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    )
    expect(screen.getByText('Type Check')).toBeInTheDocument()
    expect(screen.getByText('Lint Fix')).toBeInTheDocument()
    expect(screen.getByText('Run Tests')).toBeInTheDocument()
    expect(screen.getByText('Format Check')).toBeInTheDocument()
  })

  it('renders system health section', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('TypeScript')).toBeInTheDocument()
      expect(screen.getByText('ESLint')).toBeInTheDocument()
      expect(screen.getByText('Tests')).toBeInTheDocument()
      expect(screen.getByText('Git')).toBeInTheDocument()
    })
  })
})

describe('Settings', () => {
  it('renders page title', async () => {
    render(
      <AppProvider>
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      </AppProvider>,
    )
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    })
  })

  it('renders Sentry configuration fields', async () => {
    render(
      <AppProvider>
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      </AppProvider>,
    )
    await waitFor(() => {
      expect(screen.getByText('DSN')).toBeInTheDocument()
      expect(screen.getByText('Auth Token')).toBeInTheDocument()
      expect(screen.getByText('Organization')).toBeInTheDocument()
      expect(screen.getByText('Project')).toBeInTheDocument()
    })
  })

  it('renders dark mode toggle', async () => {
    render(
      <AppProvider>
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      </AppProvider>,
    )
    await waitFor(() => {
      expect(screen.getByText('Dark Mode')).toBeInTheDocument()
    })
  })
})

describe('About', () => {
  it('renders app name and tagline', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>,
    )
    expect(screen.getByText('Wardex')).toBeInTheDocument()
  })

  it('renders 4 layer architecture descriptions', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>,
    )
    const layerBadges = screen.getAllByText(/^[1-4]$/)
    expect(layerBadges).toHaveLength(4)
  })

  it('renders tech stack items', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>,
    )
    expect(screen.getByText('React 19 + TypeScript')).toBeInTheDocument()
    expect(screen.getByText('Tailwind CSS v4')).toBeInTheDocument()
  })
})

describe('Timeline', () => {
  it('renders page title', () => {
    render(
      <MemoryRouter>
        <Timeline />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Timeline' })).toBeInTheDocument()
  })

  it('renders event filter dropdowns', () => {
    render(
      <MemoryRouter>
        <Timeline />
      </MemoryRouter>,
    )
    const selects = screen.getAllByRole('combobox')
    expect(selects.length).toBeGreaterThanOrEqual(2)
  })
})
