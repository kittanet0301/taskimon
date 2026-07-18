import { describe, expect, it } from 'vitest'
import {
  canEnterBattle,
  elementMultiplier,
  pureBonus,
  rollElementSlots
} from './elements'

describe('elements', () => {
  it('applies SE / resist / neutral multipliers', () => {
    expect(elementMultiplier('fire', 'grass', null)).toBe(1.5)
    expect(elementMultiplier('fire', 'water', null)).toBe(0.75)
    expect(elementMultiplier('fire', 'electric', null)).toBe(1)
  })

  it('treats dual defenders as SE if either slot is weak', () => {
    expect(elementMultiplier('fire', 'electric', 'grass')).toBe(1.5)
  })

  it('requires both dual slots to resist for NVE', () => {
    // water resists fire; electric does not resist fire → neutral
    expect(elementMultiplier('fire', 'water', 'electric')).toBe(1)
    // both water and ice? ice does not resist fire. Use water+water-like: water resists fire,
    // and only water-type strong against fire among dual that both resist fire.
    // grass is weak to fire (does not resist). ground does not resist fire.
    // For both to resist fire, each must have fire in strong-against. Only water has fire.
    // So pure water is the resist case; dual cannot both resist fire with current chart.
    expect(elementMultiplier('dragon', 'ice', null)).toBe(0.75)
  })

  it('gives pure pets a 1.25 damage bonus', () => {
    expect(pureBonus('fire', null)).toBe(1.25)
    expect(pureBonus('fire', 'water')).toBe(1)
  })

  it('gates battle entry on care health/emotion', () => {
    expect(canEnterBattle(30, 30)).toBe(true)
    expect(canEnterBattle(29, 30)).toBe(false)
    expect(canEnterBattle(30, 29)).toBe(false)
  })

  it('rolls pure or dual slots with distinct dual elements', () => {
    const pure = rollElementSlots(() => 0.1) // < 0.6 → pure after primary pick
    // First call uses rng for pick index, second for pure chance.
    // With constant 0.1: primary = ELEMENT_IDS[floor(0.1*9)] = fire index 0; pure chance 0.1 < 0.6
    expect(pure.elementSecondary).toBeNull()

    let n = 0
    const dualRng = () => {
      // sequence crafted so first pick, then dual branch, then secondary different
      const values = [0.0, 0.9, 0.5]
      return values[Math.min(n++, values.length - 1)]!
    }
    const dual = rollElementSlots(dualRng)
    expect(dual.elementSecondary).not.toBeNull()
    expect(dual.elementSecondary).not.toBe(dual.elementPrimary)
  })
})
