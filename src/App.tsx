import { useCallback, useEffect, useState } from 'react'
import type { GameSave } from './shared/types'
import { ONBOARDING_KEY } from './shared/activityScore'
import { GetStarted } from './hub/GetStarted'
import { HomeDashboard } from './hub/HomeDashboard'
import { Inventory } from './hub/Inventory'
import { Missions } from './hub/Missions'
import { AuthPanel } from './hub/AuthPanel'
import { Friends } from './hub/Friends'
import { Battle } from './hub/Battle'
import { Chat } from './hub/Chat'
import { UserProfile } from './hub/UserProfile'

type Tab = 'home' | 'inventory' | 'missions' | 'friends' | 'battle' | 'chat' | 'profile' | 'settings'

interface Props {
  variant?: 'desktop' | 'web'
}

export default function App({ variant = 'desktop' }: Props) {
  const [save, setSave] = useState<GameSave | null>(null)
  const [tab, setTab] = useState<Tab>('home')
  const [cloudReady, setCloudReady] = useState(false)
  const [viewUserId, setViewUserId] = useState<string | null>(null)
  const [showCover, setShowCover] = useState(() => !localStorage.getItem(ONBOARDING_KEY))

  const refresh = useCallback(async () => {
    if (!window.electronAPI) return
    const data = await window.electronAPI.getGame()
    setSave(data)
  }, [])

  useEffect(() => {
    if (!window.electronAPI) return
    refresh()
    window.electronAPI.supabaseConfigured().then(setCloudReady)
    return window.electronAPI.onGameUpdated(setSave)
  }, [refresh])

  const handleGetStarted = () => {
    localStorage.setItem(ONBOARDING_KEY, '1')
    setShowCover(false)
  }

  if (!window.electronAPI) {
    return <div className="content">กำลังเชื่อมต่อแอป...</div>
  }

  if (!save) {
    return <div className="content">กำลังโหลด...</div>
  }

  if (showCover) {
    return (
      <GetStarted
        onStart={handleGetStarted}
        cloudReady={cloudReady}
        onLogin={() => {
          handleGetStarted()
          setTab('settings')
        }}
      />
    )
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
        <h1>Taskimon{variant === 'web' ? ' — Web' : ''}</h1>
        <span className="header-sub">
          {variant === 'web'
            ? 'คลิก & พิมพ์ในหน้านี้ → Activity Score'
            : 'Home Dashboard'}
        </span>
      </header>

      {cloudReady && tab === 'home' && (
        <div className="notice notice-info">
          เข้าสู่ระบบที่ <strong>ตั้งค่า</strong> เพื่อ sync ข้อมูลบน Cloud
        </div>
      )}

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
          <AuthPanel save={save} onSynced={refresh} cloudReady={cloudReady} />
        )}
      </main>
    </div>
  )
}
