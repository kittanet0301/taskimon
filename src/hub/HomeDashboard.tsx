import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave, ItemType } from '../shared/types'
import { DinoSprite } from '../components/DinoSprite'
import { getActivityScore, getPetLevel, getStageLabel } from '../shared/activityScore'
import { QUICK_ITEM_SLOT_COUNT } from '../shared/constants'
import { normalizeQuickItemSlots } from '../shared/items'
import { canEvolveToAdult, canHatchEgg } from '../shared/stats'
import { tItemDescription, tItemLabel } from '../i18n/labels'
import { creatureDisplaySize, waitForHatchAnimation } from '../shared/petSprites'
import { isCreatureSpecies } from '../shared/creatureCharacters'
import {
  coverImagePointToPercent,
  DASH_BG_HEIGHT,
  DASH_BG_WIDTH,
  DASH_SCENE_ANCHORS,
  dashSpriteSize
} from './dashSceneLayout'

type DashboardNavTarget = 'home' | 'collection' | 'missions' | 'community' | 'battle' | 'settings' | 'minigame' | 'ranking'

interface Props {
  save: GameSave
  displayName: string
  syncing: boolean
  onNavigate: (tab: DashboardNavTarget) => void
  onUpdated: () => void | Promise<void>
}

const HUD_ICON_SRC = {
  dino: '/ui/hud-icon-dino.png',
  missions: '/ui/hud-icon-missions.png',
  collection: '/ui/hud-icon-collection.png',
  inventory: '/ui/hud-icon-inventory.png',
  community: '/ui/hud-icon-community.png',
  battle: '/ui/hud-icon-battle.png',
  settings: '/ui/hud-icon-settings.png',
  minigame: '/ui/hud-icon-minigame.png',
  ranking: '/ui/hud-icon-ranking.png'
} as const

const ITEM_ICON_SRC: Record<ItemType, string> = {
  food_basic: '/ui/item-food-basic.png',
  food_premium: '/ui/item-food-premium.png',
  medicine: '/ui/item-medicine.png',
  water: '/ui/item-water.png',
  toy: '/ui/item-toy.png',
  dev_vitamin: '/ui/item-dev-vitamin.png',
  battle_shield: '/ui/item-battle-shield.png'
}

const QUICK_ITEM_TYPES: ItemType[] = [
  'food_basic',
  'food_premium',
  'medicine',
  'water',
  'toy',
  'dev_vitamin',
  'battle_shield'
]

function statPercent(value: number, max: number): string {
  return `${Math.max(0, Math.min(100, (value / max) * 100))}%`
}

export function HomeDashboard({ save, displayName, syncing, onNavigate, onUpdated }: Props) {
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
  const activityScore = getActivityScore(save.activity)
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

  const navItems: Array<{
    id: DashboardNavTarget | 'inventory'
    label: string
    icon: keyof typeof HUD_ICON_SRC
    action: () => void
  }> = [
    { id: 'home', label: t('tabs.home'), icon: 'dino', action: () => onNavigate('home') },
    { id: 'missions', label: t('tabs.missions'), icon: 'missions', action: () => onNavigate('missions') },
    { id: 'minigame', label: t('tabs.minigame'), icon: 'minigame', action: () => onNavigate('minigame') },
    { id: 'ranking', label: t('tabs.ranking'), icon: 'ranking', action: () => onNavigate('ranking') },
    { id: 'collection', label: t('tabs.collection'), icon: 'collection', action: () => onNavigate('collection') },
    { id: 'inventory', label: t('inventory.title'), icon: 'inventory', action: () => setEditingSlot(0) },
    { id: 'community', label: t('tabs.friends'), icon: 'community', action: () => onNavigate('community') },
    { id: 'battle', label: t('tabs.battle'), icon: 'battle', action: () => onNavigate('battle') },
    { id: 'settings', label: t('tabs.settings'), icon: 'settings', action: () => onNavigate('settings') }
  ]

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

        <aside className="dash-hud-side" aria-label="Dashboard navigation">
          <div className="dash-hud-avatar">
            <img className="hud-icon hud-icon--large" src={HUD_ICON_SRC.dino} alt="" draggable={false} />
            <span>{displayName}</span>
          </div>
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`dash-hud-nav-btn${item.id === 'home' ? ' active' : ''}`}
              onClick={item.action}
              title={item.label}
              aria-label={item.label}
            >
              <img
                className="hud-icon"
                src={HUD_ICON_SRC[item.icon]}
                alt=""
                draggable={false}
              />
            </button>
          ))}
        </aside>

        <section className="dash-hud-top" aria-label={t('home.todayActivity')}>
          <div className="dash-hud-counter">
            <span>{t('home.clicks')}</span>
            <strong>{save.activity.clicks.toLocaleString()}</strong>
          </div>
          <div className="dash-hud-counter">
            <span>{t('home.typing')}</span>
            <strong>{save.activity.keystrokes.toLocaleString()}</strong>
          </div>
          <div className="dash-hud-counter">
            <span>{t('home.activityScore')}</span>
            <strong>{activityScore.toLocaleString()}</strong>
          </div>
        </section>

        <section className="dash-hud-status" aria-label="Pet status">
          <div className="dash-hud-nameplate">
            <span>{pet.name}</span>
            <strong>
              {getStageLabel(pet.stage)} Lv.{getPetLevel(pet.stage, pet.stats.devPoints)}
            </strong>
          </div>
          <div className="dash-hud-status-body">
            <div className="hud-bar hud-bar--hp">
              <span>{t('home.health')}</span>
              <div><i style={{ width: statPercent(pet.stats.hp, 100) }} /></div>
              <b>{pet.stats.hp}/100</b>
            </div>
            <div className="hud-bar hud-bar--mood">
              <span>{t('home.emotion')}</span>
              <div><i style={{ width: statPercent(pet.stats.mood, 100) }} /></div>
              <b>{pet.stats.mood}/100</b>
            </div>
            <div className="hud-bar hud-bar--xp">
              <span>{t('home.evolution')}</span>
              <div><i style={{ width: statPercent(pet.stats.devPoints, 999) }} /></div>
              <b>{pet.stats.devPoints}/999</b>
            </div>
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
          </div>
        </section>

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
