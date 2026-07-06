import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LobbyCanvas } from './LobbyCanvas'
import type { ChatRoomMember, ChatRoomMessage } from './types'

interface Props {
  roomId: string
  roomName: string
  userId: string
  onLeave: () => void
}

function parseRealtimePayload(payload: unknown): {
  table?: string
  row?: Record<string, unknown>
} {
  const p = payload as {
    table?: string
    new?: Record<string, unknown>
    old?: Record<string, unknown>
  }
  const row = p.new ?? p.old
  return { table: p.table, row }
}

export function ChatRoomView({ roomId, roomName, userId, onLeave }: Props) {
  const { t } = useTranslation()
  const [members, setMembers] = useState<ChatRoomMember[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [lastMessage, setLastMessage] = useState<ChatRoomMessage | null>(null)
  const [fallbackMember, setFallbackMember] = useState<ChatRoomMember | null>(null)
  const fallbackRef = useRef<ChatRoomMember | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const roomIdRef = useRef(roomId)
  const leftRef = useRef(false)

  const refreshMembers = useCallback(async () => {
    try {
      const rows = (await window.electronAPI.getChatRoomMembers(roomId)) as ChatRoomMember[]
      setMembers(rows)
      setError('')
      return rows
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return []
    }
  }, [roomId])

  useEffect(() => {
    void window.electronAPI.getGame().then((save) => {
      const pet = save.pet
      if (!pet) return
      setFallbackMember({
        user_id: userId,
        username: pet.name,
        pet_character: pet.character,
        gender: pet.gender,
        stage: pet.stage,
        x: 0.5,
        y: 0.62,
        facing: 'right',
        anim: 'walk'
      })
      fallbackRef.current = {
        user_id: userId,
        username: pet.name,
        pet_character: pet.character,
        gender: pet.gender,
        stage: pet.stage,
        x: 0.5,
        y: 0.62,
        facing: 'right',
        anim: 'walk'
      }
    })
  }, [userId])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.isComposing) return
      if (document.activeElement === inputRef.current) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    roomIdRef.current = roomId
    leftRef.current = false
    setReady(false)
    let unsub = () => {}

    unsub = window.electronAPI.onChatRoomUpdate((payload) => {
      const { table, row } = parseRealtimePayload(payload)
      if (!row) return

      if (table === 'chat_room_messages' && row.room_id === roomIdRef.current && row.id) {
        setLastMessage({
          id: String(row.id),
          room_id: String(row.room_id),
          sender_id: String(row.sender_id),
          content: String(row.content),
          created_at: String(row.created_at ?? new Date().toISOString())
        })
      }

      if (table === 'chat_room_positions' && row.room_id === roomIdRef.current && row.user_id) {
        const uid = String(row.user_id)
        setMembers((prev) => {
          const base = prev.length > 0 ? prev : fallbackRef.current ? [fallbackRef.current] : []
          return base.map((m) =>
            m.user_id === uid
              ? {
                  ...m,
                  x: Number(row.x ?? m.x),
                  y: Number(row.y ?? m.y),
                  facing: row.facing === 'left' ? 'left' : 'right',
                  anim: row.anim === 'jump' ? 'jump' : row.anim === 'walk' ? 'walk' : 'idle'
                }
              : m
          )
        })
      }

      if (table === 'chat_room_members') {
        void refreshMembers()
      }
    })

    void (async () => {
      try {
        await window.electronAPI.joinChatRoom(roomId)
        await refreshMembers()
        await window.electronAPI.subscribeChatRoom(roomId)
        setReady(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })()

    return () => {
      unsub()
    }
  }, [roomId, refreshMembers])

  const handleLeave = async () => {
    if (leftRef.current) return
    leftRef.current = true
    setError('')
    try {
      await window.electronAPI.leaveChatRoom(roomId)
      onLeave()
    } catch (e) {
      leftRef.current = false
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setError('')
    try {
      const msg = (await window.electronAPI.sendChatRoomMessage(roomId, trimmed)) as ChatRoomMessage
      setLastMessage(msg)
      setText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  const handlePositionSync = useCallback(
    (pos: { x: number; y: number; facing: string; anim: string }) => {
      if (leftRef.current) return
      void window.electronAPI.updateChatRoomPosition(roomId, pos)
    },
    [roomId]
  )

  const displayMembers =
    members.length > 0 ? members : fallbackMember ? [fallbackMember] : []

  return (
    <div className="chat-room-view">
      <div className="chat-room-toolbar">
        <div>
          <h2 style={{ margin: 0 }}>{roomName}</h2>
          <p className="chat-room-meta">
            {t('chatLobby.memberCount', { count: displayMembers.length })}
          </p>
        </div>
        <button type="button" className="secondary" onClick={handleLeave}>
          {t('chatLobby.leave')}
        </button>
      </div>

      {error && <p className="notice">{error}</p>}

      {!ready && !error && <p className="dash-activity-hint">{t('chatLobby.joining')}</p>}

      <LobbyCanvas
        roomId={roomId}
        userId={userId}
        members={displayMembers}
        onPositionSync={handlePositionSync}
        incomingMessage={lastMessage}
      />

      <p className="dash-activity-hint chat-room-controls">{t('chatLobby.controls')}</p>

      <div className="chat-room-input-row">
        <input
          ref={inputRef}
          value={text}
          maxLength={200}
          placeholder={t('chatLobby.inputPlaceholder')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSend()
          }}
        />
        <button type="button" className="primary" disabled={!text.trim() || sending} onClick={handleSend}>
          {t('chatLobby.send')}
        </button>
      </div>
    </div>
  )
}
