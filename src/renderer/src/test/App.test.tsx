import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import App from '../App'

vi.mock('@sentry/react', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

function renderApp(route = '/dashboard'): void {
  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App', () => {
  it('renders sidebar with wardex title', () => {
    renderApp()
    expect(screen.getByText('Wardex')).toBeInTheDocument()
  })

  it('renders sidebar navigation links', () => {
    renderApp()
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveTextContent('Dashboard')
    expect(nav).toHaveTextContent('Logs')
    expect(nav).toHaveTextContent('Timeline')
    expect(nav).toHaveTextContent('Sentry')
    expect(nav).toHaveTextContent('Settings')
  })

  it('renders dashboard page by default', () => {
    renderApp()
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('redirects unknown routes to dashboard', () => {
    renderApp('/nonexistent')
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })
})
