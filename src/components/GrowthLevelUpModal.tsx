import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PetData } from '../shared/types'
import { GROWTH_CARDS, type GrowthCard } from '../shared/combatStats'
import { getSkillDef, SKILL_RANK_MAX } from '../shared/battle/skillTrees'

interface Props {
  pet: PetData
  busy?: boolean
  onClose: () => void
  onPickGrowthCard: (cardId: string) => void | Promise<void>
  onUpgradeSkill: (slotIndex: number) => void | Promise<void>
}

function formatDelta(card: GrowthCard): string {
  const parts: string[] = []
  const d = card.deltas
  if (d.str) parts.push(`STR +${d.str}`)
  if (d.dex) parts.push(`DEX +${d.dex}`)
  if (d.int) parts.push(`INT +${d.int}`)
  if (d.con) parts.push(`CON +${d.con}`)
  return parts.join(' · ')
}

/** Level-up popup: Growth Card pick (1 of 3) + skill list with Upgrade. */
export function GrowthLevelUpModal({
  pet,
  busy = false,
  onClose,
  onPickGrowthCard,
  onUpgradeSkill
}: Props) {
  const { t } = useTranslation()
  const pending = pet.pendingGrowthOffers ?? []
  const cards = useMemo(
    () =>
      pending
        .slice(0, 3)
        .map((id) => GROWTH_CARDS.find((c) => c.id === id))
        .filter((c): c is GrowthCard => Boolean(c)),
    [pending]
  )
  const slots = pet.skillLoadout?.slots ?? []
  const remainingGroups = Math.ceil(pending.length / 3)

  if (cards.length === 0 && slots.length === 0 && pet.skillUpgradePoints <= 0) {
    return null
  }

  return (
    <div
      className="hub-modal-overlay growth-levelup-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="hub-modal card growth-levelup-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="hub-modal-close growth-levelup-close"
          onClick={onClose}
          aria-label={t('common.cancel')}
        >
          ×
        </button>

        {cards.length > 0 ? (
          <section className="rpg-growth-box" aria-label={t('growth.pickTitle')}>
            <h2 className="rpg-growth-title">{t('growth.pickTitle')}</h2>
            <p className="rpg-growth-hint">{t('growth.pickHint')}</p>
            {remainingGroups > 1 && (
              <p className="rpg-growth-hint">{t('growth.pendingLevels', { count: remainingGroups })}</p>
            )}
            <div className="growth-card-grid">
              {cards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className="growth-card"
                  disabled={busy}
                  onClick={() => void onPickGrowthCard(card.id)}
                >
                  <strong>{t(`growth.${card.id}`)}</strong>
                  <span>{formatDelta(card)}</span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="rpg-growth-box rpg-growth-box--claimed">
            <h2 className="rpg-growth-title">{t('growth.pickTitle')}</h2>
            <p className="rpg-growth-hint">{t('growth.cardClaimedHint')}</p>
          </section>
        )}

        <section className="growth-levelup-skills" aria-label={t('battle.skillMenu')}>
          <div className="pet-profile-skills-head">
            <strong>{t('battle.skillMenu')}</strong>
            {pet.skillUpgradePoints > 0 && (
              <span className="pet-profile-skill-points">
                {t('skills.upgradePointsLeft', { count: pet.skillUpgradePoints })}
              </span>
            )}
          </div>

          {pet.stage === 'egg' || slots.length === 0 ? (
            <p className="rpg-growth-hint">{t('skills.eggNoSkills')}</p>
          ) : (
            <ul className="pet-profile-skill-list">
              {slots.map((slot, i) => {
                const def = getSkillDef(slot.pathId)
                const canUp = pet.skillUpgradePoints > 0 && slot.rank < SKILL_RANK_MAX
                return (
                  <li key={`${slot.pathId}-${i}`} className="pet-profile-skill">
                    <div className="pet-profile-skill-info">
                      <strong>
                        {t(`skills.${slot.pathId}`, { defaultValue: def?.pathId ?? slot.pathId })}
                      </strong>
                      <span>
                        {slot.kind === 'ultimate' ? t('battle.ultimate') : t('battle.skillMenu')} ·{' '}
                        {t(`elements.${slot.element}`)} ·{' '}
                        {t('skills.rankLabel', { rank: slot.rank, max: SKILL_RANK_MAX })}
                      </span>
                    </div>
                    <div className="pet-profile-skill-actions">
                      <button
                        type="button"
                        className="secondary rpg-upgrade-btn"
                        disabled={!canUp || busy}
                        onClick={() => void onUpgradeSkill(i)}
                      >
                        {t('skills.upgrade')}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
