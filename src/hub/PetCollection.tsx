import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave, PetData, Stage } from '../shared/types'
import { petPreviewColor, PET_SLOTS_PER_PAGE } from '../shared/constants'
import { DinoSprite } from '../components/DinoSprite'
import { GenderTag } from '../components/GenderTag'
import { displaySizeForPet } from '../shared/petSprites'
import { tCharacter, tStage } from '../i18n/labels'
import { getCollectionPageCount, getUsedSlots } from '../shared/petCollection'
import { getPetLevel, getStageLabel } from '../shared/activityScore'

const COLLECTION_PREVIEW_SIZE = 88
const DETAIL_PREVIEW_SIZE = 120

type StageFilter = 'all' | Stage

function petSpriteSize(pet: PetData): number {
  return Math.min(displaySizeForPet(pet), COLLECTION_PREVIEW_SIZE)
}

function statPercent(value: number, max: number): string {
  return `${Math.max(0, Math.min(100, (value / max) * 100))}%`
}

interface Props {
  save: GameSave
  onUpdated: () => void
  onSelect: () => void
  onClose: () => void
}

export function PetCollection({ save, onUpdated, onSelect, onClose }: Props) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<StageFilter>('all')
  const [page, setPage] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<PetData | null>(null)
  const [detailPet, setDetailPet] = useState<PetData | null>(null)
  const [busy, setBusy] = useState(false)

  const maxCollectionSlots = save.pet ? save.petSlotLimit - 1 : save.petSlotLimit

  const filteredCollection = useMemo(
    () => (filter === 'all' ? save.collection : save.collection.filter((p) => p.stage === filter)),
    [save.collection, filter]
  )

  const pageCount =
    filter === 'all'
      ? getCollectionPageCount(maxCollectionSlots, PET_SLOTS_PER_PAGE)
      : Math.max(1, Math.ceil(filteredCollection.length / PET_SLOTS_PER_PAGE))
  const safePage = Math.min(page, pageCount - 1)
  const startIdx = safePage * PET_SLOTS_PER_PAGE
  const endIdx = Math.min(startIdx + PET_SLOTS_PER_PAGE, filter === 'all' ? maxCollectionSlots : filteredCollection.length)
  const slotIndices = Array.from({ length: endIdx - startIdx }, (_, i) => startIdx + i)

  const changeFilter = (next: StageFilter) => {
    setFilter(next)
    setPage(0)
  }

  const setActive = async (petId: string, navigate: boolean) => {
    await window.electronAPI.patchGame('setActivePet', [petId])
    try {
      await window.electronAPI.forceCloudSave()
    } catch {
      // local save is still updated; chat uses local active pet for self
    }
    onUpdated()
    if (navigate) onSelect()
  }

  const selectToPlay = async (pet: PetData) => {
    setBusy(true)
    try {
      await setActive(pet.id, true)
      setDetailPet(null)
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await window.electronAPI.patchGame('releasePet', [pendingDelete.id])
    setPendingDelete(null)
    setDetailPet(null)
    onUpdated()
  }

  const stageFilters: StageFilter[] = ['all', 'egg', 'baby', 'adult']

  return (
    <div className="hub-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="hub-modal collection-modal card" onClick={(e) => e.stopPropagation()}>
      <div className="hub-modal-head">
        <h2>{t('collection.title')}</h2>
        <button type="button" className="hub-modal-close" onClick={onClose} aria-label={t('common.cancel')}>
          ×
        </button>
      </div>
      <div className="collection-header">
        <span className="collection-slots">
          {t('collection.slots', { used: getUsedSlots(save), limit: save.petSlotLimit })}
        </span>
      </div>

      {save.pet && (
        <div className="collection-active-card">
          <span className="collection-active-badge">{t('collection.active')}</span>
          <div
            className="collection-active-preview"
            style={{ background: petPreviewColor(save.pet.character) }}
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

      <div className="collection-filter-tabs">
        {stageFilters.map((stageKey) => (
          <button
            key={stageKey}
            type="button"
            className={`collection-filter-tab ${filter === stageKey ? 'collection-filter-tab--active' : ''}`}
            onClick={() => changeFilter(stageKey)}
          >
            {stageKey === 'all' ? t('collection.filterAll') : tStage(stageKey)}
          </button>
        ))}
      </div>

      <div className="collection-grid">
        {slotIndices.length === 0 && (
          <div className="collection-slot collection-slot-empty">
            <span className="collection-empty-label">{t('collection.empty')}</span>
          </div>
        )}
        {slotIndices.map((slotIdx) => {
          const pet = filter === 'all' ? save.collection[slotIdx] ?? null : filteredCollection[slotIdx]
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
                onClick={() => setDetailPet(pet)}
                title={t('collection.select')}
              >
                <div
                  className="collection-slot-preview"
                  style={{ background: petPreviewColor(pet.character) }}
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

      {detailPet && (
        <div className="hub-modal-overlay" role="dialog" aria-modal="true" onClick={() => setDetailPet(null)}>
          <div className="hub-modal pet-detail-modal card" onClick={(e) => e.stopPropagation()}>
            <div className="hub-modal-head">
              <h2>{detailPet.name}</h2>
              <button
                type="button"
                className="hub-modal-close"
                onClick={() => setDetailPet(null)}
                aria-label={t('common.cancel')}
              >
                ×
              </button>
            </div>

            <div className="pet-detail-body">
              <div
                className="pet-detail-preview"
                style={{ background: petPreviewColor(detailPet.character) }}
              >
                <DinoSprite pet={detailPet} size={Math.min(displaySizeForPet(detailPet), DETAIL_PREVIEW_SIZE)} />
              </div>
              <div className="pet-detail-info">
                <span className="collection-slot-info">
                  {tCharacter(detailPet.character)} · <GenderTag gender={detailPet.gender} />
                </span>
                <strong>
                  {getStageLabel(detailPet.stage)} Lv.{getPetLevel(detailPet.stage, detailPet.stats.devPoints)}
                </strong>
                <div className="hud-bar hud-bar--hp">
                  <span>{t('home.health')}</span>
                  <div><i style={{ width: statPercent(detailPet.stats.hp, 100) }} /></div>
                  <b>{detailPet.stats.hp}/100</b>
                </div>
                <div className="hud-bar hud-bar--mood">
                  <span>{t('home.emotion')}</span>
                  <div><i style={{ width: statPercent(detailPet.stats.mood, 100) }} /></div>
                  <b>{detailPet.stats.mood}/100</b>
                </div>
                <div className="hud-bar hud-bar--xp">
                  <span>{t('home.evolution')}</span>
                  <div><i style={{ width: statPercent(detailPet.stats.devPoints, 999) }} /></div>
                  <b>{detailPet.stats.devPoints}/999</b>
                </div>
              </div>
            </div>

            <div className="pet-detail-actions">
              <button
                type="button"
                className="danger-btn"
                onClick={() => setPendingDelete(detailPet)}
                disabled={busy}
              >
                {t('collection.delete')}
              </button>
              <button
                type="button"
                className="dash-hud-action dash-hud-action--inline"
                onClick={() => selectToPlay(detailPet)}
                disabled={busy}
              >
                {t('collection.select')}
              </button>
            </div>
          </div>
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
    </div>
  )
}
