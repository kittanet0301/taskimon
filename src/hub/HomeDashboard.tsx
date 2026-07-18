import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave, ItemType } from '../shared/types'
import { DinoSprite } from '../components/DinoSprite'
import { getPetLevel, getStageLabel } from '../shared/activityScore'
import { QUICK_ITEM_SLOT_COUNT, TEST_FAST_EVO } from '../shared/constants'
import { normalizeQuickItemSlots } from '../shared/items'
import { canEvolveToAdult, canHatchEgg } from '../shared/stats'
import { tCharacter, tItemDescription, tItemLabel } from '../i18n/labels'
import { creatureDisplaySize, waitForHatchAnimation } from '../shared/petSprites'
import { CREATURE_SPECIES, isCreatureSpecies } from '../shared/creatureCharacters'
import { ALL_ITEM_TYPES, ITEM_ICON_SRC } from '../shared/itemIcons'
import { HomeMissionsPanel } from './HomeMissionsPanel'
import { CombatStatCheck } from '../components/CombatStatCheck'
import {
  coverImagePointToPercent,
  DASH_BG_HEIGHT,
  DASH_BG_WIDTH,
  DASH_SCENE_ANCHORS,
  dashSpriteSize
} from './dashSceneLayout'

interface Props {
  save: GameSave
  syncing: boolean
  onUpdated: () => void | Promise<void>
}

const QUICK_ITEM_TYPES: ItemType[] = ALL_ITEM_TYPES

function statPercent(value: number, max: number): string {
  return `${Math.max(0, Math.min(100, (value / max) * 100))}%`
}

export function HomeDashboard({ save, syncing, onUpdated }: Props) {
  const { t } = useTranslation()
  const sceneRef = useRef<HTMLDivElement>(null)
  const pet = save.pet
  const isEgg = pet?.stage === 'egg'
  const [layout, setLayout] = useState({ leftPct: 50, topPct: 50, spriteSize: 96 })
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const [hatching, setHatching] = useState(false)
  const hatchDoneRef = useRef<(() => void) | null>(null)
  const sceneKey = 'hatch'

  const quickSlots = useMemo(
    () => normalizeQuickItemSlots(save.quickItemSlots).slice(0, QUICK_ITEM_SLOT_COUNT),
    [save.quickItemSlots]
  )

  useEffect(() => {
    const el = sceneRef.current
    if (!el || !pet) return

    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width === 0 || height === 0) return
      const anchor = DASH_SCENE_ANCHORS[isEgg ? 'egg' : 'pedestal']
      const pos = coverImagePointToPercent(
        width,
        height,
        DASH_BG_WIDTH,
        DASH_BG_HEIGHT,
        anchor.x,
        anchor.y
      )
      setLayout({
        leftPct: pos.leftPct,
        topPct: pos.topPct,
        spriteSize: isCreatureSpecies(pet.character)
          ? creatureDisplaySize(pet.stage)
          : dashSpriteSize(width, Boolean(isEgg))
      })
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isEgg, pet])

  if (!pet) return null

  const inventoryByType = new Map(save.inventory.map((item) => [item.type, item.quantity]))
  const canHatch = canHatchEgg(pet)
  const canEvolve = canEvolveToAdult(pet)

  const useQuickItem = async (type: ItemType | null) => {
    if (!type || !inventoryByType.get(type)) return
    await window.electronAPI.patchGame('useItem', [type])
    onUpdated()
  }

  const setQuickItem = async (slotIndex: number, type: ItemType | null) => {
    await window.electronAPI.patchGame('setQuickItemSlot', [slotIndex, type])
    setEditingSlot(null)
    onUpdated()
  }

  const runPetAction = async () => {
    if (canHatch) {
      setHatching(true)
      await waitForHatchAnimation(pet.character, (finish) => {
        hatchDoneRef.current = finish
      })
      hatchDoneRef.current = null
      await window.electronAPI.patchGame('hatch')
      await onUpdated()
      setHatching(false)
      return
    }
    if (canEvolve) {
      await window.electronAPI.patchGame('evolve')
      onUpdated()
    }
  }

  const runDebug = async (mutator: string, args: unknown[] = []) => {
    await window.electronAPI.patchGame(mutator, args)
    onUpdated()
  }

  return (
    <div className={`dash-hud dash-hud--${sceneKey}`}>
      <div ref={sceneRef} className="dash-hud-scene">
        <img
          src="/ui/dash-bg-hatch-v2.png"
          alt=""
          className="dash-scene-bg"
          width={DASH_BG_WIDTH}
          height={DASH_BG_HEIGHT}
          draggable={false}
        />

        <section className="dash-hud-status" aria-label="Pet status">
          <div className="dash-hud-nameplate">
            <span>{pet.name}</span>
            <strong>
              {getStageLabel(pet.stage)} Lv.{getPetLevel(pet.stage, pet.stats.evolution)}
            </strong>
            <div className="dash-hud-nameplate-elements">
              <span className={`element-badge element-badge--${pet.elementPrimary}`}>
                {t(`elements.${pet.elementPrimary}`)}
              </span>
              {pet.elementSecondary && (
                <span className={`element-badge element-badge--${pet.elementSecondary}`}>
                  {t(`elements.${pet.elementSecondary}`)}
                </span>
              )}
            </div>
          </div>
          <div className="dash-hud-status-body">
            <div className="hud-bar hud-bar--hp">
              <span>{t('home.health')}</span>
              <div><i style={{ width: statPercent(pet.stats.health, 100) }} /></div>
              <b>{pet.stats.health}/100</b>
            </div>
            <div className="hud-bar hud-bar--mood">
              <span>{t('home.emotion')}</span>
              <div><i style={{ width: statPercent(pet.stats.emotion, 100) }} /></div>
              <b>{pet.stats.emotion}/100</b>
            </div>
            <div className="hud-bar hud-bar--xp">
              <span>{t('home.evolution')}</span>
              <div><i style={{ width: statPercent(pet.stats.evolution, 999) }} /></div>
              <b>{pet.stats.evolution}/999</b>
            </div>
            <CombatStatCheck pet={pet} variant="compact" className="dash-hud-combat-stats" />
            {(canHatch || canEvolve) && (
              <button
                type="button"
                className="dash-hud-action dash-hud-action--inline"
                onClick={runPetAction}
                disabled={hatching}
              >
                {hatching ? t('pet.hatching') : canHatch ? t('pet.hatch') : t('pet.evolveToAdult')}
              </button>
            )}
            {TEST_FAST_EVO && (
              <div className="dash-hud-debug" aria-label="Test controls">
                <span className="dash-hud-debug-label">TEST</span>
                <div className="dash-hud-debug-row">
                  {CREATURE_SPECIES.map((species) => (
                    <button
                      key={species}
                      type="button"
                      className={`dash-hud-debug-btn${pet.character === species ? ' active' : ''}`}
                      onClick={() => runDebug('debugSetSpecies', [species])}
                      title={tCharacter(species)}
                    >
                      {species === 'ember-sail' ? 'ember' : species}
                    </button>
                  ))}
                </div>
                <div className="dash-hud-debug-row">
                  {(['egg', 'baby', 'adult'] as const).map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      className={`dash-hud-debug-btn${pet.stage === stage ? ' active' : ''}`}
                      onClick={() => runDebug('debugSetStage', [stage])}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
                <div className="dash-hud-debug-row">
                  <button type="button" className="dash-hud-debug-btn" onClick={() => runDebug('debugBoostDev', [50])}>
                    +50 DP
                  </button>
                  <button
                    type="button"
                    className="dash-hud-debug-btn"
                    onClick={() => runDebug('newEgg', ['garden'])}
                  >
                    +garden egg
                  </button>
                  <button
                    type="button"
                    className="dash-hud-debug-btn"
                    onClick={() => runDebug('newEgg', ['ember-sail'])}
                  >
                    +ember egg
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <HomeMissionsPanel save={save} onUpdated={onUpdated} />

        <div
          className={`dash-scene-pet dash-scene-pet--${isEgg ? 'egg' : 'pedestal'}`}
          style={{ left: `${layout.leftPct}%`, top: `${layout.topPct}%` }}
        >
          <DinoSprite
            pet={pet}
            size={layout.spriteSize}
            hatching={hatching}
            onHatchComplete={() => hatchDoneRef.current?.()}
          />
        </div>

        <section className="dash-hud-quickbar" aria-label={t('home.quickCare')}>
          {quickSlots.map((type, index) => {
            const quantity = type ? inventoryByType.get(type) ?? 0 : 0
            const disabled = !type || quantity <= 0
            return (
              <div key={`${type ?? 'empty'}-${index}`} className="dash-hud-slot-wrap">
                <button
                  type="button"
                  className="dash-hud-slot"
                  disabled={disabled}
                  onClick={() => useQuickItem(type)}
                  title={type ? `${tItemLabel(type)} · ${tItemDescription(type)}` : t('inventory.empty')}
                >
                  {type ? <img className="hud-icon" src={ITEM_ICON_SRC[type]} alt="" draggable={false} /> : <span className="dash-hud-empty-slot" />}
                  {quantity > 0 && <strong>{quantity}</strong>}
                </button>
                <button
                  type="button"
                  className="dash-hud-slot-edit"
                  onClick={() => setEditingSlot(editingSlot === index ? null : index)}
                  title={t('inventory.title')}
                  aria-label={t('inventory.title')}
                >
                  +
                </button>
              </div>
            )
          })}
        </section>

        {editingSlot !== null && (
          <div className="dash-hud-picker">
            <div className="dash-hud-picker-head">
              <strong>{t('inventory.title')}</strong>
              <button type="button" onClick={() => setEditingSlot(null)} aria-label={t('common.cancel')}>
                ×
              </button>
            </div>
            <div className="dash-hud-picker-grid">
              {QUICK_ITEM_TYPES.map((type) => {
                const quantity = inventoryByType.get(type) ?? 0
                return (
                  <button
                    key={type}
                    type="button"
                    className="dash-hud-picker-item"
                    disabled={quantity <= 0}
                    onClick={() => setQuickItem(editingSlot, type)}
                    title={tItemDescription(type)}
                  >
                    <img className="hud-icon" src={ITEM_ICON_SRC[type]} alt="" draggable={false} />
                    <span>{tItemLabel(type)}</span>
                    <b>{quantity}</b>
                  </button>
                )
              })}
              <button
                type="button"
                className="dash-hud-picker-item dash-hud-picker-item--clear"
                onClick={() => setQuickItem(editingSlot, null)}
              >
                {t('common.none')}
              </button>
            </div>
          </div>
        )}

        {syncing && <div className="dash-hud-sync">{t('app.syncing')}</div>}
      </div>
    </div>
  )
}
