import { describe, expect, it } from 'vitest'
import {
  BASE_ATTACK_POWER,
  DEFEND_REDUCTION,
  SHIELD_ITEM_REDUCTION
} from './constants'
import {
  ELEMENT_RESIST_MULT,
  ELEMENT_SE_MULT,
  PURE_DAMAGE_BONUS
} from '../elements'
import { calcDamage } from './damage'
import { getSkillDef, skillPower } from './skillTrees'

const baseAttack = {
  mode: 'attack' as const,
  attackerStr: 30,
  attackerInt: 20,
  defenderDef: 20,
  attackerElement: 'fire' as const,
  defenderElementPrimary: 'neutral' as const,
  defenderElementSecondary: null,
  attackerPure: true,
  defenderDefending: false,
  randomFactor: 1
}

describe('calcDamage (RPG)', () => {
  it('computes deterministic pure basic attack damage', () => {
    const dmg = calcDamage(baseAttack)
    const expected = Math.round(
      BASE_ATTACK_POWER * (baseAttack.attackerStr / baseAttack.defenderDef) * PURE_DAMAGE_BONUS
    )
    expect(dmg).toBe(expected)
  })

  it('drops the pure bonus when attacker has a dual element', () => {
    const dmg = calcDamage({ ...baseAttack, attackerPure: false })
    const expected = Math.round(
      BASE_ATTACK_POWER * (baseAttack.attackerStr / baseAttack.defenderDef)
    )
    expect(dmg).toBe(expected)
  })

  it('applies SE multiplier when attacker element is strong vs defender', () => {
    // fire is strong against grass
    const dmg = calcDamage({
      ...baseAttack,
      defenderElementPrimary: 'grass'
    })
    const expected = Math.round(
      BASE_ATTACK_POWER *
        (baseAttack.attackerStr / baseAttack.defenderDef) *
        ELEMENT_SE_MULT *
        PURE_DAMAGE_BONUS
    )
    expect(dmg).toBe(expected)
  })

  it('applies resist multiplier when attacker element is weak vs defender', () => {
    // fire is weak against water
    const dmg = calcDamage({
      ...baseAttack,
      defenderElementPrimary: 'water'
    })
    const expected = Math.round(
      BASE_ATTACK_POWER *
        (baseAttack.attackerStr / baseAttack.defenderDef) *
        ELEMENT_RESIST_MULT *
        PURE_DAMAGE_BONUS
    )
    expect(dmg).toBe(expected)
  })

  it('treats dual defender as SE if attacker is strong vs either slot', () => {
    // fire vs (neutral / grass): grass is weak to fire → SE
    const dmg = calcDamage({
      ...baseAttack,
      defenderElementPrimary: 'neutral',
      defenderElementSecondary: 'grass'
    })
    const expected = Math.round(
      BASE_ATTACK_POWER *
        (baseAttack.attackerStr / baseAttack.defenderDef) *
        ELEMENT_SE_MULT *
        PURE_DAMAGE_BONUS
    )
    expect(dmg).toBe(expected)
  })

  it('reduces damage by DEFEND_REDUCTION when defender is defending', () => {
    const raw = calcDamage(baseAttack)
    const guarded = calcDamage({ ...baseAttack, defenderDefending: true })
    expect(guarded).toBe(Math.round(raw * DEFEND_REDUCTION))
  })

  it('stacks the battle_shield item reduction on top of defending', () => {
    const raw = calcDamage(baseAttack)
    const shielded = calcDamage({
      ...baseAttack,
      defenderDefending: true,
      shieldItem: true
    })
    // The engine applies the two reductions sequentially, each rounding to int.
    const guarded = Math.round(raw * DEFEND_REDUCTION)
    const expected = Math.round(guarded * SHIELD_ITEM_REDUCTION)
    expect(shielded).toBe(expected)
  })

  it('uses skill power scaled by rank for damaging skills', () => {
    const def = getSkillDef('fire_flame_rush')!
    expect(def).toBeTruthy()

    for (const rank of [1, 3, 8]) {
      const dmg = calcDamage({
        ...baseAttack,
        mode: 'skill',
        skillId: def.pathId,
        skillRank: rank
      })
      const power = skillPower(def, rank)
      // Skill mode uses averaged STR+INT for atkStat
      const atkStat = Math.round((baseAttack.attackerStr + baseAttack.attackerInt) / 2)
      const expected = Math.round(
        power * (atkStat / baseAttack.defenderDef) * PURE_DAMAGE_BONUS
      )
      expect(dmg).toBe(expected)
    }
  })

  it('non-damaging role skills (guard/dodge/support) deal zero damage', () => {
    for (const id of ['fire_heat_guard', 'fire_smoke_step', 'fire_kindling']) {
      const dmg = calcDamage({
        ...baseAttack,
        mode: 'skill',
        skillId: id
      })
      expect(dmg).toBe(0)
    }
  })

  it('mark-role skills deal chip damage using their base power', () => {
    const def = getSkillDef('fire_cinder_mark')!
    const dmg = calcDamage({
      ...baseAttack,
      mode: 'skill',
      skillId: def.pathId,
      defenderElementPrimary: 'grass'
    })
    const power = skillPower(def, 1)
    const atkStat = Math.round((baseAttack.attackerStr + baseAttack.attackerInt) / 2)
    const expected = Math.round(
      power * (atkStat / baseAttack.defenderDef) * ELEMENT_SE_MULT * PURE_DAMAGE_BONUS
    )
    expect(dmg).toBe(expected)
  })

  it('returns 0 for unknown skill ids', () => {
    const dmg = calcDamage({
      ...baseAttack,
      mode: 'skill',
      skillId: 'not_a_real_skill'
    })
    expect(dmg).toBe(0)
  })
})
