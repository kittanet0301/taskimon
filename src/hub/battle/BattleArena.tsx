import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BattleCommand, BattleSession, BattleTurn } from '../../shared/battle/types'
import { TP_MAX } from '../../shared/battle/constants'
import type { PetData } from '../../shared/types'
import { DinoSprite } from '../../components/DinoSprite'
import { getSkillDef } from '../../shared/battle/skillTrees'
import { deriveCombatStats } from '../../shared/combatStats'

type MenuView = 'commands' | 'skills' | 'items'

interface Props {
  session: BattleSession
  turns: BattleTurn[]
  userId: string
  challengerName?: string
  defenderName?: string
  challengerPet?: PetData | null
  defenderPet?: PetData | null
  shieldCount?: number
  onAction: (command: BattleCommand, extra?: { skillId?: string; itemType?: string }) => Promise<void>
}

function ResourceBar({
  label,
  value,
  max,
  className
}: {
  label: string
  value: number
  max: number
  className: string
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className={`rpg-bar ${className}`}>
      <div className="rpg-bar-label">
        <span>{label}</span>
        <span>
          {value}/{max}
        </span>
      </div>
      <div className="rpg-bar-track">
        <div className="rpg-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ElementBadges({ pet }: { pet: PetData | null | undefined }) {
  if (!pet) return null
  return (
    <div className="rpg-elements" aria-hidden>
      <span className={`rpg-element rpg-element--${pet.elementPrimary}`}>{pet.elementPrimary}</span>
      {pet.elementSecondary && (
        <span className={`rpg-element rpg-element--${pet.elementSecondary}`}>
          {pet.elementSecondary}
        </span>
      )}
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
  const [menu, setMenu] = useState<MenuView>('commands')

  const isChallenger = session.challengerUserId === userId
  const myTurn = session.turnUserId === userId && session.status === 'active'
  const myPet = isChallenger ? challengerPet : defenderPet
  const oppPet = isChallenger ? defenderPet : challengerPet
  const myHp = isChallenger ? session.challengerHp : session.defenderHp
  const myHpStart = isChallenger ? session.challengerHpStart : session.defenderHpStart
  const oppHp = isChallenger ? session.defenderHp : session.challengerHp
  const oppHpStart = isChallenger ? session.defenderHpStart : session.challengerHpStart
  const myMp = isChallenger ? session.challengerMp : session.defenderMp
  const myTp = isChallenger ? session.challengerTp : session.defenderTp
  const myMpMax = myPet ? deriveCombatStats(myPet.primaries).maxMp : Math.max(myMp, 1)
  const loadout = myPet?.skillLoadout?.slots ?? []

  const turnOrder = useMemo(() => {
    const cDex = challengerPet?.primaries.dex ?? 0
    const dDex = defenderPet?.primaries.dex ?? 0
    const cFirst = cDex >= dDex
    return cFirst
      ? [
          { id: 'c', name: challengerName ?? t('battle.challenger'), active: session.turnUserId === session.challengerUserId },
          { id: 'd', name: defenderName ?? t('battle.defender'), active: session.turnUserId === session.defenderUserId }
        ]
      : [
          { id: 'd', name: defenderName ?? t('battle.defender'), active: session.turnUserId === session.defenderUserId },
          { id: 'c', name: challengerName ?? t('battle.challenger'), active: session.turnUserId === session.challengerUserId }
        ]
  }, [
    challengerPet,
    defenderPet,
    challengerName,
    defenderName,
    session.turnUserId,
    session.challengerUserId,
    session.defenderUserId,
    t
  ])

  const act = async (command: BattleCommand, extra?: { skillId?: string; itemType?: string }) => {
    if (!myTurn || submitting) return
    setSubmitting(true)
    try {
      await onAction(command, extra)
      setMenu('commands')
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
    <div className="battle-arena rpg-arena">
      <div className="rpg-top">
        <div className="rpg-status">
          <div className="rpg-status-head">
            <strong>{myPet?.name ?? (isChallenger ? challengerName : defenderName)}</strong>
            <ElementBadges pet={myPet} />
          </div>
          <ResourceBar label="HP" value={myHp} max={myHpStart || 1} className="rpg-bar--hp" />
          <ResourceBar label="MP" value={myMp} max={myMpMax || 1} className="rpg-bar--mp" />
          <ResourceBar label="TP" value={myTp} max={TP_MAX} className="rpg-bar--tp" />
        </div>
        <div className="rpg-turn-order" aria-label={t('battle.turnOrder')}>
          <span className="rpg-turn-label">{t('battle.turnOrder')}</span>
          <div className="rpg-turn-list">
            {turnOrder.map((entry) => (
              <span key={entry.id} className={`rpg-turn-chip${entry.active ? ' active' : ''}`}>
                {entry.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="rpg-status-line">
        <strong>{statusLabel}</strong>
      </p>

      <div className="battle-stage rpg-stage">
        <div className="battle-fighter">
          <div className="battle-fighter-sprite">
            {challengerPet ? (
              <DinoSprite pet={challengerPet} size={96} />
            ) : (
              <div className="battle-fighter-placeholder" aria-hidden />
            )}
            {session.challengerDefending && (
              <span className="battle-fighter-badge">{t('battle.defend')}</span>
            )}
          </div>
          <div className="rpg-mini-hp">
            {(challengerName ?? t('battle.challenger')) + ` ${session.challengerHp}/${session.challengerHpStart}`}
          </div>
        </div>
        <div className="battle-vs">VS</div>
        <div className="battle-fighter">
          <div className="battle-fighter-sprite battle-fighter-sprite--flip">
            {defenderPet ? (
              <DinoSprite pet={defenderPet} size={96} />
            ) : (
              <div className="battle-fighter-placeholder" aria-hidden />
            )}
            {session.defenderDefending && (
              <span className="battle-fighter-badge">{t('battle.defend')}</span>
            )}
          </div>
          <div className="rpg-mini-hp">
            {(defenderName ?? t('battle.defender')) + ` ${oppHp}/${oppHpStart}`}
          </div>
        </div>
      </div>

      {session.status === 'active' && (
        <div className="rpg-bottom">
          {menu === 'commands' && (
            <div className="rpg-commands">
              <button
                type="button"
                className="primary"
                disabled={!myTurn || submitting}
                onClick={() => void act('attack')}
              >
                {t('battle.attack')}
              </button>
              <button
                type="button"
                className="primary"
                disabled={!myTurn || submitting}
                onClick={() => setMenu('skills')}
              >
                {t('battle.skillMenu')}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={!myTurn || submitting}
                onClick={() => setMenu('items')}
              >
                {t('battle.itemMenu')}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={!myTurn || submitting}
                onClick={() => void act('defend')}
              >
                {t('battle.defend')}
              </button>
            </div>
          )}

          {menu === 'skills' && (
            <div className="rpg-submenu">
              <button type="button" className="secondary rpg-back" onClick={() => setMenu('commands')}>
                {t('battle.back')}
              </button>
              <div className="rpg-skill-grid">
                {loadout.map((slot) => {
                  const def = getSkillDef(slot.pathId)
                  const isUlt = slot.kind === 'ultimate'
                  const needTp = isUlt && myTp < TP_MAX
                  const needMp = !isUlt && def != null && myMp < def.mpCost
                  const label = t(`skills.${slot.pathId}`, {
                    defaultValue: slot.pathId.replace(/_/g, ' ')
                  })
                  return (
                    <button
                      key={`${slot.pathId}-${slot.kind}`}
                      type="button"
                      className={isUlt ? 'primary ultimate-ready-btn' : 'primary'}
                      disabled={!myTurn || submitting || needTp || needMp}
                      title={
                        isUlt
                          ? t('battle.ultimateNeedEnergy', { required: TP_MAX, current: myTp })
                          : def
                            ? `MP ${def.mpCost} · Lv${slot.rank}`
                            : undefined
                      }
                      onClick={() => void act('skill', { skillId: slot.pathId })}
                    >
                      {label}
                      {isUlt ? ' ★' : ''}
                    </button>
                  )
                })}
                {loadout.length === 0 && (
                  <p className="rpg-hint">{t('battle.noSkills')}</p>
                )}
              </div>
            </div>
          )}

          {menu === 'items' && (
            <div className="rpg-submenu">
              <button type="button" className="secondary rpg-back" onClick={() => setMenu('commands')}>
                {t('battle.back')}
              </button>
              <div className="rpg-skill-grid">
                <button
                  type="button"
                  className="secondary"
                  disabled={!myTurn || submitting || shieldCount <= 0}
                  onClick={() => void act('item', { itemType: 'battle_shield' })}
                >
                  {t('items.battle_shield.label')} ×{shieldCount}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {turns.length > 0 && (
        <div className="battle-log rpg-log">
          {turns.map((turn) => (
            <div key={turn.id}>{turn.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
