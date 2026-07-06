import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatApiError } from '../shared/formatError'

interface Props {
  username?: string
  onCleared: () => void
}

export function ClearMyDataPanel({ username, onCleared }: Props) {
  const { t } = useTranslation()
  const [showConfirm, setShowConfirm] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const confirmClear = async () => {
    setLoading(true)
    setMessage('')
    try {
      await window.electronAPI.clearMyGameData()
      setShowConfirm(false)
      setMessage(t('clearMyData.done'))
      onCleared()
    } catch (e) {
      setMessage(formatApiError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="clear-my-data">
      <h3>{t('clearMyData.title')}</h3>
      <p className="clear-my-data-desc">
        {t('clearMyData.description', {
          usernameSuffix: username
            ? t('clearMyData.descriptionWithUsernameSuffix', { username })
            : t('clearMyData.descriptionWithoutUsernameSuffix')
        })}
      </p>
      <ul className="clear-my-data-list">
        <li>{t('clearMyData.deleteList')}</li>
        <li>{t('clearMyData.keepList')}</li>
      </ul>
      {message && <p className="clear-my-data-message">{message}</p>}
      {!showConfirm ? (
        <button className="danger-btn" type="button" onClick={() => setShowConfirm(true)}>
          {t('clearMyData.button')}
        </button>
      ) : (
        <div className="reset-confirm">
          <p>{t('clearMyData.confirm')}</p>
          <div className="reset-confirm-actions">
            <button className="danger-btn" type="button" onClick={confirmClear} disabled={loading}>
              {loading ? t('clearMyData.loading') : t('common.confirm')}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setShowConfirm(false)
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
