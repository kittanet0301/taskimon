import { useCallback, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave } from './shared/types'
import { ONBOARDING_KEY } from './shared/activityScore'
import './i18n'
import { GetStarted } from './hub/GetStarted'
import { LoginGate } from './hub/LoginGate'
import { HomeDashboard } from './hub/HomeDashboard'
import { Missions } from './hub/Missions'
import { AuthPanel } from './hub/AuthPanel'
import { Friends } from './hub/Friends'
import { BattleProvider, BattleContext } from './hub/battle/BattleContext'
import { BattleHub } from './hub/battle/BattleHub'
import { useBattleGuard } from './hub/battle/useBattleGuard'
import { Chat } from './hub/Chat'
import { UserProfile } from './hub/UserProfile'
import { PetCollection } from './hub/PetCollection'
import { LanguageSwitcher } from './hub/LanguageSwitcher'

type Tab = 'home' | 'collection' | 'missions' | 'friends' | 'battle' | 'chat' | 'profile' | 'settings'

type Session = { user: { id: string; email?: string } } | null

interface Props {
  variant?: 'desktop' | 'web'
}

export default function App({ variant = 'desktop' }: Props) {
  return (
    <BattleProvider>
      <AppContent variant={variant} />
    </BattleProvider>
  )
}

function AppContent({ variant = 'desktop' }: Props) {
  const { t } = useTranslation()
  const battleCtx = useContext(BattleContext)
  const { isInRoom, confirmLeave } = useBattleGuard()
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

  const syncOnTabChange = useCallback(async () => {
    if (!window.electronAPI) return
    await window.electronAPI.forceCloudSave()
    await window.electronAPI.reloadFromCloud()
    await refresh()
  }, [refresh])

  const [tabSyncing, setTabSyncing] = useState(false)

  const handleTabChange = useCallback(
    async (nextTab: Tab) => {
      if (nextTab === tab || tabSyncing) return
      if (tab === 'battle' && nextTab !== 'battle' && isInRoom) {
        const ok = await confirmLeave()
        if (!ok) return
      }
      setTabSyncing(true)
      try {
        await syncOnTabChange()
        setTab(nextTab)
      } catch (e) {
        console.error('[tab] sync failed:', e)
        setTab(nextTab)
      } finally {
        setTabSyncing(false)
      }
    },
    [tab, tabSyncing, syncOnTabChange, isInRoom, confirmLeave]
  )

  const handleViewProfile = useCallback(
    async (userId: string) => {
      if (tabSyncing) return
      setTabSyncing(true)
      try {
        await syncOnTabChange()
        setViewUserId(userId)
        setTab('profile')
      } catch (e) {
        console.error('[tab] sync failed:', e)
        setViewUserId(userId)
        setTab('profile')
      } finally {
        setTabSyncing(false)
      }
    },
    [tabSyncing, syncOnTabChange]
  )

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
    const unsubscribe = window.electronAPI.onGameUpdated(setSave)
    const onFocus = () => {
      void refresh()
    }
    window.addEventListener('focus', onFocus)
    return () => {
      unsubscribe()
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh, checkSession])

  useEffect(() => {
    battleCtx?.syncUserId(session?.user?.id ?? null)
  }, [session?.user?.id, battleCtx])

  useEffect(() => {
    if (!session?.user?.id || showCover || !window.electronAPI) return
    const id = setInterval(() => {
      refresh()
    }, 60_000)
    return () => clearInterval(id)
  }, [session, showCover, refresh])

  const handleGetStarted = () => {
    localStorage.setItem(ONBOARDING_KEY, '1')
    setShowCover(false)
  }

  const handleLogout = () => {
    setSession(null)
    refresh()
  }

  const handleDataReset = () => {
    localStorage.removeItem(ONBOARDING_KEY)
    setShowCover(true)
    setTab('home')
    refresh()
  }

  if (!window.electronAPI) {
    return <div className="content">{t('common.connectingApp')}</div>
  }

  if (!save || authLoading) {
    return <div className="content">{t('common.loading')}</div>
  }

  if (!cloudReady) {
    return (
      <div className="cover-screen">
        <div className="cover-card">
          <h1 className="cover-title">{t('app.title')}</h1>
          <p className="cover-tagline">{t('app.supabaseRequiredSubtitle')}</p>
          <p className="notice" style={{ textAlign: 'left', margin: 0 }}>
            {t('app.supabaseRequiredBody')}
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
    { id: 'home', label: t('tabs.home'), icon: '🏠' },
    { id: 'collection', label: t('tabs.collection'), icon: '🥚' },
    { id: 'missions', label: t('tabs.missions'), icon: '📋' },
    { id: 'friends', label: t('tabs.friends'), icon: '👥' },
    { id: 'battle', label: t('tabs.battle'), icon: '⚔️' },
    { id: 'chat', label: t('tabs.chat'), icon: '💬' },
    { id: 'settings', label: t('tabs.settings'), icon: '⚙️' }
  ]

  return (
    <div className="app pixel-hub">
      <header className="header">
        <div>
          <h1>
            {t('app.title')}
            {variant === 'web' ? ` - ${t('app.webSuffix')}` : ''}
          </h1>
          <span className="header-sub">
            {session.user.email} · {tabSyncing ? t('app.syncing') : t('app.autoSync')}
          </span>
        </div>
        <LanguageSwitcher variant="pixel" />
      </header>

      <nav className="tabs">
        {tabs.map((tTab) => (
          <button
            key={tTab.id}
            className={`tab ${tab === tTab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tTab.id)}
            disabled={tabSyncing}
          >
            <span className="tab-icon">{tTab.icon}</span>
            {tTab.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {tab === 'home' && <HomeDashboard save={save} onUpdated={refresh} />}
        {tab === 'collection' && (
          <PetCollection save={save} onUpdated={refresh} onSelect={() => setTab('home')} />
        )}
        {tab === 'missions' && <Missions save={save} onUpdated={refresh} />}
        {tab === 'friends' && (
          <Friends
            key="friends"
            onViewProfile={handleViewProfile}
          />
        )}
        {tab === 'battle' && <BattleHub save={save} variant={variant} />}
        {tab === 'chat' && <Chat key="chat" />}
        {tab === 'profile' && <UserProfile key={`profile-${viewUserId ?? 'self'}`} userId={viewUserId} />}
        {tab === 'settings' && (
          <AuthPanel
            save={save}
            onSynced={refresh}
            cloudReady={cloudReady}
            onLogout={handleLogout}
            onDataReset={handleDataReset}
          />
        )}
      </main>
    </div>
  )
}
