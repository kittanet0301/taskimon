import type { AppLocale } from '../../src/i18n'
import en from '../../src/i18n/locales/en.json'
import th from '../../src/i18n/locales/th.json'

let currentLocale: AppLocale = 'en'

const bundles = { en, th } as const

function lookup(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const part of parts) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return typeof cur === 'string' ? cur : undefined
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(params[key] ?? ''))
}

export function setMainLocale(locale: AppLocale): void {
  currentLocale = locale
}

export function tMain(key: string, params?: Record<string, string | number>): string {
  const value = lookup(bundles[currentLocale] as unknown as Record<string, unknown>, key)
  if (!value) return key
  return interpolate(value, params)
}
