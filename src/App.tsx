import { useCallback, useEffect, useState } from 'react'
import type { GameSave } from './shared/types'
import { ONBOARDING_KEY } from './shared/activityScore'
import { GetStarted } from './hub/GetStarted'
import { LoginGate } from './hub/LoginGate'
import { HomeDashboard } from './hub/HomeDashboard'
import { Inventory } from './hub/Inventory'
import { Missions } from './hub/Missions'
import { AuthPanel } from './hub/AuthPanel'
import { Friends } from './hub/Friends'
import { Battle } from './hub/Battle'
import { Chat } from './hub/Chat'
import { UserProfile } from './hub/UserProfile'

type Tab = 'home' | 'inventory' | 'missions' | 'friends' | 'battle' | 'chat' | 'profile' | 'settings'

type Session = { user: { id: string; email?: string } } | null

interface Props {
  variant?: 'desktop' | 'web'
}

export default function App({ variant = 'desktop' }: Props) {
  const [save, setSave] = useState<GameSave | null>(null)
  const [tab, setTab] = useState<Tab>('home')
  const [cloudReady, setCloudReady] = useState(false)
  const [viewUserId, setViewUserId] = useState<string | null>(null)
  const [showCover, setShowCover] = useState(() => !localStorage.getItem(ONBOARDING_KEY))
  const [session, setSession] = useState<Session>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!window.electronAPI) return
    const data = await window.electronAPI.getGame()
    setSave(data)
  }, [])

  const checkSession = useCallback(async () => {
    if (!window.electronAPI) return
    const s = (await window.electronAPI.getSession()) as Session
    setSession(s)
    setAuthLoading(false)
    if (s?.user?.id) {
      await window.electronAPI.reloadFromCloud()
      await refresh()
    }
  }, [refresh])

  useEffect(() => {
    if (!window.electronAPI) return
    refresh()
    window.electronAPI.supabaseConfigured().then(setCloudReady)
    checkSession()
    return window.electronAPI.onGameUpdated(setSave)
  }, [refresh, checkSession])

  const handleGetStarted = () => {
    localStorage.setItem(ONBOARDING_KEY, '1')
    setShowCover(false)
  }

  const handleLogout = () => {
    setSession(null)
    refresh()
  }

  if (!window.electronAPI) {
    return <div className="content">กำลังเชื่อมต่อแอป...</div>
  }

  if (!save || authLoading) {
    return <div className="content">กำลังโหลด...</div>
  }

  if (!cloudReady) {
    return (
      <div className="cover-screen">
        <div className="cover-card">
          <h1 className="cover-title">TASKIMON</h1>
          <p className="cover-tagline">ต้องตั้งค่า Supabase ก่อนใช้งาน</p>
          <p className="notice" style={{ textAlign: 'left', margin: 0 }}>
            สร้างไฟล์ <code>.env</code> หรือ <code>.env.production</code> แล้วรัน SQL ใน{' '}
            <code>supabase/migrations/</code>
          </p>
        </div>
      </div>
    )
  }

  if (!session?.user?.id) {
    return <LoginGate onLoggedIn={checkSession} />
  }

  if (showCover) {
    return <GetStarted onStart={handleGetStarted} />
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'home', label: 'หน้าแรก', icon: '🏠' },
    { id: 'inventory', label: 'ไอเทม', icon: '🎒' },
    { id: 'missions', label: 'ภารกิจ', icon: '📋' },
    { id: 'friends', label: 'ชุมชน', icon: '👥' },
    { id: 'battle', label: 'ต่อสู้', icon: '⚔️' },
    { id: 'chat', label: 'แชท', icon: '💬' },
    { id: 'settings', label: 'ตั้งค่า', icon: '⚙️' }
  ]

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Taskimon{variant === 'web' ? ' — Web' : ''}</h1>
          <span className="header-sub">
            {session.user.email} · sync อัตโนมัติ
          </span>
        </div>
      </header>

      <nav className="tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {tab === 'home' && <HomeDashboard save={save} onUpdated={refresh} />}
        {tab === 'inventory' && <Inventory save={save} onUpdated={refresh} />}
        {tab === 'missions' && <Missions save={save} onUpdated={refresh} />}
        {tab === 'friends' && (
          <Friends
            onViewProfile={(userId) => {
              setViewUserId(userId)
              setTab('profile')
            }}
          />
        )}
        {tab === 'battle' && <Battle save={save} />}
        {tab === 'chat' && <Chat />}
        {tab === 'profile' && <UserProfile userId={viewUserId} />}
        {tab === 'settings' && (
          <AuthPanel
            save={save}
            onSynced={refresh}
            cloudReady={cloudReady}
            onLogout={handleLogout}
          />
        )}
      </main>
    </div>
  )
}
