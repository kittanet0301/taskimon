import type { BattleActionType, BattleSessionState } from './types'
import i18n from '../../i18n'
import {
  ENERGY_GAIN_ATTACK_MAX,
  ENERGY_GAIN_ATTACK_MIN,
  ENERGY_GAIN_DEFEND_MAX,
  ENERGY_GAIN_DEFEND_MIN,
  ULTIMATE_ENERGY_MAX
} from './constants'
import { calcDamage } from './damage'
import {
  formatActionMessage,
  formatDefendMessage,
  formatFleeMessage,
  formatWinnerMessage
} from './formatLog'

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

export function rollEnergyGain(action: 'attack' | 'defend', randomFactor?: number): number {
  const roll = randomFactor ?? Math.random()
  if (action === 'defend') {
    const span = ENERGY_GAIN_DEFEND_MAX - ENERGY_GAIN_DEFEND_MIN + 1
    return ENERGY_GAIN_DEFEND_MIN + Math.floor(roll * span)
  }
  const span = ENERGY_GAIN_ATTACK_MAX - ENERGY_GAIN_ATTACK_MIN + 1
  return ENERGY_GAIN_ATTACK_MIN + Math.floor(roll * span)
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

  if (action === 'defend') {
    const gain = rollEnergyGain('defend', randomFactor)
    actorRef.defending = true
    actorRef.energy = addEnergy(actorRef.energy, gain)
    next.turnUserId = nextTurnUserId(next)
    return {
      state: next,
      damage: 0,
      logMessage: `${formatDefendMessage(actor.name)} (+${gain}% ${i18n.t('battle.ultimateEnergy')})`,
      finished: false
    }
  }

  if (action === 'ultimate' && actorRef.energy < ULTIMATE_ENERGY_MAX) {
    throw new Error('Ultimate not ready')
  }

  const effectiveAction: BattleActionType =
    action === 'ultimate' && actorRef.energy >= ULTIMATE_ENERGY_MAX ? 'ultimate' : 'attack'

  if (effectiveAction === 'ultimate') {
    actorRef.energy = 0
  } else {
    const gain = rollEnergyGain('attack', randomFactor)
    actorRef.energy = addEnergy(actorRef.energy, gain)
  }

  const damage = calcDamage({
    action: effectiveAction,
    attackerElement: actorRef.element,
    defenderElement: opponentRef.element,
    defenderDefending: opponentRef.defending,
    randomFactor
  })

  const logMessage = formatActionMessage(
    actor.name,
    opponent.name,
    effectiveAction,
    damage,
    actorRef.element
  )

  opponentRef.hp = Math.max(0, opponentRef.hp - damage)
  if (opponentRef.defending) opponentRef.defending = false

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
