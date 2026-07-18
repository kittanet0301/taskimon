import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave, PetData } from '../shared/types'
import { petPreviewColor, DEV_POINTS_ADULT, ADULT_MIN_HOURS } from '../shared/constants'
import { displaySizeForPet } from '../shared/petSprites'
import { DinoSprite } from '../components/DinoSprite'
import { GenderTag } from '../components/GenderTag'
import { tCharacter, tStage } from '../i18n/labels'
import { canEvolveToAdult } from '../shared/stats'
import { GROWTH_CARDS, type GrowthCard } from '../shared/combatStats'
import { getSkillDef, SKILL_RANK_MAX } from '../shared/battle/skillTrees'
import { CombatStatCheck } from '../components/CombatStatCheck'

interface ProfileProps {
  save: Pick<GameSave, 'pet' | 'inventory'>
  onUpdated: () => void
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

export function PetProfile({ save, onUpdated }: ProfileProps) {
  const { t } = useTranslation()
  const pet = save.pet
  const [name, setName] = useState(pet?.name ?? '')
  const [forgetIndex, setForgetIndex] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const forgetInv = useMemo(
    () => save.inventory.find((i) => i.type === 'skill_forget')?.quantity ?? 0,
    [save.inventory]
  )

  if (!pet) return null

  const patch = async (mutator: string, args: unknown[] = []) => {
    if (busy) return
    setBusy(true)
    try {
      await window.electronAPI.patchGame(mutator, args)
      onUpdated()
    } finally {
      setBusy(false)
    }
  }

  const evolve = () => patch('evolve')
  const rename = () => patch('rename', [name])

  const pickGrowthCard = (cardId: string) => patch('applyGrowthCard', [pet.id, cardId])
  const upgradeSkill = (slotIndex: number) => patch('upgradeSkillRank', [pet.id, slotIndex])
  const forgetSkill = (slotIndex: number) => {
    setForgetIndex(null)
    return patch('forgetSkill', [pet.id, slotIndex])
  }

  const pendingOffers = pet.pendingGrowthOffers ?? []
  const activeOfferCards: GrowthCard[] = pendingOffers
    .slice(0, 3)
    .map((id) => GROWTH_CARDS.find((c) => c.id === id))
    .filter((c): c is GrowthCard => Boolean(c))

  return (
    <div className="card">
      <h2>{pet.name}</h2>
      <div
        className="pet-preview"
        style={{
          background: petPreviewColor(pet.character),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <DinoSprite pet={pet} size={displaySizeForPet(pet)} />
      </div>
      <p>
        {tCharacter(pet.character)} · <GenderTag gender={pet.gender} /> · {tStage(pet.stage)}
      </p>

      <div className="stat-row">
        <span>{t('home.health')}</span>
        <strong>{pet.stats.health}</strong>
      </div>
      <div className="bar">
        <span style={{ width: `${pet.stats.health}%` }} />
      </div>
      <div className="stat-row">
        <span>{t('home.emotion')}</span>
        <strong>{pet.stats.emotion}</strong>
      </div>
      <div className="bar">
        <span style={{ width: `${pet.stats.emotion}%`, background: 'var(--pixel-accent-dark)' }} />
      </div>
      <div className="stat-row">
        <span>{t('home.evolution')}</span>
        <strong>{pet.stats.evolution}</strong>
      </div>
      <div className="bar">
        <span
          style={{
            width: `${Math.min(100, pet.stats.evolution / 10)}%`,
            background: 'var(--pixel-accent)'
          }}
        />
      </div>

      <CombatStatCheck pet={pet} variant="full" />

      {pet.skillLoadout && pet.skillLoadout.slots.length > 0 && (
        <div className="pet-profile-skills">
          <div className="pet-profile-skills-head">
            <strong>{t('battle.skillMenu')}</strong>
            {pet.skillUpgradePoints > 0 && (
              <span className="pet-profile-skill-points">
                {t('skills.upgradePointsLeft', { count: pet.skillUpgradePoints })}
              </span>
            )}
          </div>
          <ul className="pet-profile-skill-list">
            {pet.skillLoadout.slots.map((slot, i) => {
              const def = getSkillDef(slot.pathId)
              const canUp = pet.skillUpgradePoints > 0 && slot.rank < SKILL_RANK_MAX
              return (
                <li key={`${slot.pathId}-${i}`} className={`pet-profile-skill element-tag--${slot.element}`}>
                  <div className="pet-profile-skill-info">
                    <strong>
                      {t(`skills.${slot.pathId}`, { defaultValue: def?.pathId ?? slot.pathId })}
                    </strong>
                    <span>
                      {slot.kind === 'ultimate' ? t('battle.ultimate') : t('battle.skillMenu')} ·{' '}
                      {t(`elements.${slot.element}`)} · Rk {slot.rank}/{SKILL_RANK_MAX}
                    </span>
                  </div>
                  <div className="pet-profile-skill-actions">
                    <button
                      type="button"
                      className="secondary"
                      disabled={!canUp || busy}
                      onClick={() => upgradeSkill(i)}
                      title={t('skills.upgrade')}
                    >
                      {t('skills.upgrade')}
                    </button>
                    {forgetInv > 0 && (
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
        </div>
      )}

      {pet.skillLoadout && pet.skillLoadout.slots.length === 0 && (
        <p className="pet-profile-hint">{t('battle.noSkills')}</p>
      )}

      <div className="form-row" style={{ marginTop: 16 }}>
        <label>{t('pet.rename')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="secondary" onClick={rename} disabled={busy}>
          {t('pet.saveName')}
        </button>
        {pet.stage === 'baby' && (
          <button
            className="primary"
            onClick={evolve}
            disabled={!canEvolveToAdult(pet) || busy}
          >
            {t('pet.evolveToAdult')}
          </button>
        )}
      </div>
      {!canEvolveToAdult(pet) && pet.stage === 'baby' && (
        <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
          {t('pet.evolveRequirementHint', { points: DEV_POINTS_ADULT, hours: ADULT_MIN_HOURS })}
        </p>
      )}

      {activeOfferCards.length > 0 && (
        <div className="hub-modal-overlay" role="dialog" aria-modal="true">
          <div className="hub-modal card" onClick={(e) => e.stopPropagation()}>
            <div className="hub-modal-head">
              <h2>{t('growth.pickTitle')}</h2>
            </div>
            <p className="pet-profile-hint">{t('growth.pickHint')}</p>
            <div className="growth-card-grid">
              {activeOfferCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className="growth-card"
                  disabled={busy}
                  onClick={() => pickGrowthCard(card.id)}
                >
                  <strong>{t(`growth.${card.id}`)}</strong>
                  <span>{formatDelta(card)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {forgetIndex !== null && pet.skillLoadout && (
        <div
          className="hub-modal-overlay"
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
                skill: t(`skills.${pet.skillLoadout.slots[forgetIndex]?.pathId ?? ''}`, {
                  defaultValue: pet.skillLoadout.slots[forgetIndex]?.pathId ?? ''
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
                onClick={() => forgetSkill(forgetIndex!)}
              >
                {t('skills.forget')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
