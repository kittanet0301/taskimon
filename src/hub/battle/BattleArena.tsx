import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BattleActionType, BattleSession } from '../../shared/battle/types'
import type { BattleTurn } from '../../shared/battle/types'
import { ULTIMATE_ENERGY_MAX } from '../../shared/battle/constants'
import type { PetData } from '../../shared/types'
import { DinoSprite } from '../../components/DinoSprite'

interface Props {
  session: BattleSession
  turns: BattleTurn[]
  userId: string
  challengerName?: string
  defenderName?: string
  challengerPet?: PetData | null
  defenderPet?: PetData | null
  shieldCount?: number
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

function Fighter({
  name,
  pet,
  hp,
  hpStart,
  color,
  flip,
  defending,
  avoiding
}: {
  name: string
  pet: PetData | null | undefined
  hp: number
  hpStart: number
  color: string
  flip?: boolean
  defending?: boolean
  avoiding?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="battle-fighter">
      <div className={`battle-fighter-sprite${flip ? ' battle-fighter-sprite--flip' : ''}`}>
        {pet ? (
          <DinoSprite pet={pet} size={96} />
        ) : (
          <div className="battle-fighter-placeholder" aria-hidden />
        )}
        {defending && <span className="battle-fighter-badge battle-fighter-badge--shield">{t('battle.shield')}</span>}
        {avoiding && <span className="battle-fighter-badge battle-fighter-badge--avoid">{t('battle.avoid')}</span>}
      </div>
      <HpBar label={name} hp={hp} hpStart={hpStart} color={color} />
    </div>
  )
}

export function BattleArena({
  session,
  turns,
  userId,
  challengerName,
  defenderName,
  challengerPet,
  defenderPet,
  shieldCount = 0,
  onAction
}: Props) {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)
  const isChallenger = session.challengerUserId === userId
  const myTurn = session.turnUserId === userId && session.status === 'active'
  const myEnergy = isChallenger ? session.challengerEnergy : session.defenderEnergy
  const ultimateReady = myEnergy >= ULTIMATE_ENERGY_MAX
  const canShield = shieldCount > 0

  const act = async (action: BattleActionType) => {
    if (!myTurn || submitting) return
    if (action === 'ultimate' && !ultimateReady) return
    if (action === 'shield' && !canShield) return
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

  const actionButtons: Array<{
    action: BattleActionType
    labelKey: string
    hintKey: string
    className: string
    disabled?: boolean
    labelExtra?: string
  }> = [
    { action: 'bite', labelKey: 'battle.bite', hintKey: 'battle.biteHint', className: 'primary' },
    { action: 'jump', labelKey: 'battle.jump', hintKey: 'battle.jumpHint', className: 'primary' },
    { action: 'tailwhip', labelKey: 'battle.tailwhip', hintKey: 'battle.tailwhipHint', className: 'primary' },
    {
      action: 'shield',
      labelKey: 'battle.shield',
      hintKey: canShield ? 'battle.shieldHint' : 'battle.shieldNeedItem',
      className: 'secondary',
      disabled: !canShield,
      labelExtra: `×${shieldCount}`
    },
    { action: 'avoid', labelKey: 'battle.avoid', hintKey: 'battle.avoidHint', className: 'secondary' },
    {
      action: 'ultimate',
      labelKey: 'battle.ultimate',
      hintKey: 'battle.ultimateHint',
      className: `primary ultimate-ready-btn${ultimateReady ? ' ultimate-ready' : ''}`,
      disabled: !ultimateReady
    }
  ]

  return (
    <div className="battle-arena">
      <h3>{t('battle.arenaTitle')}</h3>
      <p><strong>{statusLabel}</strong></p>

      <div className="battle-stage">
        <Fighter
          name={challengerName ?? t('battle.challenger')}
          pet={challengerPet}
          hp={session.challengerHp}
          hpStart={session.challengerHpStart}
          color="var(--pixel-accent-dark)"
          defending={session.challengerDefending}
          avoiding={session.challengerAvoiding}
        />
        <div className="battle-vs">VS</div>
        <Fighter
          name={defenderName ?? t('battle.defender')}
          pet={defenderPet}
          hp={session.defenderHp}
          hpStart={session.defenderHpStart}
          color="#ef4444"
          flip
          defending={session.defenderDefending}
          avoiding={session.defenderAvoiding}
        />
      </div>

      {session.status === 'active' && (
        <>
          <EnergyBar energy={myEnergy} />
          <div className="battle-actions battle-actions--6">
            {actionButtons.map(({ action, labelKey, hintKey, className, disabled, labelExtra }) => (
              <button
                key={action}
                type="button"
                className={className}
                disabled={!myTurn || submitting || disabled}
                onClick={() => void act(action)}
                title={t(hintKey)}
              >
                {t(labelKey)}
                {labelExtra ? ` ${labelExtra}` : ''}
              </button>
            ))}
          </div>
          {!ultimateReady && myTurn && (
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
              {t('battle.ultimateHint')}
            </p>
          )}
          {!canShield && myTurn && (
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
              {t('battle.shieldNeedItem')}
            </p>
          )}
        </>
      )}

      {turns.length > 0 && (
        <div className="battle-log" style={{ marginTop: 12 }}>
          {turns.map((turn) => (
            <div key={turn.id}>{turn.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
