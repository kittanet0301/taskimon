import type { ItemType, PetStats } from './types'
import { addDevPoints, clampStat, feedPet, healPet } from './stats'

export interface ItemDefinition {
  type: ItemType
  label: string
  description: string
  apply: (stats: PetStats) => PetStats
}

export const ITEMS: Record<ItemType, ItemDefinition> = {
  food_basic: {
    type: 'food_basic',
    label: 'ผัก',
    description: 'อารมณ์ +15',
    apply: (stats) => feedPet(stats, 15)
  },
  food_premium: {
    type: 'food_premium',
    label: 'อาหารกระป๋อง',
    description: 'อารมณ์ +30, HP +10',
    apply: (stats) => healPet(feedPet(stats, 30), 10)
  },
  medicine: {
    type: 'medicine',
    label: 'ยา',
    description: 'HP +40',
    apply: (stats) => healPet(stats, 40)
  },
  water: {
    type: 'water',
    label: 'น้ำ',
    description: 'อารมณ์ +10, HP +5',
    apply: (stats) => healPet(feedPet(stats, 10), 5)
  },
  toy: {
    type: 'toy',
    label: 'ของเล่น',
    description: 'อารมณ์ +25',
    apply: (stats) => feedPet(stats, 25)
  },
  dev_vitamin: {
    type: 'dev_vitamin',
    label: 'วิตามินพัฒนาร่าง',
    description: 'พัฒนาร่าง +50',
    apply: (stats) => addDevPoints(stats, 50)
  },
  element_shield: {
    type: 'element_shield',
    label: 'โล่ธาตุ',
    description: 'ใช้ในต่อสู้ — ลด damage 50%',
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
