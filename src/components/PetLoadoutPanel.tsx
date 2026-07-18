import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PetData } from '../shared/types'
import { GROWTH_CARDS, type GrowthCard } from '../shared/combatStats'
import { getSkillDef, SKILL_RANK_MAX } from '../shared/battle/skillTrees'

interface Props {
  pet: PetData
  forgetCount?: number
  busy?: boolean
  onUpgradeSkill: (slotIndex: number) => void | Promise<void>
  onForgetSkill?: (slotIndex: number) => void | Promise<void>
  onPickGrowthCard: (cardId: string) => void | Promise<void>
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

/** Skills grid + level-up rewards (growth cards / skill points) for pet detail UIs. */
export function PetLoadoutPanel({
  pet,
  forgetCount = 0,
  busy = false,
  onUpgradeSkill,
  onForgetSkill,
  onPickGrowthCard
}: Props) {
  const { t } = useTranslation()
  const [forgetIndex, setForgetIndex] = useState<number | null>(null)

  const pendingOffers = pet.pendingGrowthOffers ?? []
  const activeOfferCards = useMemo(
    () =>
      pendingOffers
        .slice(0, 3)
        .map((id) => GROWTH_CARDS.find((c) => c.id === id))
        .filter((c): c is GrowthCard => Boolean(c)),
    [pendingOffers]
  )

  if (pet.stage === 'egg') {
    return (
      <section className="pet-loadout-panel" aria-label={t('battle.skillMenu')}>
        <div className="pet-loadout-levelup">
          <strong>{t('growth.levelUpTitle')}</strong>
          <p>{t('growth.levelUpBody')}</p>
        </div>
        <p className="pet-profile-hint">{t('skills.eggNoSkills')}</p>
      </section>
    )
  }

  const slots = pet.skillLoadout?.slots ?? []

  return (
    <section className="pet-loadout-panel" aria-label={t('battle.skillMenu')}>
      <div className="pet-loadout-levelup">
        <strong>{t('growth.levelUpTitle')}</strong>
        <p>{t('growth.levelUpBody')}</p>
        <ul className="pet-loadout-levelup-list">
          <li>{t('growth.levelUpCard')}</li>
          <li>{t('growth.levelUpSkillPoint')}</li>
        </ul>
        {pet.skillUpgradePoints > 0 && (
          <span className="pet-profile-skill-points">
            {t('skills.upgradePointsLeft', { count: pet.skillUpgradePoints })}
          </span>
        )}
      </div>

      {activeOfferCards.length > 0 && (
        <div className="pet-loadout-growth">
          <strong>{t('growth.pickTitle')}</strong>
          <p className="pet-profile-hint">{t('growth.pickHint')}</p>
          <div className="growth-card-grid">
            {activeOfferCards.map((card) => (
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
        </div>
      )}

      <div className="pet-profile-skills-head">
        <strong>{t('battle.skillMenu')}</strong>
      </div>

      {slots.length === 0 ? (
        <p className="pet-profile-hint">{t('battle.noSkills')}</p>
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
                    {t(`elements.${slot.element}`)} · {t('skills.rankLabel', { rank: slot.rank, max: SKILL_RANK_MAX })}
                  </span>
                </div>
                <div className="pet-profile-skill-actions">
                  <button
                    type="button"
                    className="secondary"
                    disabled={!canUp || busy}
                    onClick={() => void onUpgradeSkill(i)}
                    title={t('skills.upgrade')}
                  >
                    {t('skills.upgrade')}
                  </button>
                  {forgetCount > 0 && onForgetSkill && (
                    <button
                      type="button"
                      className="danger-btn"
                      disabled={busy}
                      onClick={() => setForgetIndex(i)}
                      title={t('skills.forget')}
                    >
                      {t('skills.forget')}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {forgetIndex !== null && slots[forgetIndex] && (
        <div
          className="hub-modal-overlay pet-loadout-confirm"
          role="dialog"
          aria-modal="true"
          onClick={() => setForgetIndex(null)}
        >
          <div className="hub-modal card" onClick={(e) => e.stopPropagation()}>
            <div className="hub-modal-head">
              <h2>{t('skills.forgetConfirmTitle')}</h2>
              <button
                type="button"
                className="hub-modal-close"
                onClick={() => setForgetIndex(null)}
                aria-label={t('common.cancel')}
              >
                ×
              </button>
            </div>
            <p>
              {t('skills.forgetConfirmBody', {
                skill: t(`skills.${slots[forgetIndex]!.pathId}`, {
                  defaultValue: slots[forgetIndex]!.pathId
                })
              })}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="secondary" onClick={() => setForgetIndex(null)}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="danger-btn"
                disabled={busy}
                onClick={() => {
                  const idx = forgetIndex
                  setForgetIndex(null)
                  if (idx != null) void onForgetSkill?.(idx)
                }}
              >
                {t('skills.forget')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
