import type { CyclicalElement, Element } from './types'
import { ELEMENT_STRONG_AGAINST, ELEMENT_WEAK_AGAINST } from './constants'

export function getElementMultiplier(attacker: Element, defender: Element): number {
  if (attacker === 'neutral' || defender === 'neutral') return 1.0
  const atk = attacker as CyclicalElement
  if (ELEMENT_STRONG_AGAINST[atk] === defender) return 2.0
  if (ELEMENT_WEAK_AGAINST[atk] === defender) return 0.5
  return 1.0
}

export function getElementRelation(attacker: Element, defender: Element): string {
  if (attacker === 'neutral' || defender === 'neutral') return 'neutral'
  const atk = attacker as CyclicalElement
  if (ELEMENT_STRONG_AGAINST[atk] === defender) return 'super'
  if (ELEMENT_WEAK_AGAINST[atk] === defender) return 'weak'
  return 'neutral'
}
