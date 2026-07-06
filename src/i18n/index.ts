import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import th from './locales/th.json'

export const LOCALE_STORAGE_KEY = 'taskimon-lang'

export type AppLocale = 'en' | 'th'

export function getStoredLocale(): AppLocale {
  if (typeof localStorage === 'undefined') return 'en'
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (stored === 'th' || stored === 'en') return stored
  return 'en'
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    th: { translation: th }
  },
  lng: getStoredLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

if (typeof document !== 'undefined') {
  document.documentElement.lang = getStoredLocale()
}

if (typeof window !== 'undefined' && window.electronAPI?.setLocale) {
  void window.electronAPI.setLocale(getStoredLocale())
}

export function setAppLocale(locale: AppLocale): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  document.documentElement.lang = locale
  void i18n.changeLanguage(locale)
  void window.electronAPI?.setLocale?.(locale)
}

export default i18n
