import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { AppSettings } from '../../../shared/types'
import { I18nContext, getTranslations, type Locale } from '../i18n'

interface AppContextValue {
  settings: AppSettings | null
  darkMode: boolean
  setDarkMode: (dark: boolean) => void
  reloadSettings: () => void
}

const AppCtx = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [darkMode, setDarkModeState] = useState(false)
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem('wardex-locale')
    if (saved === 'ko' || saved === 'en') return saved
    return navigator.language.startsWith('ko') ? 'ko' : 'en'
  })

  function reloadSettings(): void {
    if (!window.wardex) return
    window.wardex
      .getSettings()
      .then((s) => {
        setSettings(s)
        setDarkModeState(s.darkMode)
      })
      .catch(() => {})
  }

  useEffect(() => {
    reloadSettings()
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  function setDarkMode(dark: boolean): void {
    setDarkModeState(dark)
    if (window.wardex) window.wardex.setSettings({ darkMode: dark }).catch(() => {})
  }

  function handleSetLocale(l: Locale): void {
    setLocale(l)
    localStorage.setItem('wardex-locale', l)
  }

  const t = getTranslations(locale)

  return (
    <I18nContext.Provider value={{ t, locale, setLocale: handleSetLocale }}>
      <AppCtx.Provider value={{ settings, darkMode, setDarkMode, reloadSettings }}>
        {children}
      </AppCtx.Provider>
    </I18nContext.Provider>
  )
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}
