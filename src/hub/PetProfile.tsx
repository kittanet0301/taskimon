import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave } from '../shared/types'
import { petPreviewColor, DEV_POINTS_ADULT, ADULT_MIN_HOURS } from '../shared/constants'
import { displaySizeForPet } from '../shared/petSprites'
import { DinoSprite } from '../components/DinoSprite'
import { GenderTag } from '../components/GenderTag'
import { tCharacter, tStage } from '../i18n/labels'
import { canEvolveToAdult } from '../shared/stats'
import { CombatStatCheck } from '../components/CombatStatCheck'
import { PetLoadoutPanel } from '../components/PetLoadoutPanel'

interface ProfileProps {
  save: Pick<GameSave, 'pet' | 'inventory'>
  onUpdated: () => void
}

export function PetProfile({ save, onUpdated }: ProfileProps) {
  const { t } = useTranslation()
  const pet = save.pet
  const [name, setName] = useState(pet?.name ?? '')
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

      <PetLoadoutPanel
        pet={pet}
        forgetCount={forgetInv}
        busy={busy}
        onUpgradeSkill={(slotIndex) => patch('upgradeSkillRank', [pet.id, slotIndex])}
        onForgetSkill={(slotIndex) => patch('forgetSkill', [pet.id, slotIndex])}
        onPickGrowthCard={(cardId) => patch('applyGrowthCard', [pet.id, cardId])}
      />

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
    </div>
  )
}
