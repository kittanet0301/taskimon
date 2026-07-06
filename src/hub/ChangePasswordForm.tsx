import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatAuthError } from '../shared/formatError'

interface Props {
  submitLabel?: string
  onSubmit: (password: string) => Promise<void>
}

export function ChangePasswordForm({ submitLabel, onSubmit }: Props) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (password.length < 6) {
      setMessage(t('auth.passwordMin'))
      return
    }
    if (password !== confirm) {
      setMessage(t('auth.passwordMismatch'))
      return
    }
    setLoading(true)
    setMessage('')
    try {
      await onSubmit(password)
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
        <label>{t('auth.newPasswordLabel')}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('auth.passwordMin')}
          disabled={loading}
          autoComplete="new-password"
        />
      </div>
      <div className="form-row">
        <label>{t('auth.confirmNewPasswordLabel')}</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={t('auth.confirmNewPasswordLabel')}
          disabled={loading}
          autoComplete="new-password"
        />
      </div>
      <button type="button" className="primary cover-btn" onClick={() => void handleSubmit()} disabled={loading}>
        {loading ? t('common.loading') : submitLabel ?? t('auth.savePassword')}
      </button>
    </>
  )
}
