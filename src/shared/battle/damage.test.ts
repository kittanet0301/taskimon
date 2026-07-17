import { describe, expect, it } from 'vitest'
import {
  BASE_BITE,
  BASE_JUMP,
  BASE_TAILWHIP,
  BASE_ULTIMATE,
  SHIELD_REDUCTION,
  TAILWHIP_VS_SHIELD_REDUCTION
} from './constants'
import { calcDamage } from './damage'

describe('calcDamage', () => {
  it('returns zero for non-damaging actions', () => {
    expect(calcDamage({ action: 'shield', defenderDefending: false })).toBe(0)
    expect(calcDamage({ action: 'avoid', defenderDefending: false })).toBe(0)
    expect(calcDamage({ action: 'flee', defenderDefending: false })).toBe(0)
  })

  it('uses the base damage values for each attack variant', () => {
    expect(calcDamage({ action: 'bite', defenderDefending: false, randomFactor: 1 })).toBe(BASE_BITE)
    expect(calcDamage({ action: 'jump', defenderDefending: false, randomFactor: 1 })).toBe(BASE_JUMP)
    expect(calcDamage({ action: 'tailwhip', defenderDefending: false, randomFactor: 1 })).toBe(
      BASE_TAILWHIP
    )
    expect(calcDamage({ action: 'ultimate', defenderDefending: false, randomFactor: 1 })).toBe(
      BASE_ULTIMATE
    )
  })

  it('reduces damage when the defender is shielding', () => {
    const guarded = calcDamage({
      action: 'bite',
      defenderDefending: true,
      randomFactor: 1
    })

    expect(guarded).toBe(Math.round(BASE_BITE * SHIELD_REDUCTION))
  })

  it('tail whip pierces through some of the shield reduction', () => {
    const guarded = calcDamage({
      action: 'tailwhip',
      defenderDefending: true,
      randomFactor: 1
    })

    expect(guarded).toBe(Math.round(BASE_TAILWHIP * TAILWHIP_VS_SHIELD_REDUCTION))
  })
})
