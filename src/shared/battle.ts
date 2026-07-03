import type { BattleAction, BattleResult, Element, PetData } from './types'
import { getElementMultiplier } from './elements'

const BASE_ATTACK = 15
const BASE_SKILL = 25

interface BattlePet {
  id: string
  name: string
  element: Element
  hp: number
  skillUsed: boolean
  defending: boolean
}

function calcDamage(attacker: BattlePet, defender: BattlePet, action: BattleAction): number {
  if (action.type === 'defend') return 0
  const base = action.type === 'skill' ? BASE_SKILL : BASE_ATTACK
  const multiplier = getElementMultiplier(attacker.element, defender.element)
  const randomFactor = 0.9 + Math.random() * 0.2
  let damage = Math.round(base * multiplier * randomFactor)
  if (defender.defending) damage = Math.round(damage * 0.5)
  return damage
}

export function simulateBattle(
  challenger: PetData,
  defender: PetData,
  challengerActions: BattleAction[],
  defenderActions: BattleAction[]
): BattleResult {
  const log: string[] = []
  const c: BattlePet = {
    id: challenger.id,
    name: challenger.name,
    element: challenger.element,
    hp: challenger.stats.hp,
    skillUsed: false,
    defending: false
  }
  const d: BattlePet = {
    id: defender.id,
    name: defender.name,
    element: defender.element,
    hp: defender.stats.hp,
    skillUsed: false,
    defending: false
  }

  const rounds = Math.max(challengerActions.length, defenderActions.length, 3)
  for (let i = 0; i < rounds; i++) {
    const cAction = challengerActions[i] ?? { type: 'attack' }
    const dAction = defenderActions[i] ?? { type: 'attack' }

    c.defending = cAction.type === 'defend'
    d.defending = dAction.type === 'defend'

    if (cAction.type === 'skill' && c.skillUsed) {
      log.push(`${c.name} ใช้สกิลไม่ได้แล้ว — โจมตีแทน`)
      const dmg = calcDamage(c, d, { type: 'attack' })
      d.hp = Math.max(0, d.hp - dmg)
      log.push(`${c.name} โจมตี ${d.name} -${dmg} HP`)
    } else {
      if (cAction.type === 'skill') c.skillUsed = true
      const dmg = calcDamage(c, d, cAction)
      if (cAction.type === 'defend') {
        log.push(`${c.name} ตั้งท่าป้องกัน`)
      } else {
        d.hp = Math.max(0, d.hp - dmg)
        log.push(`${c.name} ${cAction.type === 'skill' ? 'ใช้สกิล' : 'โจมตี'} ${d.name} -${dmg} HP`)
      }
    }

    if (d.hp <= 0) break

    if (dAction.type === 'skill' && d.skillUsed) {
      const dmg = calcDamage(d, c, { type: 'attack' })
      c.hp = Math.max(0, c.hp - dmg)
      log.push(`${d.name} โจมตี ${c.name} -${dmg} HP`)
    } else {
      if (dAction.type === 'skill') d.skillUsed = true
      const dmg = calcDamage(d, c, dAction)
      if (dAction.type === 'defend') {
        log.push(`${d.name} ตั้งท่าป้องกัน`)
      } else {
        c.hp = Math.max(0, c.hp - dmg)
        log.push(`${d.name} ${dAction.type === 'skill' ? 'ใช้สกิล' : 'โจมตี'} ${c.name} -${dmg} HP`)
      }
    }

    if (c.hp <= 0) break
  }

  let winnerPetId = c.id
  if (c.hp < d.hp) winnerPetId = d.id
  else if (c.hp === d.hp) winnerPetId = Math.random() < 0.5 ? c.id : d.id

  log.push(`ผู้ชนะ: ${winnerPetId === c.id ? c.name : d.name}`)
  return {
    winnerPetId,
    log,
    challengerHp: c.hp,
    defenderHp: d.hp
  }
}

export function randomBattleActions(): BattleAction[] {
  const options: BattleAction[] = [
    { type: 'attack' },
    { type: 'defend' },
    { type: 'skill' }
  ]
  return Array.from({ length: 3 }, () => options[Math.floor(Math.random() * options.length)])
}
