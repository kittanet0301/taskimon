import type { BattleActionType, BattleSessionState } from './types'
import {
  AVOID_DODGE_CHANCE,
  ENERGY_GAIN_AVOID_MAX,
  ENERGY_GAIN_AVOID_MIN,
  ENERGY_GAIN_BITE_MAX,
  ENERGY_GAIN_BITE_MIN,
  ENERGY_GAIN_JUMP_MAX,
  ENERGY_GAIN_JUMP_MIN,
  ENERGY_GAIN_SHIELD_MAX,
  ENERGY_GAIN_SHIELD_MIN,
  ENERGY_GAIN_TAILWHIP_MAX,
  ENERGY_GAIN_TAILWHIP_MIN,
  ULTIMATE_ENERGY_MAX
} from './constants'
import { calcDamage } from './damage'
import {
  formatActionMessage,
  formatAvoidMessage,
  formatDodgeMessage,
  formatFleeMessage,
  formatShieldMessage,
  formatWinnerMessage
} from './formatLog'
import i18n from '../../i18n'

type EnergyGainKind = 'bite' | 'jump' | 'tailwhip' | 'shield' | 'avoid'

const ENERGY_GAIN_RANGE: Record<EnergyGainKind, readonly [number, number]> = {
  bite: [ENERGY_GAIN_BITE_MIN, ENERGY_GAIN_BITE_MAX],
  jump: [ENERGY_GAIN_JUMP_MIN, ENERGY_GAIN_JUMP_MAX],
  tailwhip: [ENERGY_GAIN_TAILWHIP_MIN, ENERGY_GAIN_TAILWHIP_MAX],
  shield: [ENERGY_GAIN_SHIELD_MIN, ENERGY_GAIN_SHIELD_MAX],
  avoid: [ENERGY_GAIN_AVOID_MIN, ENERGY_GAIN_AVOID_MAX]
}

export function isChallenger(state: BattleSessionState, userId: string): boolean {
  return state.challenger.userId === userId
}

export function getActor(state: BattleSessionState, userId: string) {
  return isChallenger(state, userId) ? state.challenger : state.defender
}

export function getOpponent(state: BattleSessionState, userId: string) {
  return isChallenger(state, userId) ? state.defender : state.challenger
}

export function canUseUltimate(state: BattleSessionState, userId: string): boolean {
  return getActor(state, userId).energy >= ULTIMATE_ENERGY_MAX
}

export function rollEnergyGain(kind: EnergyGainKind, randomFactor?: number): number {
  const roll = randomFactor ?? Math.random()
  const [min, max] = ENERGY_GAIN_RANGE[kind]
  const span = max - min + 1
  return min + Math.floor(roll * span)
}

export function addEnergy(current: number, gain: number): number {
  return Math.min(ULTIMATE_ENERGY_MAX, current + gain)
}

export function checkWinner(state: BattleSessionState): string | null {
  if (state.challenger.hp <= 0 && state.defender.hp <= 0) return null
  if (state.defender.hp <= 0) return state.challenger.userId
  if (state.challenger.hp <= 0) return state.defender.userId
  return null
}

export function nextTurnUserId(state: BattleSessionState): string {
  return state.turnUserId === state.challenger.userId
    ? state.defender.userId
    : state.challenger.userId
}

export function applyAction(
  state: BattleSessionState,
  actorUserId: string,
  action: BattleActionType,
  randomFactor?: number
): { state: BattleSessionState; damage: number; logMessage: string; finished: boolean } {
  if (state.status !== 'active') {
    throw new Error('Battle is not active')
  }
  if (state.turnUserId !== actorUserId) {
    throw new Error('Not your turn')
  }

  const actor = getActor(state, actorUserId)
  const opponent = getOpponent(state, actorUserId)
  const next: BattleSessionState = {
    ...state,
    challenger: { ...state.challenger },
    defender: { ...state.defender }
  }
  const actorRef = getActor(next, actorUserId)
  const opponentRef = getOpponent(next, actorUserId)

  if (action === 'flee') {
    next.status = 'fled'
    next.fledUserId = actorUserId
    next.winnerUserId = opponent.userId
    next.turnUserId = actorUserId
    return {
      state: next,
      damage: 0,
      logMessage: formatFleeMessage(actor.name),
      finished: true
    }
  }

  if (action === 'shield' || action === 'defend') {
    const gain = rollEnergyGain('shield', randomFactor)
    actorRef.defending = true
    actorRef.avoiding = false
    actorRef.energy = addEnergy(actorRef.energy, gain)
    next.turnUserId = nextTurnUserId(next)
    return {
      state: next,
      damage: 0,
      logMessage: `${formatShieldMessage(actor.name)} (+${gain}% ${i18n.t('battle.ultimateEnergy')})`,
      finished: false
    }
  }

  if (action === 'avoid') {
    const gain = rollEnergyGain('avoid', randomFactor)
    actorRef.avoiding = true
    actorRef.defending = false
    actorRef.energy = addEnergy(actorRef.energy, gain)
    next.turnUserId = nextTurnUserId(next)
    return {
      state: next,
      damage: 0,
      logMessage: `${formatAvoidMessage(actor.name)} (+${gain}% ${i18n.t('battle.ultimateEnergy')})`,
      finished: false
    }
  }

  if (action === 'ultimate' && actorRef.energy < ULTIMATE_ENERGY_MAX) {
    throw new Error('Ultimate not ready')
  }

  const effectiveAction: BattleActionType =
    action === 'ultimate' && actorRef.energy >= ULTIMATE_ENERGY_MAX ? 'ultimate' : action

  if (effectiveAction === 'ultimate') {
    actorRef.energy = 0
  } else {
    const gainKind: EnergyGainKind =
      effectiveAction === 'jump' ? 'jump' : effectiveAction === 'tailwhip' ? 'tailwhip' : 'bite'
    const gain = rollEnergyGain(gainKind, randomFactor)
    actorRef.energy = addEnergy(actorRef.energy, gain)
  }

  const dodgeRoll = randomFactor ?? Math.random()
  const dodged = opponentRef.avoiding && dodgeRoll < AVOID_DODGE_CHANCE

  const damage = dodged
    ? 0
    : calcDamage({
        action: effectiveAction,
        defenderDefending: opponentRef.defending,
        randomFactor
      })

  const logMessage = dodged
    ? formatDodgeMessage(opponent.name, actor.name)
    : formatActionMessage(actor.name, opponent.name, effectiveAction, damage)

  opponentRef.hp = Math.max(0, opponentRef.hp - damage)
  opponentRef.defending = false
  opponentRef.avoiding = false

  const winnerUserId = checkWinner(next)
  if (winnerUserId) {
    next.status = 'completed'
    next.winnerUserId = winnerUserId
    next.turnUserId = actorUserId
    const winnerName = winnerUserId === actor.userId ? actor.name : opponent.name
    return {
      state: next,
      damage,
      logMessage: `${logMessage} ${formatWinnerMessage(winnerName)}`,
      finished: true
    }
  }

  next.turnUserId = nextTurnUserId(next)
  return { state: next, damage, logMessage, finished: false }
}
