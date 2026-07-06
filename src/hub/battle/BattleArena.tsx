import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BattleActionType, BattleSession } from '../../shared/battle/types'
import type { BattleTurn } from '../../shared/battle/types'
import { ULTIMATE_ENERGY_MAX } from '../../shared/battle/constants'

interface Props {
  session: BattleSession
  turns: BattleTurn[]
  userId: string
  challengerName?: string
  defenderName?: string
  onAction: (action: BattleActionType) => Promise<void>
}

function HpBar({ label, hp, hpStart, color }: { label: string; hp: number; hpStart: number; color: string }) {
  const pct = hpStart > 0 ? Math.max(0, Math.min(100, (hp / hpStart) * 100)) : 0
  return (
    <div className="hp-bar">
      <div className="hp-bar-label">
        <span>{label}</span>
        <span>{hp} / {hpStart}</span>
      </div>
      <div className="hp-bar-track">
        <div className="hp-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function EnergyBar({ energy }: { energy: number }) {
  const { t } = useTranslation()
  const pct = Math.max(0, Math.min(100, energy))
  const ready = pct >= ULTIMATE_ENERGY_MAX
  return (
    <div className="energy-bar">
      <div className="hp-bar-label">
        <span>{t('battle.ultimateEnergy')}</span>
        <span>{pct}% {ready ? `· ${t('battle.ultimateReady')}` : ''}</span>
      </div>
      <div className="hp-bar-track energy-bar-track">
        <div
          className={`hp-bar-fill energy-bar-fill ${ready ? 'ready' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function BattleArena({ session, turns, userId, challengerName, defenderName, onAction }: Props) {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)
  const isChallenger = session.challengerUserId === userId
  const myTurn = session.turnUserId === userId && session.status === 'active'
  const myEnergy = isChallenger ? session.challengerEnergy : session.defenderEnergy
  const ultimateReady = myEnergy >= ULTIMATE_ENERGY_MAX

  const act = async (action: BattleActionType) => {
    if (!myTurn || submitting) return
    if (action === 'ultimate' && !ultimateReady) return
    setSubmitting(true)
    try {
      await onAction(action)
    } finally {
      setSubmitting(false)
    }
  }

  const statusLabel =
    session.status === 'active'
      ? myTurn
        ? t('battle.statusYourTurn')
        : t('battle.statusWaitingOpponent')
      : session.status === 'completed'
        ? t('battle.statusCompleted')
        : session.status === 'fled'
          ? t('battle.statusFled')
          : session.status

  return (
    <div className="battle-arena card">
      <h3>{t('battle.arenaTitle')}</h3>
      <p><strong>{statusLabel}</strong></p>

      <HpBar
        label={challengerName ?? t('battle.challenger')}
        hp={session.challengerHp}
        hpStart={session.challengerHpStart}
        color="#6366f1"
      />
      <HpBar
        label={defenderName ?? t('battle.defender')}
        hp={session.defenderHp}
        hpStart={session.defenderHpStart}
        color="#ef4444"
      />

      {session.status === 'active' && (
        <>
          <EnergyBar energy={myEnergy} />
          <div className="battle-actions">
            <button type="button" className="primary" disabled={!myTurn || submitting} onClick={() => void act('attack')}>
              {t('battle.attack')}
            </button>
            <button
              type="button"
              className={`primary ${ultimateReady ? 'ultimate-ready' : ''}`}
              disabled={!myTurn || submitting || !ultimateReady}
              onClick={() => void act('ultimate')}
              title={
                ultimateReady
                  ? t('battle.ultimate')
                  : t('battle.ultimateNeedEnergy', { required: ULTIMATE_ENERGY_MAX, current: myEnergy })
              }
            >
              {t('battle.ultimate')}
            </button>
            <button type="button" className="secondary" disabled={!myTurn || submitting} onClick={() => void act('defend')}>
              {t('battle.defend')}
            </button>
            <button type="button" className="secondary" disabled={!myTurn || submitting} onClick={() => void act('flee')}>
              {t('battle.flee')}
            </button>
          </div>
          {!ultimateReady && myTurn && (
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
              {t('battle.ultimateHint')}
            </p>
          )}
        </>
      )}

      {turns.length > 0 && (
        <div className="battle-log" style={{ marginTop: 12 }}>
          {turns.map((t) => (
            <div key={t.id}>{t.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
