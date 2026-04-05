import { NavLink } from 'react-router-dom'
import { useI18n } from '../i18n'

export default function Sidebar(): React.JSX.Element {
  const { t } = useI18n()

  const items = [
    { to: '/dashboard', label: t.nav.dashboard },
    { to: '/logs', label: t.nav.logs },
    { to: '/timeline', label: t.nav.timeline },
    { to: '/sentry', label: t.nav.sentry },
    { to: '/patterns', label: t.nav.patterns },
    { to: '/settings', label: t.nav.settings },
    { to: '/about', label: t.nav_about },
  ]

  return (
    <nav className="w-48 shrink-0 border-r border-neutral-200 bg-white dark:bg-neutral-800 dark:border-neutral-700 p-4 flex flex-col gap-1">
      <h1 className="text-lg font-bold mb-4">{t.app.name}</h1>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `block rounded px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
