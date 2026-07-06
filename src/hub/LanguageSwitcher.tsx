import { useTranslation } from 'react-i18next'
import { setAppLocale, type AppLocale } from '../i18n'

export function LanguageSwitcher({
  compact = false,
  variant = 'default'
}: {
  compact?: boolean
  variant?: 'default' | 'pixel'
}) {
  const { i18n } = useTranslation()
  const locale = (i18n.language === 'th' ? 'th' : 'en') as AppLocale

  const switchTo = (next: AppLocale) => {
    if (next === locale) return
    setAppLocale(next)
  }

  const className = [
    'lang-switcher',
    compact ? 'lang-switcher-compact' : '',
    variant === 'pixel' ? 'lang-switcher-pixel' : ''
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      <button
        type="button"
        className={locale === 'en' ? 'active' : ''}
        onClick={() => switchTo('en')}
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
      <button
        type="button"
        className={locale === 'th' ? 'active' : ''}
        onClick={() => switchTo('th')}
        aria-pressed={locale === 'th'}
      >
        TH
      </button>
    </div>
  )
}
