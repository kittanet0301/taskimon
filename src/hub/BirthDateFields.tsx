import { daysInMonth, birthYearOptions } from '../shared/birthDate'
import { useTranslation } from 'react-i18next'

interface Props {
  day: number
  month: number
  year: number
  onChange: (next: { day: number; month: number; year: number }) => void
  disabled?: boolean
}

export function BirthDateFields({ day, month, year, onChange, disabled }: Props) {
  const { t } = useTranslation()
  const maxDay = month && year ? daysInMonth(month, year) : 31
  const dayOptions = Array.from({ length: maxDay }, (_, i) => i + 1)

  const setDay = (nextDay: number) => {
    onChange({ day: nextDay, month, year })
  }

  const setMonth = (nextMonth: number) => {
    const max = year ? daysInMonth(nextMonth, year) : 31
    onChange({ day: day > max ? max : day, month: nextMonth, year })
  }

  const setYear = (nextYear: number) => {
    const max = month ? daysInMonth(month, nextYear) : 31
    onChange({ day: day > max ? max : day, month, year: nextYear })
  }

  return (
    <div className="form-row">
      <label>{t('birthDate.label')}</label>
      <div className="birth-date-row">
        <select
          value={day || ''}
          onChange={(e) => setDay(Number(e.target.value))}
          disabled={disabled}
          aria-label={t('birthDate.day')}
        >
          <option value="">{t('birthDate.day')}</option>
          {dayOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={month || ''}
          onChange={(e) => setMonth(Number(e.target.value))}
          disabled={disabled}
          aria-label={t('birthDate.month')}
        >
          <option value="">{t('birthDate.month')}</option>
          {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
            <option key={value} value={value}>
              {t(`months.${value}`)}
            </option>
          ))}
        </select>
        <select
          value={year || ''}
          onChange={(e) => setYear(Number(e.target.value))}
          disabled={disabled}
          aria-label={t('birthDate.year')}
        >
          <option value="">{t('birthDate.yearAd')}</option>
          {birthYearOptions().map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
