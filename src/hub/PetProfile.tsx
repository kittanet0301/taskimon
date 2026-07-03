import { useState } from 'react'
import type { PetData } from '../shared/types'
import { ELEMENT_COLORS, ELEMENT_NAMES, SPECIES_NAMES } from '../shared/constants'
import { canEvolveToAdult } from '../shared/stats'

interface ProfileProps {
  save: { pet: PetData | null }
  onUpdated: () => void
}

export function PetProfile({ save, onUpdated }: ProfileProps) {
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
        {SPECIES_NAMES[pet.species]} · {ELEMENT_NAMES[pet.element]} · {pet.gender === 'male' ? 'ชาย' : 'หญิง'} ·{' '}
        {pet.stage === 'baby' ? 'Baby' : 'Adult'}
      </p>
      <div className="stat-row"><span>HP</span><strong>{pet.stats.hp}</strong></div>
      <div className="bar"><span style={{ width: `${pet.stats.hp}%` }} /></div>
      <div className="stat-row"><span>อารมณ์</span><strong>{pet.stats.mood}</strong></div>
      <div className="bar"><span style={{ width: `${pet.stats.mood}%`, background: '#6366f1' }} /></div>
      <div className="stat-row"><span>พัฒนาร่าง</span><strong>{pet.stats.devPoints}</strong></div>
      <div className="bar"><span style={{ width: `${Math.min(100, pet.stats.devPoints / 10)}%`, background: '#f59e0b' }} /></div>
      <div className="form-row" style={{ marginTop: 16 }}>
        <label>เปลี่ยนชื่อ</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="secondary" onClick={rename}>บันทึกชื่อ</button>
        {pet.stage === 'baby' && (
          <button className="primary" onClick={evolve} disabled={!canEvolveToAdult(pet)}>
            วิวัฒนาการเป็น Adult
          </button>
        )}
      </div>
      {!canEvolveToAdult(pet) && pet.stage === 'baby' && (
        <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
          ต้องมีพัฒนาร่าง ≥ 500 และเลี้ยงมา ≥ 48 ชม.
        </p>
      )}
    </div>
  )
}
