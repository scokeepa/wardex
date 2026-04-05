import { createContext, useContext } from 'react'
import { ko } from './ko'
import { en } from './en'

export type Locale = 'ko' | 'en'
export type Translations = typeof ko

const locales: Record<Locale, Translations> = { ko, en }

export function getTranslations(locale: Locale): Translations {
  return locales[locale]
}

// React context
export const I18nContext = createContext<{
  t: Translations
  locale: Locale
  setLocale: (l: Locale) => void
}>({
  t: en,
  locale: 'en',
  setLocale: () => {},
})

export function useI18n(): { t: Translations; locale: Locale; setLocale: (l: Locale) => void } {
  return useContext(I18nContext)
}
