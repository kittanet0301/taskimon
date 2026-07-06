import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PetData } from '../shared/types'
import { DEV_POINTS_HATCH, DINO_PREVIEW_COLORS } from '../shared/constants'
import { DINO_HATCH_MS } from '../shared/dinoTiming'
import { DinoSprite } from '../components/DinoSprite'
import { GenderTag } from '../components/GenderTag'
import { canHatchEgg } from '../shared/stats'
import { tCharacter } from '../i18n/labels'

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
    await new Promise((r) => setTimeout(r, DINO_HATCH_MS))
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
        style={{ background: DINO_PREVIEW_COLORS[pet.character] }}
      >
        <DinoSprite pet={pet} size={96} hatching={hatching} />
      </div>
      <p>
        {t('pet.character')}:{' '}
        <span className="tag" style={{ background: DINO_PREVIEW_COLORS[pet.character], color: '#fff' }}>
          {tCharacter(pet.character)}
        </span>
        · {t('pet.gender')}: <GenderTag gender={pet.gender} />
      </p>
      <StatBar
        label={t('home.evolution')}
        value={pet.stats.devPoints}
        max={DEV_POINTS_HATCH}
        color="#f59e0b"
      />
      <p className="dash-activity-hint dash-hint-spaced">
        {ready ? t('pet.hatchReadyHint') : t('pet.hatchEvolutionHint', { points: DEV_POINTS_HATCH })}
      </p>
      <div className="form-row dash-form-spaced">
        <label>{t('pet.setHatchName')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} disabled={hatching} />
      </div>
      <button
        className="primary dash-full-btn"
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
