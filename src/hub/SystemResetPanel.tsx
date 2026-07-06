import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RESET_SYSTEM_PIN } from '../shared/constants'
import { formatApiError } from '../shared/formatError'

interface Props {
  onReset: () => void
}

export function SystemResetPanel({ onReset }: Props) {
  const { t } = useTranslation()
  const [showConfirm, setShowConfirm] = useState(false)
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const confirmReset = async () => {
    if (pin !== RESET_SYSTEM_PIN) {
      setMessage(t('systemReset.invalidPin'))
      return
    }
    setLoading(true)
    setMessage('')
    try {
      await window.electronAPI.resetSystemGameData()
      setShowConfirm(false)
      setPin('')
      setMessage(t('systemReset.done'))
      onReset()
    } catch (e) {
      setMessage(formatApiError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="danger-zone">
      <h3>{t('systemReset.title')}</h3>
      <p className="danger-zone-desc">
        {t('systemReset.description')}
      </p>
      <ul className="clear-my-data-list">
        <li>{t('systemReset.deleteList')}</li>
        <li>{t('systemReset.keepList')}</li>
      </ul>
      {message && <p className="clear-my-data-message">{message}</p>}
      {!showConfirm ? (
        <button className="danger-btn" type="button" onClick={() => setShowConfirm(true)}>
          {t('systemReset.button')}
        </button>
      ) : (
        <div className="reset-confirm">
          <p>{t('systemReset.confirm')}</p>
          <label htmlFor="system-reset-pin">{t('systemReset.pinLabel')}</label>
          <input
            id="system-reset-pin"
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder={t('systemReset.pinPlaceholder')}
            disabled={loading}
            autoComplete="off"
          />
          <div className="reset-confirm-actions">
            <button className="danger-btn" type="button" onClick={confirmReset} disabled={loading}>
              {loading ? t('systemReset.loading') : t('common.confirm')}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setShowConfirm(false)
                setPin('')
                setMessage('')
              }}
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
