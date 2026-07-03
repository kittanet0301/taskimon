import { useState } from 'react'
import { RESET_SYSTEM_PIN } from '../shared/constants'

interface Props {
  onReset: () => void
}

export function SystemResetPanel({ onReset }: Props) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const confirmReset = async () => {
    if (pin !== RESET_SYSTEM_PIN) {
      setMessage('รหัสยืนยันไม่ถูกต้อง')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      await window.electronAPI.resetSystemGameData()
      setShowConfirm(false)
      setPin('')
      setMessage('ล้างระบบแล้ว — ข้อมูลเกมของทุกคนถูกรีเซ็ต')
      onReset()
    } catch (e) {
      setMessage(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="danger-zone">
      <h3>ล้างระบบ</h3>
      <p className="danger-zone-desc">
        ล้างข้อมูลเกมของผู้เล่นทุกคนในระบบ — ไม่กระทบบัญชี login, เพื่อน, แชท
      </p>
      <ul className="clear-my-data-list">
        <li>ลบ: สัตว์เลี้ยง, ไอเทม, ภารกิจ, activity, ประวัติต่อสู้ ของทุกคน</li>
        <li>เก็บไว้: บัญชี login, เพื่อน, แชท ของทุกคน</li>
      </ul>
      {message && <p className="clear-my-data-message">{message}</p>}
      {!showConfirm ? (
        <button className="danger-btn" type="button" onClick={() => setShowConfirm(true)}>
          ล้างระบบ
        </button>
      ) : (
        <div className="reset-confirm">
          <p>แน่ใจหรือไม่ว่าต้องการล้างข้อมูลเกมของทุกคน?</p>
          <label htmlFor="system-reset-pin">ใส่รหัสยืนยัน</label>
          <input
            id="system-reset-pin"
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="รหัส 4 หลัก"
            disabled={loading}
            autoComplete="off"
          />
          <div className="reset-confirm-actions">
            <button className="danger-btn" type="button" onClick={confirmReset} disabled={loading}>
              {loading ? 'กำลังล้าง...' : 'ตกลง'}
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
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
