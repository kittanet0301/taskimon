import type { CyclicalElement, Element, Species } from './types'

export const ELEMENT_NAMES: Record<Element, string> = {
  fire: 'ไฟ',
  water: 'น้ำ',
  earth: 'ดิน',
  wind: 'ลม',
  neutral: 'กลาง'
}

export const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#e74c3c',
  water: '#3498db',
  earth: '#a0714f',
  wind: '#95a5a6',
  neutral: '#7f8c8d'
}

export const SPECIES_NAMES: Record<Species, string> = {
  mamono: 'มาโมโน',
  avian: 'อเวี่ยน',
  aquatic: 'อะควาติก',
  mythic: 'มิธิค'
}

/** Fire → Earth → Wind → Water → Fire (neutral excluded) */
export const ELEMENT_STRONG_AGAINST: Record<CyclicalElement, CyclicalElement> = {
  fire: 'earth',
  earth: 'wind',
  wind: 'water',
  water: 'fire'
}

export const ELEMENT_WEAK_AGAINST: Record<CyclicalElement, CyclicalElement> = {
  fire: 'water',
  water: 'wind',
  wind: 'earth',
  earth: 'fire'
}

export const SAVE_VERSION = 1
export const DEV_POINTS_ADULT = 500
export const ADULT_MIN_HOURS = 48
export const CLICKS_PER_DEV = 100
export const KEYS_PER_DEV = 500
export const MAX_DEV_PER_HOUR = 10
export const RESET_SYSTEM_PIN = '1234'

export const ITEM_LABELS: Record<string, string> = {
  food_basic: 'ผัก',
  food_premium: 'อาหารกระป๋อง',
  medicine: 'ยา',
  water: 'น้ำ',
  toy: 'ของเล่น',
  dev_vitamin: 'วิตามินพัฒนาร่าง',
  element_shield: 'โล่ธาตุ'
}
