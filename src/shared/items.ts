import type { ItemType, PetStats } from './types'
import { addDevPoints, clampStat, feedPet, healPet } from './stats'

export interface ItemDefinition {
  type: ItemType
  apply: (stats: PetStats) => PetStats
}

export const ITEMS: Record<ItemType, ItemDefinition> = {
  food_basic: {
    type: 'food_basic',
    apply: (stats) => feedPet(stats, 15)
  },
  food_premium: {
    type: 'food_premium',
    apply: (stats) => healPet(feedPet(stats, 30), 10)
  },
  medicine: {
    type: 'medicine',
    apply: (stats) => healPet(stats, 40)
  },
  water: {
    type: 'water',
    apply: (stats) => healPet(feedPet(stats, 10), 5)
  },
  toy: {
    type: 'toy',
    apply: (stats) => feedPet(stats, 25)
  },
  dev_vitamin: {
    type: 'dev_vitamin',
    apply: (stats) => addDevPoints(stats, 50)
  },
  element_shield: {
    type: 'element_shield',
    apply: (stats) => stats
  }
}

export function useItem(type: ItemType, stats: PetStats): PetStats {
  return ITEMS[type].apply(stats)
}

export function getDefaultInventory(): { type: ItemType; quantity: number }[] {
  return [
    { type: 'food_basic', quantity: 2 },
    { type: 'water', quantity: 2 },
    { type: 'medicine', quantity: 1 }
  ]
}

/** Quick Care buttons on the home dashboard — one slot per item type. */
export const QUICK_CARE_ITEMS: { type: ItemType; emoji: string }[] = [
  { type: 'food_basic', emoji: '🥬' },
  { type: 'food_premium', emoji: '🥫' },
  { type: 'medicine', emoji: '💊' },
  { type: 'water', emoji: '💧' },
  { type: 'toy', emoji: '🎾' }
]
