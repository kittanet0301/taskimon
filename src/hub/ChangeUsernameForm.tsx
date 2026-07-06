import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatAuthError } from '../shared/formatError'

interface Props {
  initialUsername: string
  submitLabel?: string
  onSubmit: (username: string) => Promise<void>
}

export function ChangeUsernameForm({ initialUsername, submitLabel, onSubmit }: Props) {
  const { t } = useTranslation()
  const [username, setUsername] = useState(initialUsername)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setUsername(initialUsername)
  }, [initialUsername])

  const handleSubmit = async () => {
    const trimmed = username.trim()
    if (!trimmed) {
      setMessage(t('auth.needUsername'))
      return
    }
    if (trimmed === initialUsername.trim()) {
      setMessage(t('auth.usernameUnchanged'))
      return
    }
    setLoading(true)
    setMessage('')
    try {
      await onSubmit(trimmed)
    } catch (e) {
      setMessage(formatAuthError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {message && <p className="login-message">{message}</p>}
      <div className="form-row">
        <label>{t('auth.usernameLabel')}</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          autoComplete="username"
          maxLength={32}
        />
      </div>
      <button type="button" className="primary cover-btn" onClick={() => void handleSubmit()} disabled={loading}>
        {loading ? t('common.loading') : submitLabel ?? t('auth.saveUsername')}
      </button>
    </>
  )
}
