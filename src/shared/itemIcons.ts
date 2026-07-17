import type { ItemType } from './types'

export const ITEM_ICON_SRC: Record<ItemType, string> = {
  food_basic: '/ui/item-food-basic.png',
  food_premium: '/ui/item-food-premium.png',
  medicine: '/ui/item-medicine.png',
  water: '/ui/item-water.png',
  toy: '/ui/item-toy.png',
  dev_vitamin: '/ui/item-dev-vitamin.png',
  battle_shield: '/ui/item-battle-shield.png'
}

export const ALL_ITEM_TYPES: ItemType[] = [
  'food_basic',
  'food_premium',
  'medicine',
  'water',
  'toy',
  'dev_vitamin',
  'battle_shield'
]
