import type { BattleActionType } from './types'
import {
  BASE_BITE,
  BASE_JUMP,
  BASE_TAILWHIP,
  BASE_ULTIMATE,
  SHIELD_REDUCTION,
  TAILWHIP_VS_SHIELD_REDUCTION
} from './constants'

export interface CalcDamageInput {
  /** The effective (already-resolved) action; pass 'ultimate' only once energy is confirmed ready. */
  action: BattleActionType
  defenderDefending: boolean
  /** Defaults to random 0.9–1.1 when omitted */
  randomFactor?: number
}

export function randomDamageFactor(): number {
  return 0.9 + Math.random() * 0.2
}

function baseDamageFor(action: BattleActionType): number {
  if (action === 'ultimate') return BASE_ULTIMATE
  if (action === 'jump') return BASE_JUMP
  if (action === 'tailwhip') return BASE_TAILWHIP
  return BASE_BITE
}

export function calcDamage(input: CalcDamageInput): number {
  const { action, defenderDefending } = input
  if (action === 'shield' || action === 'avoid' || action === 'flee' || action === 'defend') return 0

  const base = baseDamageFor(action)
  const randomFactor = input.randomFactor ?? randomDamageFactor()
  let damage = Math.round(base * randomFactor)
  if (defenderDefending) {
    const reduction = action === 'tailwhip' ? TAILWHIP_VS_SHIELD_REDUCTION : SHIELD_REDUCTION
    damage = Math.round(damage * reduction)
  }
  return damage
}
