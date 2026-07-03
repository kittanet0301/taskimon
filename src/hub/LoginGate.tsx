import { useState } from 'react'
import { formatAuthError } from '../shared/formatError'

interface Props {
  onLoggedIn: () => void
}

export function LoginGate({ onLoggedIn }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const signIn = async () => {
    setLoading(true)
    setMessage('')
    try {
      await window.electronAPI.signIn(email, password)
      await window.electronAPI.reloadFromCloud()
      onLoggedIn()
    } catch (e) {
      setMessage(formatAuthError(e))
    } finally {
      setLoading(false)
    }
  }

  const signUp = async () => {
    if (!username.trim()) {
      setMessage('กรุณาตั้งชื่อผู้ใช้')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const data = (await window.electronAPI.signUp(email, password, username)) as {
        session: { user: { id: string } } | null
      }
      if (data.session?.user?.id) {
        await window.electronAPI.reloadFromCloud()
        onLoggedIn()
        return
      }
      setMessage('สมัครสำเร็จ — ยืนยันอีเมลแล้วเข้าสู่ระบบ (หรือปิด Confirm email ใน Supabase)')
    } catch (e) {
      setMessage(formatAuthError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cover-screen">
      <div className="cover-card login-card">
        <div className="cover-logo">🥚</div>
        <h1 className="cover-title">TASKIMON</h1>
        <p className="cover-tagline">เข้าสู่ระบบเพื่อเริ่มเลี้ยงสัตว์ของคุณ</p>

        {message && <p className="login-message">{message}</p>}

        <div className="form-row">
          <label>อีเมล</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            disabled={loading}
          />
        </div>
        <div className="form-row">
          <label>รหัสผ่าน</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="อย่างน้อย 6 ตัว"
            disabled={loading}
          />
        </div>
        <div className="form-row">
          <label>ชื่อผู้ใช้ (สมัครใหม่)</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ชื่อในเกม"
            disabled={loading}
          />
        </div>

        <button className="primary cover-btn" onClick={signIn} disabled={loading}>
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
        <button className="secondary cover-btn-secondary" onClick={signUp} disabled={loading}>
          สมัครสมาชิก
        </button>
      </div>
    </div>
  )
}
