import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PetData } from '../shared/types'
import { DEV_POINTS_HATCH, petPreviewColor } from '../shared/constants'
import { waitForHatchAnimation } from '../shared/petSprites'
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
  const hatchDoneRef = useRef<(() => void) | null>(null)
  const [name, setName] = useState(pet.name)
  const ready = canHatchEgg(pet)

  const hatch = async () => {
    if (!ready) return
    setHatching(true)
    await waitForHatchAnimation(pet.character, (finish) => {
      hatchDoneRef.current = finish
    })
    hatchDoneRef.current = null
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
        style={{ background: petPreviewColor(pet.character) }}
      >
        <DinoSprite
          pet={pet}
          size={96}
          hatching={hatching}
          onHatchComplete={() => hatchDoneRef.current?.()}
        />
      </div>
      <p>
        {t('pet.character')}:{' '}
        <span className="tag" style={{ background: petPreviewColor(pet.character), color: '#fff' }}>
          {tCharacter(pet.character)}
        </span>
        · {t('pet.gender')}: <GenderTag gender={pet.gender} />
      </p>
      <StatBar
        label={t('home.evolution')}
        value={pet.stats.evolution}
        max={DEV_POINTS_HATCH}
        color="var(--pixel-accent)"
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
