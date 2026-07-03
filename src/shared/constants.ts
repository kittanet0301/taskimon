import type { Element, Species } from './types'

export const ELEMENT_NAMES: Record<Element, string> = {
  fire: 'ไฟ',
  water: 'น้ำ',
  earth: 'ดิน',
  wind: 'ลม',
  nature: 'ธรรมชาติ'
}

export const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#e74c3c',
  water: '#3498db',
  earth: '#a0714f',
  wind: '#95a5a6',
  nature: '#27ae60'
}

export const SPECIES_NAMES: Record<Species, string> = {
  mamono: 'มาโมโน',
  avian: 'อเวี่ยน',
  aquatic: 'อะควาติก',
  mythic: 'มิธิค'
}

/** Fire > Nature > Earth > Wind > Water > Fire */
export const ELEMENT_STRONG_AGAINST: Record<Element, Element> = {
  fire: 'nature',
  nature: 'earth',
  earth: 'wind',
  wind: 'water',
  water: 'fire'
}

export const ELEMENT_WEAK_AGAINST: Record<Element, Element> = {
  fire: 'water',
  water: 'nature',
  earth: 'fire',
  wind: 'earth',
  nature: 'wind'
}

export const SAVE_VERSION = 1
export const DEV_POINTS_ADULT = 500
export const ADULT_MIN_HOURS = 48
export const CLICKS_PER_DEV = 100
export const KEYS_PER_DEV = 500
export const MAX_DEV_PER_HOUR = 10

export const ITEM_LABELS: Record<string, string> = {
  food_basic: 'อาหารธรรมดา',
  food_premium: 'อาหารพรีเมียม',
  medicine: 'ยารักษา',
  toy: 'ของเล่น',
  dev_vitamin: 'วิตามินพัฒนาร่าง',
  element_shield: 'โล่ธาตุ'
}
