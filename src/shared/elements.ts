import type { Element } from './types'
import { ELEMENT_STRONG_AGAINST, ELEMENT_WEAK_AGAINST } from './constants'

export function getElementMultiplier(attacker: Element, defender: Element): number {
  if (ELEMENT_STRONG_AGAINST[attacker] === defender) return 1.5
  if (ELEMENT_WEAK_AGAINST[attacker] === defender) return 0.75
  return 1.0
}

export function getElementRelation(attacker: Element, defender: Element): string {
  if (ELEMENT_STRONG_AGAINST[attacker] === defender) return 'super'
  if (ELEMENT_WEAK_AGAINST[attacker] === defender) return 'weak'
  return 'neutral'
}
