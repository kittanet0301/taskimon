import { useCallback, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave } from './shared/types'
import { isOnboardingComplete, ONBOARDING_KEY } from './shared/activityScore'
import './i18n'
import { GetStarted } from './hub/GetStarted'
import { LoginGate } from './hub/LoginGate'
import { TitleScreen } from './hub/TitleScreen'
import { PixelCoverShell } from './hub/PixelCoverShell'
import { HomeDashboard } from './hub/HomeDashboard'
import { Missions } from './hub/Missions'
import { AuthPanel } from './hub/AuthPanel'
import { Community } from './hub/Community'
import { BattleProvider, BattleContext } from './hub/battle/BattleContext'
import { BattleHub } from './hub/battle/BattleHub'
import { useBattleGuard } from './hub/battle/useBattleGuard'
import { UserProfile } from './hub/UserProfile'
import { PetCollection } from './hub/PetCollection'
import { LanguageSwitcher } from './hub/LanguageSwitcher'
import { ChangePasswordForm } from './hub/ChangePasswordForm'
import { MiniGameHub } from './hub/minigame/MiniGameHub'
import { MiniGameRanking } from './hub/minigame/MiniGameRanking'

type Tab = 'home' | 'collection' | 'missions' | 'community' | 'battle' | 'profile' | 'settings' | 'minigame' | 'ranking'

type Session = { user: { id: string; email?: string } } | null
type UserProfile = { username: string; friend_code: string }

interface Props {
  variant?: 'desktop' | 'web'
}

const PASSWORD_RECOVERY_FLAG = 'taskino-password-recovery'

function isPasswordRecoveryPending(): boolean {
  if (typeof window === 'undefined' || !window.sessionStorage) return false
  return window.sessionStorage.getItem(PASSWORD_RECOVERY_FLAG) === '1'
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
  const [showCover, setShowCover] = useState(() => !isOnboardingComplete())
  const [session, setSession] = useState<Session>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showTitle, setShowTitle] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(() => isPasswordRecoveryPending())

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
      try {
        const p = (await window.electronAPI.getProfile(s.user.id)) as UserProfile
        setProfile(p)
      } catch {
        setProfile(null)
      }
      await window.electronAPI.reloadFromCloud()
      await refresh()
    } else {
      setProfile(null)
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
    if (!window.electronAPI?.onHubOpened) return
    return window.electronAPI.onHubOpened(() => {
      setShowTitle(true)
    })
  }, [])

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
    setProfile(null)
    setShowTitle(true)
    refresh()
  }

  const handleDataReset = () => {
    localStorage.removeItem(ONBOARDING_KEY)
    setShowCover(true)
    setTab('home')
    refresh()
  }

  const finishPasswordRecovery = useCallback(() => {
    window.sessionStorage.removeItem(PASSWORD_RECOVERY_FLAG)
    setPasswordRecovery(false)
    setSession(null)
    setProfile(null)
    setShowTitle(false)
  }, [])

  if (!window.electronAPI) {
    return <div className="content">{t('common.connectingApp')}</div>
  }

  if (!save || authLoading) {
    return (
      <div className="title-screen-loading">
        <div className="title-screen-bg" aria-hidden />
        <div className="title-screen-loading-inner">
          <img className="title-screen-logo" src="/ui/taskino-logo.png" alt="TASKINO" draggable={false} />
          <p className="title-screen-loading-text">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (!cloudReady) {
    return (
      <PixelCoverShell tagline={t('app.supabaseRequiredSubtitle')} showLangSwitcher={false} centered>
        <p className="notice" style={{ textAlign: 'left', margin: 0 }}>
          {t('app.supabaseRequiredBody')}
        </p>
      </PixelCoverShell>
    )
  }

  if (!session?.user?.id) {
    if (showTitle) return <TitleScreen onContinue={() => setShowTitle(false)} />
    return <LoginGate onLoggedIn={checkSession} />
  }

  if (variant === 'web' && passwordRecovery) {
    return (
      <PixelCoverShell tagline={t('auth.passwordRecoveryTitle')} message={t('auth.passwordRecoveryHint')}>
        <ChangePasswordForm
          submitLabel={t('auth.passwordRecoverySubmit')}
          onSubmit={async (password) => {
            await window.electronAPI.updatePassword(password)
            await window.electronAPI.signOut()
            finishPasswordRecovery()
          }}
        />
      </PixelCoverShell>
    )
  }

  if (showCover) {
    return <GetStarted onStart={handleGetStarted} />
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'home', label: t('tabs.home'), icon: '🏠' },
    { id: 'collection', label: t('tabs.collection'), icon: '🥚' },
    { id: 'missions', label: t('tabs.missions'), icon: '📋' },
    { id: 'minigame', label: t('tabs.minigame'), icon: '🎮' },
    { id: 'ranking', label: t('tabs.ranking'), icon: '🏆' },
    { id: 'community', label: t('tabs.friends'), icon: '👥' },
    { id: 'battle', label: t('tabs.battle'), icon: '⚔️' },
    { id: 'settings', label: t('tabs.settings'), icon: '⚙️' }
  ]

  const displayName =
    profile?.username ?? session?.user?.email?.split('@')[0] ?? ''

  return (
    <div className={`app pixel-hub${tab === 'home' ? ' app--dash-full' : ''}`}>
      <header className="header">
        <div className="header-brand">
          <img
            src="/ui/taskino-logo.png"
            alt="TASKINO"
            className="hub-logo"
            draggable={false}
          />
          <div className="header-meta">
            <span className="header-username">{displayName}</span>
            <span className="header-sub">
              {tabSyncing ? t('app.syncing') : t('app.autoSync')}
            </span>
          </div>
        </div>
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
        <LanguageSwitcher variant="pixel" />
      </header>

      <main className={`content${tab === 'home' ? ' content--dash-full' : ''}`}>
        {tab === 'home' && (
          <HomeDashboard
            save={save}
            displayName={displayName}
            syncing={tabSyncing}
            onNavigate={handleTabChange}
            onUpdated={refresh}
          />
        )}
        {tab === 'collection' && (
          <PetCollection save={save} onUpdated={refresh} onSelect={() => setTab('home')} />
        )}
        {tab === 'missions' && <Missions save={save} onUpdated={refresh} />}
        {tab === 'minigame' && (
          <MiniGameHub
            save={save}
            onUpdated={refresh}
            onOpenRanking={() => void handleTabChange('ranking')}
          />
        )}
        {tab === 'ranking' && <MiniGameRanking />}
        {tab === 'community' && <Community key="community" onViewProfile={handleViewProfile} />}
        {tab === 'battle' && <BattleHub save={save} variant={variant} />}
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
