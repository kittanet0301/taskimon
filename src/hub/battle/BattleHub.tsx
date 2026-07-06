import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave } from '../../shared/types'
import type { BattleActionType, BattleSession } from '../../shared/battle/types'
import { mapBattleSession, mapBattleTurn } from '../../shared/battle/mappers'
import { tCharacter } from '../../i18n/labels'
import { BattleContext } from './BattleContext'
import { RoomLobby } from './RoomLobby'
import { BattleRoom } from './BattleRoom'
import { BattleArena } from './BattleArena'
import { BattleHistory } from './BattleHistory'
import { BattleEndModal } from './BattleEndModal'
import { useBattleSession } from './useBattleSession'
import { useBattleGuard } from './useBattleGuard'

type HubTab = 'room' | 'active' | 'history'

interface EndedBattle {
  session: BattleSession
  turns: ReturnType<typeof mapBattleTurn>[]
}

interface Props {
  save: GameSave
  variant?: 'desktop' | 'web'
}

export function BattleHub({ save, variant = 'desktop' }: Props) {
  const { t } = useTranslation()
  const ctx = useContext(BattleContext)
  const { isInRoom } = useBattleGuard()
  const [hubTab, setHubTab] = useState<HubTab>('room')
  const [endedBattle, setEndedBattle] = useState<EndedBattle | null>(null)
  const handledEndRef = useRef<string | null>(null)
  const dismissedEndRef = useRef<Set<string>>(new Set())
  const userId = ctx?.userId ?? null
  const sessionId = ctx?.activeSessionId ?? null
  const { session, turns, reload } = useBattleSession(userId, sessionId)

  const goToActiveBattle = useCallback(async () => {
    if (!ctx?.roomId) {
      setHubTab('active')
      return
    }
    const battles = (await window.electronAPI.listBattles()) as Record<string, unknown>[]
    const active = battles.find(
      (b) => String(b.room_id) === ctx.roomId && b.status === 'active'
    )
    if (active) {
      ctx.setActiveSessionId(String(active.id))
      ctx.setMemberStatus('in_battle')
      setHubTab('active')
      return
    }
    ctx.setMemberStatus('waiting')
    setHubTab('active')
  }, [ctx])

  const refreshMemberStatus = useCallback(async () => {
    if (!ctx?.roomId || !userId) return
    try {
      const memberRows = (await window.electronAPI.getRoomMembers(ctx.roomId)) as Record<
        string,
        unknown
      >[]
      const me = memberRows.find((m) => String(m.user_id) === userId)
      if (me) {
        ctx.setMemberStatus(me.status as 'waiting' | 'in_battle' | 'left')
      }
    } catch {
      /* optional */
    }
  }, [ctx, userId])

  const discoverRoomSession = useCallback(async () => {
    if (!ctx?.roomId || ctx.activeSessionId) return
    const battles = (await window.electronAPI.listBattles()) as Record<string, unknown>[]
    const active = battles.find(
      (b) => String(b.room_id) === ctx.roomId && b.status === 'active'
    )
    if (active) {
      ctx.setActiveSessionId(String(active.id))
      setHubTab('active')
    }
  }, [ctx])

  const handleBattleEnd = useCallback(
    async (endedSession: BattleSession) => {
      if (
        handledEndRef.current === endedSession.id ||
        dismissedEndRef.current.has(endedSession.id)
      ) {
        return
      }
      handledEndRef.current = endedSession.id

      ctx?.setActiveSessionId(null)
      ctx?.setMemberStatus('waiting')
      setHubTab('room')
      void refreshMemberStatus()

      try {
        const turnRows = (await window.electronAPI.getBattleTurns(endedSession.id)) as Record<
          string,
          unknown
        >[]
        setEndedBattle({
          session: endedSession,
          turns: turnRows.map(mapBattleTurn)
        })
      } catch {
        setEndedBattle({ session: endedSession, turns: [] })
      }
    },
    [ctx, refreshMemberStatus]
  )

  useEffect(() => {
    if (!userId) return
    void window.electronAPI.subscribeBattles(userId)

    return window.electronAPI.onBattleUpdate((payload) => {
      const row = (payload as { new?: Record<string, unknown> })?.new
      if (!row) return
      const mapped = mapBattleSession(row)
      if (mapped.status === 'active') {
        ctx?.setActiveSessionId(mapped.id)
        if (mapped.roomId) {
          ctx?.setRoomId(mapped.roomId)
          ctx?.setMemberStatus('in_battle')
        }
        setHubTab('active')
      }
      if (['completed', 'fled'].includes(mapped.status)) {
        if (
          !dismissedEndRef.current.has(mapped.id) &&
          (ctx?.activeSessionId === mapped.id || sessionId === mapped.id)
        ) {
          void handleBattleEnd(mapped)
        }
      } else {
        void reload()
      }
    })
  }, [userId, ctx, reload, sessionId, handleBattleEnd])

  useEffect(() => {
    if (!session || !userId || !sessionId) return
    if (!['completed', 'fled'].includes(session.status)) return
    void handleBattleEnd(session)
  }, [session, sessionId, userId, handleBattleEnd])

  useEffect(() => {
    if (ctx?.memberStatus === 'in_battle' && sessionId) {
      setHubTab('active')
    }
  }, [ctx?.memberStatus, sessionId])

  useEffect(() => {
    if (ctx?.memberStatus !== 'in_battle' || ctx?.activeSessionId || !ctx?.roomId) return
    void discoverRoomSession()
    const id = setInterval(() => void discoverRoomSession(), 2500)
    return () => clearInterval(id)
  }, [ctx?.memberStatus, ctx?.activeSessionId, ctx?.roomId, discoverRoomSession])

  useEffect(() => {
    if (variant !== 'web' || !isInRoom || !ctx?.roomId) return

    const handler = () => {
      void window.electronAPI.forfeitBattleRoom(ctx.roomId!)
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [variant, isInRoom, ctx?.roomId])

  const submitAction = async (action: BattleActionType) => {
    if (!sessionId) return
    await window.electronAPI.submitBattleAction(sessionId, action)
    await reload()
  }

  const canBattle = save.pet && save.pet.stage !== 'egg' && save.pet.stats.hp >= 10

  const hubTabs: { id: HubTab; label: string }[] = [
    { id: 'room', label: t('battle.tabs.room') },
    { id: 'active', label: t('battle.tabs.active') },
    { id: 'history', label: t('battle.tabs.history') }
  ]

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <h2>{t('battle.title')}</h2>
        {!canBattle ? (
          <p>{t('pet.needRaiseBeforeBattleHp')}</p>
        ) : (
          <p>
            {t('pet.yourPet')}: {save.pet!.name} ({tCharacter(save.pet!.character)}) · HP {save.pet!.stats.hp}
          </p>
        )}
      </div>

      <div className="card battle-hub-panel">
        <nav className="battle-hub-tabs" aria-label={t('battle.title')}>
          {hubTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab ${hubTab === t.id ? 'active' : ''}`}
              onClick={() => setHubTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="battle-hub-body">
          {hubTab === 'room' && (
            <>
              {ctx?.roomId ? (
                <BattleRoom onDuelStarted={goToActiveBattle} />
              ) : (
                <RoomLobby />
              )}
            </>
          )}
          {hubTab === 'active' && (
            session && session.status === 'active' && userId ? (
              <BattleArena
                session={session}
                turns={turns}
                userId={userId}
                onAction={submitAction}
              />
            ) : (
              <div className="battle-active-empty">
                <p>{t('battle.activeNone')}</p>
                {ctx?.memberStatus === 'in_battle' && (
                  <button type="button" className="primary" onClick={() => void discoverRoomSession()}>
                    {t('battle.reloadBattle')}
                  </button>
                )}
              </div>
            )
          )}
          {hubTab === 'history' && <BattleHistory />}
        </div>
      </div>

      {endedBattle && userId && (
        <BattleEndModal
          session={endedBattle.session}
          turns={endedBattle.turns}
          userId={userId}
          onClose={() => {
            if (endedBattle) dismissedEndRef.current.add(endedBattle.session.id)
            setEndedBattle(null)
            ctx?.setMemberStatus('waiting')
            setHubTab('room')
            void refreshMemberStatus()
          }}
        />
      )}
    </div>
  )
}
