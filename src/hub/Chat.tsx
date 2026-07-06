import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface FriendRow {
  friend_id: string
  profiles?: { username: string }
}

interface ChatRow {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
}

function isInThread(msg: ChatRow, userId: string, friendId: string): boolean {
  return (
    (msg.sender_id === userId && msg.receiver_id === friendId) ||
    (msg.sender_id === friendId && msg.receiver_id === userId)
  )
}

export function Chat() {
  const { t } = useTranslation()
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [friendId, setFriendId] = useState('')
  const [messages, setMessages] = useState<ChatRow[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const chatBoxRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    const el = chatBoxRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [])

  const loadHistory = useCallback(async () => {
    if (!userId || !friendId) {
      setMessages([])
      return
    }
    setLoading(true)
    try {
      const history = (await window.electronAPI.chatHistory(userId, friendId)) as ChatRow[]
      setMessages(history)
    } finally {
      setLoading(false)
    }
  }, [userId, friendId])

  useEffect(() => {
    ;(async () => {
      const session = (await window.electronAPI.getSession()) as { user: { id: string } } | null
      if (!session?.user?.id) return
      setUserId(session.user.id)
      setFriends((await window.electronAPI.listFriends(session.user.id)) as FriendRow[])
      await window.electronAPI.subscribeChat(session.user.id)
    })()
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  useEffect(() => {
    if (!userId || !friendId) return

    return window.electronAPI.onChatMessage((payload) => {
      const row = (payload as { new: ChatRow })?.new
      if (!row || !isInThread(row, userId, friendId)) return
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]))
    })
  }, [userId, friendId])

  useEffect(() => {
    if (loading || messages.length === 0) return
    requestAnimationFrame(scrollToBottom)
  }, [messages, loading, scrollToBottom])

  const send = async () => {
    if (!userId || !friendId || !text.trim()) return
    const content = text.trim()
    setText('')
    await window.electronAPI.sendChat(userId, friendId, content)
    await loadHistory()
  }

  const selectedFriend = friends.find((f) => f.friend_id === friendId)

  return (
    <div className="card">
      <h2>{t('chat.title')}</h2>
      <div className="form-row">
        <label>{t('chat.selectFriend')}</label>
        <select value={friendId} onChange={(e) => setFriendId(e.target.value)}>
          <option value="">-- {t('chat.selectFriend')} --</option>
          {friends.map((f) => (
            <option key={f.friend_id} value={f.friend_id}>
              {f.profiles?.username ?? f.friend_id}
            </option>
          ))}
        </select>
      </div>

      {!friendId ? (
        <p className="dash-activity-hint">{t('chat.startBySelectingFriend')}</p>
      ) : loading ? (
        <p className="dash-activity-hint">{t('chat.loadingMessages')}</p>
      ) : messages.length === 0 ? (
        <p className="dash-activity-hint">
          {t('chat.noMessagesYet', { friendName: selectedFriend?.profiles?.username ?? t('chat.friendFallbackName') })}
        </p>
      ) : null}

      <div ref={chatBoxRef} className="chat-box" style={{ marginTop: 12 }}>
        {messages.map((m) => (
          <div key={m.id} className={`chat-line ${m.sender_id === userId ? 'me' : ''}`}>
            {m.content}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={friendId ? t('chat.messagePlaceholder') : t('chat.selectFriendFirstPlaceholder')}
          disabled={!friendId}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
        />
        <button className="primary" onClick={send} disabled={!friendId || !text.trim()}>
          {t('chat.send')}
        </button>
      </div>
    </div>
  )
}
