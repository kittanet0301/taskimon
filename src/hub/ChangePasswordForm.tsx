import { useState } from 'react'
import { formatAuthError } from '../shared/formatError'

interface Props {
  submitLabel?: string
  onSubmit: (password: string) => Promise<void>
}

export function ChangePasswordForm({ submitLabel = 'บันทึกรหัสผ่านใหม่', onSubmit }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (password.length < 6) {
      setMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัว')
      return
    }
    if (password !== confirm) {
      setMessage('รหัสผ่านไม่ตรงกัน')
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
        <label>รหัสผ่านใหม่</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="อย่างน้อย 6 ตัว"
          disabled={loading}
          autoComplete="new-password"
        />
      </div>
      <div className="form-row">
        <label>ยืนยันรหัสผ่านใหม่</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="กรอกอีกครั้ง"
          disabled={loading}
          autoComplete="new-password"
        />
      </div>
      <button type="button" className="primary cover-btn" onClick={() => void handleSubmit()} disabled={loading}>
        {loading ? 'กำลังบันทึก...' : submitLabel}
      </button>
    </>
  )
}
