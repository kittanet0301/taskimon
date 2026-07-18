import type { MissionDefinition } from './missions'
import type { ItemType } from './types'

export const ITEM_ICON_SRC: Record<ItemType, string> = {
  food_basic: '/ui/item-food-basic.png',
  food_premium: '/ui/item-food-premium.png',
  medicine: '/ui/item-medicine.png',
  water: '/ui/item-water.png',
  toy: '/ui/item-toy.png',
  dev_vitamin: '/ui/item-dev-vitamin.png',
  battle_shield: '/ui/item-battle-shield.png',
  breed_nest: '/ui/item-dev-vitamin.png',
  skill_forget: '/ui/item-medicine.png'
}

/** Pixel icon for mission rewards. Returns null for emotion/slots (custom UI glyphs). */
export function missionRewardIconSrc(def: MissionDefinition): string | null {
  const reward = def.reward
  if ('type' in reward) return ITEM_ICON_SRC[reward.type]
  if ('evolution' in reward) return ITEM_ICON_SRC.dev_vitamin
  if ('newEgg' in reward) return '/ui/hud-icon-collection.png'
  if ('emotion' in reward || 'slots' in reward) return null
  return null
}

export const ALL_ITEM_TYPES: ItemType[] = [
  'food_basic',
  'food_premium',
  'medicine',
  'water',
  'toy',
  'dev_vitamin',
  'battle_shield',
  'breed_nest',
  'skill_forget'
]
