import { elementMultiplier, pureBonus, type ElementId } from '../elements'
import { getSkillDef, skillPower } from './skillTrees'
import { BASE_ATTACK_POWER, DEFEND_REDUCTION, SHIELD_ITEM_REDUCTION } from './constants'

export interface CalcDamageInput {
  /** Basic attack or skill path id */
  mode: 'attack' | 'skill'
  skillId?: string
  skillRank?: number
  attackerStr: number
  attackerInt: number
  defenderDef: number
  attackerElement: ElementId
  defenderElementPrimary: ElementId
  defenderElementSecondary: ElementId | null
  attackerPure: boolean
  defenderDefending: boolean
  /** Extra reduction from battle_shield item this turn */
  shieldItem?: boolean
  randomFactor?: number
}

export function randomDamageFactor(): number {
  return 0.9 + Math.random() * 0.2
}

export function calcDamage(input: CalcDamageInput): number {
  const {
    mode,
    skillId,
    skillRank = 1,
    attackerStr,
    attackerInt,
    defenderDef,
    attackerElement,
    defenderElementPrimary,
    defenderElementSecondary,
    attackerPure,
    defenderDefending,
    shieldItem = false
  } = input

  let power = BASE_ATTACK_POWER
  let atkElement = attackerElement
  if (mode === 'skill' && skillId) {
    const def = getSkillDef(skillId)
    if (!def) return 0
    if (def.power <= 0) return 0
    power = skillPower(def, skillRank)
    atkElement = def.element
  }

  const atkStat = mode === 'attack' ? attackerStr : Math.round((attackerStr + attackerInt) / 2)
  const elemMult = elementMultiplier(atkElement, defenderElementPrimary, defenderElementSecondary)
  const pBonus = attackerPure ? pureBonus(attackerElement, null) : 1
  const randomFactor = input.randomFactor ?? randomDamageFactor()

  let damage = Math.round(
    power * (atkStat / Math.max(defenderDef, 1)) * elemMult * pBonus * randomFactor
  )

  if (defenderDefending) {
    damage = Math.round(damage * DEFEND_REDUCTION)
  }
  if (shieldItem) {
    damage = Math.round(damage * SHIELD_ITEM_REDUCTION)
  }
  return Math.max(0, damage)
}
