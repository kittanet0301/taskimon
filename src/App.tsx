import { useCallback, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave } from './shared/types'
import { getActivityScore, isOnboardingComplete, ONBOARDING_KEY } from './shared/activityScore'
import { countHatchableEggs } from './shared/petCollection'
import './i18n'
import { GetStarted } from './hub/GetStarted'
import { LoginGate } from './hub/LoginGate'
import { TitleScreen } from './hub/TitleScreen'
import { PixelCoverShell } from './hub/PixelCoverShell'
import { HomeDashboard } from './hub/HomeDashboard'
import { AuthPanel } from './hub/AuthPanel'
import { Community } from './hub/Community'
import { BattleProvider, BattleContext } from './hub/battle/BattleContext'
import { BattleHub } from './hub/battle/BattleHub'
import { useBattleGuard } from './hub/battle/useBattleGuard'
import { UserProfile } from './hub/UserProfile'
import { PetCollection } from './hub/PetCollection'
import { ChangePasswordForm } from './hub/ChangePasswordForm'
import { LanguageSwitcher } from './hub/LanguageSwitcher'
import { MiniGameHub } from './hub/minigame/MiniGameHub'
import { HubSidebar, type HubSidebarTarget } from './hub/HubSidebar'
import { HubTopBar } from './hub/HubTopBar'
import { Inventory } from './hub/Inventory'

type MainView = 'home' | 'battle'

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
  const [mainView, setMainView] = useState<MainView>('home')
  const [cloudReady, setCloudReady] = useState(false)
  const [viewUserId, setViewUserId] = useState<string | null>(null)
  const [showInventory, setShowInventory] = useState(false)
  const [showCollection, setShowCollection] = useState(false)
  const [showCommunity, setShowCommunity] = useState(false)
  const [showMinigame, setShowMinigame] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [pendingGiftCount, setPendingGiftCount] = useState(0)
  const [pendingFriendCount, setPendingFriendCount] = useState(0)
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

  const refreshPendingGifts = useCallback(async () => {
    if (!window.electronAPI?.listPendingGifts) return
    try {
      const rows = await window.electronAPI.listPendingGifts()
      setPendingGiftCount(rows.length)
    } catch {
      // keep last known count; gift API may be briefly unavailable
    }
  }, [])

  const refreshPendingFriends = useCallback(async (userId?: string) => {
    const id = userId ?? session?.user?.id
    if (!window.electronAPI?.listPending || !id) {
      setPendingFriendCount(0)
      return
    }
    try {
      const rows = (await window.electronAPI.listPending(id)) as unknown[]
      setPendingFriendCount(rows.length)
    } catch {
      // keep last known count
    }
  }, [session?.user?.id])

  const syncOnTabChange = useCallback(async () => {
    if (!window.electronAPI) return
    // Pull first — never push stale local inventory over gifts sitting on the server.
    await window.electronAPI.reloadFromCloud()
    await refresh()
  }, [refresh])

  const pushThenPull = useCallback(async () => {
    if (!window.electronAPI) return
    await window.electronAPI.forceCloudSave()
    await window.electronAPI.reloadFromCloud()
    await refresh()
  }, [refresh])

  const [tabSyncing, setTabSyncing] = useState(false)

  const handleMainViewChange = useCallback(
    async (nextView: MainView) => {
      if (nextView === mainView || tabSyncing) return
      if (mainView === 'battle' && nextView !== 'battle' && isInRoom) {
        const ok = await confirmLeave()
        if (!ok) return
      }
      setTabSyncing(true)
      try {
        // Leaving/entering battle may have local progress worth pushing first.
        await pushThenPull()
        setMainView(nextView)
      } catch (e) {
        console.error('[view] sync failed:', e)
        setMainView(nextView)
      } finally {
        setTabSyncing(false)
      }
    },
    [mainView, tabSyncing, pushThenPull, isInRoom, confirmLeave]
  )

  const openPopup = useCallback(
    async (setter: (visible: boolean) => void) => {
      if (tabSyncing) return
      setTabSyncing(true)
      try {
        await syncOnTabChange()
        await refreshPendingGifts()
        await refreshPendingFriends()
      } catch (e) {
        console.error('[popup] sync failed:', e)
      } finally {
        setTabSyncing(false)
      }
      setter(true)
    },
    [tabSyncing, syncOnTabChange, refreshPendingGifts, refreshPendingFriends]
  )

  const goToProfile = useCallback(
    async (userId: string) => {
      if (tabSyncing) return
      setShowCommunity(false)
      setTabSyncing(true)
      try {
        await syncOnTabChange()
      } catch (e) {
        console.error('[profile] sync failed:', e)
      } finally {
        setTabSyncing(false)
      }
      setViewUserId(userId)
    },
    [tabSyncing, syncOnTabChange]
  )

  const handleViewProfile = useCallback((userId: string) => goToProfile(userId), [goToProfile])

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
      await refreshPendingGifts()
      await refreshPendingFriends(s.user.id)
    } else {
      setProfile(null)
      setPendingGiftCount(0)
      setPendingFriendCount(0)
    }
  }, [refresh, refreshPendingGifts, refreshPendingFriends])

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
    void refreshPendingGifts()
    void refreshPendingFriends()
    const id = setInterval(() => {
      refresh()
      void refreshPendingGifts()
      void refreshPendingFriends()
    }, 60_000)
    return () => clearInterval(id)
  }, [session, showCover, refresh, refreshPendingGifts, refreshPendingFriends])

  useEffect(() => {
    if (!window.electronAPI) return
    const onFocus = () => {
      void refreshPendingGifts()
      void refreshPendingFriends()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshPendingGifts, refreshPendingFriends])

  const handleGetStarted = () => {
    localStorage.setItem(ONBOARDING_KEY, '1')
    setShowCover(false)
  }

  const closeAllPopups = () => {
    setShowInventory(false)
    setShowCollection(false)
    setShowCommunity(false)
    setShowMinigame(false)
    setShowSettings(false)
    setViewUserId(null)
  }

  const handleLogout = () => {
    setSession(null)
    setProfile(null)
    setPendingGiftCount(0)
    setPendingFriendCount(0)
    setShowTitle(true)
    closeAllPopups()
    refresh()
  }

  const handleDataReset = () => {
    localStorage.removeItem(ONBOARDING_KEY)
    setShowCover(true)
    setMainView('home')
    closeAllPopups()
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

  const displayName =
    profile?.username ?? session?.user?.email?.split('@')[0] ?? ''

  const sidebarTarget: HubSidebarTarget | null = showCollection
    ? 'collection'
    : showInventory
      ? 'inventory'
      : showCommunity
        ? 'community'
        : showMinigame
          ? 'minigame'
          : showSettings
            ? 'settings'
            : mainView === 'battle'
              ? 'battle'
              : null

  const handleSidebarNavigate = (target: HubSidebarTarget) => {
    if (target === 'battle') {
      void handleMainViewChange('battle')
      return
    }
    if (target === 'inventory') {
      void openPopup(setShowInventory)
      return
    }
    if (target === 'collection') {
      void openPopup(setShowCollection)
      return
    }
    if (target === 'community') {
      void openPopup(setShowCommunity)
      return
    }
    if (target === 'minigame') {
      void openPopup(setShowMinigame)
      return
    }
    if (target === 'settings') {
      void openPopup(setShowSettings)
      return
    }
  }

  return (
    <div className={`app pixel-hub hub-shell${mainView === 'home' ? ' hub-shell--home' : ''}`}>
      <HubSidebar
        activeTarget={sidebarTarget}
        displayName={displayName}
        disabled={tabSyncing}
        badges={{
          inventory: pendingGiftCount,
          collection: save ? countHatchableEggs(save) : 0,
          community: pendingFriendCount
        }}
        onNavigate={handleSidebarNavigate}
      />

      <div className="hub-main">
        <HubTopBar
          gems={save.gems ?? 0}
          clicks={save.activity.clicks}
          keystrokes={save.activity.keystrokes}
          activityScore={getActivityScore(save.activity)}
          syncing={tabSyncing}
        >
          <LanguageSwitcher variant="pixel" />
        </HubTopBar>

        <main className={`hub-content${mainView === 'home' ? ' hub-content--home' : ' hub-content--panel'}`}>
          {mainView === 'home' && (
            <HomeDashboard save={save} syncing={tabSyncing} onUpdated={refresh} />
          )}
          {mainView === 'battle' && (
            <>
              <button
                type="button"
                className="hub-back-btn"
                onClick={() => void handleMainViewChange('home')}
                disabled={tabSyncing}
              >
                ‹ {t('tabs.home')}
              </button>
              <BattleHub save={save} variant={variant} onUpdated={refresh} />
            </>
          )}
        </main>
      </div>

      {showInventory && (
        <Inventory
          save={save}
          onClose={() => {
            setShowInventory(false)
            void refreshPendingGifts()
          }}
          onUpdated={async () => {
            await refresh()
            await refreshPendingGifts()
          }}
        />
      )}
      {showCollection && (
        <PetCollection
          save={save}
          onUpdated={refresh}
          onSelect={() => setShowCollection(false)}
          onClose={() => setShowCollection(false)}
        />
      )}
      {showCommunity && (
        <Community
          key="community"
          onViewProfile={handleViewProfile}
          onPendingChange={() => {
            void refreshPendingFriends()
          }}
          onClose={() => {
            setShowCommunity(false)
            void refreshPendingFriends()
          }}
        />
      )}
      {showMinigame && (
        <MiniGameHub save={save} onUpdated={refresh} onClose={() => setShowMinigame(false)} />
      )}
      {showSettings && (
        <AuthPanel
          save={save}
          onSynced={refresh}
          cloudReady={cloudReady}
          onLogout={handleLogout}
          onDataReset={handleDataReset}
          onClose={() => setShowSettings(false)}
        />
      )}
      {viewUserId && (
        <UserProfile
          key={`profile-${viewUserId}`}
          userId={viewUserId}
          save={save}
          onUpdated={refresh}
          onClose={() => setViewUserId(null)}
        />
      )}
    </div>
  )
}
