import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PetData } from '../shared/types'
import { ELEMENT_COLORS } from '../shared/constants'
import { tElement, tSpecies, tStage } from '../i18n/labels'
import { canEvolveToAdult } from '../shared/stats'

interface ProfileProps {
  save: { pet: PetData | null }
  onUpdated: () => void
}

export function PetProfile({ save, onUpdated }: ProfileProps) {
  const { t } = useTranslation()
  const pet = save.pet
  const [name, setName] = useState(pet?.name ?? '')

  if (!pet) return null

  const evolve = async () => {
    await window.electronAPI.patchGame('evolve')
    onUpdated()
  }

  const rename = async () => {
    await window.electronAPI.patchGame('rename', [name])
    onUpdated()
  }

  return (
    <div className="card">
      <h2>{pet.name}</h2>
      <div className="pet-preview" style={{ background: ELEMENT_COLORS[pet.element] }}>
        {pet.stage === 'baby' ? 'B' : 'A'}
      </div>
      <p>
        {tSpecies(pet.species)} · {tElement(pet.element)} · {pet.gender === 'male' ? t('pet.male') : t('pet.female')} ·{' '}
        {tStage(pet.stage)}
      </p>
      <div className="stat-row"><span>HP</span><strong>{pet.stats.hp}</strong></div>
      <div className="bar"><span style={{ width: `${pet.stats.hp}%` }} /></div>
      <div className="stat-row"><span>{t('home.emotion')}</span><strong>{pet.stats.mood}</strong></div>
      <div className="bar"><span style={{ width: `${pet.stats.mood}%`, background: '#6366f1' }} /></div>
      <div className="stat-row"><span>{t('home.evolution')}</span><strong>{pet.stats.devPoints}</strong></div>
      <div className="bar"><span style={{ width: `${Math.min(100, pet.stats.devPoints / 10)}%`, background: '#f59e0b' }} /></div>
      <div className="form-row" style={{ marginTop: 16 }}>
        <label>{t('pet.rename')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="secondary" onClick={rename}>{t('pet.saveName')}</button>
        {pet.stage === 'baby' && (
          <button className="primary" onClick={evolve} disabled={!canEvolveToAdult(pet)}>
            {t('pet.evolveToAdult')}
          </button>
        )}
      </div>
      {!canEvolveToAdult(pet) && pet.stage === 'baby' && (
        <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
          {t('pet.evolveRequirementHint')}
        </p>
      )}
    </div>
  )
}
