import { useEffect, useState } from 'react'

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

export function Chat() {
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [friendId, setFriendId] = useState('')
  const [messages, setMessages] = useState<ChatRow[]>([])
  const [text, setText] = useState('')

  useEffect(() => {
    ;(async () => {
      const session = (await window.electronAPI.getSession()) as { user: { id: string } } | null
      if (!session?.user?.id) return
      setUserId(session.user.id)
      setFriends((await window.electronAPI.listFriends(session.user.id)) as FriendRow[])
      await window.electronAPI.subscribeChat(session.user.id)
      window.electronAPI.onChatMessage((payload) => {
        const row = payload as { new: ChatRow }
        if (row?.new) setMessages((prev) => [...prev, row.new])
      })
    })()
  }, [])

  const loadHistory = async () => {
    if (!userId || !friendId) return
    const history = (await window.electronAPI.chatHistory(userId, friendId)) as ChatRow[]
    setMessages(history)
  }

  const send = async () => {
    if (!userId || !friendId || !text.trim()) return
    await window.electronAPI.sendChat(userId, friendId, text.trim())
    setText('')
    loadHistory()
  }

  return (
    <div className="card">
      <h2>แชทกับเพื่อน</h2>
      <div className="form-row">
        <label>เลือกเพื่อน</label>
        <select value={friendId} onChange={(e) => setFriendId(e.target.value)}>
          <option value="">-- เลือก --</option>
          {friends.map((f) => (
            <option key={f.friend_id} value={f.friend_id}>
              {f.profiles?.username ?? f.friend_id}
            </option>
          ))}
        </select>
      </div>
      <button className="secondary" onClick={loadHistory}>โหลดข้อความ</button>
      <div className="chat-box" style={{ marginTop: 12 }}>
        {messages.map((m) => (
          <div key={m.id} className={`chat-line ${m.sender_id === userId ? 'me' : ''}`}>
            {m.content}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="พิมพ์ข้อความ..." />
        <button className="primary" onClick={send}>ส่ง</button>
      </div>
    </div>
  )
}
