import { useState } from 'react'
import type { PetData } from '../shared/types'
import { ELEMENT_COLORS, ELEMENT_NAMES, SPECIES_NAMES } from '../shared/constants'

interface Props {
  pet: PetData
  onHatched: () => void
}

export function EggHatch({ pet, onHatched }: Props) {
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
      <h2>ไข่ลึกลับ</h2>
      <div
        className="pet-preview"
        style={{ background: ELEMENT_COLORS[pet.element], marginBottom: 16 }}
      >
        {hatching ? '...' : '🥚'}
      </div>
      <p>
        ธาตุ: <span className="tag" style={{ background: ELEMENT_COLORS[pet.element], color: '#fff' }}>
          {ELEMENT_NAMES[pet.element]}
        </span>
        ประเภท: {SPECIES_NAMES[pet.species]} · เพศ: {pet.gender === 'male' ? 'ช' : 'ญ'}
      </p>
      <div className="form-row">
        <label>ตั้งชื่อหลังฟัก</label>
        <input value={name} onChange={(e) => setName(e.target.value)} disabled={hatching} />
      </div>
      <button className="primary" onClick={hatch} disabled={hatching || !name.trim()}>
        {hatching ? 'กำลังฟัก...' : 'ฟักไข่'}
      </button>
    </div>
  )
}
