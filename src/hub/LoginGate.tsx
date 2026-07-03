import { useState, type ReactNode } from 'react'
import { formatAuthError } from '../shared/formatError'

interface Props {
  onLoggedIn: () => void
}

type AuthView = 'login' | 'signup'

function AuthShell({
  tagline,
  message,
  children,
  footer
}: {
  tagline: string
  message: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="cover-screen">
      <div className="cover-card login-card">
        <div className="cover-logo">🥚</div>
        <h1 className="cover-title">TASKIMON</h1>
        <p className="cover-tagline">{tagline}</p>

        {message && <p className="login-message">{message}</p>}

        {children}

        <div className="auth-switch">{footer}</div>
      </div>
    </div>
  )
}

function LoginPage({
  onLoggedIn,
  onGoSignUp
}: {
  onLoggedIn: () => void
  onGoSignUp: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  return (
    <AuthShell
      tagline="เข้าสู่ระบบเพื่อเริ่มเลี้ยงสัตว์ของคุณ"
      message={message}
      footer={
        <>
          ยังไม่มีบัญชี?{' '}
          <button type="button" className="auth-link" onClick={onGoSignUp} disabled={loading}>
            สมัครสมาชิก
          </button>
        </>
      }
    >
      <div className="form-row">
        <label>อีเมล</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          disabled={loading}
          autoComplete="email"
        />
      </div>
      <div className="form-row">
        <label>รหัสผ่าน</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="รหัสผ่านของคุณ"
          disabled={loading}
          autoComplete="current-password"
        />
      </div>

      <button className="primary cover-btn" onClick={signIn} disabled={loading}>
        {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
      </button>
    </AuthShell>
  )
}

function SignUpPage({
  onLoggedIn,
  onGoLogin
}: {
  onLoggedIn: () => void
  onGoLogin: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

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
    <AuthShell
      tagline="สร้างบัญชีใหม่เพื่อเริ่มผจญภัยกับ Taskimon"
      message={message}
      footer={
        <>
          มีบัญชีแล้ว?{' '}
          <button type="button" className="auth-link" onClick={onGoLogin} disabled={loading}>
            เข้าสู่ระบบ
          </button>
        </>
      }
    >
      <div className="form-row">
        <label>ชื่อผู้ใช้</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ชื่อในเกม"
          disabled={loading}
          autoComplete="username"
        />
      </div>
      <div className="form-row">
        <label>อีเมล</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          disabled={loading}
          autoComplete="email"
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
          autoComplete="new-password"
        />
      </div>

      <button className="primary cover-btn" onClick={signUp} disabled={loading}>
        {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
      </button>
    </AuthShell>
  )
}

export function LoginGate({ onLoggedIn }: Props) {
  const [view, setView] = useState<AuthView>('login')

  if (view === 'signup') {
    return <SignUpPage onLoggedIn={onLoggedIn} onGoLogin={() => setView('login')} />
  }

  return <LoginPage onLoggedIn={onLoggedIn} onGoSignUp={() => setView('signup')} />
}
