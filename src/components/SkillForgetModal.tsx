import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave } from '../shared/types'
import { ITEM_ICON_SRC } from '../shared/itemIcons'
import { SkillSlotSummary } from './SkillSlotSummary'
import { formatApiError } from '../shared/formatError'

interface Props {
  save: GameSave
  onClose: () => void
  onUpdated: () => void | Promise<void>
}

interface ForgetResult {
  slotIndex: number
  fromPathId: string
  toPathId: string
}

function skillName(
  t: (key: string, opts?: { defaultValue?: string }) => string,
  pathId: string
): string {
  return t(`skills.${pathId}`, { defaultValue: pathId })
}

/** Pick a skill slot to reroll with one Skill forget scroll (active pet). */
export function SkillForgetModal({ save, onClose, onUpdated }: Props) {
  const { t } = useTranslation()
  const pet = save.pet
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null)
  const [lastResult, setLastResult] = useState<ForgetResult | null>(null)

  const forgetCount = useMemo(
    () => save.inventory.find((i) => i.type === 'skill_forget')?.quantity ?? 0,
    [save.inventory]
  )

  const slots = pet?.skillLoadout?.slots ?? []
  const loadoutMode = pet?.skillLoadout?.mode

  const canForgetSlot = (index: number) => {
    const slot = slots[index]
    if (!slot) return false
    if (slot.kind === 'ultimate' && loadoutMode === 'pure') return false
    return true
  }

  const confirmSlot = confirmIndex != null ? slots[confirmIndex] : null

  const applyForget = async (slotIndex: number) => {
    if (!pet || busy || forgetCount <= 0 || !canForgetSlot(slotIndex)) return
    const fromPathId = slots[slotIndex]?.pathId
    if (!fromPathId) return
    setBusy(true)
    setError(null)
    try {
      const next = await window.electronAPI.patchGame('forgetSkill', [pet.id, slotIndex])
      await onUpdated()
      const nextPet =
        next.pet?.id === pet.id
          ? next.pet
          : next.collection.find((p) => p.id === pet.id) ?? next.pet
      const toPathId = nextPet?.skillLoadout?.slots[slotIndex]?.pathId ?? fromPathId
      setLastResult({ slotIndex, fromPathId, toPathId })
      setConfirmIndex(null)
    } catch (e) {
      setError(formatApiError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="hub-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="hub-modal skill-forget-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="hub-modal-head">
          <h2>
            <img className="hud-icon" src={ITEM_ICON_SRC.skill_forget} alt="" draggable={false} />
            {t('skills.forgetPickTitle')}
          </h2>
          <button type="button" className="hub-modal-close" onClick={onClose} aria-label={t('common.cancel')}>
            ×
          </button>
        </div>

        <p className="skill-forget-desc">
          {t('skills.forgetPickBody', { count: forgetCount })}
        </p>

        {lastResult && (
          <p className="skill-forget-result" role="status">
            {t('skills.forgetResult', {
              from: skillName(t, lastResult.fromPathId),
              to: skillName(t, lastResult.toPathId)
            })}
          </p>
        )}

        {!pet || pet.stage === 'egg' || slots.length === 0 ? (
          <p className="pixel-muted-text">{t('skills.forgetNeedPet')}</p>
        ) : (
          <>
            {forgetCount <= 0 && (
              <p className="pixel-muted-text skill-forget-empty-hint">{t('skills.forgetNoScroll')}</p>
            )}
            <ul className="pet-profile-skill-list skill-forget-list">
              {slots.map((slot, i) => {
                const allowed = canForgetSlot(i) && forgetCount > 0
                const justRolled = lastResult?.slotIndex === i
                return (
                  <li
                    key={`slot-${i}`}
                    className={`pet-profile-skill${justRolled ? ' pet-profile-skill--rolled' : ''}`}
                  >
                    <SkillSlotSummary slot={slot} />
                    <div className="pet-profile-skill-actions">
                      <button
                        type="button"
                        className="danger-btn"
                        disabled={!allowed || busy}
                        title={
                          forgetCount <= 0
                            ? t('skills.forgetNoScroll')
                            : allowed
                              ? t('skills.forget')
                              : t('skills.forgetPureUltimateBlocked')
                        }
                        onClick={() => {
                          setLastResult(null)
                          setConfirmIndex(i)
                        }}
                      >
                        {t('skills.forget')}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        {error && <p className="gift-error">{error}</p>}

        {confirmSlot && confirmIndex != null && (
          <div
            className="hub-modal-overlay pet-loadout-confirm"
            role="dialog"
            aria-modal="true"
            onClick={() => !busy && setConfirmIndex(null)}
          >
            <div className="hub-modal card" onClick={(e) => e.stopPropagation()}>
              <div className="hub-modal-head">
                <h2>{t('skills.forgetConfirmTitle')}</h2>
                <button
                  type="button"
                  className="hub-modal-close"
                  onClick={() => setConfirmIndex(null)}
                  disabled={busy}
                  aria-label={t('common.cancel')}
                >
                  ×
                </button>
              </div>
              <p>
                {t('skills.forgetConfirmBody', {
                  skill: skillName(t, confirmSlot.pathId)
                })}
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => setConfirmIndex(null)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="danger-btn"
                  disabled={busy}
                  onClick={() => void applyForget(confirmIndex)}
                >
                  {busy ? t('common.loading') : t('skills.forget')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
