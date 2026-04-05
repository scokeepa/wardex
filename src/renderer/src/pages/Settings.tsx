import { useState, useEffect, useCallback } from 'react'
import type { AppSettings } from '../../../shared/types'
import { useI18n, type Locale } from '../i18n'
import { useAppContext } from '../context/AppContext'
import Badge from '../components/Badge'

export default function Settings(): React.JSX.Element {
  const { setDarkMode: setGlobalDarkMode } = useAppContext()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const { t, locale, setLocale } = useI18n()

  const load = useCallback(() => {
    if (window.wardex)
      window.wardex
        .getSettings()
        .then(setSettings)
        .catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function save(partial: Partial<AppSettings>): Promise<void> {
    if (!window.wardex) return
    setSaving(true)
    setMessage(null)
    const result = await window.wardex.setSettings(partial)
    if (result.ok) {
      setMessage({ type: 'success', text: result.error ?? t.settings.saved })
      load()
    } else {
      setMessage({ type: 'error', text: result.error ?? t.settings.saveFailed })
    }
    setSaving(false)
    setTimeout(() => {
      setMessage(null)
    }, 3000)
  }

  if (!settings) return <div className="text-neutral-400">{t.app.loading}</div>

  const s = t.settings

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">{s.title}</h1>

      {message ? (
        <div
          className={`rounded px-3 py-2 text-sm ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}
        >
          {message.text}
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{s.sentrySection}</h2>
        <label className="block">
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">{s.dsn}</span>
            <ExternalLink href="https://sentry.io/settings/projects/" label="Projects" />
          </div>
          <input
            type="text"
            defaultValue={settings.sentryDsn}
            onBlur={(e) => {
              void save({ sentryDsn: e.target.value })
            }}
            className="mt-1 block w-full rounded border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 px-3 py-2 text-sm"
            placeholder="https://...@...ingest.sentry.io/..."
          />
          <HelpText text={s.dsnHelp} />
        </label>
        <label className="block">
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">{s.authToken}</span>
            <ExternalLink
              href="https://sentry.io/settings/account/api/auth-tokens/"
              label="Create Token"
            />
          </div>
          <input
            type="password"
            defaultValue={settings.sentryAuthToken}
            onBlur={(e) => {
              void save({ sentryAuthToken: e.target.value })
            }}
            className="mt-1 block w-full rounded border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 px-3 py-2 text-sm"
            placeholder="sntrys_..."
          />
          <HelpText text={s.authTokenHelp} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {s.organization}
              </span>
              <ExternalLink href="https://sentry.io/settings/organization/" label="Org Settings" />
            </div>
            <input
              type="text"
              defaultValue={settings.sentryOrg}
              onBlur={(e) => {
                void save({ sentryOrg: e.target.value })
              }}
              className="mt-1 block w-full rounded border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 px-3 py-2 text-sm"
            />
            <HelpText text={s.orgHelp} />
          </label>
          <label className="block">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">{s.project}</span>
              <ExternalLink href="https://sentry.io/settings/projects/" label="Projects" />
            </div>
            <input
              type="text"
              defaultValue={settings.sentryProject}
              onBlur={(e) => {
                void save({ sentryProject: e.target.value })
              }}
              className="mt-1 block w-full rounded border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 px-3 py-2 text-sm"
            />
            <HelpText text={s.projectHelp} />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{s.uiSection}</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">{s.darkMode}</span>
          <button
            type="button"
            onClick={() => {
              const next = !settings.darkMode
              void save({ darkMode: next })
              setGlobalDarkMode(next)
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.darkMode ? 'bg-neutral-900' : 'bg-neutral-300'}`}
            disabled={saving}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.darkMode ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">{s.language}</span>
          <select
            value={locale}
            onChange={(e) => {
              setLocale(e.target.value as Locale)
            }}
            className="rounded border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 px-2 py-1 text-sm"
          >
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </select>
        </div>
        <label className="block">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">{s.logBufferSize}</span>
          <input
            type="number"
            min={100}
            max={10000}
            defaultValue={settings.logBufferSize}
            onBlur={(e) => {
              void save({ logBufferSize: Number(e.target.value) })
            }}
            className="mt-1 block w-32 rounded border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 px-3 py-2 text-sm"
          />
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{s.hookStatus}</h2>
        <HookStatusSummary />
      </section>
    </div>
  )
}

function HookStatusSummary(): React.JSX.Element {
  const [health, setHealth] = useState<Awaited<
    ReturnType<NonNullable<typeof window.wardex>['getSystemHealth']>
  > | null>(null)
  const { t } = useI18n()

  useEffect(() => {
    if (window.wardex)
      window.wardex
        .getSystemHealth()
        .then(setHealth)
        .catch(() => {})
  }, [])

  if (!health) return <div className="text-neutral-400 text-sm">{t.app.checking}</div>

  const { layers } = health

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <Badge status={layers.claudeCode.active ? 'active' : 'inactive'} />
        <span>
          Claude Code: {String(layers.claudeCode.hookCount)}
          {t.dashboard.hooks}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Badge status={layers.gitHooks.preCommit ? 'active' : 'inactive'} />
        <span>pre-commit: {layers.gitHooks.preCommit ? 'yes' : 'no'}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge status={layers.gitHooks.prePush ? 'active' : 'inactive'} />
        <span>pre-push: {layers.gitHooks.prePush ? 'yes' : 'no'}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge status={layers.cicd.configured ? 'active' : 'inactive'} />
        <span>
          CI/CD: {layers.cicd.configured ? t.dashboard.configured : t.dashboard.notConfigured}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Badge status={layers.sentry.connected ? 'active' : 'inactive'} />
        <span>
          Sentry: {layers.sentry.connected ? t.dashboard.connected : t.dashboard.notConnected}
        </span>
      </div>
    </div>
  )
}

function ExternalLink({ href, label }: { href: string; label: string }): React.JSX.Element {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
      onClick={(e) => {
        e.preventDefault()
        window.open(href, '_blank')
      }}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
      {label}
    </a>
  )
}

function HelpText({ text }: { text: string }): React.JSX.Element {
  return (
    <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 leading-relaxed">{text}</p>
  )
}
