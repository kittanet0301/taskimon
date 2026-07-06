import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PetData } from '../shared/types'
import { ELEMENT_COLORS } from '../shared/constants'
import { tElement, tSpecies } from '../i18n/labels'

interface Props {
  pet: PetData
  onHatched: () => void
}

export function EggHatch({ pet, onHatched }: Props) {
  const { t } = useTranslation()
  const [hatching, setHatching] = useState(false)
  const [name, setName] = useState(pet.name)

  const hatch = async () => {
    setHatching(true)
    await new Promise((r) => setTimeout(r, 2000))
    await window.electronAPI.patchGame('rename', [name])
    await window.electronAPI.patchGame('hatch')
    setHatching(false)
    onHatched()
  }

  return (
    <div className="card">
      <h2>{t('pet.mysteriousEgg')}</h2>
      <div
        className="pet-preview"
        style={{ background: ELEMENT_COLORS[pet.element], marginBottom: 16 }}
      >
        {hatching ? '...' : '🥚'}
      </div>
      <p>
        {t('pet.element')}: <span className="tag" style={{ background: ELEMENT_COLORS[pet.element], color: '#fff' }}>
          {tElement(pet.element)}
        </span>
        {t('pet.species')}: {tSpecies(pet.species)} · {t('pet.gender')}: {pet.gender === 'male' ? t('pet.maleShort') : t('pet.femaleShort')}
      </p>
      <div className="form-row">
        <label>{t('pet.setHatchName')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} disabled={hatching} />
      </div>
      <button className="primary" onClick={hatch} disabled={hatching || !name.trim()}>
        {hatching ? t('pet.hatching') : t('pet.hatch')}
      </button>
    </div>
  )
}
