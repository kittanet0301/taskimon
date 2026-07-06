import type { CyclicalElement, Element } from './types'
export {
  tElement as ELEMENT_NAMES,
  tSpecies as SPECIES_NAMES,
  tItemLabel as ITEM_LABELS
} from '../i18n/labels'

export const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#e74c3c',
  water: '#3498db',
  earth: '#a0714f',
  wind: '#95a5a6',
  neutral: '#7f8c8d'
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

