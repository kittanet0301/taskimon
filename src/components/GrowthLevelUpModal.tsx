import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PetData } from '../shared/types'
import { GROWTH_CARDS, type GrowthCard } from '../shared/combatStats'

interface Props {
  pet: PetData
  busy?: boolean
  onClose: () => void
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

/** Popup to claim a pending Growth Card after level-up. */
export function GrowthLevelUpModal({ pet, busy = false, onClose, onPickGrowthCard }: Props) {
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

  if (cards.length === 0) return null

  const remainingGroups = Math.ceil(pending.length / 3)

  return (
    <div
      className="hub-modal-overlay growth-levelup-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="hub-modal card growth-levelup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hub-modal-head">
          <h2>{t('growth.pickTitle')}</h2>
          <button
            type="button"
            className="hub-modal-close"
            onClick={onClose}
            aria-label={t('common.cancel')}
          >
            ×
          </button>
        </div>
        <p className="pet-profile-hint">{t('growth.pickHint')}</p>
        {pet.skillUpgradePoints > 0 && (
          <p className="growth-levelup-skill-note">
            {t('skills.upgradePointsLeft', { count: pet.skillUpgradePoints })}
          </p>
        )}
        {remainingGroups > 1 && (
          <p className="pet-profile-hint">{t('growth.pendingLevels', { count: remainingGroups })}</p>
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
      </div>
    </div>
  )
}
