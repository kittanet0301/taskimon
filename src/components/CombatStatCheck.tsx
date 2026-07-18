import { useTranslation } from 'react-i18next'
import type { PetData } from '../shared/types'
import { deriveCombatStats } from '../shared/combatStats'
import { isPureElements } from '../shared/elements'

type Variant = 'compact' | 'full'

interface Props {
  pet: PetData
  variant?: Variant
  className?: string
}

/** Read-only combat stat check: elements, primaries, derived battle values. */
export function CombatStatCheck({ pet, variant = 'compact', className }: Props) {
  const { t } = useTranslation()
  const derived = deriveCombatStats(pet.primaries)
  const pure = isPureElements(pet.elementPrimary, pet.elementSecondary)
  const rootClass = ['combat-stat-check', `combat-stat-check--${variant}`, className]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={rootClass} aria-label={t('stats.combatCheck')}>
      <div className="combat-stat-check-head">
        <strong>{t('stats.combatCheck')}</strong>
        <span className={pure ? 'combat-stat-tag combat-stat-tag--pure' : 'combat-stat-tag'}>
          {pure ? t('stats.pure') : t('stats.dual')}
        </span>
      </div>

      <div className="combat-stat-check-elements">
        <span className={`element-badge element-badge--${pet.elementPrimary}`}>
          {t(`elements.${pet.elementPrimary}`)}
        </span>
        {pet.elementSecondary && (
          <span className={`element-badge element-badge--${pet.elementSecondary}`}>
            {t(`elements.${pet.elementSecondary}`)}
          </span>
        )}
      </div>

      <div className="combat-stat-check-primaries">
        <div>
          <span>{t('stats.str')}</span>
          <strong>{pet.primaries.str}</strong>
        </div>
        <div>
          <span>{t('stats.dex')}</span>
          <strong>{pet.primaries.dex}</strong>
        </div>
        <div>
          <span>{t('stats.int')}</span>
          <strong>{pet.primaries.int}</strong>
        </div>
        <div>
          <span>{t('stats.con')}</span>
          <strong>{pet.primaries.con}</strong>
        </div>
      </div>

      <div className="combat-stat-check-derived">
        <div>
          <span>{t('stats.battleHp')}</span>
          <strong>{derived.maxHp}</strong>
        </div>
        <div>
          <span>{t('stats.battleMp')}</span>
          <strong>{derived.maxMp}</strong>
        </div>
        <div>
          <span>{t('stats.eva')}</span>
          <strong>{Math.round(derived.eva * 100)}%</strong>
        </div>
        {variant === 'full' && (
          <>
            <div>
              <span>{t('stats.atk')}</span>
              <strong>{derived.atk}</strong>
            </div>
            <div>
              <span>{t('stats.def')}</span>
              <strong>{derived.def}</strong>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
