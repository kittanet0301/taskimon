import type { Element } from '../types'
import { getElementMultiplier } from '../elements'
import type { BattleActionType } from './types'
import { BASE_ATTACK, BASE_ULTIMATE, DEFEND_REDUCTION } from './constants'

export interface CalcDamageInput {
  action: BattleActionType
  attackerElement: Element
  defenderElement: Element
  defenderDefending: boolean
  /** Defaults to random 0.9–1.1 when omitted */
  randomFactor?: number
}

export function randomDamageFactor(): number {
  return 0.9 + Math.random() * 0.2
}

export function calcDamage(input: CalcDamageInput): number {
  const { action, attackerElement, defenderElement, defenderDefending } = input
  if (action === 'defend' || action === 'flee') return 0

  const base = action === 'ultimate' ? BASE_ULTIMATE : BASE_ATTACK
  const multiplier = getElementMultiplier(attackerElement, defenderElement)
  const randomFactor = input.randomFactor ?? randomDamageFactor()
  let damage = Math.round(base * multiplier * randomFactor)
  if (defenderDefending) damage = Math.round(damage * DEFEND_REDUCTION)
  return damage
}
