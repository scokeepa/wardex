import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { initSentry } from './lib/sentry'
import { AppErrorBoundary } from './components/ErrorBoundary'
import App from './App'
import { AppProvider } from './context/AppContext'
import './index.css'

initSentry()

const rootEl = document.getElementById('root')
if (rootEl) {
  createRoot(rootEl).render(
    <AppErrorBoundary>
      <AppProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </AppProvider>
    </AppErrorBoundary>,
  )
}
