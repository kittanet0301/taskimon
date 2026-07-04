import { useEffect, useState } from 'react'
import type { BattleSession } from '../../shared/battle/types'
import { mapBattleSession } from '../../shared/battle/mappers'

interface FriendRow {
  friend_id: string
  profiles?: { username: string }
}

interface Props {
  onBattleActive?: (sessionId: string) => void
}

export function BattleChallenge({ onBattleActive }: Props) {
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedFriend, setSelectedFriend] = useState('')
  const [pending, setPending] = useState<BattleSession[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const loadBattles = async (uid: string) => {
    const rows = (await window.electronAPI.listBattles()) as Record<string, unknown>[]
    const sessions = rows.map(mapBattleSession)
    setPending(
      sessions.filter(
        (s) =>
          s.status === 'pending' &&
          (s.challengerUserId === uid || s.defenderUserId === uid)
      )
    )
  }

  useEffect(() => {
    ;(async () => {
      const session = (await window.electronAPI.getSession()) as { user: { id: string } } | null
      if (!session?.user?.id) return
      setUserId(session.user.id)
      setFriends((await window.electronAPI.listFriends(session.user.id)) as FriendRow[])
      await loadBattles(session.user.id)
      await window.electronAPI.subscribeBattles(session.user.id)
    })()
  }, [])

  useEffect(() => {
    if (!userId) return
    return window.electronAPI.onBattleUpdate(() => {
      void loadBattles(userId)
    })
  }, [userId])

  const challenge = async () => {
    if (!selectedFriend) return
    setLoading(true)
    setMessage('')
    try {
      await window.electronAPI.createBattleChallenge(selectedFriend)
      setMessage('ส่งคำท้าแล้ว — รอเพื่อนตอบรับ')
      if (userId) await loadBattles(userId)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'ท้าไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  const respond = async (sessionId: string, accept: boolean) => {
    setLoading(true)
    try {
      const result = (await window.electronAPI.respondBattle(sessionId, accept)) as Record<
        string,
        unknown
      > | null
      if (userId) await loadBattles(userId)
      if (accept && result?.status === 'active') {
        onBattleActive?.(String(result.id))
      }
      setMessage(accept ? 'ยอมรับคำท้าแล้ว' : 'ปฏิเสธคำท้าแล้ว')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'ตอบคำท้าไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h3>ท้าเพื่อนต่อสู้</h3>
      {message && <p className="notice">{message}</p>}

      <div className="form-row">
        <label>เลือกเพื่อน</label>
        <select value={selectedFriend} onChange={(e) => setSelectedFriend(e.target.value)}>
          <option value="">-- เลือก --</option>
          {friends.map((f) => (
            <option key={f.friend_id} value={f.friend_id}>
              {f.profiles?.username ?? f.friend_id}
            </option>
          ))}
        </select>
      </div>
      <button type="button" className="primary" onClick={() => void challenge()} disabled={loading || !selectedFriend}>
        ส่งคำท้า
      </button>

      {pending.length > 0 && (
        <>
          <h4 style={{ marginTop: 20 }}>คำท้าที่รอดำเนินการ</h4>
          <ul className="room-list">
            {pending.map((s) => {
              const isDefender = s.defenderUserId === userId
              return (
                <li key={s.id} className="room-list-item">
                  <span>
                    {isDefender ? 'มีคนท้าคุณ' : 'คุณท้าเพื่อน'} · #{s.id.slice(0, 8)}
                  </span>
                  {isDefender && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="primary" disabled={loading} onClick={() => void respond(s.id, true)}>
                        ยอมรับ
                      </button>
                      <button type="button" className="secondary" disabled={loading} onClick={() => void respond(s.id, false)}>
                        ปฏิเสธ
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
