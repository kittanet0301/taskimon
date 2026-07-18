import type { PetData } from '../types'
import type { BattleActionType, BattleResult, LegacyBattleAction } from './types'
import { calcDamage, randomDamageFactor } from './damage'
import {
  formatActionMessage,
  formatDefendMessage,
  formatUltimateFallbackMessage,
  formatWinnerMessage
} from './formatLog'
import { normalizeElementId } from '../elements'
import { ultimateFor } from './skillTrees'

interface BattlePet {
  id: string
  name: string
  character: PetData['character']
  pet: PetData
  hp: number
  ultimateUsed: boolean
  defending: boolean
}

function toLegacyAction(action: LegacyBattleAction): BattleActionType {
  if (action.type === 'skill') return 'ultimate'
  return action.type
}

function calcLegacyDamage(
  attacker: BattlePet,
  defender: BattlePet,
  action: LegacyBattleAction
): number {
  const aPet = attacker.pet
  const dPet = defender.pet
  const attackerElement = normalizeElementId(aPet.elementPrimary)
  const isSkill = action.type === 'skill'
  const skillId = isSkill ? ultimateFor(attackerElement).pathId : undefined
  return calcDamage({
    mode: isSkill ? 'skill' : 'attack',
    skillId,
    skillRank: 1,
    attackerStr: aPet.primaries?.str ?? 20,
    attackerInt: aPet.primaries?.int ?? 20,
    defenderDef: Math.max(1, dPet.primaries?.con ?? 20),
    attackerElement,
    defenderElementPrimary: normalizeElementId(dPet.elementPrimary),
    defenderElementSecondary: dPet.elementSecondary
      ? normalizeElementId(dPet.elementSecondary)
      : null,
    attackerPure: aPet.elementSecondary == null,
    defenderDefending: defender.defending,
    randomFactor: randomDamageFactor()
  })
}

/** @deprecated Use async battle RPC. Kept for existing simulateBattle IPC. */
export function simulateBattle(
  challenger: PetData,
  defender: PetData,
  challengerActions: LegacyBattleAction[],
  defenderActions: LegacyBattleAction[]
): BattleResult {
  const log: string[] = []
  const c: BattlePet = {
    id: challenger.id,
    name: challenger.name,
    character: challenger.character,
    pet: challenger,
    hp: challenger.stats.health,
    ultimateUsed: false,
    defending: false
  }
  const d: BattlePet = {
    id: defender.id,
    name: defender.name,
    character: defender.character,
    pet: defender,
    hp: defender.stats.health,
    ultimateUsed: false,
    defending: false
  }

  const rounds = Math.max(challengerActions.length, defenderActions.length, 3)
  for (let i = 0; i < rounds; i++) {
    const cAction = challengerActions[i] ?? { type: 'attack' as const }
    const dAction = defenderActions[i] ?? { type: 'attack' as const }

    c.defending = cAction.type === 'defend'
    d.defending = dAction.type === 'defend'

    if (cAction.type === 'skill' && c.ultimateUsed) {
      const dmg = calcLegacyDamage(c, d, { type: 'attack' })
      d.hp = Math.max(0, d.hp - dmg)
      log.push(formatUltimateFallbackMessage(c.name, d.name, dmg))
    } else {
      if (cAction.type === 'skill') c.ultimateUsed = true
      const dmg = calcLegacyDamage(c, d, cAction)
      if (cAction.type === 'defend') {
        log.push(formatDefendMessage(c.name))
      } else {
        d.hp = Math.max(0, d.hp - dmg)
        const action = toLegacyAction(cAction)
        log.push(formatActionMessage(c.name, d.name, action, dmg, c.character))
      }
    }

    if (d.hp <= 0) break

    if (dAction.type === 'skill' && d.ultimateUsed) {
      const dmg = calcLegacyDamage(d, c, { type: 'attack' })
      c.hp = Math.max(0, c.hp - dmg)
      log.push(formatUltimateFallbackMessage(d.name, c.name, dmg))
    } else {
      if (dAction.type === 'skill') d.ultimateUsed = true
      const dmg = calcLegacyDamage(d, c, dAction)
      if (dAction.type === 'defend') {
        log.push(formatDefendMessage(d.name))
      } else {
        c.hp = Math.max(0, c.hp - dmg)
        const action = toLegacyAction(dAction)
        log.push(formatActionMessage(d.name, c.name, action, dmg, d.character))
      }
    }

    if (c.hp <= 0) break
  }

  let winnerPetId = c.id
  if (c.hp < d.hp) winnerPetId = d.id
  else if (c.hp === d.hp) winnerPetId = Math.random() < 0.5 ? c.id : d.id

  log.push(formatWinnerMessage(winnerPetId === c.id ? c.name : d.name))
  return {
    winnerPetId,
    log,
    challengerHp: c.hp,
    defenderHp: d.hp
  }
}

/** @deprecated Use submitBattleAction RPC. */
export function randomBattleActions(): LegacyBattleAction[] {
  const options: LegacyBattleAction[] = [{ type: 'attack' }, { type: 'defend' }, { type: 'skill' }]
  return Array.from({ length: 3 }, () => options[Math.floor(Math.random() * options.length)])
}

export * from './types'
export * from './constants'
export * from './damage'
export * from './engine'
export * from './rewards'
export * from './formatLog'
export * from './mappers'
