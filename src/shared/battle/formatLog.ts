import type { BattleActionType } from './types'
import type { Element } from '../types'
import i18n from '../../i18n'
import { tElement } from '../../i18n/labels'

const ULTIMATE_NAMES: Partial<Record<Element, string>> = {}

export function formatActionMessage(
  actorName: string,
  targetName: string,
  action: BattleActionType,
  damage: number,
  actorElement?: Element
): string {
  if (action === 'ultimate' && actorElement) {
    return formatUltimateMessage(actorName, targetName, actorElement, damage)
  }
  return `${actorName} ${i18n.t('battle.attack')} ${targetName} -${damage} HP`
}

export function formatUltimateMessage(
  actorName: string,
  targetName: string,
  element: Element,
  damage: number
): string {
  const move = ULTIMATE_NAMES[element] ?? `${tElement(element)} ${i18n.t('battle.ultimate')}`
  return `${actorName} ${i18n.t('battle.ultimate')} "${move}" ${targetName} -${damage} HP`
}

export function formatUltimateFallbackMessage(
  actorName: string,
  targetName: string,
  damage: number
): string {
  return `${actorName} ${i18n.t('battle.attack')} ${targetName} -${damage} HP`
}

export function formatDefendMessage(actorName: string): string {
  return `${actorName} ${i18n.t('battle.defend')}`
}

export function formatFleeMessage(actorName: string): string {
  return `${actorName} ${i18n.t('battle.flee')}`
}

export function formatWinnerMessage(winnerName: string): string {
  return i18n.t('battle.modal.subtitleWinnerNamed', { winnerName })
}

export function formatElementAdvantage(attacker: Element, defender: Element, multiplier: number): string {
  if (multiplier === 1.0) return ''
  return `${tElement(attacker)} x${multiplier} ${tElement(defender)}`
}
