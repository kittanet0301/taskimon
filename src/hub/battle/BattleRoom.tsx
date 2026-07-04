import { useCallback, useContext, useEffect, useState } from 'react'
import type { BattleRoom, BattleRoomMember } from '../../shared/battle/types'
import { mapBattleRoom, mapBattleRoomMember, mapBattleSession } from '../../shared/battle/mappers'
import { formatApiError } from '../../shared/formatError'
import { BattleContext } from './BattleContext'
import { useBattleGuard } from './useBattleGuard'

interface Props {
  onDuelStarted?: () => void
}

export function BattleRoom({ onDuelStarted }: Props) {
  const ctx = useContext(BattleContext)
  const { requestLeave } = useBattleGuard()
  const [room, setRoom] = useState<BattleRoom | null>(null)
  const [members, setMembers] = useState<BattleRoomMember[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const roomId = ctx?.roomId ?? null
  const userId = ctx?.userId ?? null

  const syncActiveSession = useCallback(
    async (sessionId?: string | null) => {
      if (!ctx || !roomId) return

      const battles = (await window.electronAPI.listBattles()) as Record<string, unknown>[]

      const resolveActive = (id: string) => {
        const row = battles.find((b) => String(b.id) === id)
        return row && row.status === 'active' ? row : null
      }

      if (sessionId) {
        const row = resolveActive(sessionId)
        if (row) {
          ctx.setActiveSessionId(sessionId)
          ctx.setMemberStatus('in_battle')
          onDuelStarted?.()
          return
        }
      }

      const active = battles.find(
        (b) => String(b.room_id) === roomId && b.status === 'active'
      )
      if (active) {
        ctx.setActiveSessionId(String(active.id))
        ctx.setMemberStatus('in_battle')
        onDuelStarted?.()
        return
      }

      ctx.setMemberStatus('waiting')
    },
    [ctx, roomId, onDuelStarted]
  )

  const loadRoom = useCallback(async () => {
    if (!roomId) return
    try {
      const memberRows = (await window.electronAPI.getRoomMembers(roomId)) as Record<string, unknown>[]
      const mapped = memberRows.map(mapBattleRoomMember)
      setMembers(mapped)

      const hostMember = mapped.find((m) => m.role === 'host')
      if (hostMember) ctx?.setHostUserId(hostMember.userId)

      const me = mapped.find((m) => m.userId === userId)
      if (me) {
        ctx?.setMyRole(me.role)
        if (me.status === 'in_battle') {
          await syncActiveSession(room?.activeSessionId)
        } else {
          ctx?.setMemberStatus(me.status)
        }
      }
    } catch (e) {
      setMessage(formatApiError(e))
    }
  }, [roomId, userId, ctx, room?.activeSessionId, syncActiveSession])

  useEffect(() => {
    if (!roomId) return
    void loadRoom()
    void window.electronAPI.subscribeBattleRoom(roomId)

    const unsub = window.electronAPI.onBattleUpdate((payload) => {
      const table = (payload as { table?: string }).table
      const row = (payload as { new?: Record<string, unknown> })?.new

      if (table === 'battle_room_members' || table === 'battle_rooms') {
        void loadRoom()
        if (table === 'battle_rooms' && row) {
          const mapped = mapBattleRoom(row)
          setRoom(mapped)
          ctx?.setHostUserId(mapped.hostUserId)
          if (row.active_session_id) {
            void syncActiveSession(String(row.active_session_id))
          }
        }
      }

      if (table === 'battle_sessions' && row) {
        const session = mapBattleSession(row)
        if (session.roomId === roomId && session.status === 'active') {
          void syncActiveSession(session.id)
        }
        if (session.roomId === roomId && ['completed', 'fled'].includes(session.status)) {
          ctx?.setActiveSessionId(null)
          ctx?.setMemberStatus('waiting')
          void loadRoom()
        }
      }
    })

    return unsub
  }, [roomId, loadRoom, ctx, syncActiveSession])

  useEffect(() => {
    if (!roomId || room) return
    ;(async () => {
      try {
        const publicRooms = (await window.electronAPI.listPublicRooms()) as Record<string, unknown>[]
        const found = publicRooms.find((r) => String(r.id) === roomId)
        if (found) {
          const mapped: BattleRoom = {
            id: String(found.id),
            hostUserId: ctx?.hostUserId ?? '',
            roomCode: String(found.room_code),
            name: String(found.name),
            visibility: 'public',
            status: 'open',
            maxMembers: 8,
            activeSessionId: null,
            createdAt: String(found.created_at),
            expiresAt: null
          }
          setRoom(mapped)
          if (ctx?.hostUserId) mapped.hostUserId = ctx.hostUserId
        }
      } catch {
        /* room meta optional */
      }
    })()
  }, [roomId, room, ctx?.hostUserId])

  const startDuel = async (opponentUserId: string) => {
    if (!roomId || !ctx) return
    setLoading(true)
    setMessage('')
    try {
      const row = (await window.electronAPI.startRoomDuel(roomId, opponentUserId)) as Record<
        string,
        unknown
      >
      const session = mapBattleSession(row)
      ctx.setActiveSessionId(session.id)
      ctx.setMemberStatus('in_battle')
      onDuelStarted?.()
    } catch (e) {
      setMessage(formatApiError(e))
    } finally {
      setLoading(false)
    }
  }

  const leave = async () => {
    const ok = await requestLeave()
    if (ok) setMessage('ออกจากห้องแล้ว')
  }

  if (!roomId) return null

  const isHost =
    ctx?.myRole === 'host' ||
    (userId != null && ctx?.hostUserId === userId) ||
    members.some((m) => m.userId === userId && m.role === 'host')

  const myMember = members.find((m) => m.userId === userId)
  const inBattle =
    (ctx?.memberStatus === 'in_battle' || myMember?.status === 'in_battle') &&
    Boolean(ctx?.activeSessionId)

  const waitingOpponents = members.filter(
    (m) => m.status === 'waiting' && m.userId !== userId
  )

  return (
    <div className="card">
      <h3>ห้องต่อสู้</h3>
      {message && <p className="notice">{message}</p>}
      {room && (
        <p>
          <strong>{room.name}</strong> · รหัส: <code>{room.roomCode}</code>
        </p>
      )}

      {inBattle && (
        <div className="notice" style={{ marginBottom: 12 }}>
          <p style={{ margin: '0 0 8px' }}>ดวลกำลังดำเนินอยู่</p>
          <button type="button" className="primary" onClick={() => void syncActiveSession()}>
            ไปแท็บกำลังเล่น
          </button>
        </div>
      )}

      <h4>สมาชิกในห้อง</h4>
      <ul className="room-list">
        {members.map((m) => (
          <li key={m.userId} className="room-list-item">
            <span>
              {m.username}
              {m.role === 'host' && <span className="tag">เจ้าของห้อง</span>}
              <span className="tag">
                {m.status === 'waiting' ? 'รอ' : m.status === 'in_battle' ? 'กำลังสู้' : m.status}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {!inBattle && isHost && waitingOpponents.length > 0 && (
        <div className="battle-room-duel">
          <h4>เริ่มดวล</h4>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: '0 0 8px' }}>
            เลือกคู่ต่อสู้จากสมาชิกที่รออยู่ในห้อง
          </p>
          <div className="battle-actions">
            {waitingOpponents.map((m) => (
              <button
                key={m.userId}
                type="button"
                className="primary"
                onClick={() => void startDuel(m.userId)}
                disabled={loading}
              >
                ดวลกับ {m.username}
              </button>
            ))}
          </div>
        </div>
      )}

      {!inBattle && isHost && waitingOpponents.length === 0 && (
        <p>รอผู้เล่นอื่นเข้าห้องเพื่อเริ่มดวล</p>
      )}

      {!inBattle && !isHost && (
        <p>รอเจ้าของห้องเริ่มดวล…</p>
      )}

      <button type="button" className="secondary" onClick={() => void leave()} style={{ marginTop: 12 }}>
        ออกจากห้อง
      </button>
    </div>
  )
}
