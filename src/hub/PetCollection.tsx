import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave, PetData } from '../shared/types'
import { DINO_PREVIEW_COLORS, PET_SLOTS_PER_PAGE } from '../shared/constants'
import { DinoSprite } from '../components/DinoSprite'
import { GenderTag } from '../components/GenderTag'
import { displaySizeFromPixelScale, pixelScaleForStage } from '../shared/dinoSprites'
import { tCharacter, tStage } from '../i18n/labels'
import { getCollectionPageCount, getUsedSlots } from '../shared/petCollection'

function petSpriteSize(pet: PetData): number {
  return displaySizeFromPixelScale(pixelScaleForStage(pet.stage))
}

interface Props {
  save: GameSave
  onUpdated: () => void
  onSelect: () => void
}

export function PetCollection({ save, onUpdated, onSelect }: Props) {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<PetData | null>(null)

  const maxCollectionSlots = save.pet ? save.petSlotLimit - 1 : save.petSlotLimit
  const pageCount = getCollectionPageCount(maxCollectionSlots, PET_SLOTS_PER_PAGE)
  const safePage = Math.min(page, pageCount - 1)
  const startIdx = safePage * PET_SLOTS_PER_PAGE
  const endIdx = Math.min(startIdx + PET_SLOTS_PER_PAGE, maxCollectionSlots)
  const slotIndices = Array.from({ length: endIdx - startIdx }, (_, i) => startIdx + i)

  const selectPet = async (petId: string) => {
    await window.electronAPI.patchGame('setActivePet', [petId])
    onUpdated()
    onSelect()
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await window.electronAPI.patchGame('releasePet', [pendingDelete.id])
    setPendingDelete(null)
    onUpdated()
  }

  return (
    <div className="card collection-card">
      <div className="collection-header">
        <h2>{t('collection.title')}</h2>
        <span className="collection-slots">
          {t('collection.slots', { used: getUsedSlots(save), limit: save.petSlotLimit })}
        </span>
      </div>

      {save.pet && (
        <div className="collection-active-card">
          <span className="collection-active-badge">{t('collection.active')}</span>
          <div
            className="collection-active-preview"
            style={{ background: DINO_PREVIEW_COLORS[save.pet.character] }}
          >
            <DinoSprite pet={save.pet} size={petSpriteSize(save.pet)} />
          </div>
          <div className="collection-active-meta">
            <strong>{save.pet.name}</strong>
            <span className="collection-slot-info">
              {tCharacter(save.pet.character)} · <GenderTag gender={save.pet.gender} /> · {tStage(save.pet.stage)}
            </span>
          </div>
        </div>
      )}

      <div className="collection-grid">
        {slotIndices.map((slotIdx) => {
          const pet = save.collection[slotIdx] ?? null
          if (!pet) {
            return (
              <div key={`empty-${slotIdx}`} className="collection-slot collection-slot-empty">
                <span className="collection-empty-label">{t('collection.empty')}</span>
              </div>
            )
          }
          return (
            <div key={pet.id} className="collection-slot">
              <button
                type="button"
                className="collection-slot-btn"
                onClick={() => selectPet(pet.id)}
                title={t('collection.select')}
              >
                <div
                  className="collection-slot-preview"
                  style={{ background: DINO_PREVIEW_COLORS[pet.character] }}
                >
                  <DinoSprite pet={pet} size={petSpriteSize(pet)} />
                </div>
                <div className="collection-slot-meta">
                  <strong className="collection-slot-name">{pet.name}</strong>
                  <span className="collection-slot-info">
                    {tCharacter(pet.character)} · <GenderTag gender={pet.gender} /> · {tStage(pet.stage)}
                  </span>
                </div>
              </button>
              <button
                type="button"
                className="collection-delete-btn"
                onClick={() => setPendingDelete(pet)}
                title={t('collection.delete')}
                aria-label={t('collection.delete')}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      {pageCount > 1 && (
        <div className="collection-pagination">
          <button
            type="button"
            className="secondary"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ‹
          </button>
          <span className="collection-page-label">
            {t('collection.page', { current: safePage + 1, total: pageCount })}
          </span>
          <button
            type="button"
            className="secondary"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            ›
          </button>
        </div>
      )}

      {pendingDelete && (
        <div className="collection-dialog-backdrop" role="presentation" onClick={() => setPendingDelete(null)}>
          <div
            className="collection-dialog card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <p>{t('collection.deleteConfirm', { name: pendingDelete.name })}</p>
            <div className="collection-dialog-actions">
              <button type="button" className="secondary" onClick={() => setPendingDelete(null)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="danger-btn" onClick={confirmDelete}>
                {t('collection.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
