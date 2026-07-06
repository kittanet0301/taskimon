import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChatRoomView } from './ChatRoomView'
import type { ChatRoomRow } from './types'

const ROOM_ICONS: Record<string, string> = {
  plaza: '🏛️',
  park: '🌳',
  beach: '🏖️',
  cave: '🕳️'
}

export function ChatRoomHub() {
  const { t } = useTranslation()
  const [rooms, setRooms] = useState<ChatRoomRow[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [activeRoom, setActiveRoom] = useState<ChatRoomRow | null>(null)
  const [error, setError] = useState('')
  const activeRoomRef = useRef<ChatRoomRow | null>(null)

  activeRoomRef.current = activeRoom

  const refreshRooms = useCallback(async () => {
    try {
      setRooms((await window.electronAPI.listChatRooms()) as ChatRoomRow[])
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const session = (await window.electronAPI.getSession()) as { user: { id: string } } | null
        setUserId(session?.user?.id ?? null)
        await refreshRooms()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })()
  }, [refreshRooms])

  useEffect(() => {
    return () => {
      const room = activeRoomRef.current
      if (room) {
        void window.electronAPI.leaveChatRoom(room.id)
      }
    }
  }, [])

  const join = (room: ChatRoomRow) => {
    setError('')
    setActiveRoom(room)
  }

  const handleLeaveRoom = () => {
    setActiveRoom(null)
    void refreshRooms()
  }

  if (!userId) {
    return (
      <div className="card">
        <p>{t('chatLobby.loginRequired')}</p>
      </div>
    )
  }

  if (activeRoom) {
    return (
      <ChatRoomView
        roomId={activeRoom.id}
        roomSlug={activeRoom.slug}
        roomName={t(`chatLobby.rooms.${activeRoom.slug}`, { defaultValue: activeRoom.name })}
        userId={userId}
        onLeave={handleLeaveRoom}
      />
    )
  }

  return (
    <div className="chat-room-hub">
      <div className="card">
        <h2>{t('chatLobby.title')}</h2>
        <p className="dash-activity-hint">{t('chatLobby.subtitle')}</p>
        {error && <p className="notice">{error}</p>}
        <div className="chat-room-grid">
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              className="chat-room-card"
              onClick={() => join(room)}
            >
              <span className="chat-room-card-icon">{ROOM_ICONS[room.slug] ?? '💬'}</span>
              <span className="chat-room-card-name">
                {t(`chatLobby.rooms.${room.slug}`, { defaultValue: room.name })}
              </span>
              <span className="chat-room-card-count">
                {t('chatLobby.memberCount', { count: room.member_count })}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
