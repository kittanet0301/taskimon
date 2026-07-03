import { useEffect, useState } from 'react'
import type { GameSave } from '../shared/types'

interface Props {
  save: GameSave
  onSynced: () => void
  cloudReady: boolean
}

function formatAuthError(error: unknown): string {
  const text = String(error)
  if (text.includes('Email not confirmed')) {
    return 'ยังไม่ได้ยืนยันอีเมล — เปิดอีเมลแล้วคลิกลิงก์ยืนยัน หรือปิด Confirm email ใน Supabase (Authentication → Sign In / Providers → User Signups)'
  }
  if (text.includes('Invalid login credentials')) {
    return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  }
  if (text.includes('User already registered')) {
    return 'อีเมลนี้สมัครแล้ว — ลองเข้าสู่ระบบแทน'
  }
  return text.replace(/^Error:\s*Error invoking remote method '[^']+':\s*(AuthApiError:\s*)?/i, '')
}

export function AuthPanel({ save, onSynced, cloudReady }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [session, setSession] = useState<{ user: { id: string; email?: string } } | null>(null)
  const [profile, setProfile] = useState<{ username: string; friend_code: string } | null>(null)
  const [message, setMessage] = useState('')
  const [dbMode, setDbMode] = useState(false)

  const loadSession = async () => {
    const s = (await window.electronAPI.getSession()) as { user: { id: string; email?: string } } | null
    setSession(s)
    setDbMode(await window.electronAPI.isDbMode())
    if (s?.user?.id) {
      const p = (await window.electronAPI.getProfile(s.user.id)) as { username: string; friend_code: string }
      setProfile(p)
      await window.electronAPI.reloadFromCloud()
      onSynced()
    }
  }

  useEffect(() => {
    loadSession()
  }, [])

  const signUp = async () => {
    try {
      const data = (await window.electronAPI.signUp(email, password, username)) as {
        session: { user: { id: string } } | null
        user: { id: string } | null
      }
      if (data.session?.user?.id) {
        setMessage('สมัครสำเร็จ — กำลังเข้าสู่ระบบ...')
        await loadSession()
        setMessage('เข้าสู่ระบบแล้ว — ข้อมูลถูกโหลดจากฐานข้อมูล')
        return
      }
      setMessage(
        'สมัครสำเร็จ — เปิดอีเมลแล้วคลิกลิงก์ยืนยันก่อนเข้าสู่ระบบ (หรือปิด Confirm email ใน Supabase เพื่อทดสอบเร็ว)'
      )
    } catch (e) {
      setMessage(formatAuthError(e))
    }
  }

  const signIn = async () => {
    try {
      await window.electronAPI.signIn(email, password)
      await loadSession()
      setMessage('เข้าสู่ระบบแล้ว — ข้อมูลถูกโหลดจากฐานข้อมูล')
    } catch (e) {
      setMessage(formatAuthError(e))
    }
  }

  const signOut = async () => {
    await window.electronAPI.signOut()
    setSession(null)
    setProfile(null)
    setDbMode(false)
    setMessage('ออกจากระบบแล้ว — ใช้ข้อมูลในเครื่อง (offline cache)')
    onSynced()
  }

  const forceSave = async () => {
    try {
      await window.electronAPI.forceCloudSave()
      setMessage('บันทึกลงฐานข้อมูลทันทีแล้ว')
    } catch (e) {
      setMessage(String(e))
    }
  }

  if (!cloudReady) {
    return (
      <div className="card">
        <h2>บัญชีผู้เล่น & ฐานข้อมูล</h2>
        <p className="notice" style={{ margin: 0 }}>
          ยังไม่ได้ตั้งค่า Supabase — สร้างไฟล์ <code>.env</code> ตาม <code>.env.example</code> แล้วรัน SQL ใน{' '}
          <code>supabase/migrations/</code>
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>บัญชีผู้เล่น & ฐานข้อมูล</h2>
      <p>
        สถานะ:{' '}
        <strong style={{ color: dbMode ? '#16a34a' : '#ca8a04' }}>
          {dbMode ? 'เชื่อมต่อ DB แล้ว (บันทึกอัตโนมัติ)' : 'ยังไม่ login — ใช้ไฟล์ local ชั่วคราว'}
        </strong>
      </p>
      {message && <p>{message}</p>}
      {session ? (
        <>
          <p>เข้าสู่ระบบ: {session.user.email}</p>
          {profile && (
            <p>
              ชื่อ: <strong>{profile.username}</strong> · รหัสเพื่อน: <strong>{profile.friend_code}</strong>
            </p>
          )}
          <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            สัตว์: {save.pet?.name ?? '—'} · ไอเทม {save.inventory.length} ชนิด · ภารกิจ {save.missions.length} รายการ
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="primary" onClick={forceSave}>บันทึก DB ทันที</button>
            <button className="secondary" onClick={signOut}>ออกจากระบบ</button>
          </div>
        </>
      ) : (
        <>
          <div className="form-row">
            <label>อีเมล</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-row">
            <label>รหัสผ่าน</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="form-row">
            <label>ชื่อผู้ใช้ (สมัครใหม่)</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="primary" onClick={signIn}>เข้าสู่ระบบ</button>
            <button className="secondary" onClick={signUp}>สมัครสมาชิก</button>
          </div>
        </>
      )}
    </div>
  )
}
