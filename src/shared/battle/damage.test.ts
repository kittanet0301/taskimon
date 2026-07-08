import { describe, expect, it } from 'vitest'
import { BASE_ATTACK, BASE_ULTIMATE, DEFEND_REDUCTION } from './constants'
import { calcDamage } from './damage'

describe('calcDamage', () => {
  it('returns zero for non-damaging actions', () => {
    expect(calcDamage({ action: 'defend', defenderDefending: false })).toBe(0)
    expect(calcDamage({ action: 'flee', defenderDefending: false })).toBe(0)
  })

  it('uses the base attack values for attack and ultimate moves', () => {
    expect(calcDamage({ action: 'attack', defenderDefending: false, randomFactor: 1 })).toBe(
      BASE_ATTACK
    )
    expect(calcDamage({ action: 'ultimate', defenderDefending: false, randomFactor: 1 })).toBe(
      BASE_ULTIMATE
    )
  })

  it('reduces damage when the defender is guarding', () => {
    const guarded = calcDamage({
      action: 'attack',
      defenderDefending: true,
      randomFactor: 1
    })

    expect(guarded).toBe(Math.round(BASE_ATTACK * DEFEND_REDUCTION))
  })
})
