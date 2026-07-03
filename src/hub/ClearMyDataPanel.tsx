import { useState } from 'react'
import { formatApiError } from '../shared/formatError'

interface Props {
  username?: string
  onCleared: () => void
}

export function ClearMyDataPanel({ username, onCleared }: Props) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const confirmClear = async () => {
    setLoading(true)
    setMessage('')
    try {
      await window.electronAPI.clearMyGameData()
      setShowConfirm(false)
      setMessage('ล้างข้อมูลของคุณแล้ว — เริ่มต้นใหม่')
      onCleared()
    } catch (e) {
      setMessage(formatApiError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="clear-my-data">
      <h3>ล้างข้อมูลของฉัน</h3>
      <p className="clear-my-data-desc">
        ลบเฉพาะข้อมูลเกมของบัญชี{username ? ` ${username}` : ' นี้'} — ไม่กระทบผู้เล่นคนอื่น
      </p>
      <ul className="clear-my-data-list">
        <li>ลบ: สัตว์เลี้ยง, ไอเทม, ภารกิจ, activity, ประวัติต่อสู้ ของคนกด</li>
        <li>เก็บไว้: บัญชี login, เพื่อน, แชท ของคนกด</li>
      </ul>
      {message && <p className="clear-my-data-message">{message}</p>}
      {!showConfirm ? (
        <button className="danger-btn" type="button" onClick={() => setShowConfirm(true)}>
          Clear ข้อมูลของฉัน
        </button>
      ) : (
        <div className="reset-confirm">
          <p>แน่ใจหรือไม่ว่าต้องการล้างข้อมูลเกมทั้งหมดของคุณ?</p>
          <div className="reset-confirm-actions">
            <button className="danger-btn" type="button" onClick={confirmClear} disabled={loading}>
              {loading ? 'กำลังล้าง...' : 'ตกลง'}
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
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
