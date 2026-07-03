import { useEffect, useState } from 'react'
import { formatApiError } from '../shared/formatError'

interface FriendRow {
  id: string
  friend_id: string
  profiles?: { username: string; friend_code: string }
}

interface PendingRow {
  id: string
  user_id: string
  profiles?: { username: string }
}

interface Props {
  onViewProfile: (userId: string) => void
}

export function Friends({ onViewProfile }: Props) {
  const [friendCode, setFriendCode] = useState('')
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [pending, setPending] = useState<PendingRow[]>([])
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  const load = async () => {
    const session = (await window.electronAPI.getSession()) as { user: { id: string } } | null
    if (!session?.user?.id) return
    setUserId(session.user.id)
    setFriends((await window.electronAPI.listFriends(session.user.id)) as FriendRow[])
    setPending((await window.electronAPI.listPending(session.user.id)) as PendingRow[])
  }

  useEffect(() => {
    load()
  }, [])

  const addFriend = async () => {
    if (!userId) {
      setMessage('กรุณาเข้าสู่ระบบก่อน')
      return
    }
    try {
      const profile = (await window.electronAPI.searchFriend(friendCode)) as { id: string; username: string } | null
      if (!profile) {
        setMessage('ไม่พบรหัสเพื่อน')
        return
      }
      if (profile.id === userId) {
        setMessage('ไม่สามารถเพิ่มตัวเองเป็นเพื่อนได้')
        return
      }
      await window.electronAPI.sendFriendRequest(userId, profile.id)
      setMessage(`ส่งคำขอเป็นเพื่อนไปยัง ${profile.username} แล้ว`)
    } catch (e) {
      const text = formatApiError(e)
      if (text.includes('duplicate') || text.includes('unique')) {
        setMessage('ส่งคำขอไปแล้ว หรือเป็นเพื่อนกันอยู่แล้ว')
      } else if (text.includes('violates') || text.includes('foreign key')) {
        setMessage('ไม่สามารถส่งคำขอได้ — ตรวจสอบรหัสเพื่อน')
      } else {
        setMessage(text)
      }
    }
  }

  const respond = async (requestId: string, accept: boolean) => {
    await window.electronAPI.respondFriend(requestId, accept)
    load()
  }

  return (
    <div className="card">
      <h2>เพื่อน</h2>
      {message && <p>{message}</p>}
      <div className="form-row">
        <label>เพิ่มเพื่อนด้วยรหัส</label>
        <input value={friendCode} onChange={(e) => setFriendCode(e.target.value.toUpperCase())} placeholder="ABC123" />
      </div>
      <button className="primary" onClick={addFriend}>ส่งคำขอ</button>

      <h3 style={{ marginTop: 24 }}>คำขอที่รอ</h3>
      {pending.length === 0 && <p>ไม่มีคำขอ</p>}
      {pending.map((p) => (
        <div key={p.id} className="friend-item">
          <span>{p.profiles?.username ?? p.user_id}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="primary" onClick={() => respond(p.id, true)}>ยอมรับ</button>
            <button className="secondary" onClick={() => respond(p.id, false)}>ปฏิเสธ</button>
          </div>
        </div>
      ))}

      <h3 style={{ marginTop: 24 }}>รายชื่อเพื่อน</h3>
      {friends.length === 0 && <p>ยังไม่มีเพื่อน</p>}
      {friends.map((f) => (
        <div key={f.id} className="friend-item">
          <span>{f.profiles?.username ?? f.friend_id}</span>
          <button className="secondary" onClick={() => onViewProfile(f.friend_id)}>ดูโปรไฟล์</button>
        </div>
      ))}
    </div>
  )
}
