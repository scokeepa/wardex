import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import LogViewer from './pages/LogViewer'
import SentryViewer from './pages/SentryViewer'
import Timeline from './pages/Timeline'
import Settings from './pages/Settings'
import About from './pages/About'

export default function App(): React.JSX.Element {
  return (
    <div className="flex h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/logs" element={<LogViewer />} />
          <Route path="/sentry" element={<SentryViewer />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/about" element={<About />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  )
}
