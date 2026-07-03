import { useCallback, useEffect, useState } from 'react'
import type { GameSave } from './shared/types'
import { PetProfile } from './hub/PetProfile'
import { EggHatch } from './hub/EggHatch'
import { Inventory } from './hub/Inventory'
import { Missions } from './hub/Missions'
import { AuthPanel } from './hub/AuthPanel'
import { Friends } from './hub/Friends'
import { Battle } from './hub/Battle'
import { Chat } from './hub/Chat'
import { UserProfile } from './hub/UserProfile'

type Tab = 'pet' | 'inventory' | 'missions' | 'friends' | 'battle' | 'chat' | 'profile' | 'auth'

interface Props {
  variant?: 'desktop' | 'web'
}

export default function App({ variant = 'desktop' }: Props) {
  const [save, setSave] = useState<GameSave | null>(null)
  const [tab, setTab] = useState<Tab>('pet')
  const [cloudReady, setCloudReady] = useState(false)
  const [viewUserId, setViewUserId] = useState<string | null>(null)

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

  if (!window.electronAPI) {
    return <div className="content">กำลังเชื่อมต่อแอป...</div>
  }

  if (!save) {
    return <div className="content">กำลังโหลด...</div>
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'pet', label: 'สัตว์เลี้ยง' },
    { id: 'inventory', label: 'ไอเทม' },
    { id: 'missions', label: 'ภารกิจ' },
    { id: 'friends', label: 'เพื่อน' },
    { id: 'battle', label: 'ต่อสู้' },
    { id: 'chat', label: 'แชท' },
    { id: 'profile', label: 'โปรไฟล์' },
    { id: 'auth', label: 'บัญชี' }
  ]

  return (
    <div className="app">
      <header className="header">
        <h1>Taskimon{variant === 'web' ? ' — Web' : ''}</h1>
        <span>
          {variant === 'web'
            ? 'เวอร์ชันเบราว์เซอร์ — คลิก & พิมพ์ในหน้านี้นับเป็นพัฒนาร่าง'
            : 'Demo — พัฒนาร่างจากคลิก & พิมพ์'}
        </span>
      </header>

      {!cloudReady && (
        <div className="notice" style={{ margin: '16px 24px 0' }}>
          ยังไม่ได้ตั้งค่า Supabase — สร้างไฟล์ <code>.env</code> แล้วรัน SQL migration (ดู README)
        </div>
      )}
      {cloudReady && (
        <div className="notice" style={{ margin: '16px 24px 0', background: '#dbeafe', color: '#1e40af' }}>
          แนะนำ: เข้าสู่ระบบที่แท็บ <strong>บัญชี</strong> เพื่อเก็บข้อมูลบน Database (บันทึกอัตโนมัติทุก 1.5 วินาที)
        </div>
      )}

      <nav className="tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {tab === 'pet' && (
          <div className="grid-2">
            {save.pet?.stage === 'egg' ? (
              <EggHatch pet={save.pet} onHatched={refresh} />
            ) : (
              <PetProfile save={save} onUpdated={refresh} />
            )}
            <div className="card">
              <h3>กิจกรรมวันนี้</h3>
              <div className="stat-row"><span>คลิก</span><strong>{save.activity.clicks}</strong></div>
              <div className="stat-row"><span>พิมพ์</span><strong>{save.activity.keystrokes}</strong></div>
              <div className="stat-row"><span>พัฒนาร่างชั่วโมงนี้</span><strong>{save.activity.devPointsThisHour}/10</strong></div>
            </div>
          </div>
        )}
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
        {tab === 'auth' && <AuthPanel save={save} onSynced={refresh} cloudReady={cloudReady} />}
      </main>
    </div>
  )
}
