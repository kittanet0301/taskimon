import { useCallback, useContext, useEffect, useState } from 'react'
import { formatApiError } from '../../shared/formatError'
import type { BattleRoomSummary } from '../../shared/battle/types'
import { mapBattleRoom, mapBattleRoomSummary } from '../../shared/battle/mappers'
import { BattleContext } from './BattleContext'

export function RoomLobby() {
  const ctx = useContext(BattleContext)
  const [rooms, setRooms] = useState<BattleRoomSummary[]>([])
  const [roomCode, setRoomCode] = useState('')
  const [roomName, setRoomName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const loadRooms = useCallback(async () => {
    try {
      const rows = (await window.electronAPI.listPublicRooms()) as Record<string, unknown>[]
      setRooms(rows.map(mapBattleRoomSummary))
    } catch (e) {
      setMessage(formatApiError(e))
    }
  }, [])

  useEffect(() => {
    void loadRooms()
  }, [loadRooms])

  const enterRoom = async (code: string) => {
    if (!ctx) return
    setLoading(true)
    setMessage('')
    try {
      const row = (await window.electronAPI.joinBattleRoom(code)) as Record<string, unknown>
      const room = mapBattleRoom(row)
      ctx.setRoomId(room.id)
      ctx.setHostUserId(room.hostUserId)
      ctx.setMyRole('member')
      ctx.setMemberStatus('waiting')
      ctx.setActiveSessionId(room.activeSessionId)
    } catch (e) {
      setMessage(formatApiError(e))
    } finally {
      setLoading(false)
    }
  }

  const createRoom = async () => {
    if (!ctx) return
    setLoading(true)
    setMessage('')
    try {
      const row = (await window.electronAPI.createBattleRoom(roomName || undefined)) as Record<
        string,
        unknown
      >
      const room = mapBattleRoom(row)
      ctx.setRoomId(room.id)
      ctx.setHostUserId(room.hostUserId)
      ctx.setMyRole('host')
      ctx.setMemberStatus('waiting')
      ctx.setActiveSessionId(room.activeSessionId)
      setRoomName('')
    } catch (e) {
      setMessage(formatApiError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="room-lobby card">
      <h3>ห้องต่อสู้สาธารณะ</h3>
      {message && <p className="notice">{message}</p>}

      <div className="form-row">
        <label>ชื่อห้อง (ตอนสร้าง)</label>
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="ห้องของฉัน"
        />
      </div>
      <button type="button" className="primary" onClick={() => void createRoom()} disabled={loading}>
        สร้างห้องใหม่
      </button>

      <div className="form-row" style={{ marginTop: 16 }}>
        <label>รหัสห้อง</label>
        <input
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
        />
      </div>
      <button
        type="button"
        className="secondary"
        onClick={() => void enterRoom(roomCode)}
        disabled={loading || !roomCode.trim()}
      >
        เข้าห้องด้วยรหัส
      </button>

      <h4 style={{ marginTop: 20 }}>ห้องที่เปิดอยู่</h4>
      {rooms.length === 0 ? (
        <p>ยังไม่มีห้องเปิด — สร้างห้องแรกได้เลย</p>
      ) : (
        <ul className="room-list">
          {rooms.map((room) => (
            <li key={room.id} className="room-list-item">
              <div>
                <strong>{room.name}</strong>
                <span className="tag">{room.roomCode}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                เจ้าของ: {room.hostUsername} · {room.memberCount} คน · รอ {room.waitingCount}
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => void enterRoom(room.roomCode)}
                disabled={loading}
              >
                เข้าร่วม
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="secondary" onClick={() => void loadRooms()} style={{ marginTop: 12 }}>
        รีเฟรช
      </button>
    </div>
  )
}
