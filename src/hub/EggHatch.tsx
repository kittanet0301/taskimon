import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PetData } from '../shared/types'
import { DEV_POINTS_HATCH, ELEMENT_COLORS } from '../shared/constants'
import { canHatchEgg } from '../shared/stats'
import { tElement, tSpecies } from '../i18n/labels'

interface Props {
  pet: PetData
  onHatched: () => void
}

function StatBar({
  label,
  value,
  max,
  color
}: {
  label: string
  value: number
  max: number
  color: string
}) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="dash-stat">
      <div className="dash-stat-head">
        <span>{label}</span>
        <strong>
          {value} / {max}
        </strong>
      </div>
      <div className="bar">
        <span style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export function EggHatch({ pet, onHatched }: Props) {
  const { t } = useTranslation()
  const [hatching, setHatching] = useState(false)
  const [name, setName] = useState(pet.name)
  const ready = canHatchEgg(pet)

  const hatch = async () => {
    if (!ready) return
    setHatching(true)
    await new Promise((r) => setTimeout(r, 2000))
    await window.electronAPI.patchGame('rename', [name])
    await window.electronAPI.patchGame('hatch')
    setHatching(false)
    onHatched()
  }

  return (
    <div className="card dash-pet-card">
      <h2>{t('pet.mysteriousEgg')}</h2>
      <div
        className="pet-preview dash-pet-sprite"
        style={{ background: ELEMENT_COLORS[pet.element], marginBottom: 16 }}
      >
        {hatching ? '...' : '🥚'}
      </div>
      <p>
        {t('pet.element')}:{' '}
        <span className="tag" style={{ background: ELEMENT_COLORS[pet.element], color: '#fff' }}>
          {tElement(pet.element)}
        </span>
        {t('pet.species')}: {tSpecies(pet.species)} · {t('pet.gender')}:{' '}
        {pet.gender === 'male' ? t('pet.maleShort') : t('pet.femaleShort')}
      </p>
      <StatBar
        label={t('home.evolution')}
        value={pet.stats.devPoints}
        max={DEV_POINTS_HATCH}
        color="#f59e0b"
      />
      <p className="dash-activity-hint" style={{ marginTop: 12 }}>
        {ready ? t('pet.hatchReadyHint') : t('pet.hatchEvolutionHint', { points: DEV_POINTS_HATCH })}
      </p>
      <div className="form-row" style={{ marginTop: 12 }}>
        <label>{t('pet.setHatchName')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} disabled={hatching} />
      </div>
      <button
        className="primary"
        style={{ width: '100%', marginTop: 12 }}
        onClick={hatch}
        disabled={hatching || !name.trim() || !ready}
      >
        {hatching
          ? t('pet.hatching')
          : ready
            ? t('pet.hatch')
            : t('pet.hatchLocked', { points: DEV_POINTS_HATCH })}
      </button>
    </div>
  )
}
